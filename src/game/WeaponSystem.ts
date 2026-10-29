export interface WeaponData {
  id: string;
  name: string;
  type: 'rifle' | 'sniper' | 'smg' | 'shotgun' | 'grenade';
  damage: number;
  fireRate: number; // seconds between shots
  magSize: number;
  currentAmmo: number;
  reserveAmmo: number;
  reloadTime: number;
  recoilPitch: number;
  recoilYaw: number;
  spread: number;
  zoomFov: number; // ADS FOV in degrees
  range: number;
  color: string;
}

export const WEAPON_REGISTRY: Record<string, WeaponData> = {
  'M416-X': {
    id: 'm416',
    name: 'M416-X Assault Rifle',
    type: 'rifle',
    damage: 36,
    fireRate: 0.09,
    magSize: 30,
    currentAmmo: 30,
    reserveAmmo: 120,
    reloadTime: 2.1,
    recoilPitch: 0.018,
    recoilYaw: 0.009,
    spread: 0.02,
    zoomFov: 42,
    range: 220,
    color: '#38bdf8',
  },
  'AK-Vanguard': {
    id: 'ak_vanguard',
    name: 'AK-Vanguard Heavy',
    type: 'rifle',
    damage: 46,
    fireRate: 0.12,
    magSize: 30,
    currentAmmo: 30,
    reserveAmmo: 90,
    reloadTime: 2.4,
    recoilPitch: 0.032,
    recoilYaw: 0.016,
    spread: 0.035,
    zoomFov: 45,
    range: 190,
    color: '#f97316',
  },
  'AWP-Recon': {
    id: 'awp_recon',
    name: 'AWP-Recon Sniper',
    type: 'sniper',
    damage: 96,
    fireRate: 1.25,
    magSize: 5,
    currentAmmo: 5,
    reserveAmmo: 25,
    reloadTime: 3.2,
    recoilPitch: 0.07,
    recoilYaw: 0.02,
    spread: 0.002,
    zoomFov: 16, // High 8x zoom
    range: 400,
    color: '#a855f7',
  },
  'Vector-9': {
    id: 'vector9',
    name: 'Vector-9 SMG',
    type: 'smg',
    damage: 22,
    fireRate: 0.055,
    magSize: 25,
    currentAmmo: 25,
    reserveAmmo: 150,
    reloadTime: 1.7,
    recoilPitch: 0.015,
    recoilYaw: 0.012,
    spread: 0.045,
    zoomFov: 50,
    range: 110,
    color: '#22c55e',
  },
  'Striker-12': {
    id: 'striker12',
    name: 'Striker-12 Shotgun',
    type: 'shotgun',
    damage: 18, // per pellet (8 pellets = 144 max)
    fireRate: 0.45,
    magSize: 8,
    currentAmmo: 8,
    reserveAmmo: 32,
    reloadTime: 2.8,
    recoilPitch: 0.06,
    recoilYaw: 0.025,
    spread: 0.09,
    zoomFov: 55,
    range: 65,
    color: '#eab308',
  },
};

export class WeaponInventory {
  public weapons: WeaponData[] = [];
  public activeSlot: number = 0;
  public isReloading: boolean = false;
  public reloadProgress: number = 0;
  public lastShotTime: number = 0;
  public isADS: boolean = false;
  public grenades: number = 3;

  constructor() {
    // Default loadout: M416-X and Vector-9
    this.weapons.push(JSON.parse(JSON.stringify(WEAPON_REGISTRY['M416-X'])));
    this.weapons.push(JSON.parse(JSON.stringify(WEAPON_REGISTRY['Vector-9'])));
  }

  public get currentWeapon(): WeaponData {
    return this.weapons[this.activeSlot] || this.weapons[0];
  }

  public canShoot(now: number): boolean {
    if (this.isReloading) return false;
    const w = this.currentWeapon;
    if (w.currentAmmo <= 0) return false;
    return now - this.lastShotTime >= w.fireRate;
  }

  public shoot(now: number): boolean {
    if (!this.canShoot(now)) return false;
    this.lastShotTime = now;
    this.currentWeapon.currentAmmo--;
    return true;
  }

  public reload(): boolean {
    const w = this.currentWeapon;
    if (this.isReloading) return false;
    if (w.currentAmmo >= w.magSize) return false;
    if (w.reserveAmmo <= 0) return false;

    this.isReloading = true;
    this.reloadProgress = 0;
    return true;
  }

  public update(dt: number) {
    if (this.isReloading) {
      const w = this.currentWeapon;
      this.reloadProgress += dt / w.reloadTime;
      if (this.reloadProgress >= 1.0) {
        this.isReloading = false;
        this.reloadProgress = 0;
        const needed = w.magSize - w.currentAmmo;
        const toAdd = Math.min(needed, w.reserveAmmo);
        w.currentAmmo += toAdd;
        w.reserveAmmo -= toAdd;
      }
    }
  }

  public switchSlot(slot: number) {
    if (slot >= 0 && slot < this.weapons.length && slot !== this.activeSlot) {
      this.activeSlot = slot;
      this.isReloading = false;
      this.reloadProgress = 0;
    }
  }

  public equipLootWeapon(name: string) {
    const key = Object.keys(WEAPON_REGISTRY).find((k) => name.includes(k) || WEAPON_REGISTRY[k].name.includes(name));
    if (key) {
      const newWep = JSON.parse(JSON.stringify(WEAPON_REGISTRY[key]));
      if (this.weapons.length < 3) {
        this.weapons.push(newWep);
        this.activeSlot = this.weapons.length - 1;
      } else {
        // Replace current active slot
        this.weapons[this.activeSlot] = newWep;
      }
      this.isReloading = false;
    }
  }

  public addAmmo(count: number) {
    this.weapons.forEach((w) => {
      w.reserveAmmo += count;
    });
  }
}
