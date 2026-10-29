import React, { useRef, useState, useEffect } from 'react';
import { NetSafeZone, EliminationRecord } from '../game/NetworkClient';
import { GameEngine } from '../game/GameEngine';
import {
  Shield,
  Heart,
  Crosshair as CrosshairIcon,
  RotateCw,
  Compass,
  MapPin,
  Volume2,
  VolumeX,
  Settings,
  Car,
  Package,
} from 'lucide-react';
import { soundFx } from '../game/SoundFx';

interface HUDProps {
  engine: GameEngine;
  health: number;
  armor: number;
  kills: number;
  isAlive: boolean;
  currentAmmo: number;
  reserveAmmo: number;
  isReloading: boolean;
  reloadProgress: number;
  isADS: boolean;
  weaponName: string;
  safeZone: NetSafeZone;
  nearbyPrompt: string | null;
  isOutsideZone: boolean;
  isDriving: boolean;
  vehicleSpeed: number;
  ping: number;
  eliminations: EliminationRecord[];
  onOpenSettings: () => void;
  onOpenMap: () => void;
}

export const HUD: React.FC<HUDProps> = ({
  engine,
  health,
  armor,
  kills,
  isAlive,
  currentAmmo,
  reserveAmmo,
  isReloading,
  reloadProgress,
  isADS,
  weaponName,
  safeZone,
  nearbyPrompt,
  isOutsideZone,
  isDriving,
  vehicleSpeed,
  ping,
  eliminations,
  onOpenSettings,
  onOpenMap,
}) => {
  const [audioEnabled, setAudioEnabled] = useState(soundFx.enabled);
  const [activeSlot, setActiveSlot] = useState(engine.inventory.activeSlot);

  // Virtual Joystick touch state
  const joystickRef = useRef<HTMLDivElement>(null);
  const [joystickPos, setJoystickPos] = useState({ x: 0, y: 0 });
  const [isJoystickActive, setIsJoystickActive] = useState(false);
  const joystickTouchId = useRef<number | null>(null);
  const joystickCenter = useRef({ x: 0, y: 0 });

  // Camera look drag state (right half of touch screen)
  const lookTouchId = useRef<number | null>(null);
  const lastLookPos = useRef({ x: 0, y: 0 });

  // Handle Joystick Touch
  const handleJoystickTouchStart = (e: React.TouchEvent) => {
    const touch = e.changedTouches[0];
    if (!touch || !joystickRef.current) return;
    const rect = joystickRef.current.getBoundingClientRect();
    joystickCenter.current = {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    };
    joystickTouchId.current = touch.identifier;
    setIsJoystickActive(true);
    handleJoystickMove(touch.clientX, touch.clientY);
  };

  const handleJoystickMove = (clientX: number, clientY: number) => {
    const maxRadius = 45;
    const dx = clientX - joystickCenter.current.x;
    const dy = clientY - joystickCenter.current.y;
    const dist = Math.hypot(dx, dy);
    const clampedDist = Math.min(dist, maxRadius);
    const angle = Math.atan2(dy, dx);

    const nx = (Math.cos(angle) * clampedDist) / maxRadius;
    const ny = (Math.sin(angle) * clampedDist) / maxRadius;

    setJoystickPos({ x: nx * 35, y: ny * 35 });

    // Send to game engine: ny is forward/backward (-1 to 1), nx is right/left (-1 to 1)
    engine.input.forward = -ny;
    engine.input.right = nx;
    engine.input.sprint = clampedDist > maxRadius * 0.85; // Auto sprint when pushed to edge
  };

  const handleJoystickTouchEnd = (e: React.TouchEvent) => {
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === joystickTouchId.current) {
        joystickTouchId.current = null;
        setIsJoystickActive(false);
        setJoystickPos({ x: 0, y: 0 });
        engine.input.forward = 0;
        engine.input.right = 0;
        engine.input.sprint = false;
        break;
      }
    }
  };

  // Handle Right-Side Touch Look Area
  const handleLookTouchStart = (e: React.TouchEvent) => {
    const touch = e.changedTouches[0];
    if (!touch) return;
    // Only capture if not clicking a button
    const target = e.target as HTMLElement;
    if (target.closest('button')) return;

    lookTouchId.current = touch.identifier;
    lastLookPos.current = { x: touch.clientX, y: touch.clientY };
  };

  const handleLookTouchMove = (e: React.TouchEvent) => {
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (touch.identifier === lookTouchId.current) {
        const dx = touch.clientX - lastLookPos.current.x;
        const dy = touch.clientY - lastLookPos.current.y;
        lastLookPos.current = { x: touch.clientX, y: touch.clientY };

        engine.input.lookX += dx * 1.5;
        engine.input.lookY += dy * 1.5;
        break;
      }
    }
  };

  const handleLookTouchEnd = (e: React.TouchEvent) => {
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === lookTouchId.current) {
        lookTouchId.current = null;
        break;
      }
    }
  };

  const toggleAudio = () => {
    soundFx.enabled = !audioEnabled;
    setAudioEnabled(!audioEnabled);
  };

  const switchWeaponSlot = (slot: number) => {
    engine.inventory.switchSlot(slot);
    setActiveSlot(slot);
  };

  // Keyboard desktop input listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;
      if (e.code === 'KeyW') engine.input.forward = 1;
      if (e.code === 'KeyS') engine.input.forward = -1;
      if (e.code === 'KeyA') engine.input.right = -1;
      if (e.code === 'KeyD') engine.input.right = 1;
      if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') engine.input.sprint = true;
      if (e.code === 'Space') engine.input.jump = true;
      if (e.code === 'KeyC') engine.isCrouched = !engine.isCrouched;
      if (e.code === 'KeyZ') engine.isProne = !engine.isProne;
      if (e.code === 'KeyR') engine.reloadWeapon();
      if (e.code === 'KeyF') engine.handleInteract();
      if (e.code === 'Digit1') switchWeaponSlot(0);
      if (e.code === 'Digit2') switchWeaponSlot(1);
      if (e.code === 'Digit3') switchWeaponSlot(2);
      if (e.code === 'KeyM') onOpenMap();
      if (e.code === 'Escape') onOpenSettings();
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'KeyW' || e.code === 'KeyS') engine.input.forward = 0;
      if (e.code === 'KeyA' || e.code === 'KeyD') engine.input.right = 0;
      if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') engine.input.sprint = false;
      if (e.code === 'Space') engine.input.jump = false;
    };

    const handleMouseDown = (e: MouseEvent) => {
      if (e.button === 0) engine.fireWeapon();
      if (e.button === 2) {
        e.preventDefault();
        engine.inventory.isADS = !engine.inventory.isADS;
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (document.pointerLockElement) {
        engine.input.lookX += e.movementX;
        engine.input.lookY += e.movementY;
      }
    };

    const handleContextMenu = (e: MouseEvent) => e.preventDefault();

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('contextmenu', handleContextMenu);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('contextmenu', handleContextMenu);
    };
  }, [engine, onOpenMap, onOpenSettings]);

  const compassHeading = Math.round(((engine.playerRotY * 180) / Math.PI + 360) % 360);

  return (
    <div
      className="absolute inset-0 pointer-events-none select-none overflow-hidden"
      onTouchStart={handleLookTouchStart}
      onTouchMove={handleLookTouchMove}
      onTouchEnd={handleLookTouchEnd}
    >
      {/* Safe Zone Out-of-Bounds Screen Flashing Warning */}
      {isOutsideZone && (
        <div className="absolute inset-0 pointer-events-none border-[12px] border-cyan-500/40 bg-cyan-950/20 animate-pulse flex items-center justify-center">
          <div className="bg-red-600/90 text-white font-mono px-6 py-2 rounded-lg text-sm tracking-widest font-black uppercase shadow-2xl animate-bounce">
            WARNING: OUTSIDE SAFE ZONE — RADIATION HAZARD
          </div>
        </div>
      )}

      {/* TOP STATUS BAR CLUSTER */}
      <div className="absolute top-3 inset-x-0 flex items-start justify-between px-4 sm:px-8">
        {/* Left: Elimination Killfeed */}
        <div className="flex flex-col gap-1 w-60 text-xs font-mono">
          {eliminations.slice(-3).map((kill) => (
            <div
              key={kill.id}
              className="bg-black/60 border-l-2 border-orange-500 px-2 py-1 text-slate-200 rounded flex items-center justify-between"
            >
              <span className="text-orange-400 font-bold truncate max-w-[80px]">{kill.killerName}</span>
              <span className="text-slate-400 text-[10px]">[{kill.weapon}]</span>
              <span className="text-red-400 truncate max-w-[80px]">{kill.victimName}</span>
            </div>
          ))}
        </div>

        {/* Center: Match Status & Safe Zone Countdown */}
        <div className="flex flex-col items-center">
          <div className="flex items-center gap-3 bg-black/75 border border-slate-700/80 px-4 py-1.5 rounded-full shadow-2xl">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span className="text-xs text-slate-400 uppercase font-mono">Alive</span>
              <span className="font-bold font-mono text-sm text-emerald-400 tabular-nums">
                {engine.remotePlayers.size + (isAlive ? 1 : 0)}
              </span>
            </div>
            <div className="w-px h-3 bg-slate-700"></div>
            <div className="flex items-center gap-1.5">
              <CrosshairIcon className="w-3.5 h-3.5 text-orange-400" />
              <span className="text-xs text-slate-400 uppercase font-mono">Kills</span>
              <span className="font-bold font-mono text-sm text-orange-400 tabular-nums">{kills}</span>
            </div>
            <div className="w-px h-3 bg-slate-700"></div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-cyan-400 uppercase font-mono">Zone {safeZone.phase}</span>
              <span className="font-bold font-mono text-sm text-white tabular-nums">
                {Math.floor(safeZone.timeRemaining / 60)}:
                {(safeZone.timeRemaining % 60).toString().padStart(2, '0')}
              </span>
            </div>
          </div>

          {/* Compass Ribbon */}
          <div className="mt-1 flex items-center gap-1 text-[11px] font-mono text-slate-400 bg-black/40 px-3 py-0.5 rounded">
            <Compass className="w-3 h-3 text-cyan-400" />
            <span className="tabular-nums font-bold text-white">{compassHeading}°</span>
            <span>
              {compassHeading > 337 || compassHeading <= 22
                ? 'N'
                : compassHeading <= 67
                ? 'NE'
                : compassHeading <= 112
                ? 'E'
                : compassHeading <= 157
                ? 'SE'
                : compassHeading <= 202
                ? 'S'
                : compassHeading <= 247
                ? 'SW'
                : compassHeading <= 292
                ? 'W'
                : 'NW'}
            </span>
          </div>
        </div>

        {/* Right: Radar Mini-Map & Tactical Controls */}
        <div className="flex items-start gap-2">
          {/* Tactical Mini-Map Box */}
          <button
            onClick={onOpenMap}
            className="pointer-events-auto relative w-22 h-22 sm:w-24 sm:h-24 bg-slate-900/80 border-2 border-slate-700 rounded-lg overflow-hidden shadow-2xl active:scale-95 transition-transform"
          >
            {/* Simulated Radar Ping Grid */}
            <div className="absolute inset-0 bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:12px_12px] opacity-20"></div>
            {/* Safe Zone circle on minimap */}
            <div className="absolute inset-2 border border-cyan-400/60 rounded-full animate-pulse"></div>
            {/* Player marker in center */}
            <div
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-b-[8px] border-b-orange-500"
              style={{ transform: `translate(-50%, -50%) rotate(${compassHeading}deg)` }}
            ></div>
            <div className="absolute bottom-0.5 right-1 text-[9px] font-mono text-slate-400 flex items-center gap-0.5">
              <MapPin className="w-2.5 h-2.5 text-cyan-400" /> MAP
            </div>
          </button>

          {/* Quick System Buttons */}
          <div className="flex flex-col gap-1 pointer-events-auto">
            <button
              onClick={toggleAudio}
              className="p-1.5 bg-black/60 hover:bg-black/80 text-slate-300 rounded border border-slate-700 active:scale-90"
              title="Toggle Audio"
            >
              {audioEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4 text-red-400" />}
            </button>
            <button
              onClick={onOpenSettings}
              className="p-1.5 bg-black/60 hover:bg-black/80 text-slate-300 rounded border border-slate-700 active:scale-90"
              title="Settings"
            >
              <Settings className="w-4 h-4 text-slate-300" />
            </button>
            <div className="text-[10px] font-mono text-slate-400 text-center bg-black/60 px-1 py-0.5 rounded border border-slate-800">
              {ping}ms
            </div>
          </div>
        </div>
      </div>

      {/* CENTER CROSSHAIR / ADS OPTICAL SCOPE */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        {isADS ? (
          // Sniper / Holographic ADS reticle
          <div className="relative w-72 h-72 rounded-full border border-cyan-400/80 flex items-center justify-center bg-radial-gradient">
            <div className="absolute w-full h-px bg-cyan-400/60"></div>
            <div className="absolute h-full w-px bg-cyan-400/60"></div>
            <div className="w-2 h-2 rounded-full bg-red-500/80"></div>
            {/* Mil-dots */}
            <div className="absolute top-1/4 w-1.5 h-0.5 bg-cyan-400"></div>
            <div className="absolute bottom-1/4 w-1.5 h-0.5 bg-cyan-400"></div>
            <div className="absolute left-1/4 w-0.5 h-1.5 bg-cyan-400"></div>
            <div className="absolute right-1/4 w-0.5 h-1.5 bg-cyan-400"></div>
          </div>
        ) : (
          // Standard dynamic tactical crosshair
          <div className="relative w-8 h-8 flex items-center justify-center">
            <div className="absolute top-0 w-0.5 h-2 bg-white/80 shadow"></div>
            <div className="absolute bottom-0 w-0.5 h-2 bg-white/80 shadow"></div>
            <div className="absolute left-0 h-0.5 w-2 bg-white/80 shadow"></div>
            <div className="absolute right-0 h-0.5 w-2 bg-white/80 shadow"></div>
            <div className="w-1 h-1 rounded-full bg-cyan-400"></div>
          </div>
        )}

        {/* Hitmarker Flash "X" on Target Hit */}
        {engine.isHitmarkerActive && (
          <div className="absolute w-8 h-8 pointer-events-none animate-ping">
            <div className="absolute inset-0 border-2 border-red-500 rotate-45 scale-75"></div>
          </div>
        )}
      </div>

      {/* DYNAMIC CONTEXT INTERACTION PROMPT */}
      {nearbyPrompt && (
        <div className="absolute top-2/3 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-auto">
          <button
            onClick={() => engine.handleInteract()}
            className="flex items-center gap-2 bg-orange-600 hover:bg-orange-500 active:scale-95 text-white font-mono px-5 py-2.5 rounded-full shadow-2xl border-2 border-white/40 tracking-wider font-bold animate-bounce"
          >
            {isDriving ? <Car className="w-5 h-5" /> : <Package className="w-5 h-5" />}
            {nearbyPrompt}
          </button>
        </div>
      )}

      {/* BOTTOM-LEFT: VIRTUAL JOYSTICK & STANCE */}
      <div className="absolute bottom-6 left-6 pointer-events-auto flex items-end gap-3">
        {/* Analog Touch Joystick */}
        <div
          ref={joystickRef}
          onTouchStart={handleJoystickTouchStart}
          onTouchMove={(e) => {
            const touch = Array.from(e.changedTouches).find((t) => t.identifier === joystickTouchId.current);
            if (touch) handleJoystickMove(touch.clientX, touch.clientY);
          }}
          onTouchEnd={handleJoystickTouchEnd}
          className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-full border-2 border-slate-600/70 bg-black/40 flex items-center justify-center shadow-2xl backdrop-blur-none touch-none"
        >
          {/* Outer sprint lock ring indicator */}
          <div className="absolute inset-2 rounded-full border border-dashed border-orange-500/40"></div>
          {/* Thumb Nub */}
          <div
            className={`w-12 h-12 rounded-full bg-gradient-to-br from-slate-400 to-slate-700 border-2 border-white/60 shadow-lg transition-transform duration-75 ${
              isJoystickActive ? 'scale-110' : ''
            }`}
            style={{
              transform: `translate(${joystickPos.x}px, ${joystickPos.y}px)`,
            }}
          >
            <div className="w-full h-full flex items-center justify-center text-[10px] font-black text-slate-900 font-mono">
              MOVE
            </div>
          </div>
        </div>

        {/* Crouch & Prone Buttons */}
        <div className="flex flex-col gap-2">
          <button
            onClick={() => {
              engine.isCrouched = !engine.isCrouched;
              engine.isProne = false;
            }}
            className={`w-11 h-11 rounded-full border flex items-center justify-center text-xs font-mono font-bold active:scale-90 shadow-lg ${
              engine.isCrouched
                ? 'bg-orange-600 border-orange-400 text-white'
                : 'bg-black/60 border-slate-700 text-slate-300'
            }`}
          >
            CROUCH
          </button>
          <button
            onClick={() => {
              engine.isProne = !engine.isProne;
              engine.isCrouched = false;
            }}
            className={`w-11 h-11 rounded-full border flex items-center justify-center text-xs font-mono font-bold active:scale-90 shadow-lg ${
              engine.isProne
                ? 'bg-orange-600 border-orange-400 text-white'
                : 'bg-black/60 border-slate-700 text-slate-300'
            }`}
          >
            PRONE
          </button>
        </div>
      </div>

      {/* BOTTOM-CENTER: HEALTH, ARMOR & WEAPON SLOTS */}
      <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 pointer-events-auto">
        {/* Driving Speedometer HUD */}
        {isDriving && (
          <div className="flex items-center gap-2 bg-black/80 border border-orange-500/80 px-4 py-1 rounded-full text-orange-400 font-mono text-xs">
            <Car className="w-4 h-4 animate-bounce" />
            <span className="font-black text-white text-base tabular-nums">{vehicleSpeed}</span> KM/H
          </div>
        )}

        {/* Health & Armor Bars */}
        <div className="w-56 sm:w-72 flex flex-col gap-1 bg-black/75 p-2 rounded-xl border border-slate-700 shadow-2xl">
          {/* Armor Bar */}
          <div className="flex items-center gap-2 text-xs font-mono text-cyan-400">
            <Shield className="w-3.5 h-3.5" />
            <div className="flex-1 bg-slate-900 h-2 rounded-full overflow-hidden border border-slate-800">
              <div
                className="bg-gradient-to-r from-cyan-600 to-cyan-400 h-full transition-all duration-150"
                style={{ width: `${Math.max(0, Math.min(100, armor))}%` }}
              ></div>
            </div>
            <span className="tabular-nums font-bold w-7 text-right">{armor}</span>
          </div>

          {/* Health Bar */}
          <div className="flex items-center gap-2 text-xs font-mono text-emerald-400">
            <Heart className="w-3.5 h-3.5" />
            <div className="flex-1 bg-slate-900 h-2.5 rounded-full overflow-hidden border border-slate-800">
              <div
                className={`h-full transition-all duration-150 ${
                  health > 50
                    ? 'bg-gradient-to-r from-emerald-600 to-emerald-400'
                    : health > 20
                    ? 'bg-gradient-to-r from-amber-600 to-amber-400'
                    : 'bg-gradient-to-r from-red-600 to-red-400 animate-pulse'
                }`}
                style={{ width: `${Math.max(0, Math.min(100, health))}%` }}
              ></div>
            </div>
            <span className="tabular-nums font-bold w-7 text-right">{health}</span>
          </div>
        </div>

        {/* Weapon Slots Selector */}
        <div className="flex items-center gap-2">
          {engine.inventory.weapons.map((w, idx) => (
            <button
              key={w.id}
              onClick={() => switchWeaponSlot(idx)}
              className={`px-3 py-1.5 rounded-lg border text-xs font-mono flex items-center gap-2 transition-all active:scale-95 shadow-md ${
                activeSlot === idx
                  ? 'bg-orange-600/90 border-orange-400 text-white font-bold'
                  : 'bg-black/60 border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              <span>{idx + 1}</span>
              <span className="truncate max-w-[80px]">{w.name.split(' ')[0]}</span>
            </button>
          ))}
        </div>
      </div>

      {/* BOTTOM-RIGHT: FIRE, ADS, JUMP, RELOAD */}
      <div className="absolute bottom-6 right-6 pointer-events-auto flex items-end gap-3">
        {/* Secondary Column: Jump & Reload */}
        <div className="flex flex-col gap-2 items-center">
          <button
            onClick={() => {
              engine.reloadWeapon();
            }}
            className="w-12 h-12 rounded-full bg-slate-800/90 hover:bg-slate-700 text-white border-2 border-slate-600 flex items-center justify-center shadow-xl active:scale-90"
            title="Reload [R]"
          >
            <RotateCw className={`w-5 h-5 ${isReloading ? 'animate-spin text-orange-400' : ''}`} />
          </button>

          <button
            onClick={() => {
              engine.input.jump = true;
              setTimeout(() => {
                engine.input.jump = false;
              }, 120);
            }}
            className="w-12 h-12 rounded-full bg-slate-800/90 hover:bg-slate-700 text-white border-2 border-slate-600 flex items-center justify-center font-mono font-bold text-xs shadow-xl active:scale-90"
            title="Jump [Space]"
          >
            JUMP
          </button>
        </div>

        {/* Primary Action Cluster: ADS & BIG FIRE TRIGGER */}
        <div className="flex flex-col gap-2 items-end">
          {/* ADS Aim-Down-Sights Toggle */}
          <button
            onClick={() => {
              engine.inventory.isADS = !engine.inventory.isADS;
            }}
            className={`w-14 h-14 rounded-full border-2 flex items-center justify-center font-mono font-bold text-xs shadow-2xl active:scale-90 transition-all ${
              isADS
                ? 'bg-cyan-600 border-cyan-300 text-white shadow-cyan-500/50'
                : 'bg-black/60 border-slate-600 text-slate-300'
            }`}
            title="Aim Down Sights [Right Click]"
          >
            <CrosshairIcon className="w-6 h-6" />
          </button>

          {/* Large Tactile FIRE Trigger Button */}
          <button
            onClick={() => engine.fireWeapon()}
            className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-br from-orange-500 to-red-700 hover:from-orange-400 hover:to-red-600 text-white font-mono font-black border-4 border-orange-300 shadow-2xl flex flex-col items-center justify-center active:scale-90 transition-transform"
            title="Fire Weapon [Left Click]"
          >
            <span className="text-base sm:text-lg tracking-wider">FIRE</span>
            <span className="text-[11px] font-mono opacity-90 tabular-nums">
              {currentAmmo}/{reserveAmmo}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
