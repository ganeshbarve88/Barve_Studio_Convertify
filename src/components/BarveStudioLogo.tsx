import React, { useState } from 'react';

interface BarveStudioLogoProps {
  className?: string;
  showText?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const BarveStudioLogo: React.FC<BarveStudioLogoProps> = ({
  className = '',
  showText = true,
  size = 'md',
}) => {
  const [imgSrc, setImgSrc] = useState<string>('/bs_logo.png');

  const handleImgError = () => {
    if (imgSrc === '/bs_logo.png') {
      setImgSrc('/barve-studio-logo.svg');
    }
  };

  const iconDimensions = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-16 h-16',
  }[size];

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* Visual Logo Badge */}
      <div
        className={`${iconDimensions} shrink-0 rounded-xl overflow-hidden shadow-md shadow-emerald-950/30 border border-emerald-500/40 bg-[#03071c] flex items-center justify-center`}
      >
        <img
          src={imgSrc}
          alt="Barve Studio Logo"
          onError={handleImgError}
          className="w-full h-full object-cover"
          referrerPolicy="no-referrer"
        />
      </div>

      {/* Brand & App Name */}
      {showText && (
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5">
            <span className="text-lg font-extrabold tracking-tight text-slate-900 leading-none">
              Convertify
            </span>
            <span className="px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-md">
              Offline
            </span>
          </div>
          <span className="text-[10px] text-slate-400 font-semibold tracking-wide mt-1">
            By Barve Studio.
          </span>
        </div>
      )}
    </div>
  );
};

