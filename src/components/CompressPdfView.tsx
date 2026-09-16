import React, { useState } from 'react';
import { jsPDF } from 'jspdf';
import {
  FileDown,
  Upload,
  Zap,
  CheckCircle2,
  Sparkles,
  Download,
  RotateCcw,
  Loader2,
  AlertCircle,
  TrendingDown,
} from 'lucide-react';
import { pdfjsLib } from '../utils/pdfHelper';
import { formatBytes, downloadBlob, getBaseFileName } from '../utils/fileHelpers';

type CompressionPreset = 'extreme' | 'recommended' | 'light';

export const CompressPdfView: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState<number>(0);
  const [preset, setPreset] = useState<CompressionPreset>('recommended');
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressText, setProgressText] = useState('');
  const [compressedBlob, setCompressedBlob] = useState<Blob | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleFileChange = async (selectedFile: File) => {
    setErrorMsg(null);
    setCompressedBlob(null);
    setFile(selectedFile);
    setIsProcessing(true);
    setProgressText('Inspecting document...');

    try {
      const buffer = await selectedFile.arrayBuffer();
      const loadingTask = pdfjsLib.getDocument({
        data: new Uint8Array(buffer),
      });
      const doc = await loadingTask.promise;
      setPageCount(doc.numPages);
    } catch (err) {
      console.error('Error loading PDF for compression:', err);
      setErrorMsg('Could not read PDF. It might be password-protected or corrupted.');
      setFile(null);
    } finally {
      setIsProcessing(false);
      setProgressText('');
    }
  };

  const handleCompress = async () => {
    if (!file || pageCount === 0) return;

    setIsProcessing(true);
    setProgress(5);
    setProgressText('Preparing PDF compression engine...');
    setErrorMsg(null);

    try {
      const buffer = await file.arrayBuffer();
      const loadingTask = pdfjsLib.getDocument({
        data: new Uint8Array(buffer),
        cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@6.3.289/cmaps/',
        cMapPacked: true,
      });
      const pdfDoc = await loadingTask.promise;

      // Settings based on preset
      const settings = {
        extreme: { scale: 1.0, quality: 0.5 },
        recommended: { scale: 1.35, quality: 0.7 },
        light: { scale: 1.75, quality: 0.85 },
      }[preset];

      let pdf: jsPDF | null = null;

      for (let i = 1; i <= pageCount; i++) {
        const pct = Math.round(10 + ((i - 1) / pageCount) * 80);
        setProgress(pct);
        setProgressText(`Compressing page ${i} of ${pageCount}...`);

        const page = await pdfDoc.getPage(i);
        const unscaledViewport = page.getViewport({ scale: 1 });
        const viewport = page.getViewport({ scale: settings.scale });

        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext('2d');

        if (ctx) {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          await (page.render as any)({
            canvasContext: ctx,
            viewport,
            canvas,
          }).promise;
        }

        const imgData = canvas.toDataURL('image/jpeg', settings.quality);

        const widthPt = unscaledViewport.width;
        const heightPt = unscaledViewport.height;
        const orientation = widthPt > heightPt ? 'landscape' : 'portrait';

        if (i === 1) {
          pdf = new jsPDF({
            orientation,
            unit: 'pt',
            format: [widthPt, heightPt],
            compress: true,
          });
          pdf.addImage(imgData, 'JPEG', 0, 0, widthPt, heightPt, undefined, 'FAST');
        } else if (pdf) {
          pdf.addPage([widthPt, heightPt], orientation);
          pdf.addImage(imgData, 'JPEG', 0, 0, widthPt, heightPt, undefined, 'FAST');
        }
      }

      setProgress(95);
      setProgressText('Packaging compressed PDF...');
      if (pdf) {
        const outBlob = pdf.output('blob');
        setCompressedBlob(outBlob);
      }
      setProgress(100);
      setIsProcessing(false);
    } catch (err) {
      console.error('Compression error:', err);
      setIsProcessing(false);
      setErrorMsg('An error occurred during compression. Please try again.');
    }
  };

  const handleDownload = () => {
    if (!compressedBlob || !file) return;
    const base = getBaseFileName(file.name);
    downloadBlob(compressedBlob, `${base}_compressed.pdf`);
  };

  const reductionPercent =
    file && compressedBlob
      ? Math.max(0, Math.round(((file.size - compressedBlob.size) / file.size) * 100))
      : 0;

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <FileDown className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">Compress PDF</h3>
            <p className="text-xs text-slate-500">
              Reduce PDF file size without sacrificing visual clarity, completely offline.
            </p>
          </div>
        </div>

        {file && (
          <button
            type="button"
            onClick={() => {
              setFile(null);
              setCompressedBlob(null);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-red-50 text-slate-600 hover:text-red-600 border border-slate-200 text-xs font-semibold transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Change File</span>
          </button>
        )}
      </div>

      {errorMsg && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Empty State */}
      {!file ? (
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            if (e.dataTransfer.files?.[0]) handleFileChange(e.dataTransfer.files[0]);
          }}
          onClick={() => document.getElementById('compress-file-input')?.click()}
          className="border-2 border-dashed border-slate-300 hover:border-blue-500 hover:bg-blue-50/20 transition-all rounded-3xl p-12 text-center flex flex-col items-center justify-center bg-white cursor-pointer"
        >
          <input
            id="compress-file-input"
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={(e) => {
              if (e.target.files?.[0]) handleFileChange(e.target.files[0]);
            }}
          />
          <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4 shadow-xs">
            <Upload className="w-8 h-8" />
          </div>
          <h4 className="text-base font-bold text-slate-800">Select PDF document to compress</h4>
          <p className="text-xs text-slate-500 mt-1 max-w-sm">
            Drag and drop your PDF here or click to browse. Files are processed locally on your device.
          </p>
          <button
            type="button"
            className="mt-6 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors pointer-events-none"
          >
            Select PDF File
          </button>
        </div>
      ) : (
        /* Compression Settings & Actions */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <h4 className="text-sm font-bold text-slate-900">Select Compression Level</h4>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Extreme */}
                <div
                  onClick={() => {
                    setPreset('extreme');
                    setCompressedBlob(null);
                  }}
                  className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    preset === 'extreme'
                      ? 'border-blue-600 bg-blue-50/40 shadow-xs'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900">Extreme</span>
                    <Zap className="w-4 h-4 text-amber-500" />
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1.5 leading-relaxed">
                    Maximum file size reduction. Ideal for strict email & form attachment limits.
                  </p>
                  <span className="inline-block mt-3 text-[10px] font-bold text-blue-700 bg-blue-100/60 px-2 py-0.5 rounded-md">
                    ~70-80% Smaller
                  </span>
                </div>

                {/* Recommended */}
                <div
                  onClick={() => {
                    setPreset('recommended');
                    setCompressedBlob(null);
                  }}
                  className={`p-4 rounded-xl border-2 cursor-pointer transition-all relative ${
                    preset === 'recommended'
                      ? 'border-blue-600 bg-blue-50/40 shadow-xs'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <span className="absolute -top-2.5 right-3 text-[9px] font-bold uppercase tracking-wider bg-blue-600 text-white px-2 py-0.5 rounded-full shadow-xs">
                    Recommended
                  </span>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900">Balanced</span>
                    <Sparkles className="w-4 h-4 text-blue-600" />
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1.5 leading-relaxed">
                    Optimal balance between crisp visual text clarity and compact file size.
                  </p>
                  <span className="inline-block mt-3 text-[10px] font-bold text-blue-700 bg-blue-100/60 px-2 py-0.5 rounded-md">
                    ~50-65% Smaller
                  </span>
                </div>

                {/* Light */}
                <div
                  onClick={() => {
                    setPreset('light');
                    setCompressedBlob(null);
                  }}
                  className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    preset === 'light'
                      ? 'border-blue-600 bg-blue-50/40 shadow-xs'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900">Light</span>
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1.5 leading-relaxed">
                    High visual fidelity. Preserves fine details for sharp professional printing.
                  </p>
                  <span className="inline-block mt-3 text-[10px] font-bold text-blue-700 bg-blue-100/60 px-2 py-0.5 rounded-md">
                    ~25-40% Smaller
                  </span>
                </div>
              </div>
            </div>

            {/* Results Comparison Card */}
            {compressedBlob && (
              <div className="bg-emerald-50/70 border border-emerald-200 p-6 rounded-2xl space-y-4">
                <div className="flex items-center gap-2 text-emerald-800 font-bold text-sm">
                  <TrendingDown className="w-5 h-5 text-emerald-600" />
                  <span>Compression Complete! Reduced by {reductionPercent}%</span>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white/80 p-3 rounded-xl border border-emerald-100">
                    <span className="text-[11px] text-slate-500 block">Original Size</span>
                    <strong className="text-sm text-slate-900">{formatBytes(file.size)}</strong>
                  </div>
                  <div className="bg-white/80 p-3 rounded-xl border border-emerald-100">
                    <span className="text-[11px] text-emerald-700 block font-semibold">New Size</span>
                    <strong className="text-sm text-emerald-800 font-bold">
                      {formatBytes(compressedBlob.size)}
                    </strong>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Action Card */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs h-fit space-y-5">
            <h4 className="text-sm font-bold text-slate-900">File Summary</h4>

            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 space-y-2 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>File Name:</span>
                <strong className="text-slate-900 truncate max-w-[150px]">{file.name}</strong>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Total Pages:</span>
                <strong className="text-slate-900">{pageCount}</strong>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Current Size:</span>
                <strong className="text-slate-900">{formatBytes(file.size)}</strong>
              </div>
            </div>

            {isProcessing && (
              <div className="space-y-2">
                <div className="flex justify-between text-xs text-slate-600">
                  <span>{progressText}</span>
                  <span className="font-bold">{progress}%</span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-600 transition-all duration-300 rounded-full"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}

            {compressedBlob ? (
              <button
                type="button"
                onClick={handleDownload}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-sm transition-colors cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Download Compressed PDF</span>
              </button>
            ) : (
              <button
                type="button"
                disabled={isProcessing}
                onClick={handleCompress}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Compressing...</span>
                  </>
                ) : (
                  <>
                    <FileDown className="w-4 h-4" />
                    <span>Compress PDF</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
