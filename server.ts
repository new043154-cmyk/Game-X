import express, { Request, Response } from 'express';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json());

interface PlayerState {
  id: string;
  name: string;
  x: number;
  y: number;
  z: number;
  rotY: number;
  pitch: number;
  health: number;
  maxHealth: number;
  armor: number;
  maxArmor: number;
  kills: number;
  isAlive: boolean;
  color: string;
  isDriving: boolean;
  vehicleId: string | null;
  weapon: string;
  ping: number;
  lastUpdate: number;
}

interface VehicleState {
  id: string;
  x: number;
  y: number;
  z: number;
  rotY: number;
  speed: number;
  driverId: string | null;
  health: number;
}

interface LootItem {
  id: string;
  name: string;
  type: 'weapon' | 'ammo' | 'medkit' | 'armor';
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  x: number;
  y: number;
  z: number;
  count: number;
  pickedUp: boolean;
}

interface SafeZoneState {
  centerX: number;
  centerZ: number;
  radius: number;
  targetCenterX: number;
  targetCenterZ: number;
  targetRadius: number;
  phase: number;
  totalPhases: number;
  timeRemaining: number;
  phaseDuration: number;
  isShrinking: boolean;
  dps: number;
}

interface MatchRoom {
  id: string;
  mode: 'br_solo' | 'tdm' | 'training';
  players: Map<string, PlayerState>;
  clients: Map<string, WebSocket>;
  vehicles: VehicleState[];
  loot: LootItem[];
  safeZone: SafeZoneState;
  state: 'waiting' | 'in_progress' | 'ended';
  winner: string | null;
  elapsedTime: number;
}

const activeRooms = new Map<string, MatchRoom>();

// Generate initial loot on Frontier Island
function generateIslandLoot(): LootItem[] {
  const items: LootItem[] = [];
  const lootTable = [
    { name: 'M416-X Rifle', type: 'weapon' as const, rarity: 'rare' as const, count: 1 },
    { name: 'AK-Vanguard', type: 'weapon' as const, rarity: 'epic' as const, count: 1 },
    { name: 'AWP-Recon', type: 'weapon' as const, rarity: 'legendary' as const, count: 1 },
    { name: 'Vector-9 SMG', type: 'weapon' as const, rarity: 'common' as const, count: 1 },
    { name: 'Striker-12 Shotgun', type: 'weapon' as const, rarity: 'common' as const, count: 1 },
    { name: '5.56mm Ammo', type: 'ammo' as const, rarity: 'common' as const, count: 60 },
    { name: '7.62mm Ammo', type: 'ammo' as const, rarity: 'common' as const, count: 45 },
    { name: 'Medkit', type: 'medkit' as const, rarity: 'rare' as const, count: 1 },
    { name: 'Tactical Armor Vest', type: 'armor' as const, rarity: 'rare' as const, count: 1 },
    { name: 'Kevlar Helmet', type: 'armor' as const, rarity: 'epic' as const, count: 1 },
  ];

  // Key compound locations on Frontier Island
  const hotspots = [
    { x: 0, z: 0 },       // Central Military Base
    { x: -50, z: -40 },   // Research Lab
    { x: 60, z: -30 },    // Industrial Port
    { x: -70, z: 50 },    // Airport Hangar
    { x: 40, z: 60 },     // Riverside Outpost
    { x: -20, z: -80 },   // Radio Observatory
    { x: 30, z: -70 },    // Bunker Alpha
    { x: -60, z: 0 },     // Watchtower Hill
    { x: 70, z: 20 },     // Warehouse Yard
    { x: 0, z: 70 },      // Coastal Battery
  ];

  let idCounter = 1;
  hotspots.forEach((spot) => {
    // 3-5 loot items per hotspot
    const count = 3 + Math.floor(Math.random() * 3);
    for (let i = 0; i < count; i++) {
      const template = lootTable[Math.floor(Math.random() * lootTable.length)];
      const offsetX = (Math.random() - 0.5) * 24;
      const offsetZ = (Math.random() - 0.5) * 24;
      items.push({
        id: `loot_${idCounter++}`,
        name: template.name,
        type: template.type,
        rarity: template.rarity,
        x: Math.round(spot.x + offsetX),
        y: 1.0,
        z: Math.round(spot.z + offsetZ),
        count: template.count,
        pickedUp: false,
      });
    }
  });

  return items;
}

function createRoom(id: string, mode: 'br_solo' | 'tdm' | 'training'): MatchRoom {
  const room: MatchRoom = {
    id,
    mode,
    players: new Map(),
    clients: new Map(),
    vehicles: [
      { id: 'veh_buggy_1', x: 15, y: 0.5, z: 12, rotY: 0, speed: 0, driverId: null, health: 300 },
      { id: 'veh_buggy_2', x: -45, y: 0.5, z: -35, rotY: 1.5, speed: 0, driverId: null, health: 300 },
      { id: 'veh_buggy_3', x: 50, y: 0.5, z: 45, rotY: -0.8, speed: 0, driverId: null, health: 300 },
    ],
    loot: generateIslandLoot(),
    safeZone: {
      centerX: 0,
      centerZ: 0,
      radius: 140,
      targetCenterX: 10,
      targetCenterZ: -10,
      targetRadius: 90,
      phase: 1,
      totalPhases: 5,
      timeRemaining: 60,
      phaseDuration: 60,
      isShrinking: false,
      dps: 3,
    },
    state: 'in_progress',
    winner: null,
    elapsedTime: 0,
  };

  // Add 5 intelligent bot operators to populate match if solo/BR
  const botNames = ['GhostRider', 'Viper-01', 'Krypton', 'ShadowStrike', 'NovaTactical', 'ApexPredator'];
  const botColors = ['#e11d48', '#2563eb', '#16a34a', '#ca8a04', '#9333ea', '#0891b2'];
  
  botNames.forEach((bName, idx) => {
    const angle = (idx / botNames.length) * Math.PI * 2;
    const dist = 45 + Math.random() * 35;
    const botId = `bot_${idx + 1}`;
    room.players.set(botId, {
      id: botId,
      name: bName,
      x: Math.cos(angle) * dist,
      y: 0,
      z: Math.sin(angle) * dist,
      rotY: angle + Math.PI,
      pitch: 0,
      health: 100,
      maxHealth: 100,
      armor: 50,
      maxArmor: 100,
      kills: 0,
      isAlive: true,
      color: botColors[idx % botColors.length],
      isDriving: false,
      vehicleId: null,
      weapon: 'M416-X Rifle',
      ping: 15,
      lastUpdate: Date.now(),
    });
  });

  return room;
}

// Default standard room
const defaultRoom = createRoom('frontier-alpha', 'br_solo');
activeRooms.set(defaultRoom.id, defaultRoom);

// Server simulation tick (20 ticks/sec = 50ms)
setInterval(() => {
  for (const [, room] of activeRooms) {
    if (room.state !== 'in_progress') continue;
    room.elapsedTime += 0.05;

    // Safe zone timer & shrinking
    const sz = room.safeZone;
    sz.timeRemaining -= 0.05;

    if (sz.timeRemaining <= 0) {
      if (!sz.isShrinking) {
        // Switch to shrinking phase
        sz.isShrinking = true;
        sz.timeRemaining = 35; // 35 seconds to shrink to target
      } else {
        // Shrink complete, start next countdown
        sz.isShrinking = false;
        sz.phase = Math.min(sz.totalPhases, sz.phase + 1);
        sz.radius = sz.targetRadius;
        sz.centerX = sz.targetCenterX;
        sz.centerZ = sz.targetCenterZ;
        sz.phaseDuration = Math.max(25, 60 - sz.phase * 8);
        sz.timeRemaining = sz.phaseDuration;
        sz.dps = sz.phase * 2.5;

        // Pick next circle inside current circle
        const angle = Math.random() * Math.PI * 2;
        const maxOffset = sz.radius * 0.45;
        const offset = Math.random() * maxOffset;
        sz.targetCenterX = Math.round(sz.centerX + Math.cos(angle) * offset);
        sz.targetCenterZ = Math.round(sz.centerZ + Math.sin(angle) * offset);
        sz.targetRadius = Math.max(15, Math.round(sz.radius * 0.6));

        broadcast(room, {
          type: 'zone_phase_start',
          phase: sz.phase,
          centerX: sz.centerX,
          centerZ: sz.centerZ,
          radius: sz.radius,
          targetCenterX: sz.targetCenterX,
          targetCenterZ: sz.targetCenterZ,
          targetRadius: sz.targetRadius,
          duration: sz.phaseDuration,
        });
      }
    }

    if (sz.isShrinking) {
      // Lerp radius and center towards target
      const lerpFactor = 0.05 / 35;
      sz.radius = Math.max(sz.targetRadius, sz.radius - (sz.radius - sz.targetRadius) * lerpFactor * 2);
      sz.centerX += (sz.targetCenterX - sz.centerX) * lerpFactor * 2;
      sz.centerZ += (sz.targetCenterZ - sz.centerZ) * lerpFactor * 2;
    }

    // Apply out-of-zone damage & AI bot patrol simulation
    for (const [, p] of room.players) {
      if (!p.isAlive) continue;

      // Distance from safe circle center
      const distFromCenter = Math.hypot(p.x - sz.centerX, p.z - sz.centerZ);
      if (distFromCenter > sz.radius) {
        // Outside safe circle! Take tick damage
        const dmg = sz.dps * 0.05;
        if (p.armor > 0) {
          p.armor = Math.max(0, p.armor - dmg * 0.5);
          p.health = Math.max(0, p.health - dmg * 0.5);
        } else {
          p.health = Math.max(0, p.health - dmg);
        }

        if (p.health <= 0) {
          p.isAlive = false;
          broadcast(room, {
            type: 'player_eliminated',
            victimId: p.id,
            victimName: p.name,
            killerId: 'safe_zone',
            killerName: 'Blue Zone',
            weapon: 'Zone Radiation',
          });
          checkWinner(room);
        }
      }

      // Simulated Bot Behavior
      if (p.id.startsWith('bot_')) {
        // If outside safe zone, run toward center
        if (distFromCenter > sz.radius * 0.8) {
          const toCenterX = sz.centerX - p.x;
          const toCenterZ = sz.centerZ - p.z;
          const len = Math.hypot(toCenterX, toCenterZ) || 1;
          p.x += (toCenterX / len) * 0.22;
          p.z += (toCenterZ / len) * 0.22;
          p.rotY = Math.atan2(toCenterX, toCenterZ);
        } else {
          // Wander or seek nearest player
          const wanderAngle = p.rotY + (Math.random() - 0.5) * 0.2;
          p.rotY = wanderAngle;
          p.x += Math.sin(wanderAngle) * 0.12;
          p.z += Math.cos(wanderAngle) * 0.12;
        }

        // Clamp inside island limits
        p.x = Math.max(-120, Math.min(120, p.x));
        p.z = Math.max(-120, Math.min(120, p.z));
      }
    }

    // Broadcast snapshot (compressed payload)
    const playerArray = Array.from(room.players.values()).map((p) => ({
      id: p.id,
      name: p.name,
      x: Number(p.x.toFixed(2)),
      y: Number(p.y.toFixed(2)),
      z: Number(p.z.toFixed(2)),
      rotY: Number(p.rotY.toFixed(2)),
      pitch: Number(p.pitch.toFixed(2)),
      health: Math.round(p.health),
      armor: Math.round(p.armor),
      kills: p.kills,
      isAlive: p.isAlive,
      color: p.color,
      isDriving: p.isDriving,
      vehicleId: p.vehicleId,
      weapon: p.weapon,
    }));

    const snapshot = {
      type: 'world_tick',
      players: playerArray,
      vehicles: room.vehicles,
      safeZone: {
        centerX: Number(sz.centerX.toFixed(1)),
        centerZ: Number(sz.centerZ.toFixed(1)),
        radius: Number(sz.radius.toFixed(1)),
        phase: sz.phase,
        timeRemaining: Math.ceil(sz.timeRemaining),
        isShrinking: sz.isShrinking,
      },
      aliveCount: playerArray.filter((p) => p.isAlive).length,
    };

    broadcast(room, snapshot);
  }
}, 50);

function checkWinner(room: MatchRoom) {
  const alivePlayers = Array.from(room.players.values()).filter((p) => p.isAlive);
  if (alivePlayers.length === 1 && room.players.size > 1 && room.state === 'in_progress') {
    room.state = 'ended';
    room.winner = alivePlayers[0].name;
    broadcast(room, {
      type: 'match_ended',
      winnerId: alivePlayers[0].id,
      winnerName: alivePlayers[0].name,
      kills: alivePlayers[0].kills,
    });
  }
}

function broadcast(room: MatchRoom, message: object, excludeClientId?: string) {
  const payload = JSON.stringify(message);
  for (const [clientId, ws] of room.clients) {
    if (clientId !== excludeClientId && ws.readyState === WebSocket.OPEN) {
      ws.send(payload);
    }
  }
}

// REST Endpoints
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'online',
    title: 'BattleZone X Dedicated Authoritative Server',
    engine: 'Three.js PBR + Node WebSocket Server',
    rooms: activeRooms.size,
    totalPlayers: Array.from(activeRooms.values()).reduce((acc, r) => acc + r.players.size, 0),
    timestamp: Date.now(),
  });
});

app.get('/api/leaderboard', (_req: Request, res: Response) => {
  res.json([
    { rank: 1, name: 'Vanguard_Alpha', kills: 428, wins: 54, tier: 'Apex Warlord' },
    { rank: 2, name: 'CyberShadow', kills: 382, wins: 49, tier: 'Titan' },
    { rank: 3, name: 'SniperWolf_X', kills: 319, wins: 41, tier: 'Elite Spec-Ops' },
    { rank: 4, name: 'PhoenixRecon', kills: 274, wins: 33, tier: 'Master' },
    { rank: 5, name: 'DesertFox', kills: 215, wins: 28, tier: 'Diamond' },
  ]);
});

// Unity C# Architecture Specification & Script Bundle for Part 23
app.get('/api/unity-export-docs', (_req: Request, res: Response) => {
  res.json({
    project: 'BattleZone X Unity Android Migration Package',
    version: '2023.3 LTS / Photon Fusion 2',
    scripts: [
      'GameBootstrap.cs',
      'GameManager.cs',
      'PlayerController.cs',
      'MobileInputController.cs',
      'WeaponManager.cs',
      'SafeZoneManager.cs',
      'NetworkSessionManager.cs',
    ],
    status: 'Ready for Android Studio / Unity Cloud Build',
  });
});

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

wss.on('connection', (ws: WebSocket) => {
  let currentRoomId = 'frontier-alpha';
  let playerId = `p_${Math.random().toString(36).substring(2, 9)}`;

  ws.on('message', (raw: string) => {
    try {
      const data = JSON.parse(raw.toString());

      if (data.type === 'join') {
        const room = activeRooms.get(currentRoomId) || defaultRoom;
        playerId = data.id || playerId;
        const playerName = data.name || `Player_${playerId.slice(-4)}`;

        // Spawn position around perimeter of island
        const angle = Math.random() * Math.PI * 2;
        const dist = 50 + Math.random() * 30;

        const player: PlayerState = {
          id: playerId,
          name: playerName,
          x: Math.round(Math.cos(angle) * dist),
          y: 0,
          z: Math.round(Math.sin(angle) * dist),
          rotY: angle + Math.PI,
          pitch: 0,
          health: 100,
          maxHealth: 100,
          armor: 100,
          maxArmor: 100,
          kills: 0,
          isAlive: true,
          color: data.color || '#ff5722',
          isDriving: false,
          vehicleId: null,
          weapon: 'M416-X Rifle',
          ping: 20,
          lastUpdate: Date.now(),
        };

        room.players.set(playerId, player);
        room.clients.set(playerId, ws);

        // Send Welcome & Current Full World State
        ws.send(
          JSON.stringify({
            type: 'init',
            assignedId: playerId,
            safeZone: room.safeZone,
            loot: room.loot.filter((item) => !item.pickedUp),
            vehicles: room.vehicles,
            players: Array.from(room.players.values()),
          })
        );

        // Broadcast to others
        broadcast(
          room,
          {
            type: 'player_joined',
            player,
          },
          playerId
        );
      }

      if (data.type === 'input') {
        const room = activeRooms.get(currentRoomId);
        if (!room) return;
        const player = room.players.get(playerId);
        if (!player || !player.isAlive) return;

        // Authoritative validation: speed limit protection
        const dx = data.x - player.x;
        const dz = data.z - player.z;
        const distMoved = Math.hypot(dx, dz);

        // Max legitimate travel per packet (~15m/s max sprint or 35m/s vehicle)
        const maxDist = player.isDriving ? 3.5 : 1.2;
        if (distMoved < maxDist * 3) {
          player.x = data.x;
          player.y = data.y;
          player.z = data.z;
          player.rotY = data.rotY;
          player.pitch = data.pitch || 0;
          player.lastUpdate = Date.now();
        }

        if (player.isDriving && player.vehicleId) {
          const veh = room.vehicles.find((v) => v.id === player.vehicleId);
          if (veh) {
            veh.x = player.x;
            veh.z = player.z;
            veh.rotY = player.rotY;
            veh.speed = data.speed || 0;
          }
        }
      }

      if (data.type === 'shoot') {
        const room = activeRooms.get(currentRoomId);
        if (!room) return;
        const shooter = room.players.get(playerId);
        if (!shooter || !shooter.isAlive) return;

        // Broadcast shot muzzle flash & audio event to all nearby players
        broadcast(
          room,
          {
            type: 'weapon_fired',
            shooterId: playerId,
            weapon: data.weapon || shooter.weapon,
            originX: shooter.x,
            originY: shooter.y + 1.4,
            originZ: shooter.z,
            dirX: data.dirX,
            dirY: data.dirY,
            dirZ: data.dirZ,
          },
          playerId
        );

        // If client reported a targeted hit, validate authoritatively
        if (data.targetId) {
          const target = room.players.get(data.targetId);
          if (target && target.isAlive) {
            // Distance check
            const dist = Math.hypot(target.x - shooter.x, target.z - shooter.z);
            if (dist < 180) {
              const baseDamage = data.isHeadshot ? 70 : 35;
              let effectiveDamage = baseDamage;

              if (target.armor > 0) {
                const absorbed = Math.min(target.armor, baseDamage * 0.5);
                target.armor -= absorbed;
                effectiveDamage -= absorbed;
              }
              target.health = Math.max(0, target.health - effectiveDamage);

              // Notify shooter with hit marker
              ws.send(
                JSON.stringify({
                  type: 'hit_confirmed',
                  targetId: target.id,
                  damage: baseDamage,
                  isHeadshot: !!data.isHeadshot,
                  targetHealth: target.health,
                })
              );

              // Check if eliminated
              if (target.health <= 0) {
                target.isAlive = false;
                shooter.kills++;
                broadcast(room, {
                  type: 'player_eliminated',
                  victimId: target.id,
                  victimName: target.name,
                  killerId: shooter.id,
                  killerName: shooter.name,
                  weapon: data.weapon || shooter.weapon,
                  isHeadshot: !!data.isHeadshot,
                });
                checkWinner(room);
              }
            }
          }
        }
      }

      if (data.type === 'pickup_loot') {
        const room = activeRooms.get(currentRoomId);
        if (!room) return;
        const lootItem = room.loot.find((item) => item.id === data.lootId && !item.pickedUp);
        const player = room.players.get(playerId);
        if (lootItem && player && player.isAlive) {
          const dist = Math.hypot(lootItem.x - player.x, lootItem.z - player.z);
          if (dist < 8) {
            lootItem.pickedUp = true;
            if (lootItem.type === 'weapon') {
              player.weapon = lootItem.name;
            } else if (lootItem.type === 'medkit') {
              player.health = Math.min(player.maxHealth, player.health + 50);
            } else if (lootItem.type === 'armor') {
              player.armor = 100;
            }

            broadcast(room, {
              type: 'loot_collected',
              lootId: lootItem.id,
              playerId: player.id,
              playerName: player.name,
              item: lootItem,
            });
          }
        }
      }

      if (data.type === 'enter_vehicle') {
        const room = activeRooms.get(currentRoomId);
        if (!room) return;
        const player = room.players.get(playerId);
        const veh = room.vehicles.find((v) => v.id === data.vehicleId);
        if (player && veh && !veh.driverId) {
          const dist = Math.hypot(veh.x - player.x, veh.z - player.z);
          if (dist < 7) {
            veh.driverId = playerId;
            player.isDriving = true;
            player.vehicleId = veh.id;
            broadcast(room, {
              type: 'vehicle_occupied',
              vehicleId: veh.id,
              driverId: playerId,
              driverName: player.name,
            });
          }
        }
      }

      if (data.type === 'exit_vehicle') {
        const room = activeRooms.get(currentRoomId);
        if (!room) return;
        const player = room.players.get(playerId);
        if (player && player.vehicleId) {
          const veh = room.vehicles.find((v) => v.id === player.vehicleId);
          if (veh) {
            veh.driverId = null;
          }
          player.isDriving = false;
          player.vehicleId = null;
          broadcast(room, {
            type: 'vehicle_vacated',
            vehicleId: data.vehicleId,
            driverId: playerId,
          });
        }
      }

      if (data.type === 'ping') {
        ws.send(JSON.stringify({ type: 'pong', clientTime: data.clientTime, serverTime: Date.now() }));
      }
    } catch {
      // Ignored malformed JSON
    }
  });

  ws.on('close', () => {
    const room = activeRooms.get(currentRoomId);
    if (room) {
      const p = room.players.get(playerId);
      if (p && p.isDriving && p.vehicleId) {
        const veh = room.vehicles.find((v) => v.id === p.vehicleId);
        if (veh) veh.driverId = null;
      }
      room.players.delete(playerId);
      room.clients.delete(playerId);
      broadcast(room, {
        type: 'player_left',
        playerId,
      });
      checkWinner(room);
    }
  });
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`BattleZone X Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
