import React, { useState } from 'react';
import { Play, Download, Shield, Crosshair, Users, Target } from 'lucide-react';

interface TitleScreenProps {
  onStartGame: (playerName: string, playerColor: string, mode: string) => void;
  onOpenExport: () => void;
  onOpenSettings: () => void;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({
  onStartGame,
  onOpenExport,
}) => {
  const [callsign, setCallsign] = useState('Ghost-01');
  const [selectedColor, setSelectedColor] = useState('#ff5722');
  const [selectedMode, setSelectedMode] = useState('br_solo');

  const camoColors = [
    { name: 'Vanguard Orange', hex: '#ff5722' },
    { name: 'Spec-Ops Cyan', hex: '#00e5ff' },
    { name: 'Desert Tan', hex: '#ca8a04' },
    { name: 'Jungle Olive', hex: '#16a34a' },
    { name: 'Midnight Violet', hex: '#9333ea' },
    { name: 'Crimson Hazard', hex: '#e11d48' },
  ];

  const modes = [
    {
      id: 'br_solo',
      title: 'SOLO BATTLE ROYALE',
      desc: 'Survive against 20 operators on Frontier Island. One survivor takes all.',
      icon: Crosshair,
      tag: 'RANKED',
    },
    {
      id: 'tdm',
      title: 'TEAM DEATHMATCH',
      desc: 'Rapid 4v4 compound firefights with instant respawns and tactical buggies.',
      icon: Users,
      tag: 'FAST PACED',
    },
    {
      id: 'training',
      title: 'TRAINING GROUNDS',
      desc: 'Test all weapons, practice long-distance sniping, and master buggy physics.',
      icon: Target,
      tag: 'PRACTICE',
    },
  ];

  const handleStart = () => {
    onStartGame(callsign.trim() || 'Ghost-01', selectedColor, selectedMode);
  };

  return (
    <div className="absolute inset-0 z-20 flex flex-col justify-between p-6 sm:p-12 bg-gradient-to-r from-black/90 via-black/60 to-transparent pointer-events-auto select-none overflow-y-auto">
      {/* TOP BRANDING & BESPOKE INLINE SVG TITLE LOCKUP */}
      <div className="flex flex-col items-start max-w-xl">
        <div className="flex items-center gap-2 mb-2 px-3 py-1 rounded bg-orange-600/20 border border-orange-500/40 text-orange-400 font-mono text-xs tracking-widest uppercase">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          Authoritative 20Hz Dedicated Server Online
        </div>

        {/* Bespoke Tactical Inline SVG Title Lockup */}
        <div className="my-2">
          <svg className="w-72 sm:w-96 h-20" viewBox="0 0 400 80" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="titleGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stop-color="#ffffff" />
                <stop offset="55%" stop-color="#f8fafc" />
                <stop offset="75%" stop-color="#ff5722" />
                <stop offset="100%" stop-color="#00e5ff" />
              </linearGradient>
              <linearGradient id="xGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#ff7043" />
                <stop offset="100%" stop-color="#ff1744" />
              </linearGradient>
            </defs>

            {/* Geometric Tactical Slash Lines */}
            <line x1="10" y1="12" x2="330" y2="12" stroke="#ff5722" stroke-width="2" stroke-opacity="0.8" />
            <line x1="280" y1="12" x2="380" y2="12" stroke="#00e5ff" stroke-width="3" />
            
            {/* Main Wordmark */}
            <text
              x="12"
              y="58"
              font-family="system-ui, -apple-system, sans-serif"
              font-weight="900"
              font-size="44"
              letter-spacing="4"
              fill="url(#titleGrad)"
            >
              BATTLEZONE
            </text>

            {/* Tactical 'X' Glyph */}
            <g transform="translate(355, 42)">
              <path
                d="M-18 -24 L-2 0 L-18 24 H-6 L5 7 L16 24 H28 L12 0 L28 -24 H16 L5 -7 L-6 -24 Z"
                fill="url(#xGrad)"
                filter="drop-shadow(0 0 10px rgba(255, 87, 34, 0.8))"
              />
            </g>

            {/* Subtitle Tech Markings */}
            <text x="14" y="74" font-family="monospace" font-size="10" font-weight="bold" letter-spacing="3" fill="#94a3b8">
              TACTICAL ONLINE 3D BATTLE ROYALE
            </text>
          </svg>
        </div>

        <p className="text-slate-300 text-sm sm:text-base leading-relaxed mt-1 font-light max-w-md">
          Drop onto Frontier Island. Scavenge high-tier assault weapons, pilot tactical buggies, and outlive 20 operators as the electromagnetic safe zone closes in.
        </p>
      </div>

      {/* MIDDLE: CALLSIGN & MODE SELECTION */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl my-6">
        {/* Callsign & Customization Card */}
        <div className="bg-slate-900/80 border border-slate-700/80 p-5 rounded-2xl shadow-2xl backdrop-blur-none">
          <label className="block text-xs font-mono uppercase text-slate-400 mb-2 font-bold tracking-wider">
            Operator Call-sign
          </label>
          <input
            type="text"
            value={callsign}
            maxLength={16}
            onChange={(e) => setCallsign(e.target.value)}
            className="w-full bg-black/60 border border-slate-700 rounded-lg px-4 py-2.5 text-white font-mono text-base focus:outline-none focus:border-orange-500 mb-4"
            placeholder="Enter call-sign..."
          />

          <label className="block text-xs font-mono uppercase text-slate-400 mb-2 font-bold tracking-wider">
            Combat Armor Camo
          </label>
          <div className="grid grid-cols-6 gap-2">
            {camoColors.map((c) => (
              <button
                key={c.hex}
                onClick={() => setSelectedColor(c.hex)}
                className={`h-9 rounded-lg border-2 transition-all flex items-center justify-center ${
                  selectedColor === c.hex ? 'border-white scale-110 shadow-lg' : 'border-transparent opacity-75'
                }`}
                style={{ backgroundColor: c.hex }}
                title={c.name}
              >
                {selectedColor === c.hex && <Shield className="w-4 h-4 text-white drop-shadow" />}
              </button>
            ))}
          </div>
        </div>

        {/* Game Mode Selector */}
        <div className="flex flex-col gap-2.5">
          {modes.map((m) => {
            const Icon = m.icon;
            const isSelected = selectedMode === m.id;
            return (
              <div
                key={m.id}
                onClick={() => setSelectedMode(m.id)}
                className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                  isSelected
                    ? 'bg-orange-600/20 border-orange-500 shadow-xl'
                    : 'bg-black/50 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <Icon className={`w-4 h-4 ${isSelected ? 'text-orange-400' : 'text-slate-400'}`} />
                    <span className="font-mono font-bold text-sm text-white">{m.title}</span>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-bold">
                    {m.tag}
                  </span>
                </div>
                <p className="text-xs text-slate-400">{m.desc}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* BOTTOM ACTION BAR */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-800/80 pt-5">
        {/* Primary Start CTA */}
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            onClick={handleStart}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-3 bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-400 hover:to-red-500 text-white font-mono font-black text-lg px-8 py-4 rounded-xl shadow-2xl border-2 border-orange-400/50 active:scale-95 transition-transform"
          >
            <Play className="w-6 h-6 fill-white" />
            ENTER BATTLEFIELD
          </button>

          <button
            onClick={onOpenExport}
            className="flex items-center gap-2 bg-slate-900/90 hover:bg-slate-800 text-slate-200 border border-slate-700 px-5 py-4 rounded-xl font-mono text-sm active:scale-95 transition-all shadow-lg"
            title="Android APK & Architecture Code"
          >
            <Download className="w-5 h-5 text-cyan-400" />
            <span className="hidden sm:inline">APK & Source Code</span>
          </button>
        </div>

        {/* Single Flat Control-Hint Line */}
        <div className="text-xs font-mono text-slate-400 bg-black/60 px-4 py-2 rounded-lg border border-slate-800 flex items-center gap-2">
          <span className="text-cyan-400">Controls:</span>
          <span>WASD Move · Space Jump · Click / Tap Fire · F Drive/Loot · Esc Settings</span>
        </div>
      </div>
    </div>
  );
};
