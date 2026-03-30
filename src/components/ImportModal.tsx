import React, { useState, useEffect } from 'react';
import { FileAudio, Link as LinkIcon, X, Upload, CheckCircle2, History, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportFile: (file: File) => void;
  onImportUrl: (url: string) => void;
}

const RECENT_IMPORTS_KEY = 'sonicflow_recent_imports';

export const ImportModal: React.FC<ImportModalProps> = ({
  isOpen,
  onClose,
  onImportFile,
  onImportUrl
}) => {
  const [url, setUrl] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [recentImports, setRecentImports] = useState<string[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem(RECENT_IMPORTS_KEY);
    if (saved) {
      try {
        setRecentImports(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse recent imports", e);
      }
    }
  }, [isOpen]);

  const saveRecentImport = (newUrl: string) => {
    const updated = [newUrl, ...recentImports.filter(u => u !== newUrl)].slice(0, 5);
    setRecentImports(updated);
    localStorage.setItem(RECENT_IMPORTS_KEY, JSON.stringify(updated));
  };

  const clearRecentImports = () => {
    setRecentImports([]);
    localStorage.removeItem(RECENT_IMPORTS_KEY);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onImportFile(file);
      onClose();
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('audio/')) {
      onImportFile(file);
      onClose();
    }
  };

  const handleUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (url.trim()) {
      saveRecentImport(url.trim());
      onImportUrl(url.trim());
      onClose();
    }
  };

  const handleRecentClick = (recentUrl: string) => {
    onImportUrl(recentUrl);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-md bg-zinc-900 border border-white/10 rounded-3xl shadow-2xl overflow-hidden"
          >
            <div className="p-6 border-b border-white/5 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-white">Import Audio</h2>
              <button onClick={onClose} className="p-2 text-zinc-400 hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* File Upload */}
              <div
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                className={cn(
                  "relative group cursor-pointer border-2 border-dashed rounded-2xl p-8 transition-all flex flex-col items-center gap-3",
                  isDragging 
                    ? "border-indigo-500 bg-indigo-500/10" 
                    : "border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800/30"
                )}
              >
                <input
                  type="file"
                  accept="audio/*"
                  onChange={handleFileChange}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
                <div className="p-4 bg-zinc-800 rounded-2xl group-hover:scale-110 transition-transform">
                  <Upload className="text-indigo-400" size={32} />
                </div>
                <div className="text-center">
                  <p className="text-white font-medium">Choose a local file</p>
                  <p className="text-xs text-zinc-500 mt-1">MP3, WAV, OGG supported</p>
                </div>
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-zinc-800"></div>
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-zinc-900 px-2 text-zinc-500">Or use a URL</span>
                </div>
              </div>

              {/* URL Input */}
              <form onSubmit={handleUrlSubmit} className="space-y-3">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <LinkIcon size={18} className="text-zinc-500" />
                  </div>
                  <input
                    type="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="Direct audio URL or YouTube link"
                    className="block w-full pl-10 pr-3 py-3 bg-zinc-800 border border-white/5 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                  />
                </div>
                <div className="flex flex-col gap-1.5 px-1">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
                    <p className="text-[10px] text-zinc-500 font-medium uppercase tracking-wider">Supports YouTube, MP3, WAV, OGG</p>
                  </div>
                  <p className="text-[9px] text-zinc-600 leading-tight">Note: YouTube extraction may occasionally be limited by YouTube's servers. If it fails, try again in a few minutes or use a direct URL/local file.</p>
                </div>
                <button
                  type="submit"
                  disabled={!url.trim()}
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-white font-semibold rounded-xl transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                  <CheckCircle2 size={18} />
                  Load from URL
                </button>
              </form>

              {/* Recent Imports */}
              {recentImports.length > 0 && (
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between px-1">
                    <div className="flex items-center gap-2 text-zinc-500">
                      <History size={14} />
                      <span className="text-[10px] font-bold uppercase tracking-wider">Recent Imports</span>
                    </div>
                    <button 
                      onClick={clearRecentImports}
                      className="text-[10px] text-zinc-600 hover:text-rose-400 transition-colors flex items-center gap-1"
                    >
                      <Trash2 size={12} />
                      Clear
                    </button>
                  </div>
                  <div className="space-y-1.5">
                    {recentImports.map((recentUrl, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleRecentClick(recentUrl)}
                        className="w-full text-left px-3 py-2 bg-zinc-800/50 hover:bg-zinc-800 border border-white/5 rounded-lg text-[11px] text-zinc-400 hover:text-zinc-200 truncate transition-all flex items-center gap-2"
                      >
                        <LinkIcon size={12} className="shrink-0 text-zinc-600" />
                        {recentUrl}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
