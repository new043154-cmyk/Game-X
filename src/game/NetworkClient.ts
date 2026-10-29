export interface NetPlayer {
  id: string;
  name: string;
  x: number;
  y: number;
  z: number;
  rotY: number;
  pitch: number;
  health: number;
  armor: number;
  kills: number;
  isAlive: boolean;
  color: string;
  isDriving: boolean;
  vehicleId: string | null;
  weapon: string;
}

export interface NetVehicle {
  id: string;
  x: number;
  y: number;
  z: number;
  rotY: number;
  speed: number;
  driverId: string | null;
  health: number;
}

export interface NetSafeZone {
  centerX: number;
  centerZ: number;
  radius: number;
  phase: number;
  timeRemaining: number;
  isShrinking: boolean;
}

export interface NetLoot {
  id: string;
  name: string;
  type: string;
  rarity: string;
  x: number;
  y: number;
  z: number;
  count: number;
  pickedUp: boolean;
}

export interface EliminationRecord {
  id: string;
  victimId: string;
  victimName: string;
  killerId: string;
  killerName: string;
  weapon: string;
  isHeadshot: boolean;
  timestamp: number;
}

export class NetworkClient {
  private ws: WebSocket | null = null;
  public playerId: string = '';
  public isConnected: boolean = false;
  public pingMs: number = 24;

  public onInit?: (data: {
    assignedId: string;
    safeZone: NetSafeZone;
    loot: NetLoot[];
    vehicles: NetVehicle[];
    players: NetPlayer[];
  }) => void;

  public onWorldTick?: (data: {
    players: NetPlayer[];
    vehicles: NetVehicle[];
    safeZone: NetSafeZone;
    aliveCount: number;
  }) => void;

  public onHitConfirmed?: (data: {
    targetId: string;
    damage: number;
    isHeadshot: boolean;
    targetHealth: number;
  }) => void;

  public onWeaponFired?: (data: {
    shooterId: string;
    weapon: string;
    originX: number;
    originY: number;
    originZ: number;
    dirX: number;
    dirY: number;
    dirZ: number;
  }) => void;

  public onLootCollected?: (data: {
    lootId: string;
    playerId: string;
    item: NetLoot;
  }) => void;

  public onElimination?: (record: EliminationRecord) => void;
  public onMatchEnded?: (data: { winnerId: string; winnerName: string; kills: number }) => void;
  public onConnectionChange?: (connected: boolean) => void;

  private pingInterval: number | null = null;

  public connect(playerName: string, playerColor: string = '#ff5722', mode: string = 'br_solo') {
    if (this.ws) {
      try {
        this.ws.close();
      } catch {
        // Safe ignore
      }
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}`;

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.isConnected = true;
        this.onConnectionChange?.(true);

        // Send Join handshake
        this.ws?.send(
          JSON.stringify({
            type: 'join',
            name: playerName,
            color: playerColor,
            mode,
          })
        );

        // Start ping heartbeat
        if (this.pingInterval) clearInterval(this.pingInterval);
        this.pingInterval = window.setInterval(() => {
          if (this.ws?.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({ type: 'ping', clientTime: Date.now() }));
          }
        }, 2000);
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.type === 'init') {
            this.playerId = data.assignedId;
            this.onInit?.(data);
          } else if (data.type === 'world_tick') {
            this.onWorldTick?.(data);
          } else if (data.type === 'hit_confirmed') {
            this.onHitConfirmed?.(data);
          } else if (data.type === 'weapon_fired') {
            this.onWeaponFired?.(data);
          } else if (data.type === 'loot_collected') {
            this.onLootCollected?.(data);
          } else if (data.type === 'player_eliminated') {
            this.onElimination?.({
              id: `${data.victimId}_${Date.now()}`,
              victimId: data.victimId,
              victimName: data.victimName,
              killerId: data.killerId,
              killerName: data.killerName,
              weapon: data.weapon,
              isHeadshot: !!data.isHeadshot,
              timestamp: Date.now(),
            });
          } else if (data.type === 'match_ended') {
            this.onMatchEnded?.(data);
          } else if (data.type === 'pong') {
            this.pingMs = Math.max(1, Date.now() - data.clientTime);
          }
        } catch {
          // Ignored
        }
      };

      this.ws.onclose = () => {
        this.isConnected = false;
        this.onConnectionChange?.(false);
        if (this.pingInterval) clearInterval(this.pingInterval);
      };

      this.ws.onerror = () => {
        this.isConnected = false;
        this.onConnectionChange?.(false);
      };
    } catch (err) {
      console.warn('WebSocket connection error:', err);
    }
  }

  public sendInput(x: number, y: number, z: number, rotY: number, pitch: number, isDriving: boolean = false, speed: number = 0) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(
        JSON.stringify({
          type: 'input',
          x,
          y,
          z,
          rotY,
          pitch,
          isDriving,
          speed,
        })
      );
    }
  }

  public sendShoot(weapon: string, dirX: number, dirY: number, dirZ: number, targetId?: string, isHeadshot: boolean = false) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(
        JSON.stringify({
          type: 'shoot',
          weapon,
          dirX,
          dirY,
          dirZ,
          targetId,
          isHeadshot,
        })
      );
    }
  }

  public sendPickupLoot(lootId: string) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'pickup_loot', lootId }));
    }
  }

  public sendEnterVehicle(vehicleId: string) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'enter_vehicle', vehicleId }));
    }
  }

  public sendExitVehicle(vehicleId: string) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'exit_vehicle', vehicleId }));
    }
  }

  public disconnect() {
    if (this.pingInterval) clearInterval(this.pingInterval);
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.isConnected = false;
  }
}
