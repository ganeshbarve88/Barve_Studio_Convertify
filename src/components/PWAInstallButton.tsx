import React, { useState } from 'react';
import { Download, MonitorDown, X, Smartphone, Laptop, Check } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  className?: string;
  variant?: 'primary' | 'sidebar' | 'banner';
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  className = '',
  variant = 'primary',
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showGuideModal, setShowGuideModal] = useState(false);

  // If already installed and running as standalone app, suppress prompt
  if (isInstalled) {
    return (
      <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-semibold border border-emerald-200">
        <Check className="w-3.5 h-3.5" />
        <span>Installed Offline</span>
      </div>
    );
  }

  // Handle direct click
  const handleClick = async () => {
    if (isInstallable) {
      await install();
    } else {
      // In iframes or browsers where beforeinstallprompt didn't trigger yet, show helpful guide
      setShowGuideModal(true);
    }
  };

  const buttonContent = (
    <>
      <MonitorDown className="w-4 h-4" />
      <span>Install App</span>
    </>
  );

  return (
    <>
      {variant === 'sidebar' ? (
        <button
          id="pwa-install-sidebar-btn"
          type="button"
          onClick={handleClick}
          className={`w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs ${
            isInstallable
              ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-200'
              : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200'
          } ${className}`}
          title="Install Convertify to your device for offline use"
        >
          {buttonContent}
        </button>
      ) : variant === 'banner' ? (
        <button
          id="pwa-install-banner-btn"
          type="button"
          onClick={handleClick}
          className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
            isInstallable
              ? 'bg-blue-600 hover:bg-blue-700 text-white'
              : 'bg-slate-800 hover:bg-slate-700 text-white'
          } ${className}`}
        >
          <Download className="w-3.5 h-3.5" />
          <span>{isInstallable ? 'Install App (Offline)' : 'Install Offline App'}</span>
        </button>
      ) : (
        <button
          id="pwa-install-btn"
          type="button"
          onClick={handleClick}
          className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer shadow-xs ${
            isInstallable
              ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-100'
              : 'bg-slate-100 hover:bg-slate-200 text-slate-800'
          } ${className}`}
        >
          {buttonContent}
        </button>
      )}

      {/* Installation Guide Modal (for iOS or when inside preview iframe) */}
      {showGuideModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 text-slate-900 animate-scale-in">
            <div className="flex items-start justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
                  <MonitorDown className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Install Convertify</h3>
                  <p className="text-xs text-slate-500">Run completely offline without an internet connection</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowGuideModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-4 space-y-4 text-xs text-slate-600 leading-relaxed">
              {isIOS ? (
                <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <div className="flex items-center gap-2 font-semibold text-slate-800 text-sm">
                    <Smartphone className="w-4 h-4 text-blue-600" />
                    <span>Install on iPhone or iPad</span>
                  </div>
                  <ol className="list-decimal pl-4 space-y-1.5 text-slate-600">
                    <li>Open this app in <strong>Safari</strong>.</li>
                    <li>Tap the <strong>Share</strong> button (box with an upward arrow) in the Safari toolbar.</li>
                    <li>Scroll down and select <strong>Add to Home Screen</strong>.</li>
                    <li>Tap <strong>Add</strong> in the top-right corner.</li>
                  </ol>
                </div>
              ) : (
                <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <div className="flex items-center gap-2 font-semibold text-slate-800 text-sm">
                    <Laptop className="w-4 h-4 text-blue-600" />
                    <span>Desktop (Chrome, Edge, Brave)</span>
                  </div>
                  <ol className="list-decimal pl-4 space-y-1.5 text-slate-600">
                    <li>If you are viewing inside an embedded preview, click the <strong>Open in New Tab</strong> button first.</li>
                    <li>Look for the <strong>Install</strong> icon (computer with down arrow) in your browser address bar.</li>
                    <li>Click <strong>Install</strong> to add Convertify as a native desktop application.</li>
                  </ol>
                </div>
              )}

              <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-100 flex items-start gap-2.5">
                <span className="text-blue-600 font-bold text-xs mt-0.5">Tip:</span>
                <p className="text-[11px] text-blue-900 leading-normal">
                  Once installed, Convertify launches in its own dedicated window without browser bars, and works even when your computer is in airplane mode or disconnected from Wi-Fi.
                </p>
              </div>
            </div>

            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={() => setShowGuideModal(false)}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-900 hover:bg-slate-800 text-white cursor-pointer"
              >
                Got It
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
