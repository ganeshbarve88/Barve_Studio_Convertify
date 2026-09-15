import React, { useState } from 'react';
import { Share2, Copy, Check, QrCode, X, Smartphone, Laptop } from 'lucide-react';
import { BarveStudioLogo } from './BarveStudioLogo';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  shareUrl: string;
}

export const ShareModal: React.FC<ShareModalProps> = ({ isOpen, onClose, shareUrl }) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback
      const input = document.createElement('input');
      input.value = shareUrl;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  // Generate SVG QR Code using standard QR rendering
  const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
    shareUrl
  )}&bgcolor=ffffff&color=1e3a8a&margin=1`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 text-slate-900 animate-scale-in">
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">Share Convertify</h3>
              <p className="text-xs text-slate-500">By Barve Studio • 100% Private Offline Converter</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Ownership & Privacy Note */}
        <div className="mt-4 p-3 rounded-xl bg-slate-900 text-slate-200 text-xs border border-slate-800 flex items-start gap-2.5">
          <BarveStudioLogo showText={false} size="sm" className="shrink-0" />
          <p className="text-[11px] leading-relaxed text-slate-300">
            <strong className="text-white">Note:</strong> This app is fully owned by <span className="text-emerald-400 font-semibold">Barve Studio</span>, designed to help the people to convert their documents without any threat to privacy.
          </p>
        </div>

        {/* QR Code & Direct Scan */}
        <div className="my-4 flex flex-col items-center justify-center p-4 rounded-xl bg-slate-50 border border-slate-200 text-center">
          <div className="w-36 h-36 bg-white p-2 rounded-xl shadow-xs border border-slate-200/80 flex items-center justify-center mb-3">
            <img
              src={qrApiUrl}
              alt="Scan to open Convertify"
              className="w-full h-full object-contain"
              loading="lazy"
            />
          </div>
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
            <QrCode className="w-3.5 h-3.5 text-blue-600" />
            <span>Scan with phone camera to open & install</span>
          </div>
        </div>

        {/* Copy Link Field */}
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-slate-700">
            App Link
          </label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={shareUrl}
              className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono text-slate-700 select-all outline-none"
            />
            <button
              type="button"
              onClick={handleCopy}
              className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs shrink-0 ${
                copied
                  ? 'bg-emerald-600 text-white'
                  : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-200'
              }`}
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Link</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Quick Instructions for Friends */}
        <div className="mt-5 grid grid-cols-2 gap-2 text-left">
          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 text-[11px] text-slate-600">
            <div className="font-semibold text-slate-800 flex items-center gap-1 mb-1">
              <Smartphone className="w-3.5 h-3.5 text-blue-600" />
              <span>iPhone & Android</span>
            </div>
            <p className="text-[10.5px] leading-tight text-slate-500">
              Open link in Safari/Chrome & tap "Add to Home Screen" or "Install".
            </p>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 text-[11px] text-slate-600">
            <div className="font-semibold text-slate-800 flex items-center gap-1 mb-1">
              <Laptop className="w-3.5 h-3.5 text-blue-600" />
              <span>PC & Mac</span>
            </div>
            <p className="text-[10.5px] leading-tight text-slate-500">
              Click the "Install App" button in browser address bar for desktop use.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
