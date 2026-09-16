import React, { useState } from 'react';
import { PDFDocument } from '@cantoo/pdf-lib';
import JSZip from 'jszip';
import {
  Scissors,
  Upload,
  CheckSquare,
  Square,
  Download,
  RotateCcw,
  Loader2,
  FileCheck,
  Archive,
  AlertCircle,
  FileText,
} from 'lucide-react';
import { loadPdfDocument } from '../utils/pdfToImage';
import { formatBytes, downloadBlob, getBaseFileName } from '../utils/fileHelpers';
import { PdfPageItem } from '../types';

export const SplitPdfView: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [pages, setPages] = useState<PdfPageItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState({ current: 0, total: 0 });
  const [rangeInput, setRangeInput] = useState('');
  const [splitMode, setSplitMode] = useState<'single' | 'individual'>('single');
  const [isProcessing, setIsProcessing] = useState(false);
  const [processProgress, setProcessProgress] = useState(0);
  const [resultBlob, setResultBlob] = useState<{ blob: Blob; filename: string; isZip: boolean } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleFileChange = async (selectedFile: File) => {
    setErrorMsg(null);
    setResultBlob(null);
    setFile(selectedFile);
    setIsLoading(true);

    try {
      const { initialPages } = await loadPdfDocument(selectedFile, (curr, total) => {
        setLoadingProgress({ current: curr, total });
      });
      setPages(initialPages);
      setRangeInput(`1-${initialPages.length}`);
    } catch (err) {
      console.error('Failed to load PDF:', err);
      setErrorMsg('Failed to load this PDF. The document might be password-protected or corrupted.');
      setFile(null);
      setPages([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Selection helpers
  const togglePage = (pageNumber: number) => {
    setPages((prev) =>
      prev.map((p) => (p.pageNumber === pageNumber ? { ...p, selected: !p.selected } : p))
    );
    setResultBlob(null);
  };

  const selectAll = () => {
    setPages((prev) => prev.map((p) => ({ ...p, selected: true })));
    setResultBlob(null);
  };

  const selectNone = () => {
    setPages((prev) => prev.map((p) => ({ ...p, selected: false })));
    setResultBlob(null);
  };

  const selectOdd = () => {
    setPages((prev) => prev.map((p) => ({ ...p, selected: p.pageNumber % 2 !== 0 })));
    setResultBlob(null);
  };

  const selectEven = () => {
    setPages((prev) => prev.map((p) => ({ ...p, selected: p.pageNumber % 2 === 0 })));
    setResultBlob(null);
  };

  // Parse page range string (e.g., "1-3, 5, 8")
  const applyRangeInput = (rangeStr: string) => {
    setRangeInput(rangeStr);
    const selectedSet = new Set<number>();
    const parts = rangeStr.split(',').map((s) => s.trim());

    for (const part of parts) {
      if (part.includes('-')) {
        const [startStr, endStr] = part.split('-').map((s) => s.trim());
        const start = parseInt(startStr, 10);
        const end = parseInt(endStr, 10);
        if (!isNaN(start) && !isNaN(end)) {
          const min = Math.max(1, Math.min(start, end));
          const max = Math.min(pages.length, Math.max(start, end));
          for (let i = min; i <= max; i++) {
            selectedSet.add(i);
          }
        }
      } else {
        const num = parseInt(part, 10);
        if (!isNaN(num) && num >= 1 && num <= pages.length) {
          selectedSet.add(num);
        }
      }
    }

    setPages((prev) => prev.map((p) => ({ ...p, selected: selectedSet.has(p.pageNumber) })));
    setResultBlob(null);
  };

  // Perform split
  const handleSplit = async () => {
    if (!file) return;
    const selectedPages = pages.filter((p) => p.selected);
    if (selectedPages.length === 0) {
      setErrorMsg('Please select at least one page to extract.');
      return;
    }

    setIsProcessing(true);
    setProcessProgress(10);
    setErrorMsg(null);

    try {
      const buffer = await file.arrayBuffer();
      const baseName = getBaseFileName(file.name);

      if (splitMode === 'single') {
        // Extract selected pages into one single PDF
        const sourcePdf = await PDFDocument.load(buffer);
        const targetPdf = await PDFDocument.create();

        const pageIndices = selectedPages.map((p) => p.pageNumber - 1);
        const copied = await targetPdf.copyPages(sourcePdf, pageIndices);
        copied.forEach((p) => targetPdf.addPage(p));

        setProcessProgress(80);
        const bytes = await targetPdf.save();
        const blob = new Blob([bytes], { type: 'application/pdf' });

        setResultBlob({
          blob,
          filename: `${baseName}_extracted_${selectedPages.length}pages.pdf`,
          isZip: false,
        });
      } else {
        // Extract each page as a separate PDF in a ZIP file
        const zip = new JSZip();
        const sourcePdf = await PDFDocument.load(buffer);

        for (let i = 0; i < selectedPages.length; i++) {
          const p = selectedPages[i];
          const singleDoc = await PDFDocument.create();
          const [copiedPage] = await singleDoc.copyPages(sourcePdf, [p.pageNumber - 1]);
          singleDoc.addPage(copiedPage);

          const bytes = await singleDoc.save();
          const padNum = String(p.pageNumber).padStart(String(pages.length).length, '0');
          zip.file(`${baseName}_page_${padNum}.pdf`, bytes);

          setProcessProgress(Math.round(15 + ((i + 1) / selectedPages.length) * 70));
        }

        const zipBlob = await zip.generateAsync({ type: 'blob' }, (metadata) => {
          setProcessProgress(85 + Math.round(metadata.percent * 0.15));
        });

        setResultBlob({
          blob: zipBlob,
          filename: `${baseName}_split_pages.zip`,
          isZip: true,
        });
      }

      setProcessProgress(100);
      setIsProcessing(false);
    } catch (err) {
      console.error('Split error:', err);
      setIsProcessing(false);
      setErrorMsg('An error occurred during extraction. Please try again.');
    }
  };

  const handleDownload = () => {
    if (!resultBlob) return;
    downloadBlob(resultBlob.blob, resultBlob.filename);
  };

  const selectedCount = pages.filter((p) => p.selected).length;

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <Scissors className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">Split & Extract PDF Pages</h3>
            <p className="text-xs text-slate-500">
              Select specific pages to extract into a new PDF or split all pages into separate files.
            </p>
          </div>
        </div>

        {file && (
          <div className="flex items-center gap-3">
            <div className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-600">
              Selected: <strong className="text-blue-600">{selectedCount}</strong> of{' '}
              <strong className="text-slate-900">{pages.length}</strong> pages
            </div>
            <button
              type="button"
              onClick={() => {
                setFile(null);
                setPages([]);
                setResultBlob(null);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-xl border border-slate-200 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Change PDF</span>
            </button>
          </div>
        )}
      </div>

      {errorMsg && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Empty Dropzone */}
      {!file ? (
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            if (e.dataTransfer.files?.[0]) handleFileChange(e.dataTransfer.files[0]);
          }}
          onClick={() => document.getElementById('split-file-input')?.click()}
          className="border-2 border-dashed border-slate-300 hover:border-blue-500 hover:bg-blue-50/20 transition-all rounded-3xl p-12 text-center flex flex-col items-center justify-center bg-white cursor-pointer"
        >
          <input
            id="split-file-input"
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
          <h4 className="text-base font-bold text-slate-800">Select PDF document to split</h4>
          <p className="text-xs text-slate-500 mt-1 max-w-sm">
            Drag and drop your PDF here or click to browse. Fully private and offline.
          </p>
          <button
            type="button"
            className="mt-6 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors pointer-events-none"
          >
            Select PDF File
          </button>
        </div>
      ) : isLoading ? (
        <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center space-y-4">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto" />
          <p className="text-sm font-semibold text-slate-800">
            Analyzing pages... ({loadingProgress.current} of {loadingProgress.total})
          </p>
        </div>
      ) : (
        /* Split Controls & Page Grid */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            {/* Quick Select Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={selectAll}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                >
                  All
                </button>
                <button
                  type="button"
                  onClick={selectOdd}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                >
                  Odd
                </button>
                <button
                  type="button"
                  onClick={selectEven}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                >
                  Even
                </button>
                <button
                  type="button"
                  onClick={selectNone}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                >
                  None
                </button>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 font-medium">Range:</span>
                <input
                  type="text"
                  value={rangeInput}
                  onChange={(e) => applyRangeInput(e.target.value)}
                  placeholder="e.g. 1-3, 5, 8"
                  className="w-36 px-2.5 py-1 text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg outline-none text-slate-800"
                />
              </div>
            </div>

            {/* Thumbnail Cards Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3.5 max-h-[580px] overflow-y-auto p-1">
              {pages.map((p) => (
                <div
                  key={p.pageNumber}
                  onClick={() => togglePage(p.pageNumber)}
                  className={`group relative rounded-xl border-2 p-2 bg-white transition-all cursor-pointer shadow-2xs hover:shadow-md ${
                    p.selected
                      ? 'border-blue-600 ring-2 ring-blue-100'
                      : 'border-slate-200 opacity-60 hover:opacity-100'
                  }`}
                >
                  <div className="aspect-[1/1.3] bg-slate-50 rounded-lg overflow-hidden flex items-center justify-center relative">
                    <img
                      src={p.thumbnailUrl}
                      alt={`Page ${p.pageNumber}`}
                      className="w-full h-full object-contain"
                    />
                    <div className="absolute top-1.5 right-1.5">
                      {p.selected ? (
                        <div className="w-5 h-5 bg-blue-600 text-white rounded-md flex items-center justify-center shadow-xs">
                          <CheckSquare className="w-3.5 h-3.5" />
                        </div>
                      ) : (
                        <div className="w-5 h-5 bg-white/90 text-slate-400 rounded-md flex items-center justify-center border border-slate-300">
                          <Square className="w-3.5 h-3.5" />
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-[11px] font-semibold text-slate-700">
                    <span>Page {p.pageNumber}</span>
                    <span className="text-[10px] text-slate-400">
                      {p.width} × {p.height}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Action Card */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs h-fit space-y-5">
            <h4 className="text-sm font-bold text-slate-900">Extraction Options</h4>

            <div className="space-y-2">
              <label
                onClick={() => setSplitMode('single')}
                className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                  splitMode === 'single'
                    ? 'border-blue-600 bg-blue-50/40 text-blue-950 font-medium'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <input
                  type="radio"
                  name="split-mode"
                  checked={splitMode === 'single'}
                  onChange={() => setSplitMode('single')}
                  className="mt-0.5 text-blue-600"
                />
                <div className="text-xs">
                  <span className="font-bold block">One Single PDF</span>
                  <span className="text-slate-500 text-[11px]">
                    Merge all selected pages into one new PDF document.
                  </span>
                </div>
              </label>

              <label
                onClick={() => setSplitMode('individual')}
                className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                  splitMode === 'individual'
                    ? 'border-blue-600 bg-blue-50/40 text-blue-950 font-medium'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <input
                  type="radio"
                  name="split-mode"
                  checked={splitMode === 'individual'}
                  onChange={() => setSplitMode('individual')}
                  className="mt-0.5 text-blue-600"
                />
                <div className="text-xs">
                  <span className="font-bold block">Individual PDFs (ZIP)</span>
                  <span className="text-slate-500 text-[11px]">
                    Save each selected page as a separate PDF, bundled into a ZIP.
                  </span>
                </div>
              </label>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 space-y-2 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Original File:</span>
                <strong className="text-slate-900 truncate max-w-[150px]">{file.name}</strong>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Pages to Extract:</span>
                <strong className="text-blue-600">{selectedCount} pages</strong>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Original Size:</span>
                <strong className="text-slate-900">{formatBytes(file.size)}</strong>
              </div>
            </div>

            {isProcessing && (
              <div className="space-y-2">
                <div className="flex justify-between text-xs text-slate-600">
                  <span>Extracting pages...</span>
                  <span className="font-bold">{processProgress}%</span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-600 transition-all duration-300 rounded-full"
                    style={{ width: `${processProgress}%` }}
                  />
                </div>
              </div>
            )}

            {resultBlob ? (
              <div className="space-y-2">
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-xs text-emerald-800 font-semibold">
                  <FileCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Ready! ({formatBytes(resultBlob.blob.size)})</span>
                </div>
                <button
                  type="button"
                  onClick={handleDownload}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-sm transition-colors cursor-pointer"
                >
                  {resultBlob.isZip ? <Archive className="w-4 h-4" /> : <Download className="w-4 h-4" />}
                  <span>Download {resultBlob.isZip ? 'ZIP Archive' : 'Extracted PDF'}</span>
                </button>
              </div>
            ) : (
              <button
                type="button"
                disabled={isProcessing || selectedCount === 0}
                onClick={handleSplit}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:hover:bg-blue-600 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Extracting...</span>
                  </>
                ) : (
                  <>
                    <Scissors className="w-4 h-4" />
                    <span>Extract {selectedCount} Pages</span>
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
