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

export interface BoardZone {
  center: THREE.Vector3;
  writePosition: THREE.Vector3;
  boardPosition: THREE.Vector3;
  boardFacingAngle: number;
  hitMesh: THREE.Mesh;
  rugMesh: THREE.Mesh;
  drawBoard: (entries: Array<{ author: string; text: string; progress: number }>) => void;
}

export interface WindowZone {
  id: string;
  center: THREE.Vector3;
  hitMesh: THREE.Mesh;
  frameMat: THREE.MeshStandardMaterial;
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

function createBoardSpotLabelTexture(renderer: THREE.WebGLRenderer): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 140;
  const ctx = canvas.getContext('2d')!;

  ctx.clearRect(0, 0, 512, 140);
  ctx.fillStyle = '#214537';
  ctx.beginPath();
  ctx.roundRect(14, 14, 484, 112, 30);
  ctx.fill();

  ctx.strokeStyle = '#d4a373';
  ctx.lineWidth = 7;
  ctx.stroke();

  ctx.fillStyle = '#fff9ee';
  ctx.font = '800 38px Manrope, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('Board · Drop to Write', 256, 72);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return tex;
}

function createSchoolCarpetTexture(renderer: THREE.WebGLRenderer): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1400;
  canvas.height = 520;
  const ctx = canvas.getContext('2d')!;

  // Rich woven plum outer border
  ctx.fillStyle = '#5d26a8';
  ctx.beginPath();
  ctx.roundRect(0, 0, 1400, 520, 38);
  ctx.fill();

  // Gold woven inner trim
  ctx.strokeStyle = '#f4c653';
  ctx.lineWidth = 10;
  ctx.beginPath();
  ctx.roundRect(22, 22, 1356, 476, 28);
  ctx.stroke();

  // Warm cream/lavender central rug field
  ctx.fillStyle = '#fbf2ff';
  ctx.beginPath();
  ctx.roundRect(38, 38, 1324, 444, 22);
  ctx.fill();

  // Subtle woven stripes
  ctx.fillStyle = 'rgba(124, 66, 212, 0.05)';
  for (let y = 52; y < 470; y += 18) {
    ctx.fillRect(50, y, 1300, 5);
  }

  // Bold school name on the carpet close to the teacher
  ctx.fillStyle = '#32136f';
  ctx.font = '800 84px Manrope, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('ESTATE MODEL HIGH SCHOOL', 700, 225);

  // Decorative stars & Civic subtitle
  ctx.fillStyle = '#7c42d4';
  ctx.font = '700 34px DM Sans, sans-serif';
  ctx.fillText('★  CIVIC EDUCATION · EXCELLENCE & INTEGRITY  ★', 700, 330);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return tex;
}

function createFieldLinesTexture(renderer: THREE.WebGLRenderer): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 768;
  const ctx = canvas.getContext('2d')!;

  // Mowed grass stripes
  for (let i = 0; i < 12; i++) {
    ctx.fillStyle = i % 2 === 0 ? '#509944' : '#468c3b';
    ctx.fillRect(0, i * 64, 512, 64);
  }

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
  ctx.lineWidth = 6;

  // Pitch boundary
  ctx.strokeRect(28, 34, 456, 700);

  // Halfway line & center circle
  ctx.beginPath();
  ctx.moveTo(28, 384);
  ctx.lineTo(484, 384);
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(256, 384, 66, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(256, 384, 6, 0, Math.PI * 2);
  ctx.fill();

  // Penalty boxes
  ctx.strokeRect(136, 34, 240, 108);
  ctx.strokeRect(136, 626, 240, 108);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return tex;
}

function buildOutdoorSchoolyard(scene: THREE.Scene, renderer: THREE.WebGLRenderer) {
  // Grass lawn outside the classroom windows (x: -39 to -10.5)
  const lawnMat = new THREE.MeshStandardMaterial({
    color: 0x62a84f,
    roughness: 0.92,
    metalness: 0,
  });
  const lawn = new THREE.Mesh(new THREE.PlaneGeometry(32, 36), lawnMat);
  lawn.rotation.x = -Math.PI / 2;
  lawn.position.set(-26.5, -0.015, 0);
  lawn.receiveShadow = true;
  scene.add(lawn);

  // Paved walkway right outside the classroom wall
  const walkway = new THREE.Mesh(
    new THREE.BoxGeometry(1.9, 0.04, 20),
    new THREE.MeshStandardMaterial({ color: 0xead8c8, roughness: 0.88 }),
  );
  walkway.position.set(-11.55, 0.01, 0);
  walkway.receiveShadow = true;
  scene.add(walkway);

  // Football / Play Field
  const fieldTex = createFieldLinesTexture(renderer);
  const pitch = new THREE.Mesh(
    new THREE.PlaneGeometry(10.6, 15.6),
    new THREE.MeshStandardMaterial({ map: fieldTex, roughness: 0.88 }),
  );
  pitch.rotation.x = -Math.PI / 2;
  pitch.position.set(-24.8, 0.004, -2.2);
  pitch.receiveShadow = true;
  scene.add(pitch);

  // Football goalposts at north (-9.6) and south (+5.2) ends of pitch
  const postMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.35, metalness: 0.2 });
  const netMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.32,
    side: THREE.DoubleSide,
    wireframe: true,
  });

  [-9.6, 5.2].forEach((gz, idx) => {
    const goalGroup = new THREE.Group();
    goalGroup.position.set(-24.8, 0, gz);
    if (idx === 1) goalGroup.rotation.y = Math.PI;

    const leftPost = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 1.55, 10), postMat);
    leftPost.position.set(-1.5, 0.775, 0);
    leftPost.castShadow = true;

    const rightPost = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 1.55, 10), postMat);
    rightPost.position.set(1.5, 0.775, 0);
    rightPost.castShadow = true;

    const crossbar = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 3.1, 10), postMat);
    crossbar.rotation.z = Math.PI / 2;
    crossbar.position.set(0, 1.55, 0);
    crossbar.castShadow = true;

    const backNet = new THREE.Mesh(new THREE.BoxGeometry(2.96, 1.48, 0.75), netMat);
    backNet.position.set(0, 0.75, -0.4);

    goalGroup.add(leftPost, rightPost, crossbar, backNet);
    scene.add(goalGroup);
  });

  // Soccer ball on center spot
  const ball = new THREE.Mesh(
    new THREE.SphereGeometry(0.18, 14, 14),
    new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.45 }),
  );
  ball.position.set(-24.8, 0.18, -2.2);
  ball.castShadow = true;
  scene.add(ball);

  // Playground Zone (closer to the front-left outside the windows: x ≈ -15.8, z ≈ +4.6)
  const playgroundPad = new THREE.Mesh(
    new THREE.CylinderGeometry(3.6, 3.7, 0.05, 32),
    new THREE.MeshStandardMaterial({ color: 0xf4dfca, roughness: 0.92 }),
  );
  playgroundPad.position.set(-15.6, 0.02, 4.4);
  playgroundPad.receiveShadow = true;
  scene.add(playgroundPad);

  // Swingset
  const swingFrameMat = new THREE.MeshStandardMaterial({ color: 0x6b32c2, roughness: 0.45, metalness: 0.25 });
  const swingSeatMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.55 });
  const swingGroup = new THREE.Group();
  swingGroup.position.set(-16.2, 0, 5.4);
  swingGroup.rotation.y = 0.25;

  const topBar = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 3.0, 10), swingFrameMat);
  topBar.rotation.z = Math.PI / 2;
  topBar.position.y = 2.25;
  topBar.castShadow = true;
  swingGroup.add(topBar);

  [-1.4, 1.4].forEach((lx) => {
    [-0.55, 0.55].forEach((lz) => {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.05, 2.38, 8), swingFrameMat);
      leg.position.set(lx, 1.12, lz * 0.5);
      leg.rotation.x = lz > 0 ? -0.24 : 0.24;
      leg.castShadow = true;
      swingGroup.add(leg);
    });
  });

  [-0.58, 0.58].forEach((sx) => {
    const chainMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.6, roughness: 0.3 });
    [-0.18, 0.18].forEach((cx) => {
      const chain = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 1.65, 6), chainMat);
      chain.position.set(sx + cx, 1.4, 0);
      swingGroup.add(chain);
    });
    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.05, 0.24), swingSeatMat);
    seat.position.set(sx, 0.56, 0);
    seat.castShadow = true;
    swingGroup.add(seat);
  });
  scene.add(swingGroup);

  // Slide
  const slideGroup = new THREE.Group();
  slideGroup.position.set(-14.3, 0, 3.2);
  slideGroup.rotation.y = -0.5;
  const slideChute = new THREE.Mesh(
    new THREE.BoxGeometry(0.62, 0.08, 2.2),
    new THREE.MeshStandardMaterial({ color: 0xf472b6, roughness: 0.35 }),
  );
  slideChute.position.set(0, 0.9, 0.55);
  slideChute.rotation.x = 0.62;
  slideChute.castShadow = true;
  const slidePlatform = new THREE.Mesh(
    new THREE.BoxGeometry(0.66, 0.1, 0.66),
    swingFrameMat,
  );
  slidePlatform.position.set(0, 1.5, -0.35);
  [-0.28, 0.28].forEach((px) => {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.55, 8), swingFrameMat);
    post.position.set(px, 0.77, -0.6);
    post.castShadow = true;
    slideGroup.add(post);
  });
  slideGroup.add(slideChute, slidePlatform);
  scene.add(slideGroup);

  // Seesaw
  const seesawGroup = new THREE.Group();
  seesawGroup.position.set(-16.8, 0, 2.8);
  seesawGroup.rotation.y = 0.4;
  const fulcrum = new THREE.Mesh(
    new THREE.ConeGeometry(0.24, 0.45, 12),
    swingFrameMat,
  );
  fulcrum.position.y = 0.22;
  const plank = new THREE.Mesh(
    new THREE.BoxGeometry(2.4, 0.08, 0.32),
    new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.5 }),
  );
  plank.position.y = 0.48;
  plank.rotation.z = 0.16;
  plank.castShadow = true;
  seesawGroup.add(fulcrum, plank);
  scene.add(seesawGroup);

  // Lush Trees & Vegetation visible right outside the classroom windows!
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x7c4d2b, roughness: 0.9 });
  const leafDarkMat = new THREE.MeshStandardMaterial({ color: 0x2f7d32, roughness: 0.82 });
  const leafBrightMat = new THREE.MeshStandardMaterial({ color: 0x4caf50, roughness: 0.78 });
  const flowerMat = new THREE.MeshStandardMaterial({ color: 0xf472b6, roughness: 0.65 });
  const flowerGoldMat = new THREE.MeshStandardMaterial({ color: 0xfbbf24, roughness: 0.65 });

  const treeCoords: Array<[number, number, number]> = [
    [-13.8, -4.6, 1.15],
    [-14.6, -0.8, 0.95],
    [-13.9, 1.6, 1.05],
    [-18.2, -6.5, 1.25],
    [-18.8, 8.2, 1.2],
    [-31.5, -7.2, 1.35],
    [-31.8, 0.4, 1.25],
    [-31.4, 7.6, 1.3],
    [-24.2, -12.6, 1.35],
    [-25.4, 9.2, 1.2],
  ];

  treeCoords.forEach(([tx, tz, scale], idx) => {
    const tree = new THREE.Group();
    tree.position.set(tx, 0, tz);

    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.16 * scale, 0.24 * scale, 1.9 * scale, 10),
      trunkMat,
    );
    trunk.position.y = 0.95 * scale;
    trunk.castShadow = true;

    const c1 = new THREE.Mesh(
      new THREE.DodecahedronGeometry(1.05 * scale, 1),
      idx % 2 === 0 ? leafDarkMat : leafBrightMat,
    );
    c1.position.set(0, 2.35 * scale, 0);
    c1.castShadow = true;

    const c2 = new THREE.Mesh(
      new THREE.DodecahedronGeometry(0.75 * scale, 1),
      idx % 2 === 0 ? leafBrightMat : leafDarkMat,
    );
    c2.position.set(0.45 * scale, 2.85 * scale, -0.2 * scale);
    c2.castShadow = true;

    const c3 = new THREE.Mesh(
      new THREE.DodecahedronGeometry(0.68 * scale, 1),
      leafBrightMat,
    );
    c3.position.set(-0.48 * scale, 2.1 * scale, 0.3 * scale);
    c3.castShadow = true;

    tree.add(trunk, c1, c2, c3);
    scene.add(tree);
  });

  // Flowering shrubs right outside the window sill
  [-4.4, -3.5, -1.5, -0.6, 0.4, 2.5, 3.6].forEach((sz, idx) => {
    const bush = new THREE.Group();
    bush.position.set(-12.75, 0, sz);

    const foliage = new THREE.Mesh(
      new THREE.DodecahedronGeometry(0.52 + (idx % 2) * 0.14, 1),
      idx % 2 === 0 ? leafBrightMat : leafDarkMat,
    );
    foliage.position.y = 0.42;
    foliage.castShadow = true;
    bush.add(foliage);

    for (let f = 0; f < 3; f++) {
      const blossom = new THREE.Mesh(
        new THREE.SphereGeometry(0.09, 8, 8),
        (idx + f) % 2 === 0 ? flowerMat : flowerGoldMat,
      );
      blossom.position.set((f - 1) * 0.22, 0.65 + (f % 2) * 0.12, 0.25);
      bush.add(blossom);
    }

    scene.add(bush);
  });

  // Schoolyard wooden perimeter fence
  const fenceMat = new THREE.MeshStandardMaterial({ color: 0xe6d3bc, roughness: 0.82 });
  for (let fz = -12; fz <= 12; fz += 2.4) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.14, 1.05, 0.14), fenceMat);
    post.position.set(-34.2, 0.525, fz);
    post.castShadow = true;
    scene.add(post);
  }
  [0.35, 0.82].forEach((ry) => {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.08, 24.4), fenceMat);
    rail.position.set(-34.2, ry, 0);
    scene.add(rail);
  });
}

export function buildClassroomEnvironment(
  scene: THREE.Scene,
  renderer: THREE.WebGLRenderer,
  studentIds: string[],
): {
  chairs: ChairSlot[];
  groupZones: GroupPadZone[];
  boardZone: BoardZone;
  windowZones: WindowZone[];
} {
  // Classroom Interior Wood Floor (x: -10.5 to +11.5)
  const floorTex = createWoodPlankTexture(renderer);
  const floorMat = new THREE.MeshStandardMaterial({
    map: floorTex,
    roughness: 0.78,
    metalness: 0.04,
  });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(22, 16.5), floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0.5, 0, 2.05);
  floor.receiveShadow = true;
  scene.add(floor);

  // Build lush outdoor vegetation, football field & playground outside left windows
  buildOutdoorSchoolyard(scene, renderer);

  // Classroom walls (back wall + left wall with REAL open window cutouts)
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
  const exteriorWallMat = new THREE.MeshStandardMaterial({
    color: 0xf6e6d5,
    roughness: 0.88,
  });

  const backWall = new THREE.Mesh(new THREE.BoxGeometry(22, 6.2, 0.25), wallMat);
  backWall.position.set(0.5, 3.1, -6.1);
  backWall.receiveShadow = true;
  scene.add(backWall);

  const backWainscot = new THREE.Mesh(new THREE.BoxGeometry(22, 1.35, 0.28), wainscotMat);
  backWainscot.position.set(0.5, 0.675, -6.08);
  backWainscot.receiveShadow = true;
  scene.add(backWainscot);

  // Left wall with two genuine open window portals at z = -2.6 and z = +1.2 (2.5m wide, y: 1.75..4.45)
  const addLeftWallSegment = (yCenter: number, ySize: number, zCenter: number, zSize: number) => {
    const inner = new THREE.Mesh(new THREE.BoxGeometry(0.24, ySize, zSize), wallMat);
    inner.position.set(-10.5, yCenter, zCenter);
    inner.receiveShadow = true;
    inner.castShadow = true;
    scene.add(inner);

    const outer = new THREE.Mesh(new THREE.BoxGeometry(0.06, ySize, zSize), exteriorWallMat);
    outer.position.set(-10.64, yCenter, zCenter);
    outer.receiveShadow = true;
    scene.add(outer);
  };

  // Bottom apron (y: 0..1.75), top header (y: 4.45..6.2), and 3 vertical piers around the 2 windows
  addLeftWallSegment(0.875, 1.75, 0, 20);
  addLeftWallSegment(5.325, 1.75, 0, 20);
  addLeftWallSegment(3.1, 2.7, -6.925, 6.15);
  addLeftWallSegment(3.1, 2.7, -0.7, 1.3);
  addLeftWallSegment(3.1, 2.7, 6.225, 7.55);

  // Exterior school trim strip along roof edge
  const roofTrim = new THREE.Mesh(
    new THREE.BoxGeometry(0.38, 0.28, 20.2),
    new THREE.MeshStandardMaterial({ color: 0x6829bd, roughness: 0.7 }),
  );
  roofTrim.position.set(-10.58, 6.15, 0);
  scene.add(roofTrim);

  // Interactive Open Windows looking out onto Vegetation & Play Field
  const windowZones: WindowZone[] = [];
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0xe6f6ff,
    transparent: true,
    opacity: 0.16,
    roughness: 0.08,
    metalness: 0.1,
    side: THREE.DoubleSide,
  });

  [-2.6, 1.2].forEach((zPos, idx) => {
    const frameMat = new THREE.MeshStandardMaterial({
      color: 0xc99c72,
      roughness: 0.62,
    });

    const sill = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.1, 2.66), frameMat);
    sill.position.set(-10.52, 1.78, zPos);
    const header = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.1, 2.66), frameMat);
    header.position.set(-10.52, 4.42, zPos);
    const sideBack = new THREE.Mesh(new THREE.BoxGeometry(0.34, 2.7, 0.1), frameMat);
    sideBack.position.set(-10.52, 3.1, zPos - 1.25);
    const sideFront = new THREE.Mesh(new THREE.BoxGeometry(0.34, 2.7, 0.1), frameMat);
    sideFront.position.set(-10.52, 3.1, zPos + 1.25);
    scene.add(sill, header, sideBack, sideFront);

    // Two hinged glass casements swung open outward toward the field
    const backSash = new THREE.Group();
    backSash.position.set(-10.58, 3.1, zPos - 1.2);
    backSash.rotation.y = -0.62;
    const backGlass = new THREE.Mesh(new THREE.PlaneGeometry(0.04, 2.45), glassMat);
    backGlass.rotation.y = Math.PI / 2;
    const backPane = new THREE.Mesh(new THREE.BoxGeometry(0.04, 2.45, 1.15), glassMat);
    backPane.position.z = 0.58;
    const backStile = new THREE.Mesh(new THREE.BoxGeometry(0.06, 2.52, 0.06), frameMat);
    backStile.position.z = 1.16;
    backSash.add(backGlass, backPane, backStile);
    scene.add(backSash);

    const frontSash = new THREE.Group();
    frontSash.position.set(-10.58, 3.1, zPos + 1.2);
    frontSash.rotation.y = 0.62;
    const frontPane = new THREE.Mesh(new THREE.BoxGeometry(0.04, 2.45, 1.15), glassMat);
    frontPane.position.z = -0.58;
    const frontStile = new THREE.Mesh(new THREE.BoxGeometry(0.06, 2.52, 0.06), frameMat);
    frontStile.position.z = -1.16;
    frontSash.add(frontPane, frontStile);
    scene.add(frontSash);

    const winHitMesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.55, 2.75, 2.55),
      new THREE.MeshBasicMaterial({ visible: false }),
    );
    winHitMesh.position.set(-10.5, 3.1, zPos);
    winHitMesh.userData.isWindow = true;
    winHitMesh.userData.windowId = `window-${idx + 1}`;
    scene.add(winHitMesh);

    windowZones.push({
      id: `window-${idx + 1}`,
      center: new THREE.Vector3(-10.5, 3.05, zPos),
      hitMesh: winHitMesh,
      frameMat,
    });
  });

  // Civic Education, Voting & Electoral Process Chalkboard (Facing the children!)
  const boardPos = new THREE.Vector3(-1.85, 0, -5.65);
  const boardFacingAngle = 0.1; // Tilted slightly toward the seating rows so every learner sees it
  const boardGroup = new THREE.Group();
  boardGroup.position.copy(boardPos);
  boardGroup.rotation.y = boardFacingAngle;
  scene.add(boardGroup);

  const boardFrame = new THREE.Mesh(
    new THREE.BoxGeometry(7.2, 2.75, 0.16),
    new THREE.MeshStandardMaterial({ color: 0xb78458, roughness: 0.65 }),
  );
  boardFrame.position.set(0, 2.6, 0);
  boardFrame.castShadow = true;
  boardGroup.add(boardFrame);

  const chalkTray = new THREE.Mesh(
    new THREE.BoxGeometry(6.8, 0.08, 0.24),
    new THREE.MeshStandardMaterial({ color: 0x9b6d46, roughness: 0.65 }),
  );
  chalkTray.position.set(0, 1.25, 0.12);
  boardGroup.add(chalkTray);

  const boardCanvas = document.createElement('canvas');
  boardCanvas.width = 1152;
  boardCanvas.height = 460;
  const boardCtx = boardCanvas.getContext('2d')!;
  const boardTex = new THREE.CanvasTexture(boardCanvas);
  boardTex.colorSpace = THREE.SRGBColorSpace;
  boardTex.anisotropy = renderer.capabilities.getMaxAnisotropy();

  let lastBoardSignature = '';
  const drawBoard = (entries: Array<{ author: string; text: string; progress: number }>) => {
    const sig = entries
      .map((e) => `${e.author}:${e.text}:${Math.floor(e.progress * 30)}`)
      .join('|');
    if (sig === lastBoardSignature) return;
    lastBoardSignature = sig;

    boardCtx.fillStyle = '#1f4536';
    boardCtx.fillRect(0, 0, 1152, 460);

    // Subtle chalk smudge
    boardCtx.fillStyle = 'rgba(255, 255, 255, 0.03)';
    for (let i = 0; i < 40; i++) {
      boardCtx.fillRect((i * 89) % 1040, (i * 51) % 390, 120, 22);
    }

    // Main Civic Education Title
    boardCtx.fillStyle = '#fde68a';
    boardCtx.font = '800 38px Manrope, sans-serif';
    boardCtx.textAlign = 'center';
    boardCtx.fillText('CIVIC EDUCATION · Voting & Electoral Process', 576, 52);

    boardCtx.strokeStyle = 'rgba(255, 240, 215, 0.35)';
    boardCtx.lineWidth = 3;
    boardCtx.beginPath();
    boardCtx.moveTo(80, 78);
    boardCtx.lineTo(1072, 78);
    boardCtx.stroke();

    // Permanent Civic Education Lesson Outline
    boardCtx.textAlign = 'left';
    boardCtx.fillStyle = '#d1fae5';
    boardCtx.font = '700 24px DM Sans, sans-serif';
    boardCtx.fillText('1. Civic Duties & Rights: Obey laws, participate & vote responsibly', 84, 122);

    boardCtx.fillStyle = '#fff9ee';
    boardCtx.fillText('2. Voting: Secret ballot, Voter Card (PVC) & one citizen, one equal vote', 84, 162);

    boardCtx.fillStyle = '#fde68a';
    boardCtx.fillText('3. Electoral Process: Register → Campaign → Polling Unit → Count → Result', 84, 202);

    boardCtx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    boardCtx.lineWidth = 2;
    boardCtx.beginPath();
    boardCtx.moveTo(84, 228);
    boardCtx.lineTo(1068, 228);
    boardCtx.stroke();

    if (entries.length === 0) {
      boardCtx.fillStyle = 'rgba(227, 214, 255, 0.88)';
      boardCtx.font = '500 24px DM Sans, sans-serif';
      boardCtx.fillText('Student Chalk Notes (drag a learner to Board mat or press Write):', 84, 272);
      boardCtx.fillStyle = 'rgba(255, 249, 238, 0.72)';
      boardCtx.fillText('✎ Waiting for learners to share their Civic Education notes...', 84, 322);
    } else {
      const visible = entries.slice(-3);
      visible.forEach((entry, idx) => {
        const y = 276 + idx * 58;
        const fullText = `${entry.text}`;
        const charCount = Math.max(1, Math.floor(fullText.length * Math.min(1, entry.progress)));
        const shown = fullText.slice(0, charCount);

        boardCtx.fillStyle = '#fde68a';
        boardCtx.font = '700 25px Manrope, sans-serif';
        boardCtx.fillText('✎', 84, y);

        boardCtx.fillStyle = '#fff9ee';
        boardCtx.font = '600 26px DM Sans, sans-serif';
        boardCtx.fillText(shown, 126, y);
      });
    }

    boardTex.needsUpdate = true;
  };

  drawBoard([]);

  const boardSurface = new THREE.Mesh(
    new THREE.PlaneGeometry(6.8, 2.45),
    new THREE.MeshStandardMaterial({ map: boardTex, roughness: 0.82 }),
  );
  boardSurface.position.set(0, 2.6, 0.09);
  boardGroup.add(boardSurface);

  // Bold "ESTATE MODEL HIGH SCHOOL" Teacher Carpet right in front of the board
  const carpetTex = createSchoolCarpetTexture(renderer);
  const schoolCarpet = new THREE.Mesh(
    new THREE.BoxGeometry(6.4, 0.026, 2.1),
    new THREE.MeshStandardMaterial({ map: carpetTex, roughness: 0.92 }),
  );
  schoolCarpet.position.set(-1.6, 0.013, -3.7);
  schoolCarpet.rotation.y = 0.06;
  schoolCarpet.receiveShadow = true;
  scene.add(schoolCarpet);

  // Chalkboard Floor Drop Spot (right in front of the chalkboard, overlapping back edge of carpet)
  const boardCenter = new THREE.Vector3(-1.75, 0, -4.45);
  const boardWritePos = new THREE.Vector3(-1.75, 0, -5.02);
  const boardRugMat = new THREE.MeshStandardMaterial({
    color: 0x3b7a62,
    roughness: 0.85,
    transparent: true,
    opacity: 0.28,
  });
  const boardRugMesh = new THREE.Mesh(
    new THREE.CylinderGeometry(1.05, 1.08, 0.032, 32),
    boardRugMat,
  );
  boardRugMesh.position.set(boardCenter.x, 0.018, boardCenter.z);
  boardRugMesh.receiveShadow = true;
  scene.add(boardRugMesh);

  const boardRing = new THREE.Mesh(
    new THREE.RingGeometry(0.98, 1.08, 32),
    new THREE.MeshBasicMaterial({
      color: 0x3b7a62,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.65,
      depthWrite: false,
    }),
  );
  boardRing.rotation.x = -Math.PI / 2;
  boardRing.position.set(boardCenter.x, 0.036, boardCenter.z);
  scene.add(boardRing);

  const boardLabelTex = createBoardSpotLabelTexture(renderer);
  const boardLabelPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(1.55, 0.42),
    new THREE.MeshBasicMaterial({ map: boardLabelTex, transparent: true }),
  );
  boardLabelPlane.position.set(boardCenter.x, 0.044, boardCenter.z + 0.88);
  boardLabelPlane.rotation.x = -Math.PI / 3.2;
  scene.add(boardLabelPlane);

  const boardHitMesh = new THREE.Mesh(
    new THREE.CylinderGeometry(1.2, 1.2, 0.35, 20),
    new THREE.MeshBasicMaterial({ visible: false }),
  );
  boardHitMesh.position.set(boardCenter.x, 0.16, boardCenter.z);
  boardHitMesh.userData.boardZone = true;
  scene.add(boardHitMesh);

  // Seating Area Rug (left/center-left zone for the 20 chairs, shifted slightly forward for clear teaching aisle)
  const seatingRug = new THREE.Mesh(
    new THREE.BoxGeometry(7.2, 0.024, 6.2),
    new THREE.MeshStandardMaterial({ color: 0xf7e6f8, roughness: 0.94 }),
  );
  seatingRug.position.set(-2.9, 0.012, 0.85);
  seatingRug.receiveShadow = true;
  scene.add(seatingRug);

  // Build 20 Classroom Chairs (5 columns × 4 rows) ALL FACING THE BLACKBOARD!
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
  const startX = -5.5;
  const startZ = -1.15;
  const spacingX = 1.3;
  const spacingZ = 1.35;

  for (let i = 0; i < studentIds.length; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = startX + col * spacingX;
    const z = startZ + row * spacingZ;

    const chairGroup = new THREE.Group();
    chairGroup.position.set(x, 0, z);
    // Seated student faces +z in local space -> orient directly toward the chalkboard!
    chairGroup.rotation.y = Math.atan2(boardPos.x - x, boardPos.z - z);

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
    { id: 1, name: 'Group 1', color: 0x9b6ae8, hex: '#8b50d6', x: 2.55, z: -1.45 },
    { id: 2, name: 'Group 2', color: 0xf4a87a, hex: '#e07b42', x: 5.85, z: -1.45 },
    { id: 3, name: 'Group 3', color: 0xe97da8, hex: '#d45287', x: 2.55, z: 1.85 },
    { id: 4, name: 'Group 4', color: 0x7b56d8, hex: '#6335c5', x: 5.85, z: 1.85 },
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

    const labelTex = createGroupLabelTexture(spec.name, spec.hex, renderer);
    const labelPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(1.25, 0.39),
      new THREE.MeshBasicMaterial({ map: labelTex, transparent: true }),
    );
    labelPlane.position.set(spec.x, 0.042, spec.z - 1.15);
    labelPlane.rotation.x = -Math.PI / 3.2;
    scene.add(labelPlane);

    const hitMesh = new THREE.Mesh(hitPadGeo, hitPadMat);
    hitMesh.position.set(spec.x, 0.16, spec.z);
    hitMesh.userData.groupId = spec.id;
    scene.add(hitMesh);

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

  return {
    chairs,
    groupZones,
    boardZone: {
      center: boardCenter,
      writePosition: boardWritePos,
      boardPosition: boardPos,
      boardFacingAngle,
      hitMesh: boardHitMesh,
      rugMesh: boardRugMesh,
      drawBoard,
    },
    windowZones,
  };
}
