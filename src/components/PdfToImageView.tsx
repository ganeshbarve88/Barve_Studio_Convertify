import React, { useState, useEffect } from 'react';
import {
  FileText,
  Sliders,
  CheckSquare,
  Square,
  Download,
  Eye,
  RefreshCw,
  Archive,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import { Dropzone } from './Dropzone';
import { PreviewModal } from './PreviewModal';
import {
  ImageFormat,
  PdfPageItem,
  PdfToImageSettings,
} from '../types';
import {
  loadPdfDocument,
  renderPdfPageToBlob,
  buildImagesZip,
} from '../utils/pdfToImage';
import {
  formatBytes,
  downloadBlob,
  getBaseFileName,
} from '../utils/fileHelpers';
import { createSamplePdf } from '../utils/sampleFiles';

export const PdfToImageView: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [pages, setPages] = useState<PdfPageItem[]>([]);
  const [isLoadingDoc, setIsLoadingDoc] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState({ current: 0, total: 0 });
  const [loadError, setLoadError] = useState<string | null>(null);

  // Conversion settings
  const [settings, setSettings] = useState<PdfToImageSettings>({
    format: 'png',
    quality: 0.92,
    scale: 2, // 2x gives crisp text
    backgroundColor: 'white',
  });

  // Range input state
  const [rangeInput, setRangeInput] = useState('');

  // Conversion process state
  const [isConverting, setIsConverting] = useState(false);
  const [convertProgress, setConvertProgress] = useState({ current: 0, total: 0 });
  const [isDone, setIsDone] = useState(false);
  const [zipBlob, setZipBlob] = useState<Blob | null>(null);
  const [isCreatingZip, setIsCreatingZip] = useState(false);

  // Preview Modal state
  const [previewModal, setPreviewModal] = useState<{
    isOpen: boolean;
    title: string;
    imageSrc?: string;
    details?: string;
  }>({
    isOpen: false,
    title: '',
  });

  // Clean up Object URLs on unmount or file reset
  useEffect(() => {
    return () => {
      pages.forEach((p) => {
        if (p.renderedUrl) URL.revokeObjectURL(p.renderedUrl);
      });
    };
  }, [pages]);

  const handlePdfSelected = async (selectedFiles: File[]) => {
    if (selectedFiles.length === 0) return;
    const selectedFile = selectedFiles[0];

    // Reset previous state
    pages.forEach((p) => {
      if (p.renderedUrl) URL.revokeObjectURL(p.renderedUrl);
    });
    setFile(selectedFile);
    setPdfDoc(null);
    setPages([]);
    setIsDone(false);
    setZipBlob(null);
    setLoadError(null);
    setIsLoadingDoc(true);

    try {
      const { pdfDoc: doc, initialPages } = await loadPdfDocument(
        selectedFile,
        (current, total) => {
          setLoadingProgress({ current, total });
        }
      );
      setPdfDoc(doc);
      setPages(initialPages);
    } catch (err: any) {
      console.error('Failed to load PDF:', err);
      setLoadError(
        err.message || 'Could not parse this PDF file. It might be corrupted or password-protected.'
      );
    } finally {
      setIsLoadingDoc(false);
    }
  };

  const handleToggleSelectPage = (pageNumber: number) => {
    setPages((prev) =>
      prev.map((p) =>
        p.pageNumber === pageNumber ? { ...p, selected: !p.selected } : p
      )
    );
  };

  const handleSelectAll = (select: boolean) => {
    setPages((prev) => prev.map((p) => ({ ...p, selected: select })));
  };

  const handleApplyRange = () => {
    if (!rangeInput.trim()) return;
    const selectedSet = new Set<number>();
    const parts = rangeInput.split(',');

    for (const part of parts) {
      const trimmed = part.trim();
      if (trimmed.includes('-')) {
        const [startStr, endStr] = trimmed.split('-');
        const start = parseInt(startStr, 10);
        const end = parseInt(endStr, 10);
        if (!isNaN(start) && !isNaN(end)) {
          for (let i = Math.min(start, end); i <= Math.max(start, end); i++) {
            if (i >= 1 && i <= pages.length) selectedSet.add(i);
          }
        }
      } else {
        const num = parseInt(trimmed, 10);
        if (!isNaN(num) && num >= 1 && num <= pages.length) {
          selectedSet.add(num);
        }
      }
    }

    if (selectedSet.size > 0) {
      setPages((prev) =>
        prev.map((p) => ({ ...p, selected: selectedSet.has(p.pageNumber) }))
      );
    }
  };

  const handleConvert = async () => {
    if (!pdfDoc || pages.length === 0) return;
    const selectedPages = pages.filter((p) => p.selected);
    if (selectedPages.length === 0) return;

    setIsConverting(true);
    setConvertProgress({ current: 0, total: selectedPages.length });
    setIsDone(false);
    setZipBlob(null);

    const convertedResults: { pageNumber: number; blob: Blob; url: string }[] = [];

    try {
      for (let i = 0; i < selectedPages.length; i++) {
        const pageItem = selectedPages[i];
        setConvertProgress({ current: i + 1, total: selectedPages.length });

        const { blob } = await renderPdfPageToBlob(
          pdfDoc,
          pageItem.pageNumber,
          settings
        );

        const url = URL.createObjectURL(blob);
        convertedResults.push({
          pageNumber: pageItem.pageNumber,
          blob,
          url,
        });

        // Update individual page in state
        setPages((prev) =>
          prev.map((p) =>
            p.pageNumber === pageItem.pageNumber
              ? { ...p, renderedBlob: blob, renderedUrl: url }
              : p
          )
        );
      }

      // Automatically prepare ZIP for 1-click download of all pages
      if (convertedResults.length > 1) {
        setIsCreatingZip(true);
        const baseName = file ? getBaseFileName(file.name) : 'converted_images';
        const zip = await buildImagesZip(convertedResults, baseName, settings.format);
        setZipBlob(zip);
        setIsCreatingZip(false);
      }

      setIsDone(true);
    } catch (err: any) {
      console.error('Error during conversion:', err);
      alert('Conversion failed: ' + (err.message || 'Unknown error'));
    } finally {
      setIsConverting(false);
    }
  };

  const handleDownloadSingle = (page: PdfPageItem) => {
    if (!page.renderedBlob || !file) return;
    const baseName = getBaseFileName(file.name);
    const filename = `${baseName}_page_${String(page.pageNumber).padStart(3, '0')}.${settings.format}`;
    downloadBlob(page.renderedBlob, filename);
  };

  const handleDownloadZip = () => {
    if (!zipBlob || !file) return;
    const baseName = getBaseFileName(file.name);
    downloadBlob(zipBlob, `${baseName}_images.zip`);
  };

  const selectedCount = pages.filter((p) => p.selected).length;

  return (
    <div className="space-y-6">
      {!file ? (
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-slate-900">
              Convert PDF to Images Offline
            </h2>
            <p className="text-sm text-slate-600 mt-1 max-w-lg mx-auto">
              Extract every page or specific ranges into crisp PNG, high-efficiency JPEG,
              or modern WebP images right in your browser.
            </p>
          </div>

          <Dropzone
            id="pdf-dropzone"
            accept=".pdf,application/pdf"
            title="Select or Drop a PDF File"
            subtitle="All pages will be rendered client-side with full privacy"
            supportedText="PDF documents (.pdf)"
            icon={<FileText className="w-8 h-8 text-rose-600" />}
            onFilesSelected={handlePdfSelected}
            onLoadSample={() => handlePdfSelected([createSamplePdf()])}
            sampleLabel="Try with Sample PDF (3 Pages)"
          />
        </div>
      ) : (
        <div className="space-y-6">
          {/* File Header Bar */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4 min-w-0">
              <div className="w-12 h-14 bg-red-50 text-red-600 rounded-xl flex items-center justify-center font-bold text-xs border border-red-100 uppercase shrink-0">
                PDF
              </div>
              <div className="min-w-0">
                <h3 className="font-semibold text-slate-800 truncate text-base">
                  {file.name}
                </h3>
                <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                  <span>{formatBytes(file.size)}</span>
                  <span>•</span>
                  <span>{pages.length} {pages.length === 1 ? 'Page' : 'Pages'}</span>
                  <span>•</span>
                  <span className="text-emerald-600 font-semibold">Offline Ready</span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setFile(null);
                setPdfDoc(null);
                setPages([]);
              }}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer shrink-0"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Choose Another PDF</span>
            </button>
          </div>

          {loadError && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-3 text-sm text-rose-700">
              <AlertCircle className="w-5 h-5 shrink-0 text-rose-600" />
              <div>
                <p className="font-semibold">Unable to load document</p>
                <p className="text-xs text-rose-600 mt-0.5">{loadError}</p>
              </div>
            </div>
          )}

          {isLoadingDoc && (
            <div className="bg-white rounded-2xl p-12 border border-slate-200 text-center shadow-sm">
              <div className="w-10 h-10 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <h4 className="text-base font-bold text-slate-900 mb-1">
                Reading PDF & Generating Previews
              </h4>
              <p className="text-xs text-slate-500">
                Processing page {loadingProgress.current} of {loadingProgress.total}...
              </p>
            </div>
          )}

          {!isLoadingDoc && pages.length > 0 && (
            <>
              {/* Settings Configuration Card */}
              <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                  <Sliders className="w-4 h-4 text-blue-600" />
                  <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Conversion Settings</h4>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Format Selector */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Image Format
                    </label>
                    <div className="grid grid-cols-3 gap-1 bg-slate-100 p-1 rounded-xl">
                      {(['png', 'jpeg', 'webp'] as ImageFormat[]).map((fmt) => (
                        <button
                          key={fmt}
                          type="button"
                          onClick={() => setSettings((s) => ({ ...s, format: fmt }))}
                          className={`py-2 text-xs font-bold uppercase rounded-lg transition-all cursor-pointer ${
                            settings.format === fmt
                              ? 'bg-white text-blue-600 shadow-sm'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          {fmt}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Resolution / Scale */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Resolution / DPI
                    </label>
                    <select
                      value={settings.scale}
                      onChange={(e) =>
                        setSettings((s) => ({ ...s, scale: parseFloat(e.target.value) }))
                      }
                      className="w-full bg-white border border-slate-200 rounded-lg px-4 py-2 text-sm font-medium shadow-sm outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                    >
                      <option value={1}>72 DPI (Standard)</option>
                      <option value={1.5}>150 DPI (Web Balanced)</option>
                      <option value={2}>200 DPI (High-Res Crisp)</option>
                      <option value={3}>300 DPI (Print Quality)</option>
                    </select>
                  </div>

                  {/* Quality Slider (for JPEG / WebP) */}
                  {settings.format !== 'png' ? (
                    <div>
                      <div className="flex justify-between items-center mb-1.5">
                        <label className="text-xs font-semibold text-slate-700">
                          Quality: {Math.round(settings.quality * 100)}%
                        </label>
                        <span className="text-[10px] text-slate-400">
                          {settings.quality > 0.85 ? 'High' : 'Compact'}
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0.2"
                        max="1"
                        step="0.05"
                        value={settings.quality}
                        onChange={(e) =>
                          setSettings((s) => ({
                            ...s,
                            quality: parseFloat(e.target.value),
                          }))
                        }
                        className="w-full accent-blue-600 h-2 bg-slate-100 rounded-lg cursor-pointer"
                      />
                    </div>
                  ) : (
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                        Background
                      </label>
                      <select
                        value={settings.backgroundColor}
                        onChange={(e) =>
                          setSettings((s) => ({
                            ...s,
                            backgroundColor: e.target.value as 'white' | 'transparent',
                          }))
                        }
                        className="w-full bg-white border border-slate-200 rounded-lg px-4 py-2 text-sm font-medium shadow-sm outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                      >
                        <option value="white">White Background</option>
                        <option value="transparent">Transparent Background</option>
                      </select>
                    </div>
                  )}

                  {/* Output Preview Tag */}
                  <div className="flex flex-col justify-end">
                    <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 text-xs text-slate-600">
                      <span className="font-semibold text-slate-800">
                        {settings.format.toUpperCase()}
                      </span>{' '}
                      •{' '}
                      <span className="font-semibold text-slate-800">
                        {settings.scale}×
                      </span>{' '}
                      (~
                      {Math.round(
                        (pages[0]?.width || 600) * settings.scale
                      )}{' '}
                      ×{' '}
                      {Math.round(
                        (pages[0]?.height || 800) * settings.scale
                      )}{' '}
                      px)
                    </div>
                  </div>
                </div>
              </div>

              {/* Page Selection Toolbar */}
              <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleSelectAll(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-100 border border-slate-200 cursor-pointer transition-colors"
                  >
                    <CheckSquare className="w-3.5 h-3.5 text-blue-600" />
                    <span>Select All</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSelectAll(false)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-100 border border-slate-200 cursor-pointer transition-colors"
                  >
                    <Square className="w-3.5 h-3.5 text-slate-400" />
                    <span>Deselect All</span>
                  </button>

                  <span className="text-xs font-medium text-slate-600 ml-2">
                    <strong className="text-blue-600 font-bold">{selectedCount}</strong>{' '}
                    of {pages.length} selected
                  </span>
                </div>

                {/* Range Input Filter */}
                <div className="flex items-center gap-2">
                  <label htmlFor="range-input" className="text-xs font-medium text-slate-600 hidden sm:inline">
                    Range:
                  </label>
                  <input
                    id="range-input"
                    type="text"
                    placeholder="e.g. 1-2, 3"
                    value={rangeInput}
                    onChange={(e) => setRangeInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleApplyRange();
                    }}
                    className="w-28 sm:w-36 bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-800 shadow-sm outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={handleApplyRange}
                    className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer transition-colors"
                  >
                    Apply
                  </button>
                </div>
              </div>

              {/* Pages Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {pages.map((page) => (
                  <div
                    key={page.pageNumber}
                    onClick={() => handleToggleSelectPage(page.pageNumber)}
                    className={`relative rounded-2xl border-2 transition-all cursor-pointer overflow-hidden bg-white shadow-sm group ${
                      page.selected
                        ? 'border-blue-600 ring-2 ring-blue-500/20'
                        : 'border-slate-200 opacity-65 hover:opacity-100'
                    }`}
                  >
                    {/* Top Badges */}
                    <div className="absolute top-2 left-2 z-10">
                      <span
                        className={`w-5 h-5 rounded-md flex items-center justify-center transition-colors ${
                          page.selected
                            ? 'bg-blue-600 text-white'
                            : 'bg-white/90 border border-slate-300 text-transparent'
                        }`}
                      >
                        ✓
                      </span>
                    </div>

                    <div className="absolute top-2 right-2 z-10">
                      <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-slate-900/80 text-white backdrop-blur-xs">
                        #{page.pageNumber}
                      </span>
                    </div>

                    {/* Thumbnail */}
                    <div className="aspect-3/4 w-full bg-slate-50 flex items-center justify-center p-2">
                      <img
                        src={page.renderedUrl || page.thumbnailUrl}
                        alt={`Page ${page.pageNumber}`}
                        referrerPolicy="no-referrer"
                        className="max-h-full max-w-full object-contain shadow-xs rounded"
                      />
                    </div>

                    {/* Card Footer */}
                    <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs">
                      <span className="text-[11px] text-slate-500">
                        {Math.round(page.width * settings.scale)} × {Math.round(page.height * settings.scale)}
                      </span>

                      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() =>
                            setPreviewModal({
                              isOpen: true,
                              title: `Page ${page.pageNumber} Preview`,
                              imageSrc: page.renderedUrl || page.thumbnailUrl,
                              details: `${page.width} × ${page.height} pt`,
                            })
                          }
                          title="Preview Full Size"
                          className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-200/70 cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>

                        {page.renderedBlob && (
                          <button
                            type="button"
                            onClick={() => handleDownloadSingle(page)}
                            title="Download this page image"
                            className="p-1 rounded text-emerald-600 hover:bg-emerald-50 cursor-pointer"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Conversion Action Bar */}
              <div className="sticky bottom-4 z-20 bg-white border border-slate-200 rounded-2xl p-6 shadow-lg">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-base text-slate-900">
                        {isDone
                          ? 'Conversion Complete!'
                          : isConverting
                          ? 'Rendering High-Resolution Images...'
                          : `Ready for conversion (${selectedCount} ${selectedCount === 1 ? 'page' : 'pages'})`}
                      </span>
                      {isDone && (
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          {settings.format.toUpperCase()}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      {isConverting
                        ? `Processing page ${convertProgress.current} of ${convertProgress.total}...`
                        : isDone
                        ? 'Your converted files are ready to download individually or bundled as a ZIP archive.'
                        : 'Local processing in your browser ensures instant, confidential conversion.'}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto justify-end">
                    {isDone ? (
                      <>
                        {zipBlob && (
                          <button
                            id="download-zip-btn"
                            type="button"
                            onClick={handleDownloadZip}
                            className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold shadow-md cursor-pointer transition-all"
                          >
                            <Archive className="w-4 h-4" />
                            <span>Download All as ZIP ({formatBytes(zipBlob.size)})</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => {
                            setIsDone(false);
                            setZipBlob(null);
                          }}
                          className="inline-flex items-center gap-1.5 px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-semibold cursor-pointer transition-colors"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          <span>Re-render</span>
                        </button>
                      </>
                    ) : (
                      <button
                        id="start-convert-btn"
                        type="button"
                        disabled={isConverting || selectedCount === 0}
                        onClick={handleConvert}
                        className={`inline-flex items-center gap-2 px-8 py-3 rounded-xl text-sm font-bold shadow-lg shadow-blue-200 cursor-pointer transition-all ${
                          selectedCount === 0 || isConverting
                            ? 'bg-slate-300 text-slate-500 shadow-none cursor-not-allowed'
                            : 'bg-blue-600 hover:bg-blue-700 text-white hover:scale-[1.01]'
                        }`}
                      >
                        {isConverting ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            <span>Converting ({convertProgress.current}/{convertProgress.total})</span>
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
                {isConverting && (
                  <div className="mt-4 w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-blue-600 h-full rounded-full transition-all duration-200"
                      style={{
                        width: `${(convertProgress.current / Math.max(1, convertProgress.total)) * 100}%`,
                      }}
                    />
                  </div>
                )}
              </div>
            </>
          )}

          {/* Preview Lightbox Modal */}
          <PreviewModal
            isOpen={previewModal.isOpen}
            title={previewModal.title}
            imageSrc={previewModal.imageSrc}
            details={previewModal.details}
            onClose={() => setPreviewModal({ isOpen: false, title: '' })}
          />
        </div>
      )}
    </div>
  );
};
