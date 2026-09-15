import React, { useState, useEffect, useRef } from 'react';
import {
  Image as ImageIcon,
  Plus,
  Trash2,
  RotateCw,
  ArrowUp,
  ArrowDown,
  Sliders,
  FileText,
  Download,
  Eye,
  RefreshCw,
  Sparkles,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react';
import { Dropzone } from './Dropzone';
import { PreviewModal } from './PreviewModal';
import {
  ImageFileItem,
  ImageToPdfSettings,
  PageSizeOption,
  PageOrientation,
  MarginOption,
  ImageFitMode,
} from '../types';
import { convertImagesToPdf } from '../utils/imageToPdf';
import { formatBytes, downloadBlob } from '../utils/fileHelpers';
import { createSampleImages } from '../utils/sampleFiles';

export const ImageToPdfView: React.FC = () => {
  const [images, setImages] = useState<ImageFileItem[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateProgress, setGenerateProgress] = useState({ current: 0, total: 0 });
  const [generatedPdfBlob, setGeneratedPdfBlob] = useState<Blob | null>(null);

  const addInputRef = useRef<HTMLInputElement>(null);

  const [settings, setSettings] = useState<ImageToPdfSettings>({
    pageSize: 'a4',
    orientation: 'auto',
    margin: 'none',
    fitMode: 'contain',
    quality: 0.92,
    fileName: 'my_converted_document.pdf',
  });

  // Preview Modal
  const [previewModal, setPreviewModal] = useState<{
    isOpen: boolean;
    title: string;
    imageSrc?: string;
    pdfBlob?: Blob;
    downloadFilename?: string;
    details?: string;
  }>({
    isOpen: false,
    title: '',
  });

  // Clean up Object URLs when items are removed
  useEffect(() => {
    return () => {
      images.forEach((img) => URL.revokeObjectURL(img.previewUrl));
    };
  }, []);

  const handleFilesAdded = async (files: File[]) => {
    const newItems: ImageFileItem[] = [];

    for (const file of files) {
      const previewUrl = URL.createObjectURL(file);
      // Determine dimensions
      const { width, height } = await new Promise<{ width: number; height: number }>(
        (resolve) => {
          const img = new Image();
          img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
          img.onerror = () => resolve({ width: 800, height: 600 });
          img.src = previewUrl;
        }
      );

      newItems.push({
        id: Math.random().toString(36).substring(2, 9),
        file,
        name: file.name,
        size: file.size,
        previewUrl,
        width,
        height,
        rotation: 0,
      });
    }

    setImages((prev) => [...prev, ...newItems]);
    setGeneratedPdfBlob(null);
  };

  const handleRemoveImage = (id: string) => {
    setImages((prev) => {
      const item = prev.find((x) => x.id === id);
      if (item) URL.revokeObjectURL(item.previewUrl);
      return prev.filter((x) => x.id !== id);
    });
    setGeneratedPdfBlob(null);
  };

  const handleRotateImage = (id: string) => {
    setImages((prev) =>
      prev.map((img) =>
        img.id === id ? { ...img, rotation: (img.rotation + 90) % 360 } : img
      )
    );
    setGeneratedPdfBlob(null);
  };

  const handleMoveImage = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= images.length) return;

    setImages((prev) => {
      const copy = [...prev];
      const temp = copy[index];
      copy[index] = copy[targetIndex];
      copy[targetIndex] = temp;
      return copy;
    });
    setGeneratedPdfBlob(null);
  };

  const handleClearAll = () => {
    images.forEach((img) => URL.revokeObjectURL(img.previewUrl));
    setImages([]);
    setGeneratedPdfBlob(null);
  };

  const handleGeneratePdf = async () => {
    if (images.length === 0) return;

    setIsGenerating(true);
    setGenerateProgress({ current: 0, total: images.length });
    setGeneratedPdfBlob(null);

    try {
      const blob = await convertImagesToPdf(
        images,
        settings,
        (current, total) => {
          setGenerateProgress({ current, total });
        }
      );
      setGeneratedPdfBlob(blob);
    } catch (err: any) {
      console.error('Failed to generate PDF:', err);
      alert('PDF generation failed: ' + (err.message || 'Unknown error'));
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadPdf = () => {
    if (!generatedPdfBlob) return;
    const filename = settings.fileName.endsWith('.pdf')
      ? settings.fileName
      : `${settings.fileName}.pdf`;
    downloadBlob(generatedPdfBlob, filename);
  };

  const totalSize = images.reduce((acc, curr) => acc + curr.size, 0);

  return (
    <div className="space-y-6">
      {images.length === 0 ? (
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-slate-900">
              Convert Images to PDF Offline
            </h2>
            <p className="text-sm text-slate-600 mt-1 max-w-lg mx-auto">
              Combine single or multiple images (PNG, JPG, WebP) into a clean,
              custom-formatted PDF document right in your browser.
            </p>
          </div>

          <Dropzone
            id="image-dropzone"
            accept="image/*,.png,.jpg,.jpeg,.webp,.gif,.bmp"
            multiple={true}
            title="Select or Drop Images"
            subtitle="JPG, PNG, WebP, GIF, or BMP files"
            supportedText="All standard image formats"
            icon={<ImageIcon className="w-8 h-8 text-indigo-600" />}
            onFilesSelected={handleFilesAdded}
            onLoadSample={() => handleFilesAdded(createSampleImages())}
            sampleLabel="Try with Sample Photos (3 Images)"
          />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Header Bar */}
          <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center shrink-0">
                <ImageIcon className="w-6 h-6 text-indigo-600" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-bold text-slate-900">
                  {images.length} {images.length === 1 ? 'Image' : 'Images'} Selected
                </h3>
                <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                  <span>Total {formatBytes(totalSize)}</span>
                  <span>•</span>
                  <span>Drag or reorder pages below</span>
                  <span>•</span>
                  <span className="text-emerald-600 font-medium">Ready offline</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto">
              {/* Hidden file input for adding more */}
              <input
                ref={addInputRef}
                type="file"
                accept="image/*,.png,.jpg,.jpeg,.webp,.gif,.bmp"
                multiple
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files.length > 0) {
                    handleFilesAdded(Array.from(e.target.files));
                    e.target.value = '';
                  }
                }}
              />

              <button
                type="button"
                onClick={() => addInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add More Images</span>
              </button>

              <button
                type="button"
                onClick={handleClearAll}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear All</span>
              </button>
            </div>
          </div>

          {/* PDF Assembly Settings Panel */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
              <Sliders className="w-4 h-4 text-blue-600" />
              <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider">PDF Document Settings</h4>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
              {/* Page Size */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Page Size
                </label>
                <select
                  value={settings.pageSize}
                  onChange={(e) => {
                    setSettings((s) => ({
                      ...s,
                      pageSize: e.target.value as PageSizeOption,
                    }));
                    setGeneratedPdfBlob(null);
                  }}
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium text-slate-800 shadow-sm outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                >
                  <option value="a4">A4 (210 × 297 mm)</option>
                  <option value="letter">US Letter (8.5 × 11 in)</option>
                  <option value="fit-image">Fit to Image Size</option>
                  <option value="legal">US Legal (8.5 × 14 in)</option>
                  <option value="a3">A3 (297 × 420 mm)</option>
                </select>
              </div>

              {/* Orientation */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Orientation
                </label>
                <select
                  disabled={settings.pageSize === 'fit-image'}
                  value={settings.orientation}
                  onChange={(e) => {
                    setSettings((s) => ({
                      ...s,
                      orientation: e.target.value as PageOrientation,
                    }));
                    setGeneratedPdfBlob(null);
                  }}
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium text-slate-800 shadow-sm outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <option value="auto">Auto (Match Image)</option>
                  <option value="portrait">Portrait</option>
                  <option value="landscape">Landscape</option>
                </select>
              </div>

              {/* Margins */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Page Margins
                </label>
                <select
                  value={settings.margin}
                  onChange={(e) => {
                    setSettings((s) => ({
                      ...s,
                      margin: e.target.value as MarginOption,
                    }));
                    setGeneratedPdfBlob(null);
                  }}
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium text-slate-800 shadow-sm outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                >
                  <option value="none">None (0 mm - Full Bleed)</option>
                  <option value="small">Small (5 mm)</option>
                  <option value="normal">Normal (10 mm)</option>
                  <option value="large">Large (15 mm)</option>
                </select>
              </div>

              {/* Fit Mode */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Image Fit
                </label>
                <select
                  disabled={settings.pageSize === 'fit-image'}
                  value={settings.fitMode}
                  onChange={(e) => {
                    setSettings((s) => ({
                      ...s,
                      fitMode: e.target.value as ImageFitMode,
                    }));
                    setGeneratedPdfBlob(null);
                  }}
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium text-slate-800 shadow-sm outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <option value="contain">Fit to Page (No Crop)</option>
                  <option value="cover">Fill Page (Cover)</option>
                  <option value="center">Original Centered</option>
                </select>
              </div>

              {/* Quality */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Compression
                </label>
                <select
                  value={settings.quality}
                  onChange={(e) => {
                    setSettings((s) => ({
                      ...s,
                      quality: parseFloat(e.target.value),
                    }));
                    setGeneratedPdfBlob(null);
                  }}
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium text-slate-800 shadow-sm outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                >
                  <option value={0.95}>Maximum (95% - Best)</option>
                  <option value={0.85}>High (85% - Crisp)</option>
                  <option value={0.7}>Balanced (70% - Compact)</option>
                </select>
              </div>

              {/* Output PDF File Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Output Filename
                </label>
                <input
                  type="text"
                  value={settings.fileName}
                  onChange={(e) =>
                    setSettings((s) => ({ ...s, fileName: e.target.value }))
                  }
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium text-slate-800 shadow-sm outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Reorderable Image Gallery Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {images.map((img, idx) => (
              <div
                key={img.id}
                className="group relative rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden hover:border-blue-400 transition-all flex flex-col"
              >
                {/* Page Number & Position Badge */}
                <div className="absolute top-2 left-2 z-10">
                  <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-slate-900/80 text-white backdrop-blur-xs shadow-xs">
                    Page {idx + 1}
                  </span>
                </div>

                {/* Top Action Quick Buttons */}
                <div className="absolute top-2 right-2 z-10 flex items-center gap-1 opacity-90 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    type="button"
                    onClick={() => handleRotateImage(img.id)}
                    title="Rotate 90°"
                    className="p-1.5 rounded-lg bg-white/95 text-slate-700 hover:text-blue-600 hover:bg-white shadow-xs cursor-pointer"
                  >
                    <RotateCw className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleRemoveImage(img.id)}
                    title="Remove Image"
                    className="p-1.5 rounded-lg bg-white/95 text-slate-700 hover:text-rose-600 hover:bg-white shadow-xs cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Thumbnail with rotation preview */}
                <div className="aspect-3/4 w-full bg-slate-50 flex items-center justify-center p-2 overflow-hidden">
                  <img
                    src={img.previewUrl}
                    alt={img.name}
                    referrerPolicy="no-referrer"
                    style={{ transform: `rotate(${img.rotation}deg)` }}
                    className="max-h-full max-w-full object-contain rounded shadow-xs transition-transform duration-200"
                  />
                </div>

                {/* Card Information & Reorder Controls */}
                <div className="p-3 bg-slate-50 border-t border-slate-100 mt-auto flex flex-col gap-1.5 text-xs">
                  <div className="truncate font-medium text-slate-800 text-[11px]" title={img.name}>
                    {img.name}
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-slate-500">
                    <span>
                      {img.rotation % 180 === 0
                        ? `${img.width} × ${img.height}`
                        : `${img.height} × ${img.width}`}
                    </span>
                    <span>{formatBytes(img.size)}</span>
                  </div>

                  {/* Reorder Buttons */}
                  <div className="flex items-center justify-between pt-1.5 border-t border-slate-200/60">
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={() => handleMoveImage(idx, 'up')}
                        title="Move Page Earlier"
                        className="p-1 rounded-md text-slate-500 hover:text-blue-600 hover:bg-slate-200/70 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        disabled={idx === images.length - 1}
                        onClick={() => handleMoveImage(idx, 'down')}
                        title="Move Page Later"
                        className="p-1 rounded-md text-slate-500 hover:text-blue-600 hover:bg-slate-200/70 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        setPreviewModal({
                          isOpen: true,
                          title: img.name,
                          imageSrc: img.previewUrl,
                          details: `${img.width} × ${img.height} px • ${formatBytes(img.size)}`,
                        })
                      }
                      title="Preview Full Image"
                      className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-200 cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Assembly / Download Footer Action Bar */}
          <div className="sticky bottom-4 z-20 bg-white border border-slate-200 rounded-2xl p-6 shadow-lg">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-base text-slate-900">
                    {generatedPdfBlob
                      ? 'PDF Generated Successfully!'
                      : isGenerating
                      ? 'Assembling PDF Document...'
                      : `Ready to assemble ${images.length} ${images.length === 1 ? 'page' : 'pages'} into PDF`}
                  </span>
                  {generatedPdfBlob && (
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      {formatBytes(generatedPdfBlob.size)}
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  {isGenerating
                    ? `Processing page ${generateProgress.current} of ${generateProgress.total}...`
                    : generatedPdfBlob
                    ? 'Your document is ready to download or preview directly in your browser.'
                    : '100% offline generation — zero data uploaded.'}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto justify-end">
                {generatedPdfBlob ? (
                  <>
                    <button
                      id="preview-pdf-btn"
                      type="button"
                      onClick={() =>
                        setPreviewModal({
                          isOpen: true,
                          title: settings.fileName,
                          pdfBlob: generatedPdfBlob,
                          downloadFilename: settings.fileName,
                          details: `${images.length} pages • ${formatBytes(generatedPdfBlob.size)}`,
                        })
                      }
                      className="inline-flex items-center gap-1.5 px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-semibold cursor-pointer transition-colors"
                    >
                      <Eye className="w-4 h-4" />
                      <span>Preview PDF</span>
                    </button>

                    <button
                      id="download-pdf-btn"
                      type="button"
                      onClick={handleDownloadPdf}
                      className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold shadow-md cursor-pointer transition-all"
                    >
                      <Download className="w-4 h-4" />
                      <span>Download PDF</span>
                    </button>
                  </>
                ) : (
                  <button
                    id="start-generate-btn"
                    type="button"
                    disabled={isGenerating || images.length === 0}
                    onClick={handleGeneratePdf}
                    className={`inline-flex items-center gap-2 px-8 py-3 rounded-xl text-sm font-bold shadow-lg shadow-blue-200 cursor-pointer transition-all ${
                      images.length === 0 || isGenerating
                        ? 'bg-slate-300 text-slate-500 shadow-none cursor-not-allowed'
                        : 'bg-blue-600 hover:bg-blue-700 text-white hover:scale-[1.01]'
                    }`}
                  >
                    {isGenerating ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Assembling ({generateProgress.current}/{generateProgress.total})</span>
                      </>
                    ) : (
                      <>
                        <span>Convert All Files</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>

            {/* Animated Progress Bar */}
            {isGenerating && (
              <div className="mt-4 w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-blue-600 h-full rounded-full transition-all duration-200"
                  style={{
                    width: `${(generateProgress.current / Math.max(1, generateProgress.total)) * 100}%`,
                  }}
                />
              </div>
            )}
          </div>

          {/* Preview Modal */}
          <PreviewModal
            isOpen={previewModal.isOpen}
            title={previewModal.title}
            imageSrc={previewModal.imageSrc}
            pdfBlob={previewModal.pdfBlob}
            downloadFilename={previewModal.downloadFilename}
            details={previewModal.details}
            onClose={() => setPreviewModal({ isOpen: false, title: '' })}
          />
        </div>
      )}
    </div>
  );
};
