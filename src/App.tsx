import React, { useState, useEffect, useCallback, useRef } from 'react';
import { AudioEngine } from './lib/AudioEngine';
import { ReverbSettings, EchoSettings, EQSettings, AudioState } from './types';
import { Player } from './components/Player';
import { EffectsPanel } from './components/EffectsPanel';
import { ImportModal } from './components/ImportModal';
import { ExportModal } from './components/ExportModal';
import { Waves, Plus, Download, Info, Github, X } from 'lucide-react';
import { motion } from 'motion/react';

const DEFAULT_REVERB: ReverbSettings = { wet: 0.3, roomSize: 0.5, decay: 1.5, delay: 0.02 };
const DEFAULT_ECHO: EchoSettings = { wet: 0, feedback: 0.4, delayTime: 0.3 };
const DEFAULT_EQ: EQSettings = { bass: 0, mid: 0, treble: 0 };

export default function App() {
  const [engine] = useState(() => new AudioEngine());
  const [audioState, setAudioState] = useState<AudioState>({
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    volume: 1,
    isLoaded: false,
    fileName: ''
  });

  const [reverb, setReverb] = useState<ReverbSettings>(DEFAULT_REVERB);
  const [echo, setEcho] = useState<EchoSettings>(DEFAULT_ECHO);
  const [eq, setEQ] = useState<EQSettings>(DEFAULT_EQ);
  
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [buffer, setBuffer] = useState<AudioBuffer | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const timerRef = useRef<number | null>(null);

  // Update engine when settings change
  useEffect(() => engine.updateReverb(reverb), [reverb, engine]);
  useEffect(() => engine.updateEcho(echo), [echo, engine]);
  useEffect(() => engine.updateEQ(eq), [eq, engine]);
  useEffect(() => engine.updateVolume(audioState.volume), [audioState.volume, engine]);

  const startTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = window.setInterval(() => {
      setAudioState(prev => ({
        ...prev,
        currentTime: engine.getCurrentTime(),
        isPlaying: true
      }));
    }, 100);
  }, [engine]);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setAudioState(prev => ({ ...prev, isPlaying: false }));
  }, []);

  const handlePlayPause = async () => {
    if (audioState.isPlaying) {
      engine.pause();
      stopTimer();
    } else {
      await engine.resume();
      startTimer();
    }
  };

  const handleSeek = async (time: number) => {
    await engine.seek(time);
    setAudioState(prev => ({ ...prev, currentTime: time }));
  };

  const handleImportFile = async (file: File) => {
    setError(null);
    setIsLoading(true);
    try {
      const buf = await engine.loadFile(file);
      setBuffer(buf);
      setAudioState({
        isPlaying: false,
        currentTime: 0,
        duration: buf.duration,
        volume: 1,
        isLoaded: true,
        fileName: file.name
      });
    } catch (err) {
      console.error("Failed to load file", err);
      setError(err instanceof Error ? err.message : "Failed to load local file. Please try another format.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleImportUrl = async (url: string) => {
    setError(null);
    setIsLoading(true);
    try {
      const buf = await engine.loadAudio(url);
      setBuffer(buf);
      const fileName = url.split('/').pop() || 'Remote Audio';
      setAudioState({
        isPlaying: false,
        currentTime: 0,
        duration: buf.duration,
        volume: 1,
        isLoaded: true,
        fileName
      });
    } catch (err) {
      console.error("Failed to load URL", err);
      setError(err instanceof Error ? err.message : "Failed to fetch audio from URL. The server may be blocking access or the URL is invalid.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleExport = async (fileName: string) => {
    const blob = await engine.export({ reverb, echo, eq });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${fileName}.wav`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-[#050505] text-zinc-100 font-sans selection:bg-indigo-500/30">
      {/* Background Gradients */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-600/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-rose-600/10 blur-[120px] rounded-full" />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-40 w-full border-b border-white/5 bg-black/50 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Waves size={20} className="text-white" />
            </div>
            <h1 className="text-lg font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-zinc-400">
              SonicFlow
            </h1>
          </div>
          
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsImportOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-sm font-medium rounded-xl transition-all border border-white/5"
            >
              <Plus size={18} />
              Import
            </button>
            <button 
              onClick={() => setIsExportOpen(true)}
              disabled={!audioState.isLoaded}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-900 disabled:text-zinc-600 disabled:border-zinc-800 text-sm font-medium rounded-xl transition-all shadow-lg shadow-indigo-500/10"
            >
              <Download size={18} />
              Export
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {isLoading && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
          >
            <div className="bg-zinc-900 border border-white/10 p-8 rounded-3xl shadow-2xl flex flex-col items-center gap-4">
              <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
              <div className="text-center">
                <p className="text-white font-semibold">Processing Audio</p>
                <p className="text-xs text-zinc-500 mt-1">This may take a moment for YouTube links...</p>
              </div>
            </div>
          </motion.div>
        )}
        {error && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-center justify-between gap-4"
          >
            <div className="flex items-center gap-3 text-rose-400">
              <div className="p-2 bg-rose-500/20 rounded-lg">
                <Info size={18} />
              </div>
              <p className="text-sm font-medium">{error}</p>
            </div>
            <button 
              onClick={() => setError(null)}
              className="p-1 text-rose-400/50 hover:text-rose-400 transition-colors"
            >
              <X size={18} />
            </button>
          </motion.div>
        )}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Player & Info */}
          <div className="lg:col-span-5 space-y-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Player 
                audioState={audioState}
                onPlayPause={handlePlayPause}
                onSeek={handleSeek}
                onVolumeChange={(v) => setAudioState(s => ({ ...s, volume: v }))}
                buffer={buffer}
                analyser={engine.getAnalyser()}
              />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-zinc-900/40 border border-white/5 rounded-3xl p-6"
            >
              <div className="flex items-center gap-2 mb-4">
                <Info size={18} className="text-indigo-400" />
                <h3 className="font-semibold">How it works</h3>
              </div>
              <ul className="space-y-3 text-sm text-zinc-400">
                <li className="flex gap-3">
                  <span className="text-indigo-500 font-mono">01</span>
                  Import any audio file or stream from a direct URL.
                </li>
                <li className="flex gap-3">
                  <span className="text-indigo-500 font-mono">02</span>
                  Adjust real-time effects like algorithmic reverb and 3-band EQ.
                </li>
                <li className="flex gap-3">
                  <span className="text-indigo-500 font-mono">03</span>
                  Preview changes instantly with our low-latency audio engine.
                </li>
                <li className="flex gap-3">
                  <span className="text-indigo-500 font-mono">04</span>
                  Export your processed masterpiece as a high-quality WAV file.
                </li>
              </ul>
            </motion.div>
          </div>

          {/* Right Column: Effects */}
          <div className="lg:col-span-7">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold">Audio Effects</h2>
                <div className="px-3 py-1 bg-indigo-500/10 text-indigo-400 text-xs font-bold rounded-full uppercase tracking-wider">
                  Real-time DSP
                </div>
              </div>
              
              <EffectsPanel 
                reverb={reverb}
                echo={echo}
                eq={eq}
                onReverbChange={setReverb}
                onEchoChange={setEcho}
                onEQChange={setEQ}
                disabled={!audioState.isLoaded}
              />
            </motion.div>
          </div>
        </div>
      </main>

      <footer className="mt-auto py-12 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="text-zinc-500 text-sm">
            © 2026 SonicFlow. Built with Web Audio API.
          </div>
          <div className="flex items-center gap-6">
            <a href="#" className="text-zinc-500 hover:text-white transition-colors flex items-center gap-2 text-sm">
              <Github size={18} />
              Source Code
            </a>
            <a href="#" className="text-zinc-500 hover:text-white transition-colors text-sm">Documentation</a>
            <a href="#" className="text-zinc-500 hover:text-white transition-colors text-sm">Privacy Policy</a>
          </div>
        </div>
      </footer>

      <ImportModal 
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        onImportFile={handleImportFile}
        onImportUrl={handleImportUrl}
      />

      <ExportModal 
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        onExport={handleExport}
        defaultFileName={audioState.fileName}
      />
    </div>
  );
}
