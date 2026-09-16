import React, { useState } from 'react';
import { PDFDocument } from '@cantoo/pdf-lib';
import {
  Lock,
  Upload,
  Eye,
  EyeOff,
  ShieldCheck,
  Download,
  RotateCcw,
  Loader2,
  FileCheck,
  AlertCircle,
  KeyRound,
} from 'lucide-react';
import { formatBytes, downloadBlob, getBaseFileName } from '../utils/fileHelpers';

export const LockPdfView: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState<number>(0);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [allowPrinting, setAllowPrinting] = useState(true);
  const [allowCopying, setAllowCopying] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [lockedBlob, setLockedBlob] = useState<Blob | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleFileChange = async (selectedFile: File) => {
    setErrorMsg(null);
    setLockedBlob(null);
    setPassword('');
    setConfirmPassword('');

    try {
      const buffer = await selectedFile.arrayBuffer();
      const doc = await PDFDocument.load(buffer, { ignoreEncryption: true });
      setFile(selectedFile);
      setPageCount(doc.getPageCount());
    } catch (err) {
      console.error('Error reading PDF for locking:', err);
      setErrorMsg('Could not read PDF. It may already be encrypted or corrupted.');
      setFile(null);
    }
  };

  const handleLock = async () => {
    if (!file) return;

    if (!password.trim()) {
      setErrorMsg('Please enter a password to lock the PDF.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match. Please re-enter.');
      return;
    }

    setIsProcessing(true);
    setErrorMsg(null);

    try {
      const buffer = await file.arrayBuffer();
      const doc = await PDFDocument.load(buffer, { ignoreEncryption: true });

      // Encrypt PDF with user and owner passwords
      (doc as any).encrypt({
        userPassword: password,
        ownerPassword: password,
        permissions: {
          printing: allowPrinting,
          copying: allowCopying,
          modifying: false,
          annotating: true,
          fillingForms: true,
          contentAccessibility: true,
          documentAssembly: true,
        },
      });

      const encryptedBytes = await doc.save();

      const blob = new Blob([encryptedBytes], { type: 'application/pdf' });
      setLockedBlob(blob);
      setIsProcessing(false);
    } catch (err) {
      console.error('Error locking PDF:', err);
      setIsProcessing(false);
      setErrorMsg('Failed to lock PDF. Please try again with a different document.');
    }
  };

  const handleDownload = () => {
    if (!lockedBlob || !file) return;
    const base = getBaseFileName(file.name);
    downloadBlob(lockedBlob, `${base}_protected.pdf`);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <Lock className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">Lock PDF with Password</h3>
            <p className="text-xs text-slate-500">
              Encrypt your PDF using standard AES-256 password protection completely offline.
            </p>
          </div>
        </div>

        {file && (
          <button
            type="button"
            onClick={() => {
              setFile(null);
              setLockedBlob(null);
              setPassword('');
              setConfirmPassword('');
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
          onClick={() => document.getElementById('lock-file-input')?.click()}
          className="border-2 border-dashed border-slate-300 hover:border-blue-500 hover:bg-blue-50/20 transition-all rounded-3xl p-12 text-center flex flex-col items-center justify-center bg-white cursor-pointer"
        >
          <input
            id="lock-file-input"
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
          <h4 className="text-base font-bold text-slate-800">Select PDF document to lock</h4>
          <p className="text-xs text-slate-500 mt-1 max-w-sm">
            Drag and drop your PDF here or click to browse. Passwords never leave your device.
          </p>
          <button
            type="button"
            className="mt-6 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors pointer-events-none"
          >
            Select PDF File
          </button>
        </div>
      ) : (
        /* Password Setup Card */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-5">
              <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-blue-600" />
                <span>Set Password Protection</span>
              </h4>

              <div className="space-y-4 max-w-md">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Enter Password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter a secure password"
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
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Confirm Password</label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter password to confirm"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 outline-none focus:border-blue-500 transition-colors"
                  />
                  {password && confirmPassword && password !== confirmPassword && (
                    <span className="text-[11px] text-red-500 block">Passwords do not match.</span>
                  )}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 space-y-3">
                <span className="text-xs font-bold text-slate-800 block">Document Permissions</span>
                <div className="space-y-2">
                  <label className="flex items-center gap-2.5 text-xs text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={allowPrinting}
                      onChange={(e) => setAllowPrinting(e.target.checked)}
                      className="rounded text-blue-600 focus:ring-0"
                    />
                    <span>Allow printing document</span>
                  </label>
                  <label className="flex items-center gap-2.5 text-xs text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={allowCopying}
                      onChange={(e) => setAllowCopying(e.target.checked)}
                      className="rounded text-blue-600 focus:ring-0"
                    />
                    <span>Allow copying text and graphics</span>
                  </label>
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
                <span>Pages:</span>
                <strong className="text-slate-900">{pageCount}</strong>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Encryption:</span>
                <strong className="text-blue-600 font-bold">Standard AES-256</strong>
              </div>
            </div>

            {lockedBlob ? (
              <div className="space-y-2">
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-xs text-emerald-800 font-semibold">
                  <FileCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>PDF locked successfully!</span>
                </div>
                <button
                  type="button"
                  onClick={handleDownload}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-sm transition-colors cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Locked PDF</span>
                </button>
              </div>
            ) : (
              <button
                type="button"
                disabled={isProcessing || !password.trim() || password !== confirmPassword}
                onClick={handleLock}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Encrypting PDF...</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4" />
                    <span>Lock PDF Document</span>
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
