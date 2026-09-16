import React, { useState } from 'react';
import { PdfToImageView } from './components/PdfToImageView';
import { ImageToPdfView } from './components/ImageToPdfView';
import { MergePdfView } from './components/MergePdfView';
import { SplitPdfView } from './components/SplitPdfView';
import { OrganizePdfView } from './components/OrganizePdfView';
import { CompressPdfView } from './components/CompressPdfView';
import { PdfToWordView } from './components/PdfToWordView';
import { WordToPdfView } from './components/WordToPdfView';
import { LockPdfView } from './components/LockPdfView';
import { UnlockPdfView } from './components/UnlockPdfView';
import { ScanPdfView } from './components/ScanPdfView';

import { PWAInstallButton } from './components/PWAInstallButton';
import { OfflineIndicator } from './components/OfflineIndicator';
import { ShareModal } from './components/ShareModal';
import { BarveStudioLogo } from './components/BarveStudioLogo';
import { AppMode } from './types';
import {
  FileText,
  Image as ImageIcon,
  FileType,
  FileCode,
  Layers,
  Scissors,
  LayoutGrid,
  FileDown,
  Lock,
  Unlock,
  Share2,
  ShieldCheck,
  Camera,
} from 'lucide-react';

interface NavItem {
  id: AppMode;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    title: 'Camera & Scan',
    items: [
      {
        id: 'scan-to-pdf',
        label: 'Scan to PDF',
        icon: Camera,
        description: 'Scan multi-page physical documents with camera, automatic document whitening, and PDF export.',
      },
    ],
  },
  {
    title: 'Convert',
    items: [
      {
        id: 'pdf-to-image',
        label: 'PDF to Image',
        icon: FileText,
        description: 'Convert PDF pages into high-quality PNG, JPG, or WebP files.',
      },
      {
        id: 'image-to-pdf',
        label: 'Image to PDF',
        icon: ImageIcon,
        description: 'Combine single or multiple images into standard, high-quality PDF documents.',
      },
      {
        id: 'pdf-to-word',
        label: 'PDF to Word',
        icon: FileType,
        description: 'Convert PDF documents into editable Microsoft Word (.docx) documents.',
      },
      {
        id: 'word-to-pdf',
        label: 'Word to PDF',
        icon: FileCode,
        description: 'Convert Microsoft Word (.docx) documents into printable vector PDFs.',
      },
    ],
  },
  {
    title: 'Organize',
    items: [
      {
        id: 'merge-pdf',
        label: 'Merge PDF',
        icon: Layers,
        description: 'Combine multiple PDF documents into a single organized file in any order.',
      },
      {
        id: 'split-pdf',
        label: 'Split PDF',
        icon: Scissors,
        description: 'Extract specific pages or split every page into separate PDF files.',
      },
      {
        id: 'organize-pdf',
        label: 'Organize PDF',
        icon: LayoutGrid,
        description: 'Rearrange, rotate, duplicate, or delete pages with full drag-and-drop ease.',
      },
    ],
  },
  {
    title: 'Security & Size',
    items: [
      {
        id: 'compress-pdf',
        label: 'Compress PDF',
        icon: FileDown,
        description: 'Reduce PDF file size without sacrificing visual clarity, completely offline.',
      },
      {
        id: 'lock-pdf',
        label: 'Lock PDF',
        icon: Lock,
        description: 'Encrypt your PDF using standard AES-256 password protection completely offline.',
      },
      {
        id: 'unlock-pdf',
        label: 'Unlock PDF',
        icon: Unlock,
        description: 'Permanently decrypt and remove password protection from your PDF files.',
      },
    ],
  },
];

const ALL_ITEMS = NAV_GROUPS.flatMap((g) => g.items);

export default function App() {
  const [mode, setMode] = useState<AppMode>('pdf-to-image');
  const [isShareOpen, setIsShareOpen] = useState(false);

  // Dynamic share URL pointing to user's site
  const shareUrl =
    typeof window !== 'undefined' && window.location.href && !window.location.href.includes('about:blank')
      ? window.location.origin + window.location.pathname
      : 'https://ganeshbarve88.github.io/Barve_Studio_Convertify/';

  const handleShareClick = async () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: 'Convertify - Offline PDF & Image Workstation',
          text: 'Convertify by Barve Studio: Convert, split, merge, compress, organize, lock, and unlock PDFs completely offline and private in your browser.',
          url: shareUrl,
        });
        return;
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          setIsShareOpen(true);
        }
        return;
      }
    }
    setIsShareOpen(true);
  };

  const currentItem = ALL_ITEMS.find((item) => item.id === mode) || ALL_ITEMS[0];

  return (
    <div className="flex h-screen w-full bg-slate-50 text-slate-900 font-sans overflow-hidden">
      {/* Sidebar (Desktop) */}
      <aside className="w-72 bg-white border-r border-slate-200 hidden md:flex flex-col shrink-0">
        <div className="p-6 pb-4">
          <BarveStudioLogo size="md" />
        </div>

        {/* Categorized Navigation */}
        <nav className="flex-1 overflow-y-auto px-4 py-2 space-y-6">
          {NAV_GROUPS.map((group) => (
            <div key={group.title} className="space-y-1">
              <span className="px-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                {group.title}
              </span>
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = mode === item.id;
                return (
                  <button
                    key={item.id}
                    id={`sidebar-${item.id}-btn`}
                    type="button"
                    onClick={() => setMode(item.id)}
                    className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium transition-colors cursor-pointer text-xs ${
                      isActive
                        ? 'bg-blue-50 text-blue-700 font-bold shadow-2xs'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                  >
                    <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
                    <span className="truncate">{item.label}</span>
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Sidebar Footer */}
        <div className="p-5 border-t border-slate-100 space-y-3 shrink-0 bg-slate-50/50">
          <PWAInstallButton variant="sidebar" />
          <button
            id="sidebar-share-btn"
            type="button"
            onClick={handleShareClick}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 transition-colors cursor-pointer shadow-2xs"
            title="Share Convertify with friends and colleagues"
          >
            <Share2 className="w-3.5 h-3.5 text-blue-600" />
            <span>Share App</span>
          </button>
          <div className="pt-1">
            <div className="flex items-center gap-2 text-emerald-600 font-semibold text-[11px] uppercase tracking-wider">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
              <span>Offline Mode Active</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
              Files are processed locally in your browser with zero server uploads.
            </p>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Mobile Navigation Header */}
        <header className="md:hidden bg-white border-b border-slate-200 p-3 flex flex-col gap-2.5 shrink-0">
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

          {/* Horizontally scrollable tool tabs on mobile */}
          <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
            {ALL_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = mode === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setMode(item.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl whitespace-nowrap transition-colors cursor-pointer shrink-0 ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </header>

        {/* Scrollable Main View */}
        <main className="flex-1 flex flex-col p-5 sm:p-7 md:p-9 bg-slate-50 overflow-y-auto">
          {/* Main View Top Banner */}
          <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
                <span>{currentItem.label}</span>
              </h2>
              <p className="text-slate-500 text-xs sm:text-sm mt-1 max-w-2xl">
                {currentItem.description}
              </p>
            </div>
            <div className="hidden sm:flex items-center gap-2.5 shrink-0">
              <button
                id="desktop-header-share-btn"
                type="button"
                onClick={handleShareClick}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 transition-colors shadow-2xs cursor-pointer"
                title="Share Convertify with friends and colleagues"
              >
                <Share2 className="w-3.5 h-3.5 text-blue-600" />
                <span>Share App</span>
              </button>
              <PWAInstallButton />
            </div>
          </div>

          {/* Active Tool View */}
          <div className="flex-1">
            {mode === 'scan-to-pdf' && <ScanPdfView />}
            {mode === 'pdf-to-image' && <PdfToImageView />}
            {mode === 'image-to-pdf' && <ImageToPdfView />}
            {mode === 'merge-pdf' && <MergePdfView />}
            {mode === 'split-pdf' && <SplitPdfView />}
            {mode === 'organize-pdf' && <OrganizePdfView />}
            {mode === 'compress-pdf' && <CompressPdfView />}
            {mode === 'pdf-to-word' && <PdfToWordView />}
            {mode === 'word-to-pdf' && <WordToPdfView />}
            {mode === 'lock-pdf' && <LockPdfView />}
            {mode === 'unlock-pdf' && <UnlockPdfView />}
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
