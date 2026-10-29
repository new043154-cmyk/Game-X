import * as THREE from 'three';

export interface WorldCollisionBox {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  height: number;
}

export class IslandWorld {
  public group: THREE.Group;
  public terrainMesh!: THREE.Mesh;
  public oceanMesh!: THREE.Mesh;
  public collisionBoxes: WorldCollisionBox[] = [];
  public treeInstances!: THREE.InstancedMesh;
  public rockInstances!: THREE.InstancedMesh;
  public compoundLocations = [
    { name: 'Central Military Base', x: 0, z: 0 },
    { name: 'Airport Runway', x: -65, z: 50 },
    { name: 'Industrial Port', x: 65, z: -35 },
    { name: 'Mountain Observatory', x: -30, z: -70 },
    { name: 'Riverside Village', x: 45, z: 55 },
    { name: 'Underground Bunker', x: 25, z: -65 },
  ];

  constructor() {
    this.group = new THREE.Group();
    this.buildTerrain();
    this.buildOcean();
    this.buildCompounds();
    this.buildRoads();
    this.buildFoliageAndRocks();
  }

  // Smooth procedural elevation formula
  public getTerrainHeight(x: number, z: number): number {
    const distFromCenter = Math.hypot(x, z);
    // Island shoreline falloff (radius ~150)
    const islandMask = Math.max(0, 1 - Math.pow(distFromCenter / 145, 3));
    if (islandMask <= 0) return -2.0;

    // Rolling hills + mountain peaks
    const h1 = Math.sin(x * 0.035) * Math.cos(z * 0.035) * 5.5;
    const h2 = Math.sin(x * 0.09 + 1.2) * Math.cos(z * 0.09) * 2.2;
    // Mountain near Observatory
    const mountainDist = Math.hypot(x - (-30), z - (-70));
    const mountain = Math.max(0, 18 * Math.exp(-Math.pow(mountainDist / 35, 2)));

    // Flat airport zone
    const airportDist = Math.hypot(x - (-65), z - 50);
    const airportFlatten = Math.exp(-Math.pow(airportDist / 40, 2));

    const rawHeight = (h1 + h2 + mountain) * islandMask;
    return THREE.MathUtils.lerp(rawHeight, 1.2, airportFlatten * 0.7);
  }

  private buildTerrain() {
    const size = 320;
    const segments = 128;
    const geo = new THREE.PlaneGeometry(size, size, segments, segments);
    geo.rotateX(-Math.PI / 2);

    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      pos.setY(i, this.getTerrainHeight(x, z));
    }
    geo.computeVertexNormals();

    // Procedural terrain grass/rock texture
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#2d4a22'; // Base military camo grass green
    ctx.fillRect(0, 0, 512, 512);

    // Stipple dirt and rock patches
    for (let i = 0; i < 4000; i++) {
      const rx = Math.random() * 512;
      const ry = Math.random() * 512;
      const shade = Math.random() > 0.5 ? '#385e2b' : '#22381b';
      ctx.fillStyle = shade;
      ctx.fillRect(rx, ry, Math.random() * 6 + 2, Math.random() * 6 + 2);
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(32, 32);
    texture.colorSpace = THREE.SRGBColorSpace;

    const terrainMat = new THREE.MeshStandardMaterial({
      map: texture,
      roughness: 0.9,
      metalness: 0.05,
      flatShading: false,
    });

    this.terrainMesh = new THREE.Mesh(geo, terrainMat);
    this.terrainMesh.receiveShadow = true;
    this.group.add(this.terrainMesh);
  }

  private buildOcean() {
    const oceanGeo = new THREE.PlaneGeometry(900, 900);
    oceanGeo.rotateX(-Math.PI / 2);
    const oceanMat = new THREE.MeshStandardMaterial({
      color: 0x0a3656, // Deep turquoise navy
      roughness: 0.15,
      metalness: 0.8,
      transparent: true,
      opacity: 0.88,
    });
    this.oceanMesh = new THREE.Mesh(oceanGeo, oceanMat);
    this.oceanMesh.position.y = -0.3;
    this.group.add(this.oceanMesh);
  }

  private buildCompounds() {
    const concreteMat = new THREE.MeshStandardMaterial({
      color: 0x334155, // Concrete slate
      roughness: 0.8,
      metalness: 0.2,
    });
    const metalMat = new THREE.MeshStandardMaterial({
      color: 0x475569, // Corrugated industrial steel
      roughness: 0.4,
      metalness: 0.8,
    });
    const woodMat = new THREE.MeshStandardMaterial({
      color: 0x5c3d2e,
      roughness: 0.85,
    });

    // 1. Central Military Base (3 large Hangars + Radar Dish)
    [-18, 0, 18].forEach((offsetZ) => {
      const hX = -12;
      const hZ = offsetZ;
      const groundY = this.getTerrainHeight(hX, hZ);
      const hangar = this.createHangar(metalMat);
      hangar.position.set(hX, groundY, hZ);
      this.group.add(hangar);
      this.collisionBoxes.push({
        minX: hX - 7,
        maxX: hX + 7,
        minZ: hZ - 5,
        maxZ: hZ + 5,
        height: 6,
      });
    });

    // Radar Tower at Base
    const rX = 14;
    const rZ = 0;
    const rY = this.getTerrainHeight(rX, rZ);
    const radar = this.createRadarTower(concreteMat, metalMat);
    radar.position.set(rX, rY, rZ);
    this.group.add(radar);
    this.collisionBoxes.push({
      minX: rX - 3,
      maxX: rX + 3,
      minZ: rZ - 3,
      maxZ: rZ + 3,
      height: 14,
    });

    // 2. Airport Runway & Control Tower
    const rwX = -65;
    const rwZ = 50;
    const rwY = this.getTerrainHeight(rwX, rwZ) + 0.05;
    const runway = new THREE.Mesh(
      new THREE.PlaneGeometry(24, 120),
      new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.9 })
    );
    runway.rotateX(-Math.PI / 2);
    runway.position.set(rwX, rwY, rwZ);
    runway.receiveShadow = true;
    this.group.add(runway);

    // Control Tower
    const ct = this.createControlTower(concreteMat);
    ct.position.set(rwX + 18, this.getTerrainHeight(rwX + 18, rwZ), rwZ);
    this.group.add(ct);
    this.collisionBoxes.push({
      minX: rwX + 14,
      maxX: rwX + 22,
      minZ: rwZ - 4,
      maxZ: rwZ + 4,
      height: 18,
    });

    // 3. Industrial Port: Shipping Containers & Cranes
    const portX = 65;
    const portZ = -35;
    const colors = [0xd97706, 0x2563eb, 0xdc2626, 0x16a34a, 0x475569];
    for (let i = 0; i < 14; i++) {
      const cMat = new THREE.MeshStandardMaterial({
        color: colors[i % colors.length],
        roughness: 0.5,
        metalness: 0.6,
      });
      const cX = portX + (i % 4) * 5.5 - 8;
      const cZ = portZ + Math.floor(i / 4) * 6.5 - 12;
      const cY = this.getTerrainHeight(cX, cZ);
      const container = new THREE.Mesh(new THREE.BoxGeometry(2.8, 2.8, 6.2), cMat);
      container.position.set(cX, cY + 1.4, cZ);
      container.castShadow = true;
      container.receiveShadow = true;
      this.group.add(container);
      this.collisionBoxes.push({
        minX: cX - 1.5,
        maxX: cX + 1.5,
        minZ: cZ - 3.2,
        maxZ: cZ + 3.2,
        height: 3,
      });
    }

    // 4. Mountain Observatory Dome
    const obsX = -30;
    const obsZ = -70;
    const obsY = this.getTerrainHeight(obsX, obsZ);
    const domeBase = new THREE.Mesh(new THREE.CylinderGeometry(8, 8, 5, 24), concreteMat);
    domeBase.position.set(obsX, obsY + 2.5, obsZ);
    const domeTop = new THREE.Mesh(new THREE.SphereGeometry(7.9, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2), metalMat);
    domeTop.position.set(obsX, obsY + 5, obsZ);
    this.group.add(domeBase);
    this.group.add(domeTop);
    this.collisionBoxes.push({
      minX: obsX - 8,
      maxX: obsX + 8,
      minZ: obsZ - 8,
      maxZ: obsZ + 8,
      height: 14,
    });

    // 5. Riverside Cabins
    const cabX = 45;
    const cabZ = 55;
    for (let c = 0; c < 3; c++) {
      const cx = cabX + c * 14 - 14;
      const cz = cabZ + (c % 2) * 8;
      const cy = this.getTerrainHeight(cx, cz);
      const cabin = this.createCabin(woodMat);
      cabin.position.set(cx, cy, cz);
      this.group.add(cabin);
      this.collisionBoxes.push({
        minX: cx - 4,
        maxX: cx + 4,
        minZ: cz - 3.5,
        maxZ: cz + 3.5,
        height: 4.5,
      });
    }
  }

  private createHangar(mat: THREE.Material): THREE.Group {
    const hangar = new THREE.Group();
    // Curved arched hangar roof
    const arch = new THREE.Mesh(
      new THREE.CylinderGeometry(6, 6, 12, 16, 1, false, 0, Math.PI),
      mat
    );
    arch.rotation.z = Math.PI / 2;
    arch.position.y = 0;
    arch.castShadow = true;
    hangar.add(arch);
    return hangar;
  }

  private createRadarTower(baseMat: THREE.Material, dishMat: THREE.Material): THREE.Group {
    const tower = new THREE.Group();
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 1.4, 12, 8), baseMat);
    shaft.position.y = 6;
    shaft.castShadow = true;
    tower.add(shaft);

    const dish = new THREE.Mesh(new THREE.SphereGeometry(3.5, 16, 8, 0, Math.PI * 2, 0, Math.PI / 3), dishMat);
    dish.position.set(0, 12.5, 0);
    dish.rotation.x = Math.PI / 3;
    tower.add(dish);
    return tower;
  }

  private createControlTower(mat: THREE.Material): THREE.Group {
    const tower = new THREE.Group();
    const shaft = new THREE.Mesh(new THREE.BoxGeometry(5, 14, 5), mat);
    shaft.position.y = 7;
    shaft.castShadow = true;
    tower.add(shaft);

    const glassMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      roughness: 0.1,
      metalness: 0.9,
      emissive: 0x0284c7,
      emissiveIntensity: 0.3,
    });
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(8, 3.5, 8), glassMat);
    cabin.position.y = 15;
    tower.add(cabin);
    return tower;
  }

  private createCabin(mat: THREE.Material): THREE.Group {
    const cabin = new THREE.Group();
    const walls = new THREE.Mesh(new THREE.BoxGeometry(7, 3, 6), mat);
    walls.position.y = 1.5;
    walls.castShadow = true;
    cabin.add(walls);

    const roofMat = new THREE.MeshStandardMaterial({ color: 0x7c2d12, roughness: 0.7 });
    const roof = new THREE.Mesh(new THREE.ConeGeometry(5.5, 2, 4), roofMat);
    roof.position.y = 4;
    roof.rotation.y = Math.PI / 4;
    cabin.add(roof);
    return cabin;
  }

  private buildRoads() {
    // Dirt/Asphalt connecting paths
    const roadMat = new THREE.MeshStandardMaterial({
      color: 0x292524,
      roughness: 0.95,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    });

    const segments = [
      { startX: 0, startZ: 0, endX: -65, endZ: 50 },  // Base to Airport
      { startX: 0, startZ: 0, endX: 65, endZ: -35 },  // Base to Port
      { startX: 0, startZ: 0, endX: 45, endZ: 55 },   // Base to Village
      { startX: 0, startZ: 0, endX: -30, endZ: -70 }, // Base to Observatory
    ];

    segments.forEach(({ startX, startZ, endX, endZ }) => {
      const len = Math.hypot(endX - startX, endZ - startZ);
      const angle = Math.atan2(endX - startX, endZ - startZ);
      const roadGeo = new THREE.PlaneGeometry(6, len, 1, 16);
      roadGeo.rotateX(-Math.PI / 2);

      // Conform road vertices to terrain
      const pos = roadGeo.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const localZ = pos.getZ(i);
        const ratio = (localZ + len / 2) / len;
        const wx = THREE.MathUtils.lerp(startX, endX, ratio);
        const wz = THREE.MathUtils.lerp(startZ, endZ, ratio);
        pos.setY(i, this.getTerrainHeight(wx, wz) + 0.08);
      }
      roadGeo.computeVertexNormals();

      const road = new THREE.Mesh(roadGeo, roadMat);
      road.position.set((startX + endX) / 2, 0, (startZ + endZ) / 2);
      road.rotation.y = angle;
      this.group.add(road);
    });
  }

  private buildFoliageAndRocks() {
    // Pine Trees using InstancedMesh
    const treeCount = 180;
    const trunkGeo = new THREE.CylinderGeometry(0.2, 0.35, 1.8, 6);
    const foliageGeo = new THREE.ConeGeometry(1.6, 4.2, 6);
    foliageGeo.translate(0, 3, 0);

    const treeCombined = new THREE.Group();
    const trunkMesh = new THREE.Mesh(
      trunkGeo,
      new THREE.MeshStandardMaterial({ color: 0x45220a, roughness: 0.9 })
    );
    trunkMesh.position.y = 0.9;
    const foliageMesh = new THREE.Mesh(
      foliageGeo,
      new THREE.MeshStandardMaterial({ color: 0x1e3a1e, roughness: 0.85 })
    );
    treeCombined.add(trunkMesh);
    treeCombined.add(foliageMesh);

    // Merge or single instanced cones for peak 60fps mobile performance
    const coneGeo = new THREE.ConeGeometry(1.8, 4.5, 6);
    coneGeo.translate(0, 2.25, 0);
    const treeMat = new THREE.MeshStandardMaterial({
      color: 0x1b4324,
      roughness: 0.85,
    });
    this.treeInstances = new THREE.InstancedMesh(coneGeo, treeMat, treeCount);
    this.treeInstances.castShadow = true;

    const dummy = new THREE.Object3D();
    const tempColor = new THREE.Color();
    let validTrees = 0;

    for (let i = 0; i < treeCount * 2 && validTrees < treeCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = 15 + Math.random() * 115;
      const x = Math.cos(angle) * dist;
      const z = Math.sin(angle) * dist;
      const y = this.getTerrainHeight(x, z);

      // Skip underwater or compound centers
      if (y > 0.8 && y < 14) {
        dummy.position.set(x, y, z);
        const scale = 0.8 + Math.random() * 0.5;
        dummy.scale.set(scale, scale, scale);
        dummy.rotation.y = Math.random() * Math.PI * 2;
        dummy.updateMatrix();

        this.treeInstances.setMatrixAt(validTrees, dummy.matrix);
        // Color variation (±15%)
        tempColor.setHSL(0.33, 0.45, 0.18 + (Math.random() - 0.5) * 0.08);
        this.treeInstances.setColorAt(validTrees, tempColor);

        // Add trunk collision proxy
        this.collisionBoxes.push({
          minX: x - 0.5,
          maxX: x + 0.5,
          minZ: z - 0.5,
          maxZ: z + 0.5,
          height: 5,
        });

        validTrees++;
      }
    }
    this.treeInstances.instanceMatrix.needsUpdate = true;
    if (this.treeInstances.instanceColor) this.treeInstances.instanceColor.needsUpdate = true;
    this.group.add(this.treeInstances);

    // Granite Boulders
    const rockCount = 65;
    const rockGeo = new THREE.DodecahedronGeometry(1.2, 0);
    const rockMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.9, metalness: 0.1 });
    this.rockInstances = new THREE.InstancedMesh(rockGeo, rockMat, rockCount);
    this.rockInstances.castShadow = true;

    let validRocks = 0;
    for (let i = 0; i < rockCount * 2 && validRocks < rockCount; i++) {
      const rx = (Math.random() - 0.5) * 220;
      const rz = (Math.random() - 0.5) * 220;
      const ry = this.getTerrainHeight(rx, rz);
      if (ry > 0.2) {
        dummy.position.set(rx, ry + 0.5, rz);
        const s = 0.7 + Math.random() * 1.4;
        dummy.scale.set(s, s * (0.6 + Math.random() * 0.5), s);
        dummy.rotation.set(Math.random(), Math.random(), Math.random());
        dummy.updateMatrix();
        this.rockInstances.setMatrixAt(validRocks, dummy.matrix);

        this.collisionBoxes.push({
          minX: rx - s * 0.8,
          maxX: rx + s * 0.8,
          minZ: rz - s * 0.8,
          maxZ: rz + s * 0.8,
          height: s * 1.2,
        });
        validRocks++;
      }
    }
    this.rockInstances.instanceMatrix.needsUpdate = true;
    this.group.add(this.rockInstances);
  }

  // Check collision for a sphere/box radius at (x, z)
  public checkObstacleCollision(x: number, z: number, radius: number): boolean {
    for (const b of this.collisionBoxes) {
      if (
        x + radius > b.minX &&
        x - radius < b.maxX &&
        z + radius > b.minZ &&
        z - radius < b.maxZ
      ) {
        return true;
      }
    }
    return false;
  }
}
