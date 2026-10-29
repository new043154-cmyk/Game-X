import * as THREE from 'three';

// 9-Part Composite Procedural High-Mobility Tactical Buggy
export class VehicleRig {
  public group: THREE.Group;
  public frontLeftWheel: THREE.Group;
  public frontRightWheel: THREE.Group;
  public rearLeftWheel: THREE.Mesh;
  public rearRightWheel: THREE.Mesh;
  public steeringWheel: THREE.Mesh;
  public headlightBeamLeft: THREE.SpotLight;
  public headlightBeamRight: THREE.SpotLight;
  public exhaustPoint: THREE.Vector3 = new THREE.Vector3(0, 0.4, -1.4);

  constructor() {
    this.group = new THREE.Group();

    const chassisMat = new THREE.MeshStandardMaterial({
      color: 0x223322, // Camo military olive drab
      roughness: 0.6,
      metalness: 0.4,
    });
    const cageMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b, // Dark steel
      roughness: 0.35,
      metalness: 0.85,
    });
    const tireMat = new THREE.MeshStandardMaterial({
      color: 0x111111,
      roughness: 0.95,
      metalness: 0.05,
    });
    const rimMat = new THREE.MeshStandardMaterial({
      color: 0xff5722, // Flame orange accent ring
      roughness: 0.2,
      metalness: 0.9,
    });
    const lightLensMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xffeedd,
      emissiveIntensity: 1.5,
      roughness: 0.1,
    });

    // 1. Main Armored Chassis Hull
    const hull = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.45, 2.6), chassisMat);
    hull.position.y = 0.65;
    hull.castShadow = true;
    this.group.add(hull);

    // 2. Protective Roll Cage (Secondary Read)
    const cage = new THREE.Group();
    cage.position.set(0, 0.5, -0.2);

    const postGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.9);
    const roofGeo = new THREE.BoxGeometry(1.4, 0.06, 1.4);

    const flPost = new THREE.Mesh(postGeo, cageMat);
    flPost.position.set(-0.65, 0.45, 0.6);
    flPost.rotation.z = -0.15;

    const frPost = new THREE.Mesh(postGeo, cageMat);
    frPost.position.set(0.65, 0.45, 0.6);
    frPost.rotation.z = 0.15;

    const rlPost = new THREE.Mesh(postGeo, cageMat);
    rlPost.position.set(-0.65, 0.45, -0.6);

    const rrPost = new THREE.Mesh(postGeo, cageMat);
    rrPost.position.set(0.65, 0.45, -0.6);

    const roof = new THREE.Mesh(roofGeo, cageMat);
    roof.position.set(0, 0.9, 0);

    cage.add(flPost);
    cage.add(frPost);
    cage.add(rlPost);
    cage.add(rrPost);
    cage.add(roof);
    hull.add(cage);

    // 3. Front Bumper / Bull Bar
    const bumper = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.2, 0.2), cageMat);
    bumper.position.set(0, 0.5, 1.4);
    this.group.add(bumper);

    // Helper to build a wheel with styled rim
    const createWheel = () => {
      const wheelGroup = new THREE.Group();
      const tire = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.35, 16), tireMat);
      tire.rotation.z = Math.PI / 2;
      tire.castShadow = true;

      const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.36, 8), rimMat);
      rim.rotation.z = Math.PI / 2;

      wheelGroup.add(tire);
      wheelGroup.add(rim);
      return wheelGroup;
    };

    // 4. Steerable Front Wheels
    this.frontLeftWheel = new THREE.Group();
    this.frontLeftWheel.position.set(-0.95, 0.42, 0.9);
    const flwMesh = createWheel();
    this.frontLeftWheel.add(flwMesh);
    this.group.add(this.frontLeftWheel);

    this.frontRightWheel = new THREE.Group();
    this.frontRightWheel.position.set(0.95, 0.42, 0.9);
    const frwMesh = createWheel();
    this.frontRightWheel.add(frwMesh);
    this.group.add(this.frontRightWheel);

    // 5. Rear Wheels
    const rlwGroup = createWheel();
    rlwGroup.position.set(-0.95, 0.42, -0.85);
    this.rearLeftWheel = rlwGroup.children[0] as THREE.Mesh;
    this.group.add(rlwGroup);

    const rrwGroup = createWheel();
    rrwGroup.position.set(0.95, 0.42, -0.85);
    this.rearRightWheel = rrwGroup.children[0] as THREE.Mesh;
    this.group.add(rrwGroup);

    // 6. Cockpit: Steering Wheel & Bucket Seats
    const seatMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.8 });
    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), seatMat);
    seat.position.set(-0.35, 0.75, 0.1);
    this.group.add(seat);

    this.steeringWheel = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.025, 8, 16), cageMat);
    this.steeringWheel.position.set(-0.35, 1.05, 0.42);
    this.steeringWheel.rotation.x = -Math.PI / 3;
    this.group.add(this.steeringWheel);

    // 7. High-Intensity LED Headlights (Accent Detail)
    const hlLeft = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.1, 12), lightLensMat);
    hlLeft.rotation.x = Math.PI / 2;
    hlLeft.position.set(-0.55, 0.7, 1.35);
    this.group.add(hlLeft);

    const hlRight = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.1, 12), lightLensMat);
    hlRight.rotation.x = Math.PI / 2;
    hlRight.position.set(0.55, 0.7, 1.35);
    this.group.add(hlRight);

    this.headlightBeamLeft = new THREE.SpotLight(0xffeedd, 3, 30, Math.PI / 6, 0.3);
    this.headlightBeamLeft.position.set(-0.55, 0.7, 1.4);
    this.headlightBeamLeft.target.position.set(-0.55, 0.1, 15);
    this.group.add(this.headlightBeamLeft);
    this.group.add(this.headlightBeamLeft.target);

    this.headlightBeamRight = new THREE.SpotLight(0xffeedd, 3, 30, Math.PI / 6, 0.3);
    this.headlightBeamRight.position.set(0.55, 0.7, 1.4);
    this.headlightBeamRight.target.position.set(0.55, 0.1, 15);
    this.group.add(this.headlightBeamRight);
    this.group.add(this.headlightBeamRight.target);
  }

  public updateSteering(steerFactor: number, speed: number, dt: number) {
    // Steer front wheels
    const targetAngle = steerFactor * 0.45;
    this.frontLeftWheel.rotation.y = THREE.MathUtils.damp(this.frontLeftWheel.rotation.y, targetAngle, 12, dt);
    this.frontRightWheel.rotation.y = THREE.MathUtils.damp(this.frontRightWheel.rotation.y, targetAngle, 12, dt);
    this.steeringWheel.rotation.z = -this.frontLeftWheel.rotation.y * 2;

    // Spin wheels according to speed
    const spin = (speed / 0.42) * dt;
    this.frontLeftWheel.children[0].rotation.x += spin;
    this.frontRightWheel.children[0].rotation.x += spin;
    this.rearLeftWheel.rotation.x += spin;
    this.rearRightWheel.rotation.x += spin;

    // Body roll when turning at speed
    this.group.rotation.z = THREE.MathUtils.damp(this.group.rotation.z, -steerFactor * 0.08, 6, dt);
  }
}
