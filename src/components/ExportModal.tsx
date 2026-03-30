import React, { useState } from 'react';
import { Download, X, Loader2, CheckCircle2, Music } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: (fileName: string) => Promise<void>;
  defaultFileName: string;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  onExport,
  defaultFileName
}) => {
  const [fileName, setFileName] = useState(defaultFileName.replace(/\.[^/.]+$/, ""));
  const [isExporting, setIsExporting] = useState(false);
  const [isDone, setIsDone] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      await onExport(fileName || 'processed_audio');
      setIsDone(true);
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const resetAndClose = () => {
    setIsDone(false);
    setIsExporting(false);
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
            onClick={resetAndClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-md bg-zinc-900 border border-white/10 rounded-3xl shadow-2xl overflow-hidden"
          >
            <div className="p-6 border-b border-white/5 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-white">Export Audio</h2>
              <button onClick={resetAndClose} className="p-2 text-zinc-400 hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="p-8 flex flex-col items-center text-center">
              {!isDone ? (
                <>
                  <div className="w-20 h-20 bg-indigo-500/10 rounded-3xl flex items-center justify-center mb-6">
                    <Music className="text-indigo-400" size={40} />
                  </div>
                  <h3 className="text-lg font-medium text-white mb-2">Ready to Render</h3>
                  <p className="text-sm text-zinc-500 mb-8">
                    Your audio will be processed with all active effects and saved as a high-quality WAV file.
                  </p>

                  <div className="w-full space-y-4">
                    <div className="text-left">
                      <label className="text-xs font-medium text-zinc-400 mb-1.5 block ml-1">File Name</label>
                      <input
                        type="text"
                        value={fileName}
                        onChange={(e) => setFileName(e.target.value)}
                        placeholder="my_processed_audio"
                        className="w-full px-4 py-3 bg-zinc-800 border border-white/5 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                      />
                    </div>

                    <button
                      onClick={handleExport}
                      disabled={isExporting}
                      className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-white font-bold rounded-xl transition-all active:scale-95 flex items-center justify-center gap-3 shadow-lg shadow-indigo-500/20"
                    >
                      {isExporting ? (
                        <>
                          <Loader2 size={20} className="animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <Download size={20} />
                          Render & Save
                        </>
                      )}
                    </button>
                  </div>
                </>
              ) : (
                <motion.div 
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="py-6"
                >
                  <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mb-6 mx-auto">
                    <CheckCircle2 className="text-emerald-400" size={48} />
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-2">Export Complete!</h3>
                  <p className="text-zinc-400 mb-8">Your file has been saved successfully.</p>
                  <button
                    onClick={resetAndClose}
                    className="px-8 py-3 bg-zinc-800 hover:bg-zinc-700 text-white font-semibold rounded-xl transition-all"
                  >
                    Done
                  </button>
                </motion.div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
