import React from 'react';
import { X, Download, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { downloadBlob } from '../utils/fileHelpers';

interface PreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  imageSrc?: string;
  pdfBlob?: Blob;
  downloadFilename?: string;
  details?: string;
}

export const PreviewModal: React.FC<PreviewModalProps> = ({
  isOpen,
  onClose,
  title,
  imageSrc,
  pdfBlob,
  downloadFilename = 'file',
  details,
}) => {
  const [zoom, setZoom] = React.useState(1);

  React.useEffect(() => {
    setZoom(1);
  }, [imageSrc, pdfBlob]);

  if (!isOpen) return null;

  const pdfUrl = pdfBlob ? URL.createObjectURL(pdfBlob) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-xs">
      <div className="bg-white w-full max-w-5xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-slate-200">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
          <div>
            <h3 className="text-base font-bold text-slate-900">{title}</h3>
            {details && <p className="text-xs text-slate-500 mt-0.5">{details}</p>}
          </div>

          <div className="flex items-center gap-2">
            {imageSrc && (
              <div className="flex items-center bg-white border border-slate-200 rounded-lg p-0.5 mr-2">
                <button
                  type="button"
                  onClick={() => setZoom((z) => Math.max(0.5, z - 0.25))}
                  className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md"
                  title="Zoom Out"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <span className="text-xs font-mono px-2 text-slate-600">
                  {Math.round(zoom * 100)}%
                </span>
                <button
                  type="button"
                  onClick={() => setZoom((z) => Math.min(3, z + 0.25))}
                  className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md"
                  title="Zoom In"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setZoom(1)}
                  className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md border-l border-slate-200"
                  title="Reset Zoom"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>
            )}

            {pdfBlob && (
              <button
                type="button"
                onClick={() => downloadBlob(pdfBlob, downloadFilename)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-sm cursor-pointer transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download PDF</span>
              </button>
            )}

            {imageSrc && (
              <a
                href={imageSrc}
                download={downloadFilename}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-sm cursor-pointer transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download</span>
              </a>
            )}

            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-slate-100/70 min-h-[400px]">
          {imageSrc && (
            <div className="overflow-auto max-h-full max-w-full flex items-center justify-center p-4">
              <img
                src={imageSrc}
                alt={title}
                referrerPolicy="no-referrer"
                style={{ transform: `scale(${zoom})`, transformOrigin: 'center center' }}
                className="max-h-[75vh] max-w-full object-contain rounded shadow-md transition-transform duration-100 bg-white"
              />
            </div>
          )}

          {pdfUrl && (
            <iframe
              src={pdfUrl}
              title={title}
              className="w-full h-[75vh] rounded border border-slate-300 bg-white"
            />
          )}
        </div>
      </div>
    </div>
  );
};
