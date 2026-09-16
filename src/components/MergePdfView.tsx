import React, { useState } from 'react';
import { PDFDocument } from '@cantoo/pdf-lib';
import {
  Layers,
  Upload,
  ArrowUp,
  ArrowDown,
  Trash2,
  Download,
  Plus,
  FileCheck,
  RotateCcw,
  Loader2,
  FileText,
  AlertCircle,
} from 'lucide-react';
import { formatBytes, downloadBlob } from '../utils/fileHelpers';

interface MergePdfItem {
  id: string;
  file: File;
  name: string;
  size: number;
  pageCount: number;
  arrayBuffer: ArrayBuffer;
}

export const MergePdfView: React.FC = () => {
  const [items, setItems] = useState<MergePdfItem[]>([]);
  const [outputFileName, setOutputFileName] = useState('merged_document');
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressText, setProgressText] = useState('');
  const [mergedBlob, setMergedBlob] = useState<Blob | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Handle file addition
  const handleFilesAdded = async (files: FileList | File[]) => {
    setErrorMsg(null);
    const pdfFiles = Array.from(files).filter(
      (f) => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf')
    );

    if (pdfFiles.length === 0) {
      setErrorMsg('Please select valid PDF documents.');
      return;
    }

    setIsProcessing(true);
    setProgressText('Inspecting PDF files...');
    const newItems: MergePdfItem[] = [];

    for (let i = 0; i < pdfFiles.length; i++) {
      const file = pdfFiles[i];
      try {
        const buffer = await file.arrayBuffer();
        const doc = await PDFDocument.load(buffer, { ignoreEncryption: true });
        newItems.push({
          id: `${file.name}-${Date.now()}-${Math.random()}`,
          file,
          name: file.name,
          size: file.size,
          pageCount: doc.getPageCount(),
          arrayBuffer: buffer,
        });
      } catch (err) {
        console.error('Error loading PDF:', file.name, err);
        setErrorMsg(`Could not read "${file.name}". It might be corrupted or password-protected.`);
      }
    }

    setItems((prev) => [...prev, ...newItems]);
    setIsProcessing(false);
    setProgressText('');
    setMergedBlob(null);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files) {
      handleFilesAdded(e.dataTransfer.files);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFilesAdded(e.target.files);
    }
  };

  // Reorder items
  const moveItem = (index: number, direction: 'up' | 'down') => {
    setItems((prev) => {
      const newItems = [...prev];
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= newItems.length) return prev;
      const temp = newItems[index];
      newItems[index] = newItems[targetIndex];
      newItems[targetIndex] = temp;
      return newItems;
    });
    setMergedBlob(null);
  };

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
    setMergedBlob(null);
  };

  const resetAll = () => {
    setItems([]);
    setMergedBlob(null);
    setErrorMsg(null);
    setProgress(0);
  };

  // Execute Merge
  const handleMerge = async () => {
    if (items.length < 2) {
      setErrorMsg('Please add at least 2 PDF files to merge.');
      return;
    }

    setIsProcessing(true);
    setProgress(10);
    setProgressText('Initializing new merged PDF document...');
    setErrorMsg(null);

    try {
      const mergedPdf = await PDFDocument.create();

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const pct = Math.round(15 + ((i + 1) / items.length) * 75);
        setProgress(pct);
        setProgressText(`Merging file ${i + 1} of ${items.length}: "${item.name}"...`);

        const doc = await PDFDocument.load(item.arrayBuffer);
        const pageIndices = doc.getPageIndices();
        const copiedPages = await mergedPdf.copyPages(doc, pageIndices);
        copiedPages.forEach((page) => mergedPdf.addPage(page));
      }

      setProgress(95);
      setProgressText('Finalizing and compressing merged document...');
      const mergedBytes = await mergedPdf.save();
      const blob = new Blob([mergedBytes], { type: 'application/pdf' });

      setMergedBlob(blob);
      setProgress(100);
      setIsProcessing(false);
      setProgressText('');
    } catch (err) {
      console.error('Merge error:', err);
      setIsProcessing(false);
      setErrorMsg('An error occurred while merging the PDF files. Please try again.');
    }
  };

  const handleDownload = () => {
    if (!mergedBlob) return;
    const finalName = outputFileName.trim() ? `${outputFileName.replace(/\.pdf$/i, '')}.pdf` : 'merged_document.pdf';
    downloadBlob(mergedBlob, finalName);
  };

  const totalPages = items.reduce((sum, item) => sum + item.pageCount, 0);
  const totalSize = items.reduce((sum, item) => sum + item.size, 0);

  return (
    <div className="space-y-6">
      {/* Top Banner & Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">Merge PDF Files</h3>
            <p className="text-xs text-slate-500">
              Combine multiple PDF documents into a single organized file in any order.
            </p>
          </div>
        </div>

        {items.length > 0 && (
          <div className="flex items-center gap-3">
            <div className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-600">
              Files: <strong className="text-slate-900">{items.length}</strong> | Total Pages:{' '}
              <strong className="text-slate-900">{totalPages}</strong> | Total Size:{' '}
              <strong className="text-slate-900">{formatBytes(totalSize)}</strong>
            </div>
            <button
              type="button"
              onClick={resetAll}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-xl border border-slate-200 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
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

      {/* Empty State / Dropzone */}
      {items.length === 0 ? (
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          className="border-2 border-dashed border-slate-300 hover:border-blue-500 hover:bg-blue-50/20 transition-all rounded-3xl p-12 text-center flex flex-col items-center justify-center bg-white cursor-pointer"
          onClick={() => document.getElementById('merge-file-input')?.click()}
        >
          <input
            id="merge-file-input"
            type="file"
            multiple
            accept="application/pdf"
            className="hidden"
            onChange={handleFileInputChange}
          />
          <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4 shadow-xs">
            <Upload className="w-8 h-8" />
          </div>
          <h4 className="text-base font-bold text-slate-800">Choose PDF files to merge</h4>
          <p className="text-xs text-slate-500 mt-1 max-w-sm">
            Drag and drop 2 or more PDF documents here, or click to browse files from your computer.
          </p>
          <button
            type="button"
            className="mt-6 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors pointer-events-none"
          >
            Select PDF Files
          </button>
        </div>
      ) : (
        /* Reorderable List & Controls */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Document Merge Order (Drag or use arrows)
              </span>
              <label
                htmlFor="add-more-pdf-input"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold cursor-pointer shadow-2xs"
              >
                <Plus className="w-3.5 h-3.5 text-blue-600" />
                <span>Add More PDFs</span>
                <input
                  id="add-more-pdf-input"
                  type="file"
                  multiple
                  accept="application/pdf"
                  className="hidden"
                  onChange={handleFileInputChange}
                />
              </label>
            </div>

            <div className="space-y-2.5">
              {items.map((item, idx) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs hover:border-slate-300 transition-colors"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <span className="w-6 h-6 rounded-lg bg-slate-100 text-slate-600 text-xs font-bold flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <div className="p-2 rounded-xl bg-blue-50 text-blue-600 shrink-0">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-900 truncate max-w-xs sm:max-w-md">
                        {item.name}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        {item.pageCount} {item.pageCount === 1 ? 'page' : 'pages'} • {formatBytes(item.size)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0 ml-3">
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => moveItem(idx, 'up')}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer"
                      title="Move Up"
                    >
                      <ArrowUp className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      disabled={idx === items.length - 1}
                      onClick={() => moveItem(idx, 'down')}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer"
                      title="Move Down"
                    >
                      <ArrowDown className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeItem(item.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 cursor-pointer ml-1"
                      title="Remove from list"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Merge Configuration & Action Card */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs h-fit space-y-5">
            <h4 className="text-sm font-bold text-slate-900">Output Settings</h4>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Output File Name</label>
              <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
                <input
                  type="text"
                  value={outputFileName}
                  onChange={(e) => setOutputFileName(e.target.value)}
                  className="bg-transparent text-xs text-slate-900 flex-1 outline-none font-medium"
                  placeholder="merged_document"
                />
                <span className="text-xs text-slate-400 font-mono">.pdf</span>
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 space-y-2 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Total Documents:</span>
                <strong className="text-slate-900">{items.length}</strong>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Combined Pages:</span>
                <strong className="text-slate-900">{totalPages}</strong>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Approximate Size:</span>
                <strong className="text-slate-900">{formatBytes(totalSize)}</strong>
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

            {mergedBlob ? (
              <div className="space-y-2">
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-xs text-emerald-800 font-semibold">
                  <FileCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Merged successfully! ({formatBytes(mergedBlob.size)})</span>
                </div>
                <button
                  type="button"
                  onClick={handleDownload}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-sm transition-colors cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Merged PDF</span>
                </button>
              </div>
            ) : (
              <button
                type="button"
                disabled={isProcessing || items.length < 2}
                onClick={handleMerge}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:hover:bg-blue-600 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Merging Files...</span>
                  </>
                ) : (
                  <>
                    <Layers className="w-4 h-4" />
                    <span>Merge {items.length} PDFs</span>
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
