import React, { useState } from 'react';
import { PDFDocument } from '@cantoo/pdf-lib';
import {
  Unlock,
  Upload,
  Eye,
  EyeOff,
  Download,
  RotateCcw,
  Loader2,
  FileCheck,
  AlertCircle,
  Key,
} from 'lucide-react';
import { formatBytes, downloadBlob, getBaseFileName } from '../utils/fileHelpers';

export const UnlockPdfView: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [unlockedBlob, setUnlockedBlob] = useState<Blob | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleFileChange = (selectedFile: File) => {
    setErrorMsg(null);
    setUnlockedBlob(null);
    setPassword('');
    setFile(selectedFile);
  };

  const handleUnlock = async () => {
    if (!file) return;

    if (!password) {
      setErrorMsg('Please enter the password for this PDF.');
      return;
    }

    setIsProcessing(true);
    setErrorMsg(null);

    try {
      const buffer = await file.arrayBuffer();

      // Attempt to load with password
      const doc = await PDFDocument.load(buffer, { password });

      // Save without any encryption
      const unencryptedBytes = await doc.save();
      const blob = new Blob([unencryptedBytes], { type: 'application/pdf' });

      setUnlockedBlob(blob);
      setIsProcessing(false);
    } catch (err: any) {
      console.error('Error unlocking PDF:', err);
      setIsProcessing(false);
      if (err?.message?.toLowerCase().includes('password') || err?.message?.toLowerCase().includes('decrypt')) {
        setErrorMsg('Incorrect password. Please check and try again.');
      } else {
        setErrorMsg('Failed to unlock document. Please verify the password and file integrity.');
      }
    }
  };

  const handleDownload = () => {
    if (!unlockedBlob || !file) return;
    const base = getBaseFileName(file.name);
    downloadBlob(unlockedBlob, `${base}_unlocked.pdf`);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <Unlock className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">Unlock PDF (Remove Password)</h3>
            <p className="text-xs text-slate-500">
              Permanently decrypt and remove password protection from your PDF files.
            </p>
          </div>
        </div>

        {file && (
          <button
            type="button"
            onClick={() => {
              setFile(null);
              setUnlockedBlob(null);
              setPassword('');
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
          onClick={() => document.getElementById('unlock-file-input')?.click()}
          className="border-2 border-dashed border-slate-300 hover:border-blue-500 hover:bg-blue-50/20 transition-all rounded-3xl p-12 text-center flex flex-col items-center justify-center bg-white cursor-pointer"
        >
          <input
            id="unlock-file-input"
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={(e) => {
              if (e.target.files?.[0]) handleFileChange(e.target.files[0]);
            }}
          />
          <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4 shadow-xs">
            <Upload className="w-8 h-8" />
          </div>
          <h4 className="text-base font-bold text-slate-800">Select locked PDF document</h4>
          <p className="text-xs text-slate-500 mt-1 max-w-sm">
            Drag and drop your password-protected PDF here. Decrypted locally and securely.
          </p>
          <button
            type="button"
            className="mt-6 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors pointer-events-none"
          >
            Select PDF File
          </button>
        </div>
      ) : (
        /* Password Input & Unlock Card */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-5">
              <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Key className="w-4 h-4 text-blue-600" />
                <span>Enter Document Password</span>
              </h4>

              <div className="space-y-4 max-w-md">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">PDF Password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Type the password to unlock"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 outline-none focus:border-blue-500 transition-colors pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Once unlocked, the PDF will no longer require a password to open.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs h-fit space-y-5">
            <h4 className="text-sm font-bold text-slate-900">Summary</h4>

            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 space-y-2 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>File Name:</span>
                <strong className="text-slate-900 truncate max-w-[150px]">{file.name}</strong>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>File Size:</span>
                <strong className="text-slate-900">{formatBytes(file.size)}</strong>
              </div>
            </div>

            {unlockedBlob ? (
              <div className="space-y-2">
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-xs text-emerald-800 font-semibold">
                  <FileCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Password removed successfully!</span>
                </div>
                <button
                  type="button"
                  onClick={handleDownload}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-sm transition-colors cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Unlocked PDF</span>
                </button>
              </div>
            ) : (
              <button
                type="button"
                disabled={isProcessing || !password.trim()}
                onClick={handleUnlock}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Decrypting PDF...</span>
                  </>
                ) : (
                  <>
                    <Unlock className="w-4 h-4" />
                    <span>Unlock PDF</span>
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
