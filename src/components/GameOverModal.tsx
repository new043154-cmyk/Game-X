import React from 'react';
import { Trophy, Skull, RotateCcw, Eye } from 'lucide-react';

interface GameOverModalProps {
  isWinner: boolean;
  winnerName: string | null;
  kills: number;
  placement: number;
  totalPlayers: number;
  onReturnToLobby: () => void;
  onSpectate: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  isWinner,
  kills,
  placement,
  totalPlayers,
  onReturnToLobby,
  onSpectate,
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md pointer-events-auto select-none font-mono">
      <div className="bg-slate-900 border-2 border-slate-700 w-full max-w-md rounded-2xl shadow-2xl p-6 sm:p-8 text-center space-y-6 animate-in fade-in zoom-in-95 duration-200">
        {/* Banner */}
        {isWinner ? (
          <div className="space-y-2">
            <div className="w-16 h-16 rounded-full bg-orange-500/20 border-2 border-orange-400 mx-auto flex items-center justify-center shadow-orange-500/50 shadow-2xl animate-bounce">
              <Trophy className="w-8 h-8 text-orange-400" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-orange-400 to-red-500 tracking-wider">
              VICTORY ROYALE!
            </h1>
            <p className="text-xs text-orange-300 tracking-widest uppercase">#1 SURVIVOR OF FRONTIER ISLAND</p>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="w-16 h-16 rounded-full bg-red-500/20 border-2 border-red-500 mx-auto flex items-center justify-center">
              <Skull className="w-8 h-8 text-red-500" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-wider">
              ELIMINATED
            </h1>
            <p className="text-xs text-red-400 tracking-widest uppercase">
              RANK #{placement} / {totalPlayers}
            </p>
          </div>
        )}

        {/* Match Statistics Card */}
        <div className="grid grid-cols-2 gap-3 bg-black/50 p-4 rounded-xl border border-slate-800">
          <div className="flex flex-col items-center">
            <span className="text-[11px] text-slate-400 uppercase">Eliminations</span>
            <span className="text-xl font-black text-white tabular-nums">{kills}</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-[11px] text-slate-400 uppercase">Placement</span>
            <span className="text-xl font-black text-orange-400 tabular-nums">#{placement}</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-3">
          {!isWinner && (
            <button
              onClick={onSpectate}
              className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center justify-center gap-2 border border-slate-700 active:scale-95 transition-all"
            >
              <Eye className="w-4 h-4 text-cyan-400" /> SPECTATE MATCH
            </button>
          )}

          <button
            onClick={onReturnToLobby}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-400 hover:to-red-500 text-white font-black text-sm tracking-wider flex items-center justify-center gap-2 shadow-2xl active:scale-95 transition-transform"
          >
            <RotateCcw className="w-4 h-4" /> RETURN TO LOBBY
          </button>
        </div>
      </div>
    </div>
  );
};
