import React, { useState, useRef } from 'react';
import mammoth from 'mammoth';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import {
  FileText,
  Upload,
  Download,
  RotateCcw,
  Loader2,
  FileCheck,
  AlertCircle,
  Eye,
} from 'lucide-react';
import { formatBytes, downloadBlob, getBaseFileName } from '../utils/fileHelpers';

export const WordToPdfView: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [htmlContent, setHtmlContent] = useState<string>('');
  const [isParsing, setIsParsing] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const previewRef = useRef<HTMLDivElement>(null);

  const handleFileChange = async (selectedFile: File) => {
    setErrorMsg(null);
    setPdfBlob(null);
    setHtmlContent('');

    if (!selectedFile.name.toLowerCase().endsWith('.docx')) {
      setErrorMsg('Please select a valid Microsoft Word document (.docx).');
      return;
    }

    setFile(selectedFile);
    setIsParsing(true);

    try {
      const buffer = await selectedFile.arrayBuffer();
      const result = await mammoth.convertToHtml({ arrayBuffer: buffer });
      setHtmlContent(result.value || '<p>Empty Word document.</p>');
    } catch (err) {
      console.error('Error reading Word document:', err);
      setErrorMsg('Could not parse Word document. Please ensure it is a valid .docx file.');
      setFile(null);
    } finally {
      setIsParsing(false);
    }
  };

  const handleConvert = async () => {
    if (!previewRef.current || !file) return;

    setIsConverting(true);
    setProgress(20);
    setErrorMsg(null);

    try {
      const element = previewRef.current;
      setProgress(40);

      // Render the HTML content container into high-res canvas
      const canvas = await html2canvas(element, {
        scale: 2, // 2x for sharp typography
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
      });

      setProgress(75);

      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      const pdf = new jsPDF('p', 'pt', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      const imgWidth = pdfWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = 0;

      // First page
      pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
      heightLeft -= pdfHeight;

      // Multi-page pagination
      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
        heightLeft -= pdfHeight;
      }

      setProgress(95);
      const blob = pdf.output('blob');
      setPdfBlob(blob);
      setProgress(100);
      setIsConverting(false);
    } catch (err) {
      console.error('Word to PDF error:', err);
      setIsConverting(false);
      setErrorMsg('Failed to convert Word document to PDF. Please try again.');
    }
  };

  const handleDownload = () => {
    if (!pdfBlob || !file) return;
    const base = getBaseFileName(file.name);
    downloadBlob(pdfBlob, `${base}.pdf`);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">Word to PDF</h3>
            <p className="text-xs text-slate-500">
              Convert Microsoft Word (.docx) documents into standard, printable PDF files offline.
            </p>
          </div>
        </div>

        {file && (
          <button
            type="button"
            onClick={() => {
              setFile(null);
              setPdfBlob(null);
              setHtmlContent('');
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
          onClick={() => document.getElementById('word-to-pdf-input')?.click()}
          className="border-2 border-dashed border-slate-300 hover:border-blue-500 hover:bg-blue-50/20 transition-all rounded-3xl p-12 text-center flex flex-col items-center justify-center bg-white cursor-pointer"
        >
          <input
            id="word-to-pdf-input"
            type="file"
            accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            className="hidden"
            onChange={(e) => {
              if (e.target.files?.[0]) handleFileChange(e.target.files[0]);
            }}
          />
          <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4 shadow-xs">
            <Upload className="w-8 h-8" />
          </div>
          <h4 className="text-base font-bold text-slate-800">Select Word (.docx) document</h4>
          <p className="text-xs text-slate-500 mt-1 max-w-sm">
            Drag and drop your Word document here or click to browse. Fully converted in your browser.
          </p>
          <button
            type="button"
            className="mt-6 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors pointer-events-none"
          >
            Select Word File
          </button>
        </div>
      ) : isParsing ? (
        <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center space-y-4">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto" />
          <p className="text-sm font-semibold text-slate-800">Reading Word document formatting...</p>
        </div>
      ) : (
        /* Preview & Convert Controls */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5 text-blue-600" />
                <span>Document Layout Preview</span>
              </span>
            </div>

            {/* Document Paper Canvas Container */}
            <div className="bg-slate-200/70 p-6 rounded-2xl max-h-[600px] overflow-y-auto flex justify-center">
              <div
                ref={previewRef}
                className="bg-white p-12 rounded-lg shadow-md max-w-2xl w-full font-serif text-slate-900 leading-relaxed text-sm space-y-4"
                dangerouslySetInnerHTML={{ __html: htmlContent }}
              />
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs h-fit space-y-5">
            <h4 className="text-sm font-bold text-slate-900">Conversion Settings</h4>

            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 space-y-2 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>File Name:</span>
                <strong className="text-slate-900 truncate max-w-[150px]">{file.name}</strong>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Output Format:</span>
                <strong className="text-slate-900">Standard A4 PDF</strong>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>File Size:</span>
                <strong className="text-slate-900">{formatBytes(file.size)}</strong>
              </div>
            </div>

            {isConverting && (
              <div className="space-y-2">
                <div className="flex justify-between text-xs text-slate-600">
                  <span>Rendering PDF pages...</span>
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

            {pdfBlob ? (
              <div className="space-y-2">
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-xs text-emerald-800 font-semibold">
                  <FileCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>PDF ready! ({formatBytes(pdfBlob.size)})</span>
                </div>
                <button
                  type="button"
                  onClick={handleDownload}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-sm transition-colors cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Converted PDF</span>
                </button>
              </div>
            ) : (
              <button
                type="button"
                disabled={isConverting}
                onClick={handleConvert}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer"
              >
                {isConverting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Converting to PDF...</span>
                  </>
                ) : (
                  <>
                    <FileText className="w-4 h-4" />
                    <span>Convert to PDF</span>
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
