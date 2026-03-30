import React from 'react';
import { ReverbSettings, EchoSettings, EQSettings } from '../types';
import { Sliders, Zap, Wind, Activity } from 'lucide-react';
import { cn } from '../lib/utils';

interface EffectsPanelProps {
  reverb: ReverbSettings;
  echo: EchoSettings;
  eq: EQSettings;
  onReverbChange: (settings: ReverbSettings) => void;
  onEchoChange: (settings: EchoSettings) => void;
  onEQChange: (settings: EQSettings) => void;
  disabled?: boolean;
}

export const EffectsPanel: React.FC<EffectsPanelProps> = ({
  reverb,
  echo,
  eq,
  onReverbChange,
  onEchoChange,
  onEQChange,
  disabled
}) => {
  return (
    <div className={cn(
      "grid grid-cols-1 md:grid-cols-2 gap-6 transition-opacity duration-300",
      disabled && "opacity-50 pointer-events-none"
    )}>
      {/* Reverb Section */}
      <EffectCard 
        title="Reverb" 
        icon={<Wind size={20} className="text-indigo-400" />}
        description="Simulate acoustic spaces"
      >
        <div className="space-y-4">
          <SliderControl 
            label="Wet Mix" 
            value={reverb.wet} 
            onChange={(v) => onReverbChange({ ...reverb, wet: v })} 
            min={0} max={1} step={0.01}
          />
          <SliderControl 
            label="Room Size" 
            value={reverb.roomSize} 
            onChange={(v) => onReverbChange({ ...reverb, roomSize: v })} 
            min={0.1} max={2} step={0.1}
          />
          <SliderControl 
            label="Decay Time" 
            value={reverb.decay} 
            onChange={(v) => onReverbChange({ ...reverb, decay: v })} 
            min={0.1} max={5} step={0.1}
          />
        </div>
      </EffectCard>

      {/* Echo Section */}
      <EffectCard 
        title="Echo / Delay" 
        icon={<Zap size={20} className="text-amber-400" />}
        description="Time-based repetition"
      >
        <div className="space-y-4">
          <SliderControl 
            label="Wet Mix" 
            value={echo.wet} 
            onChange={(v) => onEchoChange({ ...echo, wet: v })} 
            min={0} max={1} step={0.01}
          />
          <SliderControl 
            label="Delay Time" 
            value={echo.delayTime} 
            onChange={(v) => onEchoChange({ ...echo, delayTime: v })} 
            min={0.05} max={2} step={0.05}
          />
          <SliderControl 
            label="Feedback" 
            value={echo.feedback} 
            onChange={(v) => onEchoChange({ ...echo, feedback: v })} 
            min={0} max={0.9} step={0.01}
          />
        </div>
      </EffectCard>

      {/* EQ Section */}
      <EffectCard 
        title="Equalizer" 
        icon={<Activity size={20} className="text-emerald-400" />}
        description="Tone adjustment"
      >
        <div className="space-y-4">
          <SliderControl 
            label="Bass" 
            value={eq.bass} 
            onChange={(v) => onEQChange({ ...eq, bass: v })} 
            min={-20} max={20} step={1}
            unit="dB"
          />
          <SliderControl 
            label="Mid" 
            value={eq.mid} 
            onChange={(v) => onEQChange({ ...eq, mid: v })} 
            min={-20} max={20} step={1}
            unit="dB"
          />
          <SliderControl 
            label="Treble" 
            value={eq.treble} 
            onChange={(v) => onEQChange({ ...eq, treble: v })} 
            min={-20} max={20} step={1}
            unit="dB"
          />
        </div>
      </EffectCard>

      {/* Presets Card */}
      <EffectCard 
        title="Presets" 
        icon={<Sliders size={20} className="text-rose-400" />}
        description="Quick configurations"
      >
        <div className="grid grid-cols-2 gap-2">
          <PresetButton label="Large Hall" onClick={() => onReverbChange({ ...reverb, wet: 0.6, roomSize: 1.8, decay: 3.5 })} />
          <PresetButton label="Small Room" onClick={() => onReverbChange({ ...reverb, wet: 0.2, roomSize: 0.4, decay: 0.8 })} />
          <PresetButton label="Long Echo" onClick={() => onEchoChange({ ...echo, wet: 0.4, delayTime: 0.8, feedback: 0.6 })} />
          <PresetButton label="Bass Boost" onClick={() => onEQChange({ ...eq, bass: 12, mid: 0, treble: -2 })} />
          <PresetButton label="Reset All" onClick={() => {
            onReverbChange({ wet: 0.3, roomSize: 0.5, decay: 1.5, delay: 0.02 });
            onEchoChange({ wet: 0, feedback: 0.4, delayTime: 0.3 });
            onEQChange({ bass: 0, mid: 0, treble: 0 });
          }} className="col-span-2 bg-zinc-800/50" />
        </div>
      </EffectCard>
    </div>
  );
};

const EffectCard: React.FC<{ title: string; icon: React.ReactNode; description: string; children: React.ReactNode }> = ({
  title, icon, description, children
}) => (
  <div className="bg-zinc-900/40 border border-white/5 rounded-2xl p-5 flex flex-col gap-4">
    <div className="flex items-center gap-3">
      <div className="p-2 bg-zinc-800 rounded-lg">{icon}</div>
      <div>
        <h3 className="font-medium text-white">{title}</h3>
        <p className="text-xs text-zinc-500">{description}</p>
      </div>
    </div>
    <div className="flex-1">{children}</div>
  </div>
);

const SliderControl: React.FC<{ label: string; value: number; onChange: (v: number) => void; min: number; max: number; step: number; unit?: string }> = ({
  label, value, onChange, min, max, step, unit = ""
}) => (
  <div className="space-y-1">
    <div className="flex justify-between text-xs font-medium">
      <span className="text-zinc-400">{label}</span>
      <span className="text-indigo-400">{value}{unit}</span>
    </div>
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(parseFloat(e.target.value))}
      className="w-full accent-indigo-500 bg-zinc-800 h-1.5 rounded-full appearance-none cursor-pointer"
    />
  </div>
);

const PresetButton: React.FC<{ label: string; onClick: () => void; className?: string }> = ({ label, onClick, className }) => (
  <button
    onClick={onClick}
    className={cn(
      "px-3 py-2 text-xs font-medium text-zinc-300 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors border border-white/5",
      className
    )}
  >
    {label}
  </button>
);
