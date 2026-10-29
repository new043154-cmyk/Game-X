import { useEffect, useRef, useState } from 'react';
import { GameEngine } from './game/GameEngine';
import { NetSafeZone, EliminationRecord } from './game/NetworkClient';
import { HUD } from './components/HUD';
import { TitleScreen } from './components/TitleScreen';
import { ExportModal } from './components/ExportModal';
import { TacticalMapModal } from './components/TacticalMapModal';
import { SettingsModal } from './components/SettingsModal';
import { GameOverModal } from './components/GameOverModal';
import { soundFx } from './game/SoundFx';

export function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GameEngine | null>(null);

  // High level game flow: 'title' | 'playing' | 'gameover'
  const [gameState, setGameState] = useState<'title' | 'playing' | 'gameover'>('title');

  // Modals
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isMapOpen, setIsMapOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Match statistics & HUD state
  const [hudState, setHudState] = useState({
    health: 100,
    armor: 100,
    kills: 0,
    isAlive: true,
    currentAmmo: 30,
    reserveAmmo: 120,
    isReloading: false,
    reloadProgress: 0,
    isADS: false,
    weaponName: 'M416-X Assault Rifle',
    safeZone: {
      centerX: 0,
      centerZ: 0,
      radius: 140,
      phase: 1,
      timeRemaining: 60,
      isShrinking: false,
    } as NetSafeZone,
    nearbyPrompt: null as string | null,
    isOutsideZone: false,
    isDriving: false,
    vehicleSpeed: 0,
    ping: 20,
  });

  const [eliminations, setEliminations] = useState<EliminationRecord[]>([]);
  const [matchResult, setMatchResult] = useState<{
    isWinner: boolean;
    winnerName: string | null;
    kills: number;
    placement: number;
    totalPlayers: number;
  }>({
    isWinner: false,
    winnerName: null,
    kills: 0,
    placement: 1,
    totalPlayers: 20,
  });

  // Initialize Three.js Engine once on mount
  useEffect(() => {
    if (!canvasRef.current) return;

    const engine = new GameEngine(canvasRef.current, 'Operator-Alpha', '#ff5722');
    engineRef.current = engine;

    engine.onStateUpdate = (state) => {
      setHudState(state);

      // Check if local player was eliminated
      if (!state.isAlive && gameState === 'playing') {
        const remaining = engine.remotePlayers.size + 1;
        setMatchResult({
          isWinner: false,
          winnerName: null,
          kills: state.kills,
          placement: remaining,
          totalPlayers: 20,
        });
        setGameState('gameover');
      }
    };

    engine.net.onElimination = (record) => {
      setEliminations((prev) => [...prev.slice(-5), record]);
    };

    engine.net.onMatchEnded = (data) => {
      const isWinner = data.winnerId === engine.net.playerId;
      if (isWinner) {
        soundFx.playVictoryFanfare();
      }
      setMatchResult({
        isWinner,
        winnerName: data.winnerName,
        kills: engine.kills,
        placement: 1,
        totalPlayers: 20,
      });
      setGameState('gameover');
    };

    const handleResize = () => {
      if (canvasRef.current && engineRef.current) {
        engineRef.current.resize(window.innerWidth, window.innerHeight);
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize();

    return () => {
      window.removeEventListener('resize', handleResize);
      engine.destroy();
    };
  }, []);

  const handleStartGame = (playerName: string, playerColor: string) => {
    if (!engineRef.current) return;
    engineRef.current.playerName = playerName;
    engineRef.current.playerColor = playerColor;
    engineRef.current.localRig.group.visible = true;
    engineRef.current.net.connect(playerName, playerColor);

    // Request pointer lock if on desktop
    try {
      if (!('ontouchstart' in window)) {
        canvasRef.current?.requestPointerLock?.();
      }
    } catch {
      // Ignored
    }

    setGameState('playing');
  };

  const handleReturnToLobby = () => {
    setIsSettingsOpen(false);
    setIsMapOpen(false);
    setGameState('title');
    if (engineRef.current) {
      engineRef.current.isAlive = true;
      engineRef.current.health = 100;
      engineRef.current.armor = 100;
      engineRef.current.kills = 0;
    }
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-black select-none">
      {/* Isolated WebGL 3D Canvas Viewport (100% full screen) */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full block cursor-crosshair touch-none"
      />

      {/* TITLE SCREEN / MAIN LOBBY */}
      {gameState === 'title' && (
        <TitleScreen
          onStartGame={handleStartGame}
          onOpenExport={() => setIsExportOpen(true)}
          onOpenSettings={() => setIsSettingsOpen(true)}
        />
      )}

      {/* IN-GAME LOW-OCCLUSION HUD */}
      {gameState === 'playing' && engineRef.current && (
        <HUD
          engine={engineRef.current}
          health={hudState.health}
          armor={hudState.armor}
          kills={hudState.kills}
          isAlive={hudState.isAlive}
          currentAmmo={hudState.currentAmmo}
          reserveAmmo={hudState.reserveAmmo}
          isReloading={hudState.isReloading}
          reloadProgress={hudState.reloadProgress}
          isADS={hudState.isADS}
          weaponName={hudState.weaponName}
          safeZone={hudState.safeZone}
          nearbyPrompt={hudState.nearbyPrompt}
          isOutsideZone={hudState.isOutsideZone}
          isDriving={hudState.isDriving}
          vehicleSpeed={hudState.vehicleSpeed}
          ping={hudState.ping}
          eliminations={eliminations}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onOpenMap={() => setIsMapOpen(true)}
        />
      )}

      {/* GAME OVER / VICTORY MODAL */}
      {gameState === 'gameover' && (
        <GameOverModal
          isWinner={matchResult.isWinner}
          winnerName={matchResult.winnerName}
          kills={matchResult.kills}
          placement={matchResult.placement}
          totalPlayers={matchResult.totalPlayers}
          onReturnToLobby={handleReturnToLobby}
          onSpectate={() => setGameState('playing')}
        />
      )}

      {/* TACTICAL MAP POPUP */}
      {isMapOpen && engineRef.current && (
        <TacticalMapModal
          playerX={engineRef.current.playerPos.x}
          playerZ={engineRef.current.playerPos.z}
          playerRotY={engineRef.current.playerRotY}
          safeZone={hudState.safeZone}
          onClose={() => setIsMapOpen(false)}
        />
      )}

      {/* SETTINGS POPUP */}
      {isSettingsOpen && (
        <SettingsModal
          onClose={() => setIsSettingsOpen(false)}
          onReturnToLobby={handleReturnToLobby}
        />
      )}

      {/* ANDROID APK & SOURCE EXPORT MODAL */}
      {isExportOpen && <ExportModal onClose={() => setIsExportOpen(false)} />}
    </div>
  );
}

export default App;
