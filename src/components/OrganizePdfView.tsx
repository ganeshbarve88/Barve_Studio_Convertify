import React, { useState } from 'react';
import { PDFDocument, degrees } from '@cantoo/pdf-lib';
import {
  LayoutGrid,
  Upload,
  RotateCw,
  RotateCcw,
  ArrowLeft,
  ArrowRight,
  Trash2,
  Copy,
  Download,
  FileCheck,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { loadPdfDocument } from '../utils/pdfToImage';
import { formatBytes, downloadBlob, getBaseFileName } from '../utils/fileHelpers';

interface OrganizePageItem {
  id: string;
  originalPageNumber: number;
  thumbnailUrl: string;
  rotation: number; // 0, 90, 180, 270
  width: number;
  height: number;
}

export const OrganizePdfView: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [pages, setPages] = useState<OrganizePageItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [resultBlob, setResultBlob] = useState<Blob | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleFileChange = async (selectedFile: File) => {
    setErrorMsg(null);
    setResultBlob(null);
    setFile(selectedFile);
    setIsLoading(true);

    try {
      const { initialPages } = await loadPdfDocument(selectedFile);
      setPages(
        initialPages.map((p) => ({
          id: `p-${p.pageNumber}-${Date.now()}-${Math.random()}`,
          originalPageNumber: p.pageNumber,
          thumbnailUrl: p.thumbnailUrl,
          rotation: 0,
          width: p.width,
          height: p.height,
        }))
      );
    } catch (err) {
      console.error('Failed to load PDF for organize:', err);
      setErrorMsg('Failed to load PDF. It might be password-protected or corrupted.');
      setFile(null);
    } finally {
      setIsLoading(false);
    }
  };

  // Reordering
  const movePage = (index: number, direction: 'left' | 'right') => {
    setPages((prev) => {
      const targetIndex = direction === 'left' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= prev.length) return prev;
      const next = [...prev];
      const temp = next[index];
      next[index] = next[targetIndex];
      next[targetIndex] = temp;
      return next;
    });
    setResultBlob(null);
  };

  // Rotation
  const rotatePage = (index: number) => {
    setPages((prev) => {
      const next = [...prev];
      next[index] = {
        ...next[index],
        rotation: (next[index].rotation + 90) % 360,
      };
      return next;
    });
    setResultBlob(null);
  };

  const rotateAll = () => {
    setPages((prev) =>
      prev.map((p) => ({
        ...p,
        rotation: (p.rotation + 90) % 360,
      }))
    );
    setResultBlob(null);
  };

  // Duplicate
  const duplicatePage = (index: number) => {
    setPages((prev) => {
      const next = [...prev];
      const copy: OrganizePageItem = {
        ...next[index],
        id: `copy-${Date.now()}-${Math.random()}`,
      };
      next.splice(index + 1, 0, copy);
      return next;
    });
    setResultBlob(null);
  };

  // Delete
  const deletePage = (index: number) => {
    if (pages.length <= 1) {
      setErrorMsg('A PDF must have at least 1 page.');
      return;
    }
    setPages((prev) => prev.filter((_, i) => i !== index));
    setResultBlob(null);
  };

  // Save changes
  const handleSave = async () => {
    if (!file || pages.length === 0) return;
    setIsProcessing(true);
    setErrorMsg(null);

    try {
      const buffer = await file.arrayBuffer();
      const sourcePdf = await PDFDocument.load(buffer);
      const targetPdf = await PDFDocument.create();

      for (let i = 0; i < pages.length; i++) {
        const item = pages[i];
        const [copiedPage] = await targetPdf.copyPages(sourcePdf, [item.originalPageNumber - 1]);

        if (item.rotation !== 0) {
          const existingRotation = copiedPage.getRotation().angle;
          copiedPage.setRotation(degrees((existingRotation + item.rotation) % 360));
        }

        targetPdf.addPage(copiedPage);
      }

      const bytes = await targetPdf.save();
      const blob = new Blob([bytes], { type: 'application/pdf' });
      setResultBlob(blob);
      setIsProcessing(false);
    } catch (err) {
      console.error('Error organizing PDF:', err);
      setIsProcessing(false);
      setErrorMsg('Failed to save organized PDF. Please try again.');
    }
  };

  const handleDownload = () => {
    if (!resultBlob || !file) return;
    const base = getBaseFileName(file.name);
    downloadBlob(resultBlob, `${base}_organized.pdf`);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <LayoutGrid className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">Organize PDF Pages</h3>
            <p className="text-xs text-slate-500">
              Reorder, rotate, duplicate, or delete pages with full drag-and-drop ease.
            </p>
          </div>
        </div>

        {file && (
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={rotateAll}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
            >
              <RotateCw className="w-3.5 h-3.5 text-blue-600" />
              <span>Rotate All 90°</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setFile(null);
                setPages([]);
                setResultBlob(null);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-red-50 text-slate-600 hover:text-red-600 border border-slate-200 text-xs font-semibold transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Change File</span>
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

      {/* Empty State */}
      {!file ? (
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            if (e.dataTransfer.files?.[0]) handleFileChange(e.dataTransfer.files[0]);
          }}
          onClick={() => document.getElementById('organize-file-input')?.click()}
          className="border-2 border-dashed border-slate-300 hover:border-blue-500 hover:bg-blue-50/20 transition-all rounded-3xl p-12 text-center flex flex-col items-center justify-center bg-white cursor-pointer"
        >
          <input
            id="organize-file-input"
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
          <h4 className="text-base font-bold text-slate-800">Select PDF document to organize</h4>
          <p className="text-xs text-slate-500 mt-1 max-w-sm">
            Drag and drop your PDF here or click to browse. Easily rearrange, rotate, and delete pages.
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
          <p className="text-sm font-semibold text-slate-800">Loading PDF pages for organization...</p>
        </div>
      ) : (
        /* Page Grid & Save Bar */
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {pages.map((p, index) => (
              <div
                key={p.id}
                className="bg-white rounded-2xl border border-slate-200 shadow-2xs hover:shadow-md transition-all p-3 flex flex-col justify-between"
              >
                {/* Header with Page Order */}
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 text-xs">
                  <span className="font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded-md">
                    #{index + 1}
                  </span>
                  {p.rotation !== 0 && (
                    <span className="text-[10px] text-blue-600 font-semibold">
                      +{p.rotation}°
                    </span>
                  )}
                </div>

                {/* Thumbnail Preview with live CSS rotation */}
                <div className="my-3 aspect-[1/1.3] bg-slate-50 rounded-xl overflow-hidden flex items-center justify-center p-1">
                  <img
                    src={p.thumbnailUrl}
                    alt={`Page ${index + 1}`}
                    style={{ transform: `rotate(${p.rotation}deg)` }}
                    className="w-full h-full object-contain transition-transform duration-200"
                  />
                </div>

                {/* Action Toolbar */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={index === 0}
                      onClick={() => movePage(index, 'left')}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 disabled:opacity-20 cursor-pointer"
                      title="Move Left"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={index === pages.length - 1}
                      onClick={() => movePage(index, 'right')}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 disabled:opacity-20 cursor-pointer"
                      title="Move Right"
                    >
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => rotatePage(index)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 cursor-pointer"
                      title="Rotate 90° Clockwise"
                    >
                      <RotateCw className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => duplicatePage(index)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
                      title="Duplicate Page"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => deletePage(index)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 cursor-pointer"
                      title="Delete Page"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Sticky Bottom Save Bar */}
          <div className="sticky bottom-4 bg-white/95 backdrop-blur-md p-4 rounded-2xl border border-slate-200 shadow-lg flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-xs text-slate-600">
              Pages: <strong className="text-slate-900">{pages.length}</strong> | Original File:{' '}
              <strong className="text-slate-900 truncate max-w-xs">{file.name}</strong>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              {resultBlob ? (
                <button
                  type="button"
                  onClick={handleDownload}
                  className="w-full sm:w-auto px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-sm transition-colors cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Organized PDF ({formatBytes(resultBlob.size)})</span>
                </button>
              ) : (
                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={handleSave}
                  className="w-full sm:w-auto px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Saving PDF...</span>
                    </>
                  ) : (
                    <>
                      <FileCheck className="w-4 h-4" />
                      <span>Apply Changes & Save PDF</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
