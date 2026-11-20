import * as THREE from 'three';

export interface GroupPadZone {
  groupId: number;
  name: string;
  color: number;
  rugMesh: THREE.Mesh;
  hitMesh: THREE.Mesh;
  center: THREE.Vector3;
  slotPositions: THREE.Vector3[];
  slotRings: THREE.Mesh[];
}

export interface ChairSlot {
  studentId: string;
  chairGroup: THREE.Group;
  seatPosition: THREE.Vector3;
}

function createWoodPlankTexture(renderer: THREE.WebGLRenderer): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#e7ccb2';
  ctx.fillRect(0, 0, 512, 512);

  const plankHeight = 64;
  for (let row = 0; row < 8; row++) {
    const y = row * plankHeight;
    const toneShift = (row % 3) * 6 - 6;
    ctx.fillStyle = `rgb(${232 + toneShift}, ${201 + toneShift}, ${171 + toneShift})`;
    ctx.fillRect(0, y, 512, plankHeight);

    ctx.strokeStyle = 'rgba(155, 112, 78, 0.22)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(512, y);
    ctx.stroke();

    const seamX = ((row * 173) % 360) + 70;
    ctx.beginPath();
    ctx.moveTo(seamX, y);
    ctx.lineTo(seamX, y + plankHeight);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(5, 5);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return tex;
}

function createBlackboardTexture(renderer: THREE.WebGLRenderer): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 384;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#254a3c';
  ctx.fillRect(0, 0, 1024, 384);

  // Soft chalk dust texture
  ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
  for (let i = 0; i < 40; i++) {
    ctx.fillRect((i * 73) % 980, (i * 41) % 340, 90, 24);
  }

  ctx.fillStyle = 'rgba(255, 249, 238, 0.92)';
  ctx.font = '700 54px Manrope, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Bloomly · Group Your Learners', 512, 132);

  ctx.fillStyle = 'rgba(227, 214, 255, 0.88)';
  ctx.font = '500 30px DM Sans, sans-serif';
  ctx.fillText('Drag seated learners from their chairs to stand in 4 groups of 5', 512, 205);

  ctx.strokeStyle = 'rgba(255, 240, 215, 0.35)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(220, 245);
  ctx.lineTo(804, 245);
  ctx.stroke();

  ctx.fillStyle = 'rgba(255, 236, 205, 0.78)';
  ctx.font = '600 24px DM Sans, sans-serif';
  ctx.fillText('Ability  ·  Learning Style  ·  Personality  ·  Social Skill  ·  Behaviour', 512, 300);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return tex;
}

function createGroupLabelTexture(
  title: string,
  accentHex: string,
  renderer: THREE.WebGLRenderer,
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 160;
  const ctx = canvas.getContext('2d')!;

  ctx.clearRect(0, 0, 512, 160);
  ctx.fillStyle = '#fffaf6';
  ctx.beginPath();
  ctx.roundRect(16, 16, 480, 128, 36);
  ctx.fill();

  ctx.strokeStyle = accentHex;
  ctx.lineWidth = 8;
  ctx.stroke();

  ctx.fillStyle = '#32136f';
  ctx.font = '800 56px Manrope, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(title, 256, 82);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return tex;
}

export function buildClassroomEnvironment(
  scene: THREE.Scene,
  renderer: THREE.WebGLRenderer,
  studentIds: string[],
): {
  chairs: ChairSlot[];
  groupZones: GroupPadZone[];
} {
  // Floor
  const floorTex = createWoodPlankTexture(renderer);
  const floorMat = new THREE.MeshStandardMaterial({
    map: floorTex,
    roughness: 0.78,
    metalness: 0.04,
  });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(24, 20), floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  // Classroom walls (back wall + left sunlit window wall)
  const wallMat = new THREE.MeshStandardMaterial({
    color: 0xfff5ec,
    roughness: 0.92,
    metalness: 0.0,
  });
  const wainscotMat = new THREE.MeshStandardMaterial({
    color: 0xf1dfd0,
    roughness: 0.86,
    metalness: 0.02,
  });

  const backWall = new THREE.Mesh(new THREE.BoxGeometry(24, 6.2, 0.25), wallMat);
  backWall.position.set(0, 3.1, -6.4);
  backWall.receiveShadow = true;
  scene.add(backWall);

  const backWainscot = new THREE.Mesh(new THREE.BoxGeometry(24, 1.35, 0.28), wainscotMat);
  backWainscot.position.set(0, 0.675, -6.38);
  backWainscot.receiveShadow = true;
  scene.add(backWainscot);

  const leftWall = new THREE.Mesh(new THREE.BoxGeometry(0.25, 6.2, 20), wallMat);
  leftWall.position.set(-10.5, 3.1, 0);
  leftWall.receiveShadow = true;
  scene.add(leftWall);

  // Sunlit Window Panels on left wall
  const windowGlowMat = new THREE.MeshStandardMaterial({
    color: 0xfff8e6,
    emissive: 0xffe9c2,
    emissiveIntensity: 0.55,
    roughness: 0.25,
  });
  const windowFrameMat = new THREE.MeshStandardMaterial({
    color: 0xd9bfa8,
    roughness: 0.7,
  });
  [-2.6, 1.2].forEach((zPos) => {
    const frame = new THREE.Mesh(new THREE.BoxGeometry(0.32, 2.7, 2.5), windowFrameMat);
    frame.position.set(-10.35, 3.1, zPos);
    const pane = new THREE.Mesh(new THREE.BoxGeometry(0.34, 2.35, 2.15), windowGlowMat);
    pane.position.set(-10.34, 3.1, zPos);
    scene.add(frame, pane);
  });

  // Chalkboard on back wall
  const boardFrame = new THREE.Mesh(
    new THREE.BoxGeometry(6.4, 2.35, 0.14),
    new THREE.MeshStandardMaterial({ color: 0xb78458, roughness: 0.65 }),
  );
  boardFrame.position.set(0, 3.15, -6.22);
  boardFrame.castShadow = true;
  scene.add(boardFrame);

  const boardTex = createBlackboardTexture(renderer);
  const boardSurface = new THREE.Mesh(
    new THREE.PlaneGeometry(6.0, 2.05),
    new THREE.MeshStandardMaterial({ map: boardTex, roughness: 0.82 }),
  );
  boardSurface.position.set(0, 3.15, -6.14);
  scene.add(boardSurface);

  // Seating Area Rug (left/center-left zone for the 20 chairs)
  const seatingRug = new THREE.Mesh(
    new THREE.BoxGeometry(7.2, 0.024, 6.4),
    new THREE.MeshStandardMaterial({ color: 0xf7e6f8, roughness: 0.94 }),
  );
  seatingRug.position.set(-2.9, 0.012, 0.45);
  seatingRug.receiveShadow = true;
  scene.add(seatingRug);

  // Build 20 Classroom Chairs (5 columns × 4 rows) where students begin seated
  const chairWoodMat = new THREE.MeshStandardMaterial({
    color: 0xc9966b,
    roughness: 0.68,
    metalness: 0.04,
  });
  const chairFrameMat = new THREE.MeshStandardMaterial({
    color: 0x6f43b5,
    roughness: 0.55,
    metalness: 0.15,
  });
  const seatCushionMat = new THREE.MeshStandardMaterial({
    color: 0x8e56dc,
    roughness: 0.85,
  });

  const seatGeo = new THREE.BoxGeometry(0.46, 0.055, 0.44);
  const backGeo = new THREE.BoxGeometry(0.46, 0.42, 0.055);
  const legGeo = new THREE.CylinderGeometry(0.022, 0.02, 0.39, 8);
  const postGeo = new THREE.CylinderGeometry(0.018, 0.018, 0.44, 8);

  const chairs: ChairSlot[] = [];
  const cols = 5;
  const rows = 4;
  const startX = -5.5;
  const startZ = -1.6;
  const spacingX = 1.3;
  const spacingZ = 1.4;

  for (let i = 0; i < studentIds.length; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = startX + col * spacingX;
    const z = startZ + row * spacingZ;

    const chairGroup = new THREE.Group();
    chairGroup.position.set(x, 0, z);
    chairGroup.rotation.y = 0.32; // Angled slightly toward the group activity stations

    const seat = new THREE.Mesh(seatGeo, chairWoodMat);
    seat.position.y = 0.39;
    seat.castShadow = true;
    seat.receiveShadow = true;
    chairGroup.add(seat);

    const cushion = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.024, 0.38), seatCushionMat);
    cushion.position.y = 0.422;
    cushion.receiveShadow = true;
    chairGroup.add(cushion);

    const backrest = new THREE.Mesh(backGeo, chairWoodMat);
    backrest.position.set(0, 0.67, -0.2);
    backrest.castShadow = true;
    chairGroup.add(backrest);

    // 4 metal chair legs + 2 backrest posts
    [
      [-0.19, -0.18],
      [0.19, -0.18],
      [-0.19, 0.18],
      [0.19, 0.18],
    ].forEach(([lx, lz]) => {
      const leg = new THREE.Mesh(legGeo, chairFrameMat);
      leg.position.set(lx, 0.195, lz);
      leg.castShadow = true;
      chairGroup.add(leg);
    });

    [-0.17, 0.17].forEach((px) => {
      const post = new THREE.Mesh(postGeo, chairFrameMat);
      post.position.set(px, 0.54, -0.2);
      chairGroup.add(post);
    });

    scene.add(chairGroup);

    chairs.push({
      studentId: studentIds[i],
      chairGroup,
      seatPosition: new THREE.Vector3(x, 0, z),
    });
  }

  // Build 4 Group Standing Activity Stations (right side of classroom, 2x2 layout)
  const groupSpecs = [
    { id: 1, name: 'Group 1', color: 0x9b6ae8, hex: '#8b50d6', x: 2.55, z: -1.65 },
    { id: 2, name: 'Group 2', color: 0xf4a87a, hex: '#e07b42', x: 5.85, z: -1.65 },
    { id: 3, name: 'Group 3', color: 0xe97da8, hex: '#d45287', x: 2.55, z: 1.65 },
    { id: 4, name: 'Group 4', color: 0x7b56d8, hex: '#6335c5', x: 5.85, z: 1.65 },
  ];

  const rugGeo = new THREE.CylinderGeometry(1.38, 1.42, 0.032, 36);
  const rugBorderGeo = new THREE.RingGeometry(1.32, 1.43, 36);
  const slotDiscGeo = new THREE.CylinderGeometry(0.24, 0.25, 0.02, 20);
  const hitPadGeo = new THREE.CylinderGeometry(1.48, 1.48, 0.35, 24);
  const hitPadMat = new THREE.MeshBasicMaterial({ visible: false });

  const groupZones: GroupPadZone[] = groupSpecs.map((spec) => {
    const zoneCenter = new THREE.Vector3(spec.x, 0, spec.z);

    const rugMat = new THREE.MeshStandardMaterial({
      color: spec.color,
      roughness: 0.9,
      metalness: 0.02,
      transparent: true,
      opacity: 0.32,
    });
    const rugMesh = new THREE.Mesh(rugGeo, rugMat);
    rugMesh.position.set(spec.x, 0.016, spec.z);
    rugMesh.receiveShadow = true;
    scene.add(rugMesh);

    const borderMat = new THREE.MeshBasicMaterial({
      color: spec.color,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.65,
      depthWrite: false,
    });
    const borderRing = new THREE.Mesh(rugBorderGeo, borderMat);
    borderRing.rotation.x = -Math.PI / 2;
    borderRing.position.set(spec.x, 0.036, spec.z);
    scene.add(borderRing);

    // Floating standing sign behind each group mat
    const labelTex = createGroupLabelTexture(spec.name, spec.hex, renderer);
    const labelPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(1.25, 0.39),
      new THREE.MeshBasicMaterial({ map: labelTex, transparent: true }),
    );
    labelPlane.position.set(spec.x, 0.042, spec.z - 1.15);
    labelPlane.rotation.x = -Math.PI / 3.2;
    scene.add(labelPlane);

    // Hit cylinder for raycasting drop targets
    const hitMesh = new THREE.Mesh(hitPadGeo, hitPadMat);
    hitMesh.position.set(spec.x, 0.16, spec.z);
    hitMesh.userData.groupId = spec.id;
    scene.add(hitMesh);

    // 5 Standing Spots arranged cleanly in a semi-circle / pentagon
    const slotPositions: THREE.Vector3[] = [];
    const slotRings: THREE.Mesh[] = [];
    const radius = 0.78;
    for (let s = 0; s < 5; s++) {
      const angle = (s / 5) * Math.PI * 2 - Math.PI / 2;
      const sx = spec.x + Math.cos(angle) * radius;
      const sz = spec.z + Math.sin(angle) * radius;
      slotPositions.push(new THREE.Vector3(sx, 0, sz));

      const slotMat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        emissive: spec.color,
        emissiveIntensity: 0.18,
        roughness: 0.6,
      });
      const slotDisc = new THREE.Mesh(slotDiscGeo, slotMat);
      slotDisc.position.set(sx, 0.03, sz);
      slotDisc.receiveShadow = true;
      scene.add(slotDisc);
      slotRings.push(slotDisc);
    }

    return {
      groupId: spec.id,
      name: spec.name,
      color: spec.color,
      rugMesh,
      hitMesh,
      center: zoneCenter,
      slotPositions,
      slotRings,
    };
  });

  return { chairs, groupZones };
}
