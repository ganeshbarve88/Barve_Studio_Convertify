import React, { useState } from 'react';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, PageBreak } from 'docx';
import {
  FileCode,
  Upload,
  Download,
  RotateCcw,
  Loader2,
  FileCheck,
  AlertCircle,
  FileType,
} from 'lucide-react';
import { pdfjsLib } from '../utils/pdfHelper';
import { formatBytes, downloadBlob, getBaseFileName } from '../utils/fileHelpers';

interface TextLine {
  text: string;
  fontSize: number;
  isBold?: boolean;
}

export const PdfToWordView: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState<number>(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressText, setProgressText] = useState('');
  const [docxBlob, setDocxBlob] = useState<Blob | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [extractedPreview, setExtractedPreview] = useState<string[]>([]);

  const handleFileChange = async (selectedFile: File) => {
    setErrorMsg(null);
    setDocxBlob(null);
    setExtractedPreview([]);
    setFile(selectedFile);
    setIsProcessing(true);
    setProgressText('Inspecting PDF document...');

    try {
      const buffer = await selectedFile.arrayBuffer();
      const loadingTask = pdfjsLib.getDocument({
        data: new Uint8Array(buffer),
        cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@6.3.289/cmaps/',
        cMapPacked: true,
      });
      const doc = await loadingTask.promise;
      setPageCount(doc.numPages);
    } catch (err) {
      console.error('Error loading PDF for Word conversion:', err);
      setErrorMsg('Could not read PDF. It might be password-protected or corrupted.');
      setFile(null);
    } finally {
      setIsProcessing(false);
      setProgressText('');
    }
  };

  const handleConvert = async () => {
    if (!file || pageCount === 0) return;

    setIsProcessing(true);
    setProgress(5);
    setProgressText('Extracting layout and text...');
    setErrorMsg(null);

    try {
      const buffer = await file.arrayBuffer();
      const loadingTask = pdfjsLib.getDocument({
        data: new Uint8Array(buffer),
        cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@6.3.289/cmaps/',
        cMapPacked: true,
      });
      const doc = await loadingTask.promise;

      const docxChildren: (Paragraph | PageBreak)[] = [];
      const previewSnippets: string[] = [];

      for (let pageNum = 1; pageNum <= pageCount; pageNum++) {
        const pct = Math.round(10 + ((pageNum - 1) / pageCount) * 75);
        setProgress(pct);
        setProgressText(`Converting page ${pageNum} of ${pageCount}...`);

        const page = await doc.getPage(pageNum);
        const textContent = await page.getTextContent();

        // Group text items into lines based on Y coordinate
        const linesMap = new Map<number, TextLine[]>();
        const items = textContent.items as any[];

        for (const item of items) {
          if (!item.str || item.str.trim() === '') continue;

          // Round Y coordinate to group characters on the same line
          const y = Math.round(item.transform[5] / 3) * 3;
          const fontSize = Math.abs(Math.round(item.transform[0] || item.height || 12));
          const isBold = item.fontName?.toLowerCase().includes('bold') || false;

          const existing = linesMap.get(y) || [];
          existing.push({ text: item.str, fontSize, isBold });
          linesMap.set(y, existing);
        }

        // Sort lines from top of page to bottom (PDF coordinates have Y=0 at bottom)
        const sortedY = Array.from(linesMap.keys()).sort((a, b) => b - a);

        for (const y of sortedY) {
          const lineItems = linesMap.get(y) || [];
          const fullLineText = lineItems.map((i) => i.text).join(' ').trim();
          if (!fullLineText) continue;

          if (previewSnippets.length < 5) {
            previewSnippets.push(fullLineText);
          }

          // Determine typography style
          const maxFontSize = Math.max(...lineItems.map((i) => i.fontSize));
          const hasBold = lineItems.some((i) => i.isBold);

          if (maxFontSize >= 22) {
            docxChildren.push(
              new Paragraph({
                text: fullLineText,
                heading: HeadingLevel.HEADING_1,
                spacing: { before: 240, after: 120 },
              })
            );
          } else if (maxFontSize >= 16) {
            docxChildren.push(
              new Paragraph({
                text: fullLineText,
                heading: HeadingLevel.HEADING_2,
                spacing: { before: 200, after: 100 },
              })
            );
          } else {
            docxChildren.push(
              new Paragraph({
                children: [
                  new TextRun({
                    text: fullLineText,
                    bold: hasBold,
                    size: 24, // 12pt
                  }),
                ],
                spacing: { after: 120, line: 360 },
              })
            );
          }
        }

        // Add page break between PDF pages (except after the last page)
        if (pageNum < pageCount) {
          docxChildren.push(new Paragraph({ children: [new PageBreak()] }));
        }
      }

      setExtractedPreview(previewSnippets);
      setProgress(90);
      setProgressText('Generating Word (.docx) document...');

      const wordDoc = new Document({
        sections: [
          {
            properties: {},
            children: docxChildren.length > 0 ? (docxChildren as Paragraph[]) : [new Paragraph({ text: 'No text extracted.' })],
          },
        ],
      });

      const blob = await Packer.toBlob(wordDoc);
      setDocxBlob(blob);
      setProgress(100);
      setIsProcessing(false);
      setProgressText('');
    } catch (err) {
      console.error('PDF to Word error:', err);
      setIsProcessing(false);
      setErrorMsg('Failed to convert PDF to Word. Please ensure the PDF is not an image-only scan.');
    }
  };

  const handleDownload = () => {
    if (!docxBlob || !file) return;
    const base = getBaseFileName(file.name);
    downloadBlob(docxBlob, `${base}.docx`);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <FileType className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">PDF to Word (.docx)</h3>
            <p className="text-xs text-slate-500">
              Convert PDF documents into editable Microsoft Word (.docx) documents offline.
            </p>
          </div>
        </div>

        {file && (
          <button
            type="button"
            onClick={() => {
              setFile(null);
              setDocxBlob(null);
              setExtractedPreview([]);
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
          onClick={() => document.getElementById('pdf-to-word-input')?.click()}
          className="border-2 border-dashed border-slate-300 hover:border-blue-500 hover:bg-blue-50/20 transition-all rounded-3xl p-12 text-center flex flex-col items-center justify-center bg-white cursor-pointer"
        >
          <input
            id="pdf-to-word-input"
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
          <h4 className="text-base font-bold text-slate-800">Select PDF document to convert to Word</h4>
          <p className="text-xs text-slate-500 mt-1 max-w-sm">
            Drag and drop your PDF here or click to browse. Formatted paragraphs and headings are preserved.
          </p>
          <button
            type="button"
            className="mt-6 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors pointer-events-none"
          >
            Select PDF File
          </button>
        </div>
      ) : (
        /* Action & Preview Card */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <h4 className="text-sm font-bold text-slate-900">Conversion Highlights</h4>
              <ul className="space-y-2 text-xs text-slate-600">
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-blue-600 rounded-full" />
                  <span>Exports genuine, fully editable Microsoft Word <strong>.docx</strong> format.</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-blue-600 rounded-full" />
                  <span>Automatically structures paragraphs, line breaks, and heading hierarchies.</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-blue-600 rounded-full" />
                  <span>100% private in-browser generation without external servers or cloud uploads.</span>
                </li>
              </ul>
            </div>

            {extractedPreview.length > 0 && (
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-2">
                <h5 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Extracted Content Preview
                </h5>
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 font-mono text-xs text-slate-700 space-y-1.5 max-h-48 overflow-y-auto">
                  {extractedPreview.map((line, idx) => (
                    <p key={idx} className="truncate">
                      {line}
                    </p>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs h-fit space-y-5">
            <h4 className="text-sm font-bold text-slate-900">Document Summary</h4>

            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 space-y-2 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>File Name:</span>
                <strong className="text-slate-900 truncate max-w-[150px]">{file.name}</strong>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Pages:</span>
                <strong className="text-slate-900">{pageCount}</strong>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>File Size:</span>
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

            {docxBlob ? (
              <div className="space-y-2">
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-xs text-emerald-800 font-semibold">
                  <FileCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Word document ready! ({formatBytes(docxBlob.size)})</span>
                </div>
                <button
                  type="button"
                  onClick={handleDownload}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-sm transition-colors cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Word Document (.docx)</span>
                </button>
              </div>
            ) : (
              <button
                type="button"
                disabled={isProcessing}
                onClick={handleConvert}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Converting to Word...</span>
                  </>
                ) : (
                  <>
                    <FileType className="w-4 h-4" />
                    <span>Convert to Word (.docx)</span>
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
