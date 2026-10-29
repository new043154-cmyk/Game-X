import React, { useState } from 'react';
import { X, Volume2, Monitor, Sliders, Maximize, RotateCcw } from 'lucide-react';
import { soundFx } from '../game/SoundFx';

interface SettingsModalProps {
  onClose: () => void;
  onReturnToLobby: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ onClose, onReturnToLobby }) => {
  const [volume, setVolume] = useState(soundFx.volume);
  const [graphicsPreset, setGraphicsPreset] = useState<'performance' | 'balanced' | 'ultra'>('balanced');
  const [camSens, setCamSens] = useState(1.0);

  const handleVolumeChange = (v: number) => {
    setVolume(v);
    soundFx.volume = v;
  };

  const requestFullscreenLandscape = () => {
    try {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen();
      }
      if ('screen' in window && 'orientation' in window.screen && 'lock' in (window.screen.orientation as { lock?: (o: string) => Promise<void> })) {
        (window.screen.orientation as unknown as { lock: (o: string) => Promise<void> }).lock('landscape').catch(() => {});
      }
    } catch {
      // Ignored
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm pointer-events-auto select-none font-mono">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-md rounded-2xl shadow-2xl p-6 space-y-5">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-orange-500" />
            <h2 className="text-white font-bold text-base">GAME SETTINGS & ACCESSIBILITY</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded bg-slate-800 text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Audio Volume */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-slate-300">
            <span className="flex items-center gap-1.5"><Volume2 className="w-4 h-4 text-cyan-400" /> Master Volume</span>
            <span className="tabular-nums font-bold">{Math.round(volume * 100)}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={volume}
            onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
            className="w-full accent-orange-500"
          />
        </div>

        {/* Sensitivity */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-slate-300">
            <span>Camera Sensitivity</span>
            <span className="tabular-nums font-bold">{camSens.toFixed(1)}x</span>
          </div>
          <input
            type="range"
            min="0.5"
            max="2.5"
            step="0.1"
            value={camSens}
            onChange={(e) => setCamSens(parseFloat(e.target.value))}
            className="w-full accent-orange-500"
          />
        </div>

        {/* Graphics Preset */}
        <div className="space-y-2">
          <span className="flex items-center gap-1.5 text-xs text-slate-300">
            <Monitor className="w-4 h-4 text-cyan-400" /> Graphics Target
          </span>
          <div className="grid grid-cols-3 gap-2 text-xs">
            {(['performance', 'balanced', 'ultra'] as const).map((preset) => (
              <button
                key={preset}
                onClick={() => setGraphicsPreset(preset)}
                className={`py-2 rounded-lg border capitalize ${
                  graphicsPreset === preset
                    ? 'bg-orange-600/30 border-orange-500 text-white font-bold'
                    : 'bg-black/50 border-slate-800 text-slate-400'
                }`}
              >
                {preset}
              </button>
            ))}
          </div>
        </div>

        {/* Fullscreen & Landscape API */}
        <button
          onClick={requestFullscreenLandscape}
          className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center justify-center gap-2 text-xs font-bold active:scale-95"
        >
          <Maximize className="w-4 h-4 text-cyan-400" /> Fullscreen & Landscape Lock
        </button>

        {/* Return to Lobby */}
        <div className="pt-2 border-t border-slate-800">
          <button
            onClick={onReturnToLobby}
            className="w-full py-3 rounded-xl bg-red-600/80 hover:bg-red-600 text-white font-bold text-xs flex items-center justify-center gap-2 active:scale-95 transition-all shadow-lg"
          >
            <RotateCcw className="w-4 h-4" /> LEAVE MATCH & RETURN TO LOBBY
          </button>
        </div>
      </div>
    </div>
  );
};
