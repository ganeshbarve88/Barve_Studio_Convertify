import React from 'react';
import { WifiOff, ShieldCheck } from 'lucide-react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div
      id="offline-status-banner"
      className="fixed bottom-4 left-4 z-50 flex items-center gap-2.5 rounded-xl bg-slate-900/95 text-white px-4 py-2.5 text-xs font-medium shadow-xl border border-slate-700/60 backdrop-blur-md transition-all animate-fade-in"
    >
      <div className="p-1 rounded-lg bg-amber-500/20 text-amber-400">
        <WifiOff className="w-3.5 h-3.5" />
      </div>
      <div>
        <div className="font-semibold text-slate-100 flex items-center gap-1.5">
          <span>Offline Mode</span>
          <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] bg-emerald-500/20 text-emerald-300 font-mono">
            <ShieldCheck className="w-3 h-3" /> 100% Functional
          </span>
        </div>
        <p className="text-[11px] text-slate-400">
          All conversion tools run locally inside your device.
        </p>
      </div>
    </div>
  );
};
