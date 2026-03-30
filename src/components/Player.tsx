import React, { useEffect, useRef, useState } from 'react';
import WaveSurfer from 'wavesurfer.js';
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Activity } from 'lucide-react';
import { AudioState } from '../types';
import { cn } from '../lib/utils';
import { FrequencyVisualizer } from './FrequencyVisualizer';

interface PlayerProps {
  audioState: AudioState;
  onPlayPause: () => void;
  onSeek: (time: number) => void;
  onVolumeChange: (volume: number) => void;
  buffer: AudioBuffer | null;
  analyser: AnalyserNode | null;
}

export const Player: React.FC<PlayerProps> = ({
  audioState,
  onPlayPause,
  onSeek,
  onVolumeChange,
  buffer,
  analyser
}) => {
  const waveformRef = useRef<HTMLDivElement>(null);
  const wavesurfer = useRef<WaveSurfer | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [prevVolume, setPrevVolume] = useState(1);
  const [zoom, setZoom] = useState(0);

  useEffect(() => {
    if (!waveformRef.current || !buffer) return;

    if (wavesurfer.current) {
      wavesurfer.current.destroy();
    }

    wavesurfer.current = WaveSurfer.create({
      container: waveformRef.current,
      waveColor: '#4f46e5',
      progressColor: '#818cf8',
      cursorColor: '#ffffff',
      barWidth: 2,
      barRadius: 3,
      height: 80,
      normalize: true,
    });

    // Convert AudioBuffer to Blob for WaveSurfer
    const wavBlob = bufferToWav(buffer);
    wavesurfer.current.loadBlob(wavBlob);

    wavesurfer.current.on('interaction', (newTime) => {
      onSeek(newTime * wavesurfer.current!.getDuration());
    });

    return () => {
      wavesurfer.current?.destroy();
    };
  }, [buffer]);

  useEffect(() => {
    if (wavesurfer.current) {
      wavesurfer.current.setTime(audioState.currentTime);
    }
  }, [audioState.currentTime]);

  useEffect(() => {
    if (wavesurfer.current) {
      wavesurfer.current.zoom(zoom);
    }
  }, [zoom]);

  const toggleMute = () => {
    if (isMuted) {
      onVolumeChange(prevVolume);
      setIsMuted(false);
    } else {
      setPrevVolume(audioState.volume);
      onVolumeChange(0);
      setIsMuted(true);
    }
  };

  return (
    <div className="w-full bg-zinc-900/50 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl">
      <div className="flex flex-col gap-6">
        {/* Track Info */}
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-semibold text-white truncate max-w-[200px]">
                {audioState.fileName || 'No track loaded'}
              </h2>
              {audioState.isPlaying && (
                <div className="flex gap-0.5 h-3 items-end">
                  {[1, 2, 3].map(i => (
                    <div 
                      key={i}
                      className="w-1 bg-indigo-500 animate-bounce" 
                      style={{ animationDuration: `${0.5 + i * 0.2}s` }}
                    />
                  ))}
                </div>
              )}
            </div>
            <p className="text-sm text-zinc-400">
              {audioState.isLoaded ? 'Ready to process' : 'Import audio to start'}
            </p>
          </div>
          <div className="text-right">
            <div className="font-mono text-sm text-zinc-500">
              {formatTime(audioState.currentTime)} / {formatTime(audioState.duration)}
            </div>
            <div className="mt-1">
              <FrequencyVisualizer analyser={analyser} isPlaying={audioState.isPlaying} />
            </div>
          </div>
        </div>

        {/* Waveform */}
        <div className="relative group">
          <div 
            ref={waveformRef} 
            className={cn(
              "w-full h-20 rounded-xl overflow-hidden transition-opacity duration-500",
              audioState.isLoaded ? "opacity-100" : "opacity-20 pointer-events-none"
            )}
          />
          {audioState.isLoaded && (
            <div className="absolute right-2 bottom-2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-2 bg-black/40 backdrop-blur-md px-2 py-1 rounded-lg border border-white/10">
              <span className="text-[10px] font-bold text-zinc-500 uppercase">Zoom</span>
              <input 
                type="range" 
                min="0" 
                max="100" 
                value={zoom} 
                onChange={(e) => setZoom(parseInt(e.target.value))}
                className="w-16 accent-indigo-500 h-1 rounded-full appearance-none cursor-pointer bg-zinc-800"
              />
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <button 
              onClick={toggleMute}
              className="p-2 text-zinc-400 hover:text-white transition-colors"
            >
              {isMuted || audioState.volume === 0 ? <VolumeX size={20} /> : <Volume2 size={20} />}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={audioState.volume}
              onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
              className="w-24 accent-indigo-500 bg-zinc-800 h-1 rounded-full appearance-none cursor-pointer"
            />
          </div>

          <div className="flex items-center gap-6">
            <button className="p-2 text-zinc-400 hover:text-white transition-colors">
              <SkipBack size={24} />
            </button>
            <button 
              onClick={onPlayPause}
              disabled={!audioState.isLoaded}
              className={cn(
                "w-16 h-16 rounded-full flex items-center justify-center transition-all transform active:scale-95 shadow-lg",
                audioState.isLoaded 
                  ? "bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-500/20" 
                  : "bg-zinc-800 text-zinc-600 cursor-not-allowed"
              )}
            >
              {audioState.isPlaying ? <Pause size={32} fill="currentColor" /> : <Play size={32} fill="currentColor" className="ml-1" />}
            </button>
            <button className="p-2 text-zinc-400 hover:text-white transition-colors">
              <SkipForward size={24} />
            </button>
          </div>

          <div className="w-32" /> {/* Spacer for symmetry */}
        </div>
      </div>
    </div>
  );
};

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// Helper to convert AudioBuffer to WAV Blob (simplified version for WaveSurfer)
function bufferToWav(buffer: AudioBuffer): Blob {
  const numOfChan = buffer.numberOfChannels;
  const length = buffer.length * numOfChan * 2 + 44;
  const bufferArr = new ArrayBuffer(length);
  const view = new DataView(bufferArr);
  const channels = [];
  let i;
  let sample;
  let offset = 0;
  let pos = 0;

  function setUint16(data: number) { view.setUint16(pos, data, true); pos += 2; }
  function setUint32(data: number) { view.setUint32(pos, data, true); pos += 4; }

  setUint32(0x46464952); setUint32(length - 8); setUint32(0x45564157);
  setUint32(0x20746d66); setUint32(16); setUint16(1); setUint16(numOfChan);
  setUint32(buffer.sampleRate); setUint32(buffer.sampleRate * 2 * numOfChan);
  setUint16(numOfChan * 2); setUint16(16);
  setUint32(0x61746164); setUint32(length - pos - 4);

  for (i = 0; i < buffer.numberOfChannels; i++) channels.push(buffer.getChannelData(i));
  while (pos < length) {
    for (i = 0; i < numOfChan; i++) {
      sample = Math.max(-1, Math.min(1, channels[i][offset]));
      sample = (sample < 0 ? sample * 0x8000 : sample * 0x7fff) | 0;
      view.setInt16(pos, sample, true);
      pos += 2;
    }
    offset++;
  }
  return new Blob([bufferArr], { type: "audio/wav" });
}
