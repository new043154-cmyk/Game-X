import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { IslandWorld } from './TerrainGenerator';
import { CharacterRig } from './PlayerModel';
import { VehicleRig } from './VehicleModel';
import { WeaponInventory } from './WeaponSystem';
import { NetworkClient, NetPlayer, NetVehicle, NetSafeZone, NetLoot } from './NetworkClient';
import { soundFx } from './SoundFx';

// Pre-allocated vectors for zero-GC render loop
const _v1 = new THREE.Vector3();
const _v2 = new THREE.Vector3();
const _forward = new THREE.Vector3();
const _right = new THREE.Vector3();
const _ray = new THREE.Raycaster();

export interface InputState {
  forward: number;
  right: number;
  lookX: number;
  lookY: number;
  jump: boolean;
  sprint: boolean;
  crouch: boolean;
  prone: boolean;
  fire: boolean;
  ads: boolean;
  reload: boolean;
  interact: boolean;
}

export class GameEngine {
  public canvas: HTMLCanvasElement;
  public renderer!: THREE.WebGLRenderer;
  public scene!: THREE.Scene;
  public camera!: THREE.PerspectiveCamera;
  public world!: IslandWorld;
  public isSoftwareGl: boolean = false;

  // Local Player
  public localRig!: CharacterRig;
  public playerPos: THREE.Vector3 = new THREE.Vector3(0, 0, 50);
  public playerRotY: number = 0;
  public playerPitch: number = 0;
  public velocityY: number = 0;
  public isGrounded: boolean = true;
  public isSprinting: boolean = false;
  public isCrouched: boolean = false;
  public isProne: boolean = false;
  public isDriving: boolean = false;
  public activeVehicleId: string | null = null;
  public vehicleSpeed: number = 0;
  public health: number = 100;
  public maxHealth: number = 100;
  public armor: number = 100;
  public maxArmor: number = 100;
  public kills: number = 0;
  public isAlive: boolean = true;
  public inventory: WeaponInventory;

  // Remote entities
  public remotePlayers = new Map<string, { rig: CharacterRig; targetPos: THREE.Vector3; targetRotY: number; targetPitch: number; isAlive: boolean }>();
  public vehicleRigs = new Map<string, VehicleRig>();
  public lootMeshes = new Map<string, THREE.Group>();

  // Safe Zone
  public safeZoneMesh!: THREE.Mesh;
  public safeZoneTargetRing!: THREE.Line;
  public safeZoneData: NetSafeZone = {
    centerX: 0,
    centerZ: 0,
    radius: 140,
    phase: 1,
    timeRemaining: 60,
    isShrinking: false,
  };

  // Networking
  public net: NetworkClient;
  public isConnected: boolean = false;
  public playerName: string = 'Commando';
  public playerColor: string = '#ff5722';

  // Game Feel & Feedback
  public cameraShake: number = 0;
  public hitstopTimer: number = 0;
  public isHitmarkerActive: boolean = false;
  public hitmarkerTimer: number = 0;
  public isOutsideZone: boolean = false;
  public nearbyInteractPrompt: string | null = null;

  // Input
  public input: InputState = {
    forward: 0,
    right: 0,
    lookX: 0,
    lookY: 0,
    jump: false,
    sprint: false,
    crouch: false,
    prone: false,
    fire: false,
    ads: false,
    reload: false,
    interact: false,
  };

  private frameId: number = 0;
  private isDestroyed: boolean = false;
  private lastFootstepTime: number = 0;
  private networkInputTimer: number = 0;
  private clock: THREE.Clock = new THREE.Clock();

  // Callbacks to UI
  public onStateUpdate?: (state: {
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
  }) => void;

  constructor(canvas: HTMLCanvasElement, playerName: string = 'Operator', playerColor: string = '#ff5722') {
    this.canvas = canvas;
    this.playerName = playerName;
    this.playerColor = playerColor;
    this.inventory = new WeaponInventory();
    this.net = new NetworkClient();

    this.initWebGL();
    this.initScene();
    this.initNetworking();
    this.startLoop();
  }

  private initWebGL() {
    this.isSoftwareGl = (() => {
      const gl = document.createElement('canvas').getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance',
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.renderer.setPixelRatio(this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = !this.isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.setSize(this.canvas.clientWidth, this.canvas.clientHeight, false);
  }

  private initScene() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0c1424); // Atmospheric tactical dawn/dusk sky
    this.scene.fog = new THREE.FogExp2(0x0c1424, 0.0055);

    this.camera = new THREE.PerspectiveCamera(
      65,
      this.canvas.clientWidth / this.canvas.clientHeight,
      0.1,
      600
    );

    // Studio Environment reflection using RoomEnvironment
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();

    // Studio 3-Point Lighting Rig with warm key & cool sky hemisphere
    const sunLight = new THREE.DirectionalLight(0xfff5e6, 2.2);
    sunLight.position.set(120, 180, 90);
    sunLight.castShadow = !this.isSoftwareGl;
    if (sunLight.castShadow) {
      sunLight.shadow.mapSize.width = 2048;
      sunLight.shadow.mapSize.height = 2048;
      sunLight.shadow.camera.near = 10;
      sunLight.shadow.camera.far = 400;
      sunLight.shadow.camera.left = -90;
      sunLight.shadow.camera.right = 90;
      sunLight.shadow.camera.top = 90;
      sunLight.shadow.camera.bottom = -90;
      sunLight.shadow.bias = -0.0005;
      sunLight.shadow.normalBias = 0.02;
    }
    this.scene.add(sunLight);

    const hemiLight = new THREE.HemisphereLight(0x38bdf8, 0x1e293b, 1.1);
    this.scene.add(hemiLight);

    // Procedural Frontier Island World
    this.world = new IslandWorld();
    this.scene.add(this.world.group);

    // Initial player position
    this.playerPos.set(0, this.world.getTerrainHeight(0, 45) + 0.1, 45);

    // Local Character Rig
    this.localRig = new CharacterRig(this.playerColor, this.playerName);
    this.localRig.nametagSprite.visible = false; // Don't block local 3rd person view
    this.scene.add(this.localRig.group);

    // Safe Zone Visual Mesh
    this.initSafeZoneVisuals();
  }

  private initSafeZoneVisuals() {
    // Translucent shimmering energy cylinder
    const szGeo = new THREE.CylinderGeometry(140, 140, 90, 48, 1, true);
    const szMat = new THREE.MeshBasicMaterial({
      color: 0x00e5ff,
      transparent: true,
      opacity: 0.22,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    this.safeZoneMesh = new THREE.Mesh(szGeo, szMat);
    this.safeZoneMesh.position.set(0, 40, 0);
    this.scene.add(this.safeZoneMesh);

    // Next Target circle outline on the ground
    const targetRingGeo = new THREE.BufferGeometry();
    const ringPts: THREE.Vector3[] = [];
    for (let i = 0; i <= 64; i++) {
      const theta = (i / 64) * Math.PI * 2;
      ringPts.push(new THREE.Vector3(Math.cos(theta), 0.2, Math.sin(theta)));
    }
    targetRingGeo.setFromPoints(ringPts);
    this.safeZoneTargetRing = new THREE.Line(
      targetRingGeo,
      new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.6 })
    );
    this.scene.add(this.safeZoneTargetRing);
  }

  private initNetworking() {
    this.net.connect(this.playerName, this.playerColor);

    this.net.onConnectionChange = (conn) => {
      this.isConnected = conn;
    };

    this.net.onInit = (data) => {
      this.safeZoneData = data.safeZone;
      // Spawn Vehicles
      data.vehicles.forEach((v) => this.spawnVehicle(v));
      // Spawn Loot
      data.loot.forEach((l) => this.spawnLoot(l));
    };

    this.net.onWorldTick = (data) => {
      this.safeZoneData = data.safeZone;
      this.updateSafeZoneVisuals();

      // Sync Remote Players
      data.players.forEach((p) => {
        if (p.id === this.net.playerId) {
          // Local player authoritative sync for health/armor
          this.health = p.health;
          this.armor = p.armor;
          this.kills = p.kills;
          this.isAlive = p.isAlive;
          return;
        }

        let remote = this.remotePlayers.get(p.id);
        if (!remote) {
          const rig = new CharacterRig(p.color, p.name);
          this.scene.add(rig.group);
          remote = {
            rig,
            targetPos: new THREE.Vector3(p.x, p.y, p.z),
            targetRotY: p.rotY,
            targetPitch: p.pitch,
            isAlive: p.isAlive,
          };
          this.remotePlayers.set(p.id, remote);
        }

        remote.targetPos.set(p.x, p.y, p.z);
        remote.targetRotY = p.rotY;
        remote.targetPitch = p.pitch;
        remote.isAlive = p.isAlive;
        remote.rig.group.visible = p.isAlive;
      });

      // Sync Vehicles
      data.vehicles.forEach((v) => {
        const vRig = this.vehicleRigs.get(v.id);
        if (vRig) {
          if (!this.isDriving || this.activeVehicleId !== v.id) {
            vRig.group.position.set(v.x, v.y, v.z);
            vRig.group.rotation.y = v.rotY;
            vRig.updateSteering(0, v.speed, 0.05);
          }
        }
      });
    };

    this.net.onHitConfirmed = (data) => {
      this.isHitmarkerActive = true;
      this.hitmarkerTimer = 0.12;
      soundFx.playHitMarker(data.isHeadshot);
      this.hitstopTimer = 0.05; // 50ms tactical hitstop impact
    };

    this.net.onWeaponFired = (data) => {
      soundFx.playGunshot(data.weapon);
      const remote = this.remotePlayers.get(data.shooterId);
      if (remote) {
        remote.rig.triggerMuzzleFlash();
      }
    };

    this.net.onLootCollected = (data) => {
      const mesh = this.lootMeshes.get(data.lootId);
      if (mesh) {
        this.scene.remove(mesh);
        this.lootMeshes.delete(data.lootId);
      }
      if (data.playerId === this.net.playerId) {
        soundFx.playLootPickup();
        if (data.item.type === 'weapon') {
          this.inventory.equipLootWeapon(data.item.name);
        } else if (data.item.type === 'ammo') {
          this.inventory.addAmmo(data.item.count);
        } else if (data.item.type === 'medkit') {
          this.health = Math.min(this.maxHealth, this.health + 50);
        } else if (data.item.type === 'armor') {
          this.armor = 100;
        }
      }
    };
  }

  private spawnVehicle(v: NetVehicle) {
    if (this.vehicleRigs.has(v.id)) return;
    const rig = new VehicleRig();
    rig.group.position.set(v.x, v.y, v.z);
    rig.group.rotation.y = v.rotY;
    this.scene.add(rig.group);
    this.vehicleRigs.set(v.id, rig);
  }

  private spawnLoot(l: NetLoot) {
    if (this.lootMeshes.has(l.id) || l.pickedUp) return;
    const group = new THREE.Group();
    group.position.set(l.x, this.world.getTerrainHeight(l.x, l.z) + 0.35, l.z);

    // Glowing loot marker beacon
    const beaconMat = new THREE.MeshBasicMaterial({
      color: l.rarity === 'legendary' ? 0xffaa00 : l.rarity === 'epic' ? 0xa855f7 : 0x38bdf8,
      wireframe: true,
    });
    const box = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.4, 0.6), beaconMat);
    group.add(box);

    const light = new THREE.PointLight(beaconMat.color, 1.2, 5);
    light.position.y = 0.5;
    group.add(light);

    this.scene.add(group);
    this.lootMeshes.set(l.id, group);
  }

  private updateSafeZoneVisuals() {
    const sz = this.safeZoneData;
    // Scale safe cylinder
    this.safeZoneMesh.position.set(sz.centerX, 40, sz.centerZ);
    this.safeZoneMesh.scale.set(sz.radius / 140, 1, sz.radius / 140);

    // Safe zone warning alarm sound check
    const distToCenter = Math.hypot(this.playerPos.x - sz.centerX, this.playerPos.z - sz.centerZ);
    this.isOutsideZone = distToCenter > sz.radius;
  }

  // Handle local weapon fire
  public fireWeapon() {
    if (!this.isAlive || this.isDriving) return;
    const now = performance.now() / 1000;
    if (!this.inventory.shoot(now)) {
      if (this.inventory.currentWeapon.currentAmmo === 0 && !this.inventory.isReloading) {
        this.reloadWeapon();
      }
      return;
    }

    const w = this.inventory.currentWeapon;
    soundFx.playGunshot(w.name);
    this.localRig.triggerMuzzleFlash();
    this.cameraShake = Math.min(0.04, this.cameraShake + w.recoilPitch * 0.8);

    // Recoil kick
    this.playerPitch += w.recoilPitch;
    this.playerRotY += (Math.random() - 0.5) * w.recoilYaw;

    // Raycast hit detection against remote players
    const rayDir = new THREE.Vector3();
    this.camera.getWorldDirection(rayDir);
    // Apply weapon spread
    const spread = this.inventory.isADS ? w.spread * 0.4 : w.spread;
    rayDir.x += (Math.random() - 0.5) * spread;
    rayDir.y += (Math.random() - 0.5) * spread;
    rayDir.normalize();

    _ray.set(this.camera.position, rayDir);
    _ray.far = w.range;

    let closestHitTargetId: string | undefined = undefined;
    let isHeadshot = false;
    let closestDist = Infinity;

    for (const [id, remote] of this.remotePlayers) {
      if (!remote.isAlive) continue;
      const intersects = _ray.intersectObject(remote.rig.group, true);
      if (intersects.length > 0 && intersects[0].distance < closestDist) {
        closestDist = intersects[0].distance;
        closestHitTargetId = id;
        isHeadshot = intersects[0].point.y - remote.rig.group.position.y > 1.35;
      }
    }

    // Send shot to server
    this.net.sendShoot(w.name, rayDir.x, rayDir.y, rayDir.z, closestHitTargetId, isHeadshot);
  }

  public reloadWeapon() {
    if (this.inventory.reload()) {
      soundFx.playReload();
    }
  }

  // Handle interaction (Loot or Vehicle)
  public handleInteract() {
    if (this.isDriving && this.activeVehicleId) {
      // Exit vehicle
      this.isDriving = false;
      this.localRig.group.visible = true;
      this.net.sendExitVehicle(this.activeVehicleId);
      this.activeVehicleId = null;
      return;
    }

    // Check nearby vehicles
    for (const [id, vRig] of this.vehicleRigs) {
      const dist = this.playerPos.distanceTo(vRig.group.position);
      if (dist < 4.5) {
        this.isDriving = true;
        this.activeVehicleId = id;
        this.localRig.group.visible = false;
        this.net.sendEnterVehicle(id);
        return;
      }
    }

    // Check nearby loot
    for (const [id, mesh] of this.lootMeshes) {
      const dist = this.playerPos.distanceTo(mesh.position);
      if (dist < 3.8) {
        this.net.sendPickupLoot(id);
        return;
      }
    }
  }

  private updatePlayer(dt: number) {
    if (!this.isAlive) {
      this.localRig.updateAnimation(dt, false, false, false, false, 0, false);
      return;
    }

    // Process look rotation from touch drag or mouse move
    this.playerRotY -= this.input.lookX * (this.inventory.isADS ? 0.0018 : 0.0032);
    this.playerPitch = THREE.MathUtils.clamp(
      this.playerPitch - this.input.lookY * (this.inventory.isADS ? 0.0018 : 0.0032),
      -1.1,
      1.1
    );
    this.input.lookX = 0;
    this.input.lookY = 0;

    // Movement vectors
    _forward.set(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.playerRotY);
    _right.set(1, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.playerRotY);

    if (this.isDriving && this.activeVehicleId) {
      // Vehicle driving dynamics
      const vRig = this.vehicleRigs.get(this.activeVehicleId);
      if (vRig) {
        const steer = -this.input.right;
        const accel = this.input.forward;

        if (accel > 0) {
          this.vehicleSpeed = THREE.MathUtils.damp(this.vehicleSpeed, 26, 2.5, dt);
        } else if (accel < 0) {
          this.vehicleSpeed = THREE.MathUtils.damp(this.vehicleSpeed, -10, 3.5, dt);
        } else {
          this.vehicleSpeed = THREE.MathUtils.damp(this.vehicleSpeed, 0, 1.8, dt);
        }

        // Steer while moving
        if (Math.abs(this.vehicleSpeed) > 0.5) {
          this.playerRotY += steer * (this.vehicleSpeed > 0 ? 1 : -1) * dt * 1.8;
          soundFx.playEngineRev(Math.abs(this.vehicleSpeed) / 26);
        }

        _forward.set(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.playerRotY);
        this.playerPos.addScaledVector(_forward, this.vehicleSpeed * dt);

        const groundY = this.world.getTerrainHeight(this.playerPos.x, this.playerPos.z);
        this.playerPos.y = groundY;

        vRig.group.position.copy(this.playerPos);
        vRig.group.rotation.y = this.playerRotY;
        vRig.updateSteering(steer, this.vehicleSpeed, dt);
      }
    } else {
      // On Foot Commando Movement
      this.isSprinting = this.input.sprint && this.input.forward > 0 && !this.isCrouched && !this.isProne;
      let baseSpeed = this.isSprinting ? 9.5 : 5.5;
      if (this.isCrouched) baseSpeed = 3.2;
      if (this.isProne) baseSpeed = 1.6;
      if (this.inventory.isADS) baseSpeed *= 0.55;

      const moveX = (this.input.forward * _forward.x + this.input.right * _right.x) * baseSpeed;
      const moveZ = (this.input.forward * _forward.z + this.input.right * _right.z) * baseSpeed;

      const isMoving = Math.abs(this.input.forward) > 0.1 || Math.abs(this.input.right) > 0.1;

      // Obstacle collision check with compounds & rocks
      const targetX = this.playerPos.x + moveX * dt;
      const targetZ = this.playerPos.z + moveZ * dt;
      if (!this.world.checkObstacleCollision(targetX, targetZ, 0.45)) {
        this.playerPos.x = targetX;
        this.playerPos.z = targetZ;
      }

      // Ground height & Gravity
      const terrainY = this.world.getTerrainHeight(this.playerPos.x, this.playerPos.z);
      if (this.playerPos.y <= terrainY + 0.05) {
        this.playerPos.y = terrainY;
        this.velocityY = 0;
        this.isGrounded = true;

        if (this.input.jump && !this.isCrouched && !this.isProne) {
          this.velocityY = 7.5;
          this.isGrounded = false;
          soundFx.playJump();
        }
      } else {
        this.velocityY -= 19.8 * dt; // Gravity
        this.playerPos.y += this.velocityY * dt;
        if (this.playerPos.y < terrainY) {
          this.playerPos.y = terrainY;
          this.velocityY = 0;
          this.isGrounded = true;
          soundFx.playLand();
        }
      }

      // Footstep sound interval
      if (isMoving && this.isGrounded) {
        const stepInterval = this.isSprinting ? 0.3 : 0.48;
        const now = performance.now() / 1000;
        if (now - this.lastFootstepTime > stepInterval) {
          soundFx.playFootstep();
          this.lastFootstepTime = now;
        }
      }

      // Local Rig Transform
      this.localRig.group.position.copy(this.playerPos);
      this.localRig.group.rotation.y = this.playerRotY;
      this.localRig.updateAnimation(
        dt,
        isMoving,
        this.isSprinting,
        this.isCrouched,
        this.isProne,
        this.playerPitch,
        this.isAlive
      );
    }

    // Nearby interaction scan (Loot or Vehicle)
    this.nearbyInteractPrompt = null;
    if (this.isDriving) {
      this.nearbyInteractPrompt = 'Tap [EXIT] to leave vehicle';
    } else {
      for (const [id, v] of this.vehicleRigs) {
        if (this.playerPos.distanceTo(v.group.position) < 4.5) {
          this.nearbyInteractPrompt = 'Tap [DRIVE] to enter Tactical Buggy';
          break;
        }
      }
      if (!this.nearbyInteractPrompt) {
        for (const [id, mesh] of this.lootMeshes) {
          if (this.playerPos.distanceTo(mesh.position) < 3.5) {
            this.nearbyInteractPrompt = 'Tap [LOOT] to equip supplies';
            break;
          }
        }
      }
    }

    // Send authoritative player input snapshot to server at ~20Hz
    this.networkInputTimer += dt;
    if (this.networkInputTimer >= 0.05) {
      this.networkInputTimer = 0;
      this.net.sendInput(
        this.playerPos.x,
        this.playerPos.y,
        this.playerPos.z,
        this.playerRotY,
        this.playerPitch,
        this.isDriving,
        this.vehicleSpeed
      );
    }

    // Update weapon reload cycle
    this.inventory.update(dt);
  }

  private updateCamera(dt: number) {
    // Smooth camera chase distance
    let targetDist = this.isDriving ? 6.2 : this.inventory.isADS ? 1.2 : 3.4;
    let targetHeight = this.isDriving ? 2.5 : this.inventory.isADS ? 1.45 : 1.7;
    let shoulderOffset = this.isDriving ? 0 : this.inventory.isADS ? 0.35 : 0.6;

    // Calculate camera target position
    _forward.set(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.playerRotY);
    _right.set(1, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.playerRotY);

    const pitchQuat = new THREE.Quaternion().setFromAxisAngle(_right, this.playerPitch);
    const cameraLookDir = _forward.clone().applyQuaternion(pitchQuat);

    const camTarget = this.playerPos
      .clone()
      .addScaledVector(_right, shoulderOffset)
      .add(new THREE.Vector3(0, targetHeight, 0));

    const desiredCamPos = camTarget.clone().addScaledVector(cameraLookDir, -targetDist);

    // Camera terrain clipping protection
    const camTerrainY = this.world.getTerrainHeight(desiredCamPos.x, desiredCamPos.z) + 0.35;
    if (desiredCamPos.y < camTerrainY) desiredCamPos.y = camTerrainY;

    // Apply decaying camera shake
    if (this.cameraShake > 0) {
      desiredCamPos.x += (Math.random() - 0.5) * this.cameraShake * 2;
      desiredCamPos.y += (Math.random() - 0.5) * this.cameraShake * 2;
      this.cameraShake = THREE.MathUtils.damp(this.cameraShake, 0, 10, dt);
    }

    // Exponential smooth camera damping
    this.camera.position.copy(
      this.camera.position.lerp(desiredCamPos, THREE.MathUtils.clamp(dt * 18, 0, 1))
    );
    this.camera.lookAt(camTarget.clone().addScaledVector(cameraLookDir, 15));

    // Dynamic FOV for ADS
    const targetFov = this.inventory.isADS ? this.inventory.currentWeapon.zoomFov : 65;
    this.camera.fov = THREE.MathUtils.damp(this.camera.fov, targetFov, 14, dt);
    this.camera.updateProjectionMatrix();
  }

  private updateRemotePlayers(dt: number) {
    for (const [, remote] of this.remotePlayers) {
      if (!remote.isAlive) {
        remote.rig.updateAnimation(dt, false, false, false, false, 0, false);
        continue;
      }
      // Dead reckoning / linear interpolation
      remote.rig.group.position.lerp(remote.targetPos, Math.min(1, dt * 12));
      remote.rig.group.rotation.y = THREE.MathUtils.damp(
        remote.rig.group.rotation.y,
        remote.targetRotY,
        12,
        dt
      );
      const isMoving = remote.rig.group.position.distanceTo(remote.targetPos) > 0.1;
      remote.rig.updateAnimation(dt, isMoving, false, false, false, remote.targetPitch, true);
    }
  }

  private startLoop() {
    let lastTime = performance.now();

    const afterDraw = (cb: () => void) => {
      const gl = this.renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          this.frameId = window.setTimeout(poll, 5);
        } else {
          gl.deleteSync(sync);
          this.frameId = window.setTimeout(cb, 80);
        }
      };
      this.frameId = window.setTimeout(poll, 5);
    };

    const tick = () => {
      if (this.isDestroyed) return;

      const now = performance.now();
      const rawDt = (now - lastTime) / 1000;
      lastTime = now;
      const dt = Math.min(rawDt, 0.05); // 60fps clamped delta time

      // Tactical Hitstop check
      if (this.hitstopTimer > 0) {
        this.hitstopTimer -= dt;
      } else {
        // Continuous simulation step
        this.updatePlayer(dt);
        this.updateRemotePlayers(dt);
        this.updateCamera(dt);

        // Hitmarker decay
        if (this.hitmarkerTimer > 0) {
          this.hitmarkerTimer -= dt;
          if (this.hitmarkerTimer <= 0) this.isHitmarkerActive = false;
        }

        // Animate loot floating & spinning
        for (const [, mesh] of this.lootMeshes) {
          mesh.rotation.y += dt * 1.5;
        }

        // Send UI state snapshot
        this.onStateUpdate?.({
          health: Math.round(this.health),
          armor: Math.round(this.armor),
          kills: this.kills,
          isAlive: this.isAlive,
          currentAmmo: this.inventory.currentWeapon.currentAmmo,
          reserveAmmo: this.inventory.currentWeapon.reserveAmmo,
          isReloading: this.inventory.isReloading,
          reloadProgress: this.inventory.reloadProgress,
          isADS: this.inventory.isADS,
          weaponName: this.inventory.currentWeapon.name,
          safeZone: this.safeZoneData,
          nearbyPrompt: this.nearbyInteractPrompt,
          isOutsideZone: this.isOutsideZone,
          isDriving: this.isDriving,
          vehicleSpeed: Math.round(this.vehicleSpeed * 3.6), // km/h
          ping: this.net.pingMs,
        });
      }

      this.renderer.render(this.scene, this.camera);

      if (this.isSoftwareGl) {
        afterDraw(tick);
      } else {
        this.frameId = requestAnimationFrame(tick);
      }
    };

    if (this.isSoftwareGl) {
      afterDraw(tick);
    } else {
      this.frameId = requestAnimationFrame(tick);
    }
  }

  public resize(width: number, height: number) {
    if (!this.renderer || !this.camera) return;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
  }

  public destroy() {
    this.isDestroyed = true;
    cancelAnimationFrame(this.frameId);
    clearTimeout(this.frameId);
    this.net.disconnect();
    this.renderer.dispose();
  }
}
