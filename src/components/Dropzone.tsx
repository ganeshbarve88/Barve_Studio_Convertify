import React, { useRef, useState } from 'react';
import { UploadCloud, Sparkles, AlertCircle } from 'lucide-react';

interface DropzoneProps {
  id?: string;
  accept: string;
  multiple?: boolean;
  title: string;
  subtitle: string;
  supportedText: string;
  icon: React.ReactNode;
  onFilesSelected: (files: File[]) => void;
  onLoadSample?: () => void;
  sampleLabel?: string;
  disabled?: boolean;
}

export const Dropzone: React.FC<DropzoneProps> = ({
  id = 'file-dropzone',
  accept,
  multiple = false,
  title,
  subtitle,
  supportedText,
  icon,
  onFilesSelected,
  onLoadSample,
  sampleLabel = 'Try with Sample File',
  disabled = false,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const validateAndEmitFiles = (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    setErrorMessage(null);

    const validFiles: File[] = [];
    const acceptTokens = accept
      .split(',')
      .map((t) => t.trim().toLowerCase());

    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      const ext = '.' + file.name.split('.').pop()?.toLowerCase();
      const type = file.type.toLowerCase();

      const isValid = acceptTokens.some((token) => {
        if (token.startsWith('.')) {
          return ext === token;
        }
        if (token.endsWith('/*')) {
          const mainType = token.replace('/*', '');
          return type.startsWith(mainType);
        }
        return type === token;
      });

      if (isValid) {
        validFiles.push(file);
      }
    }

    if (validFiles.length === 0) {
      setErrorMessage(`Please select valid file types matching: ${supportedText}`);
      return;
    }

    onFilesSelected(multiple ? validFiles : [validFiles[0]]);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    if (disabled) return;
    validateAndEmitFiles(e.dataTransfer.files);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    validateAndEmitFiles(e.target.files);
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  return (
    <div className="w-full">
      <div
        id={id}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => {
          if (!disabled) inputRef.current?.click();
        }}
        className={`relative group cursor-pointer border-2 border-dashed rounded-3xl p-10 md:p-14 text-center transition-all shadow-sm ${
          isDragOver
            ? 'border-blue-500 bg-blue-50/50 scale-[1.005]'
            : 'border-slate-300 hover:border-blue-400 bg-white'
        } ${disabled ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''}`}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={handleInputChange}
          className="hidden"
          disabled={disabled}
        />

        <div className="flex flex-col items-center justify-center max-w-md mx-auto">
          {/* Icon Circle */}
          <div
            className={`w-20 h-20 rounded-full flex items-center justify-center mb-6 transition-transform group-hover:scale-110 shadow-xs ${
              isDragOver ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-600'
            }`}
          >
            {isDragOver ? <UploadCloud className="w-10 h-10 animate-bounce" /> : icon}
          </div>

          <h3 className="text-xl font-semibold text-slate-800">{title}</h3>
          <p className="text-slate-400 mt-2 text-sm">{subtitle}</p>

          <div className="flex flex-wrap items-center justify-center gap-2 mt-4 mb-2">
            <span className="inline-flex items-center px-3 py-1 rounded-lg text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200/80">
              {supportedText}
            </span>
            {multiple && (
              <span className="inline-flex items-center px-3 py-1 rounded-lg text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">
                Multiple Files Supported
              </span>
            )}
          </div>

          <p className="text-xs text-slate-400 mt-2">
            or click to browse your local storage
          </p>
        </div>
      </div>

      {errorMessage && (
        <div className="mt-3 p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-xs text-rose-700">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
          <span>{errorMessage}</span>
        </div>
      )}

      {onLoadSample && (
        <div className="mt-5 flex items-center justify-center gap-2">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onLoadSample();
            }}
            className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-blue-600 bg-white hover:bg-blue-50/50 border border-slate-200 hover:border-blue-200 px-4 py-2 rounded-xl transition-colors cursor-pointer shadow-sm"
          >
            <Sparkles className="w-3.5 h-3.5 text-blue-600" />
            <span>{sampleLabel}</span>
          </button>
        </div>
      )}
    </div>
  );
};
