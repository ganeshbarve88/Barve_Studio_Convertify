import React, { useState, useRef, useEffect, useCallback } from 'react';
import { jsPDF } from 'jspdf';
import {
  Camera,
  RotateCcw,
  Sparkles,
  Download,
  Trash2,
  CheckCircle2,
  Layers,
  Flashlight,
  SwitchCamera,
  Upload,
  Eye,
  FileCheck,
  AlertCircle,
  Loader2,
  Share2,
  Sliders,
  Maximize2,
  X,
  ArrowLeft,
  ArrowRight,
} from 'lucide-react';
import { ScannedPageItem, ScanFilter, PageSizeOption } from '../types';
import { processScannedImage } from '../utils/scanFilter';
import { formatBytes, downloadBlob } from '../utils/fileHelpers';

export const ScanPdfView: React.FC = () => {
  const [pages, setPages] = useState<ScannedPageItem[]>([]);
  const [selectedPageIndex, setSelectedPageIndex] = useState<number | null>(null);

  // Camera stream states
  const [isCameraActive, setIsCameraActive] = useState<boolean>(true);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [hasTorch, setHasTorch] = useState<boolean>(false);
  const [isTorchOn, setIsTorchOn] = useState<boolean>(false);
  const [isShutterFlashing, setIsShutterFlashing] = useState<boolean>(false);

  // PDF Generation states
  const [pageSize, setPageSize] = useState<PageSizeOption>('a4');
  const [docTitle, setDocTitle] = useState<string>(() => {
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10);
    const timeStr = `${now.getHours().toString().padStart(2, '0')}${now.getMinutes().toString().padStart(2, '0')}`;
    return `Scan_${dateStr}_${timeStr}`;
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fallbackInputRef = useRef<HTMLInputElement | null>(null);

  // Stop camera tracks cleanly
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  // Start camera
  const startCamera = useCallback(async () => {
    stopCamera();
    setCameraError(null);

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError('Camera access is not supported in this browser. You can still upload or snap photos below.');
      return;
    }

    try {
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1920, min: 1280 },
          height: { ideal: 1080, min: 720 },
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      // Check for torch capability
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        const capabilities = (videoTrack.getCapabilities?.() || {}) as any;
        setHasTorch(Boolean(capabilities.torch));
      }
    } catch (err: any) {
      console.warn('Could not start camera stream:', err);
      let message = 'Unable to access camera. Please allow camera permissions.';
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        message = 'Camera permission was denied. Please allow camera access or use the photo upload button.';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        message = 'No camera device found on this device.';
      }
      setCameraError(message);
    }
  }, [facingMode, stopCamera]);

  // Handle active camera toggle
  useEffect(() => {
    if (isCameraActive) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isCameraActive, facingMode, startCamera, stopCamera]);

  // Toggle torch / flashlight
  const toggleTorch = async () => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    if (!track) return;

    try {
      const nextTorch = !isTorchOn;
      await (track as any).applyConstraints({
        advanced: [{ torch: nextTorch }],
      });
      setIsTorchOn(nextTorch);
    } catch (err) {
      console.warn('Failed to toggle torch:', err);
    }
  };

  // Flip camera (front / back)
  const toggleCamera = () => {
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
    setIsTorchOn(false);
  };

  // Capture frame from live video
  const capturePage = async () => {
    if (!videoRef.current) return;
    const video = videoRef.current;

    // Flash animation
    setIsShutterFlashing(true);
    setTimeout(() => setIsShutterFlashing(false), 200);

    // Haptic feedback if supported on mobile
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(40);
    }

    try {
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 1280;
      canvas.height = video.videoHeight || 720;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // If user facing, mirror image horizontally for natural look
      if (facingMode === 'user') {
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
      }

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const rawDataUrl = canvas.toDataURL('image/jpeg', 0.95);

      // Default to "document" filter for crisp CamScanner quality
      const processed = await processScannedImage(rawDataUrl, 'document', 0);

      const newPage: ScannedPageItem = {
        id: `page-${Date.now()}-${Math.random()}`,
        originalDataUrl: rawDataUrl,
        processedDataUrl: processed,
        filter: 'document',
        rotation: 0,
        timestamp: Date.now(),
      };

      setPages((prev) => [...prev, newPage]);
      setPdfBlob(null);
    } catch (err) {
      console.error('Error capturing page:', err);
      setErrorMsg('Failed to capture page.');
    }
  };

  // Handle file capture fallback (mobile native camera or gallery)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const reader = new FileReader();
      reader.onload = async (evt) => {
        const rawDataUrl = evt.target?.result as string;
        if (rawDataUrl) {
          const processed = await processScannedImage(rawDataUrl, 'document', 0);
          const newPage: ScannedPageItem = {
            id: `page-${Date.now()}-${Math.random()}`,
            originalDataUrl: rawDataUrl,
            processedDataUrl: processed,
            filter: 'document',
            rotation: 0,
            timestamp: Date.now(),
          };
          setPages((prev) => [...prev, newPage]);
          setPdfBlob(null);
        }
      };
      reader.readAsDataURL(file);
    }

    // Reset input
    if (fallbackInputRef.current) {
      fallbackInputRef.current.value = '';
    }
  };

  // Filter change for a single page
  const applyFilterToPage = async (pageIndex: number, newFilter: ScanFilter) => {
    const target = pages[pageIndex];
    if (!target) return;

    try {
      const updatedUrl = await processScannedImage(target.originalDataUrl, newFilter, target.rotation);
      setPages((prev) => {
        const next = [...prev];
        next[pageIndex] = {
          ...next[pageIndex],
          filter: newFilter,
          processedDataUrl: updatedUrl,
        };
        return next;
      });
      setPdfBlob(null);
    } catch (err) {
      console.error('Filter apply error:', err);
    }
  };

  // Rotate a single page 90 degrees
  const rotatePage = async (pageIndex: number) => {
    const target = pages[pageIndex];
    if (!target) return;

    const newRotation = (target.rotation + 90) % 360;
    try {
      const updatedUrl = await processScannedImage(target.originalDataUrl, target.filter, newRotation);
      setPages((prev) => {
        const next = [...prev];
        next[pageIndex] = {
          ...next[pageIndex],
          rotation: newRotation,
          processedDataUrl: updatedUrl,
        };
        return next;
      });
      setPdfBlob(null);
    } catch (err) {
      console.error('Rotate error:', err);
    }
  };

  // Apply filter to ALL pages
  const applyFilterToAll = async (newFilter: ScanFilter) => {
    try {
      const updatedPages = await Promise.all(
        pages.map(async (p) => {
          const updatedUrl = await processScannedImage(p.originalDataUrl, newFilter, p.rotation);
          return {
            ...p,
            filter: newFilter,
            processedDataUrl: updatedUrl,
          };
        })
      );
      setPages(updatedPages);
      setPdfBlob(null);
    } catch (err) {
      console.error('Batch filter apply error:', err);
    }
  };

  // Reorder
  const movePage = (index: number, direction: 'left' | 'right') => {
    setPages((prev) => {
      const target = direction === 'left' ? index - 1 : index + 1;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      const temp = next[index];
      next[index] = next[target];
      next[target] = temp;
      return next;
    });
    setSelectedPageIndex(direction === 'left' ? index - 1 : index + 1);
    setPdfBlob(null);
  };

  // Delete page
  const deletePage = (index: number) => {
    setPages((prev) => prev.filter((_, i) => i !== index));
    if (selectedPageIndex === index) {
      setSelectedPageIndex(null);
    } else if (selectedPageIndex !== null && selectedPageIndex > index) {
      setSelectedPageIndex(selectedPageIndex - 1);
    }
    setPdfBlob(null);
  };

  // Generate PDF
  const handleGeneratePdf = async () => {
    if (pages.length === 0) return;

    setIsGenerating(true);
    setErrorMsg(null);

    try {
      let pdf: jsPDF | null = null;

      for (let i = 0; i < pages.length; i++) {
        const p = pages[i];

        // Load image to compute aspect ratio
        const img = new Image();
        img.src = p.processedDataUrl;
        await new Promise((res) => {
          img.onload = res;
        });

        const imgWidth = img.naturalWidth || 800;
        const imgHeight = img.naturalHeight || 1100;

        let pageWidthPt = 595.28; // A4 default (pt)
        let pageHeightPt = 841.89;
        let orientation: 'portrait' | 'landscape' = imgWidth > imgHeight ? 'landscape' : 'portrait';

        if (pageSize === 'letter') {
          pageWidthPt = 612;
          pageHeightPt = 792;
        } else if (pageSize === 'fit-image') {
          pageWidthPt = imgWidth * 0.75;
          pageHeightPt = imgHeight * 0.75;
          orientation = imgWidth > imgHeight ? 'landscape' : 'portrait';
        }

        if (pageSize !== 'fit-image' && orientation === 'landscape') {
          const temp = pageWidthPt;
          pageWidthPt = pageHeightPt;
          pageHeightPt = temp;
        }

        if (i === 0) {
          pdf = new jsPDF({
            orientation,
            unit: 'pt',
            format: pageSize === 'fit-image' ? [pageWidthPt, pageHeightPt] : pageSize,
            compress: true,
          });
        } else if (pdf) {
          pdf.addPage(
            pageSize === 'fit-image' ? [pageWidthPt, pageHeightPt] : pageSize,
            orientation
          );
        }

        if (pdf) {
          if (pageSize === 'fit-image') {
            pdf.addImage(p.processedDataUrl, 'JPEG', 0, 0, pageWidthPt, pageHeightPt, undefined, 'FAST');
          } else {
            // Fit image into page preserving aspect ratio
            const scale = Math.min(pageWidthPt / imgWidth, pageHeightPt / imgHeight);
            const w = imgWidth * scale;
            const h = imgHeight * scale;
            const x = (pageWidthPt - w) / 2;
            const y = (pageHeightPt - h) / 2;

            pdf.addImage(p.processedDataUrl, 'JPEG', x, y, w, h, undefined, 'FAST');
          }
        }
      }

      if (pdf) {
        const outBlob = pdf.output('blob');
        setPdfBlob(outBlob);
      }
      setIsGenerating(false);
    } catch (err) {
      console.error('Error generating PDF:', err);
      setIsGenerating(false);
      setErrorMsg('Failed to build PDF. Please try again.');
    }
  };

  const handleDownload = () => {
    if (!pdfBlob) return;
    const cleanName = docTitle.trim().replace(/[/\\?%*:|"<>]/g, '_') || 'Scanned_Document';
    downloadBlob(pdfBlob, `${cleanName}.pdf`);
  };

  const handleSharePdf = async () => {
    if (!pdfBlob) return;
    const cleanName = docTitle.trim().replace(/[/\\?%*:|"<>]/g, '_') || 'Scanned_Document';
    const file = new File([pdfBlob], `${cleanName}.pdf`, { type: 'application/pdf' });

    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          files: [file],
          title: cleanName,
          text: 'Scanned document created with Convertify by Barve Studio',
        });
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          handleDownload();
        }
      }
    } else {
      handleDownload();
    }
  };

  const selectedPage = selectedPageIndex !== null ? pages[selectedPageIndex] : null;

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <Camera className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold text-slate-900">Scan to PDF (Mobile Scanner)</h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700 uppercase">
                Camera Scanner
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Scan multi-page documents directly using your mobile or webcam with automatic clean B&W enhancement.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {pages.length > 0 && (
            <button
              type="button"
              onClick={() => {
                setPages([]);
                setPdfBlob(null);
                setSelectedPageIndex(null);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-red-50 text-slate-600 hover:text-red-600 border border-slate-200 text-xs font-semibold transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Scan ({pages.length})</span>
            </button>
          )}
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Main Grid: Camera Viewfinder / Scanner Stage + Pages Tray & PDF Settings */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left / Center Viewfinder (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-slate-900 rounded-3xl overflow-hidden shadow-lg border border-slate-800 relative flex flex-col items-center justify-center min-h-[420px] sm:min-h-[500px]">
            {/* Shutter White Flash Animation */}
            {isShutterFlashing && (
              <div className="absolute inset-0 bg-white z-40 animate-out fade-out duration-200 pointer-events-none" />
            )}

            {/* Video Viewfinder */}
            {isCameraActive && !cameraError ? (
              <div className="relative w-full h-full flex items-center justify-center bg-black">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover max-h-[540px]"
                />

                {/* Document Alignment Frame Overlay (CamScanner style) */}
                <div className="absolute inset-8 sm:inset-12 pointer-events-none flex flex-col justify-between">
                  <div className="flex justify-between">
                    <div className="w-8 h-8 border-t-2 border-l-2 border-white/80 rounded-tl-lg" />
                    <div className="w-8 h-8 border-t-2 border-r-2 border-white/80 rounded-tr-lg" />
                  </div>
                  <div className="text-center">
                    <span className="inline-block px-3 py-1 bg-black/60 backdrop-blur-md rounded-full text-[11px] font-medium text-white/90 shadow-sm">
                      Align document edges within frame
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <div className="w-8 h-8 border-b-2 border-l-2 border-white/80 rounded-bl-lg" />
                    <div className="w-8 h-8 border-b-2 border-r-2 border-white/80 rounded-br-lg" />
                  </div>
                </div>

                {/* Top Camera Controls Overlay */}
                <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-20">
                  <div className="flex items-center gap-2">
                    <span className="bg-black/60 backdrop-blur-md text-white px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                      <span>Live Camera</span>
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {hasTorch && (
                      <button
                        type="button"
                        onClick={toggleTorch}
                        className={`p-2.5 rounded-full backdrop-blur-md transition-colors cursor-pointer ${
                          isTorchOn ? 'bg-amber-400 text-slate-900' : 'bg-black/50 text-white hover:bg-black/70'
                        }`}
                        title="Toggle Flashlight"
                      >
                        <Flashlight className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={toggleCamera}
                      className="p-2.5 rounded-full bg-black/50 hover:bg-black/70 text-white backdrop-blur-md transition-colors cursor-pointer"
                      title="Switch Camera (Front/Back)"
                    >
                      <SwitchCamera className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Bottom Viewfinder Action Controls */}
                <div className="absolute bottom-6 left-0 right-0 flex items-center justify-center gap-6 z-20 px-6">
                  {/* Native Upload / Snap Fallback */}
                  <button
                    type="button"
                    onClick={() => fallbackInputRef.current?.click()}
                    className="p-3.5 rounded-2xl bg-black/50 hover:bg-black/70 text-white backdrop-blur-md border border-white/20 transition-all cursor-pointer flex flex-col items-center gap-1"
                    title="Upload or snap photo from gallery"
                  >
                    <Upload className="w-5 h-5" />
                    <span className="text-[10px] font-medium hidden sm:inline">Gallery</span>
                  </button>

                  {/* Primary Shutter Button */}
                  <button
                    type="button"
                    onClick={capturePage}
                    className="w-20 h-20 rounded-full border-4 border-white bg-white/20 hover:bg-white/40 active:scale-95 transition-all p-1 flex items-center justify-center cursor-pointer shadow-lg group"
                    title="Capture Document Page"
                  >
                    <div className="w-full h-full rounded-full bg-white group-hover:bg-blue-500 transition-colors flex items-center justify-center shadow-inner">
                      <Camera className="w-6 h-6 text-slate-900 group-hover:text-white transition-colors" />
                    </div>
                  </button>

                  {/* Pages Counter Pill */}
                  <div className="p-3.5 rounded-2xl bg-black/50 text-white backdrop-blur-md border border-white/20 flex flex-col items-center gap-0.5 min-w-[54px]">
                    <span className="text-xs font-bold">{pages.length}</span>
                    <span className="text-[9px] text-white/70 font-medium">Pages</span>
                  </div>
                </div>
              </div>
            ) : (
              /* Fallback / Permission Denied State */
              <div className="p-8 text-center max-w-md space-y-4 text-white">
                <div className="w-16 h-16 rounded-2xl bg-slate-800 text-blue-400 flex items-center justify-center mx-auto border border-slate-700">
                  <Camera className="w-8 h-8" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-white">Camera Access</h4>
                  <p className="text-xs text-slate-400 mt-1">
                    {cameraError || 'Allow camera permission to use the real-time document scanner.'}
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsCameraActive(true);
                      startCamera();
                    }}
                    className="w-full sm:w-auto px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
                  >
                    Retry Camera
                  </button>
                  <button
                    type="button"
                    onClick={() => fallbackInputRef.current?.click()}
                    className="w-full sm:w-auto px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Upload className="w-4 h-4" />
                    <span>Upload or Take Photo</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Hidden File Input for Native Camera or File Picker */}
          <input
            ref={fallbackInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            multiple
            className="hidden"
            onChange={handleFileUpload}
          />

          {/* Quick Filter Preset Bar for All Pages */}
          {pages.length > 0 && (
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-blue-600" />
                <span className="text-xs font-bold text-slate-900">Enhance All Scanned Pages:</span>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => applyFilterToAll('document')}
                  className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors cursor-pointer"
                >
                  Clean B&W (Doc)
                </button>
                <button
                  type="button"
                  onClick={() => applyFilterToAll('contrast')}
                  className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
                >
                  Color Boost
                </button>
                <button
                  type="button"
                  onClick={() => applyFilterToAll('grayscale')}
                  className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
                >
                  Grayscale
                </button>
                <button
                  type="button"
                  onClick={() => applyFilterToAll('original')}
                  className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
                >
                  Original Photo
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right Stage: Scanned Pages List & PDF Builder (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Scanned Pages Carousel / Grid */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Layers className="w-4 h-4 text-blue-600" />
                <span>Scanned Pages ({pages.length})</span>
              </h4>
              <button
                type="button"
                onClick={() => fallbackInputRef.current?.click()}
                className="text-xs text-blue-600 font-semibold hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>+ Add from Photos</span>
              </button>
            </div>

            {pages.length === 0 ? (
              <div className="p-8 border-2 border-dashed border-slate-200 rounded-2xl text-center space-y-2">
                <div className="w-10 h-10 rounded-xl bg-slate-50 text-slate-400 flex items-center justify-center mx-auto">
                  <Camera className="w-5 h-5" />
                </div>
                <p className="text-xs text-slate-500 font-medium">
                  No pages captured yet. Aim your camera and tap the white shutter button to scan.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-[340px] overflow-y-auto p-1">
                {pages.map((p, index) => {
                  const isSelected = selectedPageIndex === index;
                  return (
                    <div
                      key={p.id}
                      onClick={() => setSelectedPageIndex(index)}
                      className={`group relative rounded-xl border-2 overflow-hidden cursor-pointer transition-all bg-slate-100 aspect-[1/1.3] flex flex-col justify-between ${
                        isSelected ? 'border-blue-600 shadow-sm' : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      {/* Page badge */}
                      <div className="absolute top-1.5 left-1.5 z-10 bg-black/70 backdrop-blur-xs text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md">
                        #{index + 1}
                      </div>

                      {/* Filter tag */}
                      <div className="absolute top-1.5 right-1.5 z-10 bg-blue-600/90 text-white text-[9px] font-semibold px-1 py-0.5 rounded-md uppercase">
                        {p.filter}
                      </div>

                      {/* Image Thumbnail */}
                      <img
                        src={p.processedDataUrl}
                        alt={`Scan Page ${index + 1}`}
                        className="w-full h-full object-cover"
                      />

                      {/* Quick delete overlay on hover */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          deletePage(index);
                        }}
                        className="absolute bottom-1.5 right-1.5 p-1 bg-red-600/90 hover:bg-red-700 text-white rounded-md opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                        title="Delete page"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* PDF Generation & Document Details Card */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-4">
            <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Sliders className="w-4 h-4 text-blue-600" />
              <span>Document Settings</span>
            </h4>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-600 font-semibold block mb-1">Document Name</label>
                <input
                  type="text"
                  value={docTitle}
                  onChange={(e) => setDocTitle(e.target.value)}
                  placeholder="e.g. Contract_Scan"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs outline-none focus:border-blue-500 transition-colors"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-600 font-semibold block mb-1">Page Size</label>
                  <select
                    value={pageSize}
                    onChange={(e) => setPageSize(e.target.value as PageSizeOption)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs outline-none focus:border-blue-500 cursor-pointer"
                  >
                    <option value="a4">Standard A4</option>
                    <option value="letter">US Letter</option>
                    <option value="fit-image">Fit to Scanned Photo</option>
                  </select>
                </div>
                <div>
                  <label className="text-slate-600 font-semibold block mb-1">Total Pages</label>
                  <div className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-bold">
                    {pages.length} page{pages.length === 1 ? '' : 's'}
                  </div>
                </div>
              </div>
            </div>

            {/* Generated PDF Output */}
            {pdfBlob ? (
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs text-emerald-800 font-semibold">
                  <div className="flex items-center gap-2">
                    <FileCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>PDF ready! ({formatBytes(pdfBlob.size)})</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={handleDownload}
                    className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-sm transition-colors cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download PDF</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleSharePdf}
                    className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-sm transition-colors cursor-pointer"
                    title="Share PDF via WhatsApp, Email, AirDrop, etc."
                  >
                    <Share2 className="w-4 h-4" />
                    <span>Share / Send</span>
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                disabled={pages.length === 0 || isGenerating}
                onClick={handleGeneratePdf}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Building Multi-Page PDF...</span>
                  </>
                ) : (
                  <>
                    <FileCheck className="w-4 h-4" />
                    <span>Generate PDF from {pages.length} Page{pages.length === 1 ? '' : 's'}</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Selected Page Editor & Filter Modal */}
      {selectedPage && selectedPageIndex !== null && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl border border-slate-200">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900 text-sm">
                  Editing Page #{selectedPageIndex + 1} of {pages.length}
                </span>
                <span className="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full font-semibold uppercase">
                  {selectedPage.filter}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={selectedPageIndex === 0}
                  onClick={() => movePage(selectedPageIndex, 'left')}
                  className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-30 cursor-pointer"
                  title="Move Page Earlier"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  disabled={selectedPageIndex === pages.length - 1}
                  onClick={() => movePage(selectedPageIndex, 'right')}
                  className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-30 cursor-pointer"
                  title="Move Page Later"
                >
                  <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedPageIndex(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body: Large Preview */}
            <div className="p-4 sm:p-6 bg-slate-900/90 flex-1 overflow-y-auto flex items-center justify-center min-h-[280px]">
              <img
                src={selectedPage.processedDataUrl}
                alt={`Page ${selectedPageIndex + 1}`}
                className="max-h-[400px] w-auto max-w-full object-contain rounded-lg shadow-lg border border-slate-800"
              />
            </div>

            {/* Modal Footer: Controls & Filters */}
            <div className="p-4 sm:p-5 bg-white border-t border-slate-100 space-y-4">
              <div>
                <span className="text-xs font-semibold text-slate-600 block mb-2">Enhancement Filter</span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => applyFilterToPage(selectedPageIndex, 'document')}
                    className={`px-3 py-2 rounded-xl text-xs font-semibold border text-center transition-all cursor-pointer ${
                      selectedPage.filter === 'document'
                        ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    Clean B&W
                  </button>
                  <button
                    type="button"
                    onClick={() => applyFilterToPage(selectedPageIndex, 'contrast')}
                    className={`px-3 py-2 rounded-xl text-xs font-semibold border text-center transition-all cursor-pointer ${
                      selectedPage.filter === 'contrast'
                        ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    Color Boost
                  </button>
                  <button
                    type="button"
                    onClick={() => applyFilterToPage(selectedPageIndex, 'grayscale')}
                    className={`px-3 py-2 rounded-xl text-xs font-semibold border text-center transition-all cursor-pointer ${
                      selectedPage.filter === 'grayscale'
                        ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    Grayscale
                  </button>
                  <button
                    type="button"
                    onClick={() => applyFilterToPage(selectedPageIndex, 'original')}
                    className={`px-3 py-2 rounded-xl text-xs font-semibold border text-center transition-all cursor-pointer ${
                      selectedPage.filter === 'original'
                        ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    Original
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => rotatePage(selectedPageIndex)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-blue-600" />
                  <span>Rotate 90°</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => deletePage(selectedPageIndex)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 text-xs font-semibold transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Page</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedPageIndex(null)}
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
                  >
                    Done
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
