import React from 'react';
import { FileText, Image as ImageIcon, ShieldCheck, ArrowRightLeft } from 'lucide-react';
import { AppMode } from '../types';

interface HeaderProps {
  mode: AppMode;
  onModeChange: (mode: AppMode) => void;
  isProcessing?: boolean;
}

export const Header: React.FC<HeaderProps> = ({ mode, onModeChange, isProcessing }) => {
  return (
    <header className="border-b border-slate-200 bg-white/95 backdrop-blur-xs sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        {/* Brand & Title */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-xs">
            <ArrowRightLeft className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-slate-900 tracking-tight">
                PDF ⇄ Image Converter
              </h1>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                100% Offline & Private
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Runs purely in your browser — zero files are ever uploaded or stored.
            </p>
          </div>
        </div>

        {/* Mode Switcher Segmented Control */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/80 self-start md:self-auto">
          <button
            id="mode-pdf-to-image-btn"
            type="button"
            disabled={isProcessing}
            onClick={() => onModeChange('pdf-to-image')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
              mode === 'pdf-to-image'
                ? 'bg-white text-slate-900 shadow-xs border border-slate-200/70'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            } ${isProcessing ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          >
            <FileText className="w-4 h-4 text-rose-500" />
            <span>PDF to Image</span>
            <span className="text-xs text-slate-400 font-normal hidden sm:inline">JPG • PNG • WebP</span>
          </button>

          <button
            id="mode-image-to-pdf-btn"
            type="button"
            disabled={isProcessing}
            onClick={() => onModeChange('image-to-pdf')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
              mode === 'image-to-pdf'
                ? 'bg-white text-slate-900 shadow-xs border border-slate-200/70'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            } ${isProcessing ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          >
            <ImageIcon className="w-4 h-4 text-indigo-500" />
            <span>Image to PDF</span>
            <span className="text-xs text-slate-400 font-normal hidden sm:inline">Single / Multi-page</span>
          </button>
        </div>
      </div>
    </header>
  );
};
