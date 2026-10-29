import React from 'react';
import { X, MapPin } from 'lucide-react';
import { NetSafeZone } from '../game/NetworkClient';

interface TacticalMapModalProps {
  playerX: number;
  playerZ: number;
  playerRotY: number;
  safeZone: NetSafeZone;
  onClose: () => void;
}

export const TacticalMapModal: React.FC<TacticalMapModalProps> = ({
  playerX,
  playerZ,
  playerRotY,
  safeZone,
  onClose,
}) => {
  // Map world bounds (-150 to 150) converted to percentage (0% to 100%)
  const worldToMap = (x: number, z: number) => {
    const px = ((x + 150) / 300) * 100;
    const py = ((z + 150) / 300) * 100;
    return { x: px, y: py };
  };

  const pPos = worldToMap(playerX, playerZ);
  const szCenter = worldToMap(safeZone.centerX, safeZone.centerZ);
  const szRadiusPct = (safeZone.radius / 300) * 100;

  const compounds = [
    { name: 'Central Base', x: 0, z: 0 },
    { name: 'Airport Runway', x: -65, z: 50 },
    { name: 'Industrial Port', x: 65, z: -35 },
    { name: 'Observatory', x: -30, z: -70 },
    { name: 'Riverside Village', x: 45, z: 55 },
    { name: 'Underground Bunker', x: 25, z: -65 },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm pointer-events-auto select-none">
      <div className="bg-slate-900 border-2 border-slate-700 w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-800 bg-slate-950">
          <div className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-cyan-400" />
            <span className="font-mono font-black text-sm text-white">FRONTIER ISLAND — TACTICAL SATELLITE MAP</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded bg-slate-800 text-slate-300 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Map Canvas Frame */}
        <div className="relative aspect-square w-full max-w-lg mx-auto bg-slate-950 overflow-hidden border border-slate-800 m-4 rounded-xl">
          {/* Island Landmass shape */}
          <div className="absolute inset-4 rounded-full bg-emerald-950/60 border-2 border-emerald-700/50 [clip-path:polygon(50%_0%,85%_15%,100%_55%,85%_90%,45%_100%,10%_80%,0%_45%,15%_10%)]"></div>

          {/* Grid lines */}
          <div className="absolute inset-0 grid grid-cols-6 grid-rows-6 border border-slate-800/40 pointer-events-none">
            {Array.from({ length: 36 }).map((_, i) => (
              <div key={i} className="border border-slate-700/20 text-[9px] font-mono text-slate-600 p-0.5">
                {String.fromCharCode(65 + Math.floor(i / 6))}
                {(i % 6) + 1}
              </div>
            ))}
          </div>

          {/* Safe Zone Circle */}
          <div
            className="absolute rounded-full border-2 border-cyan-400 bg-cyan-500/10 -translate-x-1/2 -translate-y-1/2 pointer-events-none animate-pulse"
            style={{
              left: `${szCenter.x}%`,
              top: `${szCenter.y}%`,
              width: `${szRadiusPct * 2}%`,
              height: `${szRadiusPct * 2}%`,
            }}
          ></div>

          {/* Compounds Labels */}
          {compounds.map((c) => {
            const pos = worldToMap(c.x, c.z);
            return (
              <div
                key={c.name}
                className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center pointer-events-none"
                style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
              >
                <div className="w-2 h-2 rounded-full bg-orange-400 shadow"></div>
                <span className="text-[9px] font-mono font-bold text-slate-300 bg-black/70 px-1 rounded whitespace-nowrap">
                  {c.name}
                </span>
              </div>
            );
          })}

          {/* Player Marker */}
          <div
            className="absolute w-4 h-4 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-none"
            style={{ left: `${pPos.x}%`, top: `${pPos.y}%` }}
          >
            <div
              className="w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-b-[10px] border-b-orange-500 drop-shadow-[0_0_6px_rgba(255,87,34,0.9)]"
              style={{ transform: `rotate(${(-playerRotY * 180) / Math.PI}deg)` }}
            ></div>
          </div>
        </div>

        {/* Footer info */}
        <div className="px-5 py-2.5 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs font-mono text-slate-400">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-orange-500"></span> You
            <span className="w-2.5 h-2.5 rounded-full border border-cyan-400 ml-3"></span> Safe Zone
          </div>
          <span>Grid Scale: 1:50m</span>
        </div>
      </div>
    </div>
  );
};
