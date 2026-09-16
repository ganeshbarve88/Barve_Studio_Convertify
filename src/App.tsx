import React, { useState } from 'react';
import { PdfToImageView } from './components/PdfToImageView';
import { ImageToPdfView } from './components/ImageToPdfView';
import { PWAInstallButton } from './components/PWAInstallButton';
import { OfflineIndicator } from './components/OfflineIndicator';
import { ShareModal } from './components/ShareModal';
import { BarveStudioLogo } from './components/BarveStudioLogo';
import { AppMode } from './types';
import { FileText, Image as ImageIcon, Share2, ShieldCheck } from 'lucide-react';

export default function App() {
  const [mode, setMode] = useState<AppMode>('pdf-to-image');
  const [isShareOpen, setIsShareOpen] = useState(false);

  // Use current window location (e.g. GitHub Pages or custom domain) with fallback
  const shareUrl =
    typeof window !== 'undefined' && window.location.href && !window.location.href.includes('about:blank')
      ? window.location.origin + window.location.pathname
      : 'https://ganeshbarve88.github.io/Barve_Studio_Convertify/';

  const handleShareClick = async () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: 'Convertify - Offline PDF & Image Converter',
          text: 'Convertify by Barve Studio: Convert PDF to Images and Images to PDF completely offline and private in your browser.',
          url: shareUrl,
        });
        return;
      } catch (err) {
        // Fall back to modal if cancelled or unsupported
        if ((err as Error).name !== 'AbortError') {
          setIsShareOpen(true);
        }
        return;
      }
    }
    setIsShareOpen(true);
  };

  return (
    <div className="flex h-screen w-full bg-slate-50 text-slate-900 font-sans overflow-hidden">
      {/* Sidebar (Desktop) */}
      <aside className="w-72 bg-white border-r border-slate-200 hidden md:flex flex-col shrink-0">
        <div className="p-8">
          {/* Logo & Brand */}
          <div className="mb-8">
            <BarveStudioLogo size="md" />
          </div>

          {/* Navigation Links */}
          <nav className="space-y-2">
            <button
              id="sidebar-pdf-to-image-btn"
              type="button"
              onClick={() => setMode('pdf-to-image')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors cursor-pointer text-sm ${
                mode === 'pdf-to-image'
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
              }`}
            >
              <FileText className="w-5 h-5" />
              <span>PDF to Image</span>
            </button>

            <button
              id="sidebar-image-to-pdf-btn"
              type="button"
              onClick={() => setMode('image-to-pdf')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors cursor-pointer text-sm ${
                mode === 'image-to-pdf'
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
              }`}
            >
              <ImageIcon className="w-5 h-5" />
              <span>Image to PDF</span>
            </button>
          </nav>
        </div>

        {/* Offline Security & Actions in Sidebar */}
        <div className="mt-auto p-6 border-t border-slate-100 space-y-3">
          <PWAInstallButton variant="sidebar" />
          <button
            id="sidebar-share-btn"
            type="button"
            onClick={handleShareClick}
            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 transition-colors cursor-pointer shadow-2xs"
            title="Share Convertify with friends and family"
          >
            <Share2 className="w-3.5 h-3.5 text-blue-600" />
            <span>Share App</span>
          </button>
          <div className="pt-1">
            <div className="flex items-center gap-2 text-emerald-600 font-semibold text-xs uppercase tracking-widest">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
              <span>Offline Mode Active</span>
            </div>
            <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
              Files are processed locally in your browser with zero server uploads.
            </p>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Mobile Navigation Header */}
        <header className="md:hidden bg-white border-b border-slate-200 p-4 flex flex-col gap-3 shrink-0">
          <div className="flex items-center justify-between">
            <BarveStudioLogo size="sm" />

            <div className="flex items-center gap-2">
              <button
                id="mobile-share-btn"
                type="button"
                onClick={handleShareClick}
                className="p-2 rounded-xl text-slate-600 hover:text-blue-600 hover:bg-slate-100 border border-slate-200 cursor-pointer transition-colors"
                title="Share App"
              >
                <Share2 className="w-4 h-4" />
              </button>
              <PWAInstallButton />
            </div>
          </div>

          <div className="flex bg-slate-100 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setMode('pdf-to-image')}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                mode === 'pdf-to-image'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              PDF to Image
            </button>
            <button
              type="button"
              onClick={() => setMode('image-to-pdf')}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                mode === 'image-to-pdf'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Image to PDF
            </button>
          </div>
        </header>

        {/* Scrollable Main View */}
        <main className="flex-1 flex flex-col p-6 sm:p-8 md:p-10 bg-slate-50 overflow-y-auto">
          {/* Main View Top Banner */}
          <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                {mode === 'pdf-to-image' ? 'PDF to Image' : 'Image to PDF'}
              </h2>
              <p className="text-slate-500 text-sm sm:text-base mt-1">
                {mode === 'pdf-to-image'
                  ? 'Convert document pages into high-quality PNG, JPG, or WebP files.'
                  : 'Combine single or multiple images into standard, high-quality PDF documents.'}
              </p>
            </div>
            <div className="hidden sm:flex items-center gap-2.5 shrink-0">
              <button
                id="desktop-header-share-btn"
                type="button"
                onClick={handleShareClick}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 transition-colors shadow-2xs cursor-pointer"
                title="Share Convertify with friends and family"
              >
                <Share2 className="w-3.5 h-3.5 text-blue-600" />
                <span>Share App</span>
              </button>
              <PWAInstallButton />
            </div>
          </div>

          {/* Converter Views */}
          <div className="flex-1">
            {mode === 'pdf-to-image' ? <PdfToImageView /> : <ImageToPdfView />}
          </div>

          {/* Footer Note */}
          <footer className="mt-12 pt-6 border-t border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
            <div className="flex items-center gap-2.5 text-center sm:text-left">
              <BarveStudioLogo showText={false} size="sm" className="shrink-0" />
              <span>
                This app is fully owned by <strong className="text-slate-800">Barve Studio</strong>, designed to help the people to convert their documents without any threat to privacy.
              </span>
            </div>
            <span className="shrink-0 inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              <ShieldCheck className="w-3 h-3 text-emerald-600" /> 100% In-Browser Privacy
            </span>
          </footer>
        </main>
      </div>

      {/* Floating Connectivity Indicator */}
      <OfflineIndicator />

      {/* Share & QR Code Modal */}
      <ShareModal
        isOpen={isShareOpen}
        onClose={() => setIsShareOpen(false)}
        shareUrl={shareUrl}
      />
    </div>
  );
}


