import * as THREE from 'three';

// 10-Part Composite Procedural Commando Model (THREE.Group)
export class CharacterRig {
  public group: THREE.Group;
  public head: THREE.Group;
  public torso: THREE.Mesh;
  public vest: THREE.Mesh;
  public leftArm: THREE.Group;
  public rightArm: THREE.Group;
  public leftLeg: THREE.Group;
  public rightLeg: THREE.Group;
  public weaponMesh: THREE.Group;
  public muzzleFlash: THREE.Mesh;
  public nametagSprite: THREE.Sprite;
  
  private flashDuration: number = 0;
  private walkCycle: number = 0;

  constructor(colorHex: string = '#2563eb', playerName: string = 'Soldier') {
    this.group = new THREE.Group();

    // Reusable tactical materials with physical variation
    const uniformMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(colorHex),
      roughness: 0.85,
      metalness: 0.1,
    });
    const armorMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#1e293b'), // Tactical slate dark
      roughness: 0.45,
      metalness: 0.55,
    });
    const skinMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#d4a373'),
      roughness: 0.7,
      metalness: 0.05,
    });
    const visorMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#00e5ff'),
      roughness: 0.15,
      metalness: 0.9,
      emissive: new THREE.Color('#00e5ff'),
      emissiveIntensity: 0.4,
    });
    const metalMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#0f172a'),
      roughness: 0.35,
      metalness: 0.85,
    });

    // 1. Pelvis / Hips (pivot root at ground = 0)
    const hips = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.22, 0.24), uniformMat);
    hips.position.y = 0.88;
    hips.castShadow = true;
    this.group.add(hips);

    // 2. Torso
    this.torso = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.48, 0.28), uniformMat);
    this.torso.position.y = 0.34;
    this.torso.castShadow = true;
    hips.add(this.torso);

    // 3. Tactical Plate Carrier Vest (Secondary Read)
    this.vest = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.42, 0.32), armorMat);
    this.vest.position.set(0, 0, 0.01);
    this.vest.castShadow = true;
    this.torso.add(this.vest);

    // 4. Head & Helmet (Accent Detail)
    this.head = new THREE.Group();
    this.head.position.y = 0.36;

    const face = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.24, 0.22), skinMat);
    this.head.add(face);

    const helmet = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.18, 0.28), armorMat);
    helmet.position.set(0, 0.08, -0.01);
    helmet.castShadow = true;
    this.head.add(helmet);

    const visor = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.06, 0.06), visorMat);
    visor.position.set(0, 0.02, 0.12);
    this.head.add(visor);
    this.torso.add(this.head);

    // 5. Left Arm
    this.leftArm = new THREE.Group();
    this.leftArm.position.set(-0.3, 0.18, 0);
    const lUpper = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.3, 0.12), uniformMat);
    lUpper.position.y = -0.15;
    const lForearm = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.28, 0.11), armorMat);
    lForearm.position.y = -0.38;
    this.leftArm.add(lUpper);
    this.leftArm.add(lForearm);
    this.torso.add(this.leftArm);

    // 6. Right Arm (Gripping Weapon)
    this.rightArm = new THREE.Group();
    this.rightArm.position.set(0.3, 0.18, 0);
    const rUpper = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.3, 0.12), uniformMat);
    rUpper.position.y = -0.15;
    const rForearm = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.28, 0.11), armorMat);
    rForearm.position.y = -0.38;
    this.rightArm.add(rUpper);
    this.rightArm.add(rForearm);
    this.torso.add(this.rightArm);

    // 7. Tactical Weapon in hands
    this.weaponMesh = new THREE.Group();
    const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.12, 0.5), metalMat);
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.4), metalMat);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.z = 0.42;
    const mag = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.14, 0.1), armorMat);
    mag.position.set(0, -0.1, 0.12);
    const scope = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.18), metalMat);
    scope.rotation.x = Math.PI / 2;
    scope.position.set(0, 0.08, 0.05);

    this.weaponMesh.add(receiver);
    this.weaponMesh.add(barrel);
    this.weaponMesh.add(mag);
    this.weaponMesh.add(scope);
    this.weaponMesh.position.set(0.05, -0.4, 0.22);
    this.weaponMesh.rotation.set(-0.2, 0, 0);
    this.rightArm.add(this.weaponMesh);

    // Muzzle Flash Sprite
    const flashMat = new THREE.MeshBasicMaterial({
      color: 0xffaa00,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
    });
    this.muzzleFlash = new THREE.Mesh(new THREE.OctahedronGeometry(0.14), flashMat);
    this.muzzleFlash.position.set(0, 0, 0.65);
    this.weaponMesh.add(this.muzzleFlash);

    // 8. Left Leg
    this.leftLeg = new THREE.Group();
    this.leftLeg.position.set(-0.13, -0.1, 0);
    const lThigh = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.4, 0.15), uniformMat);
    lThigh.position.y = -0.2;
    const lShin = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.36, 0.14), armorMat);
    lShin.position.y = -0.52;
    const lBoot = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.12, 0.22), metalMat);
    lBoot.position.set(0, -0.72, 0.04);
    this.leftLeg.add(lThigh);
    this.leftLeg.add(lShin);
    this.leftLeg.add(lBoot);
    hips.add(this.leftLeg);

    // 9. Right Leg
    this.rightLeg = new THREE.Group();
    this.rightLeg.position.set(0.13, -0.1, 0);
    const rThigh = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.4, 0.15), uniformMat);
    rThigh.position.y = -0.2;
    const rShin = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.36, 0.14), armorMat);
    rShin.position.y = -0.52;
    const rBoot = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.12, 0.22), metalMat);
    rBoot.position.set(0, -0.72, 0.04);
    this.rightLeg.add(rThigh);
    this.rightLeg.add(rShin);
    this.rightLeg.add(rBoot);
    hips.add(this.rightLeg);

    // 10. Overhead Tactical Nameplate
    this.nametagSprite = this.createNameplate(playerName);
    this.nametagSprite.position.set(0, 2.1, 0);
    this.group.add(this.nametagSprite);
  }

  private createNameplate(text: string): THREE.Sprite {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = 'rgba(15, 23, 42, 0.8)';
    ctx.roundRect(10, 10, 236, 44, 8);
    ctx.fill();

    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 24px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 128, 32);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    const spriteMat = new THREE.SpriteMaterial({ map: texture, depthTest: false });
    const sprite = new THREE.Sprite(spriteMat);
    sprite.scale.set(1.6, 0.4, 1);
    return sprite;
  }

  public triggerMuzzleFlash() {
    this.flashDuration = 0.06;
    (this.muzzleFlash.material as THREE.MeshBasicMaterial).opacity = 1.0;
  }

  public updateAnimation(
    dt: number,
    isMoving: boolean,
    isSprinting: boolean,
    isCrouching: boolean,
    isProne: boolean,
    pitch: number = 0,
    isAlive: boolean = true
  ) {
    // Muzzle flash decay
    if (this.flashDuration > 0) {
      this.flashDuration -= dt;
      if (this.flashDuration <= 0) {
        (this.muzzleFlash.material as THREE.MeshBasicMaterial).opacity = 0;
      }
    }

    if (!isAlive) {
      // Ragdoll collapse to ground
      this.group.rotation.x = THREE.MathUtils.damp(this.group.rotation.x, -Math.PI / 2, 8, dt);
      this.group.position.y = THREE.MathUtils.damp(this.group.position.y, 0.2, 8, dt);
      return;
    }

    // Aim pitch controls upper torso and arms
    this.torso.rotation.x = THREE.MathUtils.clamp(pitch * 0.6, -0.6, 0.6);

    // Stance heights
    if (isProne) {
      this.group.position.y = 0.25;
      this.group.rotation.x = -Math.PI / 2.2;
    } else if (isCrouching) {
      this.group.position.y = 0.55;
      this.group.rotation.x = 0;
      this.leftLeg.rotation.x = -0.7;
      this.rightLeg.rotation.x = -0.7;
    } else {
      this.group.position.y = 0;
      this.group.rotation.x = 0;
    }

    // Walking / Running cycle
    if (isMoving && !isProne) {
      const speed = isSprinting ? 14 : 9;
      this.walkCycle += dt * speed;

      const legAngle = Math.sin(this.walkCycle) * (isSprinting ? 0.75 : 0.45);
      this.leftLeg.rotation.x = legAngle;
      this.rightLeg.rotation.x = -legAngle;

      // Arms compensate
      this.leftArm.rotation.x = -legAngle * 0.6 - 0.4;
      this.rightArm.rotation.x = legAngle * 0.3 - 0.5;
    } else if (!isCrouching && !isProne) {
      // Idle breathing stance
      this.leftLeg.rotation.x = THREE.MathUtils.damp(this.leftLeg.rotation.x, 0, 8, dt);
      this.rightLeg.rotation.x = THREE.MathUtils.damp(this.rightLeg.rotation.x, 0, 8, dt);
      this.leftArm.rotation.x = -0.4;
      this.rightArm.rotation.x = -0.5;
    }
  }
}
