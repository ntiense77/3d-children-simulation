import * as THREE from 'three';

export type HairVariant = 'cornrows' | 'fade' | 'bun' | 'short' | 'puffs';

export type StudentActionMode =
  | 'seated'
  | 'standing'
  | 'walking'
  | 'writing_board'
  | 'raising_hand'
  | 'answering'
  | 'jumping_window'
  | 'playing_football'
  | 'swinging';

export interface StudentRig {
  root: THREE.Group;
  bodyPivot: THREE.Group;
  hipsPivot: THREE.Group;
  headPivot: THREE.Group;
  leftShoulder: THREE.Group;
  rightShoulder: THREE.Group;
  leftHip: THREE.Group;
  rightHip: THREE.Group;
  leftKnee: THREE.Group;
  rightKnee: THREE.Group;
  chalkStick: THREE.Mesh;
  selectionRing: THREE.Mesh;
  handBadge: THREE.Mesh;
  hitProxy: THREE.Mesh;
  poseBlend: number; // 0 = seated, 1 = standing
  raiseBlend: number; // 0 = lowered, 1 = raised hand
  writeBlend: number; // 0 = idle, 1 = writing on board
  kickBlend: number; // > 0 = ball kick swing
  walkCycle: number;
  bounce: number;
  phaseOffset: number;
}

export interface TeacherRig {
  root: THREE.Group;
  hipsPivot: THREE.Group;
  headPivot: THREE.Group;
  leftShoulder: THREE.Group;
  rightShoulder: THREE.Group;
  leftHip: THREE.Group;
  rightHip: THREE.Group;
  leftKnee: THREE.Group;
  rightKnee: THREE.Group;
  caneGroup: THREE.Group;
  hitProxy: THREE.Mesh;
  haloRing: THREE.Mesh;
  walkCycle: number;
  gestureAmount: number;
  pointBlend: number;
  nodAmount: number;
}

const SKIN_TONES = [0x6b3e26, 0x5c331c, 0x7a482c, 0x4f2a17, 0x855233];

const sharedGeometries = {
  torso: new THREE.CylinderGeometry(0.145, 0.13, 0.34, 14),
  collar: new THREE.CylinderGeometry(0.11, 0.125, 0.05, 14),
  pelvis: new THREE.CylinderGeometry(0.132, 0.125, 0.12, 12),
  head: new THREE.SphereGeometry(0.145, 18, 16),
  neck: new THREE.CylinderGeometry(0.048, 0.055, 0.07, 10),
  eye: new THREE.SphereGeometry(0.017, 10, 10),
  upperArm: new THREE.CylinderGeometry(0.038, 0.034, 0.18, 10),
  forearm: new THREE.CylinderGeometry(0.032, 0.028, 0.17, 10),
  hand: new THREE.SphereGeometry(0.032, 10, 10),
  thigh: new THREE.CylinderGeometry(0.052, 0.044, 0.22, 10),
  calf: new THREE.CylinderGeometry(0.042, 0.034, 0.22, 10),
  shoe: new THREE.BoxGeometry(0.075, 0.048, 0.135),
  hairCap: new THREE.SphereGeometry(0.152, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.62),
  puff: new THREE.SphereGeometry(0.068, 12, 12),
  bun: new THREE.SphereGeometry(0.072, 12, 12),
  braid: new THREE.CylinderGeometry(0.018, 0.015, 0.2, 8),
  badge: new THREE.BoxGeometry(0.045, 0.05, 0.012),
  ring: new THREE.RingGeometry(0.26, 0.33, 28),
  chalk: new THREE.CylinderGeometry(0.01, 0.01, 0.075, 8),
  handBeacon: new THREE.OctahedronGeometry(0.065, 0),
  hitProxy: new THREE.CylinderGeometry(0.28, 0.28, 1.15, 10),
  teacherHitProxy: new THREE.CylinderGeometry(0.38, 0.38, 1.65, 10),
};

const vestMat = new THREE.MeshStandardMaterial({
  color: 0x6226b5,
  roughness: 0.78,
  metalness: 0.02,
});

const shirtMat = new THREE.MeshStandardMaterial({
  color: 0xd9c2f8,
  roughness: 0.65,
  metalness: 0.02,
});

const skirtOrTrouserMat = new THREE.MeshStandardMaterial({
  color: 0x3b1b6d,
  roughness: 0.82,
  metalness: 0.04,
});

const shoeMat = new THREE.MeshStandardMaterial({
  color: 0x1e1826,
  roughness: 0.42,
  metalness: 0.12,
});

const hairMat = new THREE.MeshStandardMaterial({
  color: 0x1a1412,
  roughness: 0.88,
  metalness: 0.02,
});

const eyeMat = new THREE.MeshStandardMaterial({
  color: 0x160e0c,
  roughness: 0.2,
  metalness: 0.05,
});

const badgeMat = new THREE.MeshStandardMaterial({
  color: 0xf6c94d,
  roughness: 0.35,
  metalness: 0.45,
});

const chalkMat = new THREE.MeshStandardMaterial({
  color: 0xffffff,
  roughness: 0.9,
});

const hitMat = new THREE.MeshBasicMaterial({
  visible: false,
});

export function inferHairVariant(avatarUrl: string): HairVariant {
  if (avatarUrl.includes('amaka')) return 'cornrows';
  if (avatarUrl.includes('bayo')) return 'fade';
  if (avatarUrl.includes('zara')) return 'bun';
  if (avatarUrl.includes('kene')) return 'short';
  return 'puffs';
}

export function createStudentRig(
  studentId: string,
  index: number,
  hairVariant: HairVariant,
): StudentRig {
  const root = new THREE.Group();
  root.userData.studentId = studentId;

  const skinColor = SKIN_TONES[index % SKIN_TONES.length];
  const skinMat = new THREE.MeshStandardMaterial({
    color: skinColor,
    roughness: 0.62,
    metalness: 0.02,
  });

  // Selection / hover halo on ground
  const ringMat = new THREE.MeshBasicMaterial({
    color: 0x8d50d6,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0,
    depthWrite: false,
  });
  const selectionRing = new THREE.Mesh(sharedGeometries.ring, ringMat);
  selectionRing.rotation.x = -Math.PI / 2;
  selectionRing.position.y = 0.015;
  root.add(selectionRing);

  // Invisible hit proxy for raycasting & drag picking
  const hitProxy = new THREE.Mesh(sharedGeometries.hitProxy, hitMat);
  hitProxy.position.y = 0.56;
  hitProxy.userData.studentId = studentId;
  root.add(hitProxy);

  const bodyPivot = new THREE.Group();
  root.add(bodyPivot);

  const hipsPivot = new THREE.Group();
  hipsPivot.position.set(0, 0.39, 0);
  bodyPivot.add(hipsPivot);

  const pelvis = new THREE.Mesh(sharedGeometries.pelvis, skirtOrTrouserMat);
  pelvis.castShadow = true;
  pelvis.receiveShadow = true;
  hipsPivot.add(pelvis);

  const torso = new THREE.Mesh(sharedGeometries.torso, vestMat);
  torso.position.y = 0.21;
  torso.castShadow = true;
  torso.receiveShadow = true;
  hipsPivot.add(torso);

  const badge = new THREE.Mesh(sharedGeometries.badge, badgeMat);
  badge.position.set(0.065, 0.26, 0.128);
  hipsPivot.add(badge);

  const collar = new THREE.Mesh(sharedGeometries.collar, shirtMat);
  collar.position.y = 0.37;
  collar.castShadow = true;
  hipsPivot.add(collar);

  const neck = new THREE.Mesh(sharedGeometries.neck, skinMat);
  neck.position.y = 0.41;
  hipsPivot.add(neck);

  const headPivot = new THREE.Group();
  headPivot.position.set(0, 0.53, 0);
  hipsPivot.add(headPivot);

  const head = new THREE.Mesh(sharedGeometries.head, skinMat);
  head.castShadow = true;
  head.receiveShadow = true;
  headPivot.add(head);

  const leftEye = new THREE.Mesh(sharedGeometries.eye, eyeMat);
  leftEye.position.set(-0.048, 0.015, 0.133);
  const rightEye = new THREE.Mesh(sharedGeometries.eye, eyeMat);
  rightEye.position.set(0.048, 0.015, 0.133);
  headPivot.add(leftEye, rightEye);

  // Floating golden star beacon above head when raising hand to answer
  const handBadgeMat = new THREE.MeshStandardMaterial({
    color: 0xf6c94d,
    emissive: 0xf59e0b,
    emissiveIntensity: 0.55,
    roughness: 0.3,
    metalness: 0.2,
    transparent: true,
    opacity: 0,
  });
  const handBadge = new THREE.Mesh(sharedGeometries.handBeacon, handBadgeMat);
  handBadge.position.set(0, 0.29, 0);
  handBadge.visible = false;
  headPivot.add(handBadge);

  const hairCap = new THREE.Mesh(sharedGeometries.hairCap, hairMat);
  hairCap.position.y = 0.012;
  hairCap.rotation.x = -0.18;
  hairCap.castShadow = true;
  headPivot.add(hairCap);

  if (hairVariant === 'puffs') {
    const leftPuff = new THREE.Mesh(sharedGeometries.puff, hairMat);
    leftPuff.position.set(-0.125, 0.115, -0.02);
    leftPuff.castShadow = true;
    const rightPuff = new THREE.Mesh(sharedGeometries.puff, hairMat);
    rightPuff.position.set(0.125, 0.115, -0.02);
    rightPuff.castShadow = true;
    headPivot.add(leftPuff, rightPuff);
  } else if (hairVariant === 'bun') {
    const bun = new THREE.Mesh(sharedGeometries.bun, hairMat);
    bun.position.set(0, 0.04, -0.155);
    bun.castShadow = true;
    headPivot.add(bun);
  } else if (hairVariant === 'cornrows') {
    for (let i = -2; i <= 2; i++) {
      const braid = new THREE.Mesh(sharedGeometries.braid, hairMat);
      braid.position.set(i * 0.036, -0.06, -0.125);
      braid.rotation.x = 0.14;
      braid.castShadow = true;
      headPivot.add(braid);
    }
  }

  // Arms
  const buildArm = (side: -1 | 1) => {
    const shoulder = new THREE.Group();
    shoulder.position.set(side * 0.175, 0.34, 0);
    hipsPivot.add(shoulder);

    const upperArm = new THREE.Mesh(sharedGeometries.upperArm, shirtMat);
    upperArm.position.y = -0.08;
    upperArm.castShadow = true;
    shoulder.add(upperArm);

    const forearm = new THREE.Mesh(sharedGeometries.forearm, skinMat);
    forearm.position.set(0, -0.22, 0.02);
    forearm.rotation.x = -0.25;
    forearm.castShadow = true;
    shoulder.add(forearm);

    const hand = new THREE.Mesh(sharedGeometries.hand, skinMat);
    hand.position.set(0, -0.3, 0.045);
    shoulder.add(hand);

    return { shoulder, hand };
  };

  const leftArm = buildArm(-1);
  const rightArm = buildArm(1);

  const chalkStick = new THREE.Mesh(sharedGeometries.chalk, chalkMat);
  chalkStick.position.set(0, -0.015, 0.045);
  chalkStick.rotation.x = Math.PI / 2;
  chalkStick.visible = false;
  rightArm.hand.add(chalkStick);

  // Legs
  const buildLeg = (side: -1 | 1) => {
    const hip = new THREE.Group();
    hip.position.set(side * 0.072, -0.03, 0);
    hipsPivot.add(hip);

    const thigh = new THREE.Mesh(sharedGeometries.thigh, skirtOrTrouserMat);
    thigh.position.y = -0.11;
    thigh.castShadow = true;
    hip.add(thigh);

    const knee = new THREE.Group();
    knee.position.set(0, -0.21, 0);
    hip.add(knee);

    const calf = new THREE.Mesh(sharedGeometries.calf, skinMat);
    calf.position.y = -0.11;
    calf.castShadow = true;
    knee.add(calf);

    const shoe = new THREE.Mesh(sharedGeometries.shoe, shoeMat);
    shoe.position.set(0, -0.22, 0.028);
    shoe.castShadow = true;
    knee.add(shoe);

    return { hip, knee };
  };

  const leftLeg = buildLeg(-1);
  const rightLeg = buildLeg(1);

  return {
    root,
    bodyPivot,
    hipsPivot,
    headPivot,
    leftShoulder: leftArm.shoulder,
    rightShoulder: rightArm.shoulder,
    leftHip: leftLeg.hip,
    rightHip: rightLeg.hip,
    leftKnee: leftLeg.knee,
    rightKnee: rightLeg.knee,
    chalkStick,
    selectionRing,
    handBadge,
    hitProxy,
    poseBlend: 0,
    raiseBlend: 0,
    writeBlend: 0,
    kickBlend: 0,
    walkCycle: 0,
    bounce: 0,
    phaseOffset: index * 0.65,
  };
}

export function updateStudentPose(
  rig: StudentRig,
  actionMode: StudentActionMode,
  isDragging: boolean,
  isHovered: boolean,
  isSelected: boolean,
  elapsed: number,
  delta: number,
  swingAngle = 0,
) {
  const isSwinging = actionMode === 'swinging' && !isDragging;
  const targetPose =
    (actionMode === 'seated' || isSwinging) && !isDragging
      ? 0
      : isDragging
        ? 0.72
        : 1;
  const targetRaise = actionMode === 'raising_hand' ? 1 : 0;
  const targetWrite = actionMode === 'writing_board' ? 1 : 0;

  rig.poseBlend = THREE.MathUtils.damp(rig.poseBlend, targetPose, 11, delta);
  rig.raiseBlend = THREE.MathUtils.damp(rig.raiseBlend, targetRaise, 12, delta);
  rig.writeBlend = THREE.MathUtils.damp(rig.writeBlend, targetWrite, 12, delta);
  rig.kickBlend = THREE.MathUtils.damp(rig.kickBlend, 0, 9, delta);
  rig.bounce = THREE.MathUtils.damp(rig.bounce, 0, 8, delta);

  const isRunning = actionMode === 'playing_football';
  const isMoving = actionMode === 'walking' || isRunning;

  if (isMoving) {
    rig.walkCycle += delta * (isRunning ? 13.0 : 9.5);
  } else {
    rig.walkCycle = THREE.MathUtils.damp(rig.walkCycle, Math.round(rig.walkCycle / Math.PI) * Math.PI, 8, delta);
  }

  const p = rig.poseBlend;
  const r = rig.raiseBlend;
  const w = rig.writeBlend;
  const idleWave = Math.sin(elapsed * 2.1 + rig.phaseOffset);
  const walkSwing = isMoving ? Math.sin(rig.walkCycle) * (isRunning ? 0.68 : 0.45) : 0;
  const walkBob = isMoving ? Math.abs(Math.sin(rig.walkCycle)) * (isRunning ? 0.055 : 0.035) : 0;
  const answerNod = actionMode === 'answering' ? Math.sin(elapsed * 7.5) * 0.08 : 0;
  const isJumping = actionMode === 'jumping_window';

  rig.bodyPivot.rotation.x = isSwinging
    ? swingAngle
    : THREE.MathUtils.damp(rig.bodyPivot.rotation.x, 0, 12, delta);

  // Pelvis height: seated = 0.39, standing = 0.45 + drag lift + bounce + walk bob
  const hipY =
    THREE.MathUtils.lerp(0.39, 0.45, p) +
    (isDragging ? 0.42 : 0) +
    rig.bounce +
    walkBob;
  rig.hipsPivot.position.y = hipY;

  // Legs (seated bent, swinging pump, standing upright, running/walking swing, kicking, or window vault)
  const swingPump = isSwinging ? THREE.MathUtils.clamp(-swingAngle * 1.4, -0.7, 0.85) : 0;
  const baseHipPitch = THREE.MathUtils.lerp(-Math.PI / 2 + swingPump * 0.28, 0, p);
  const dragLegSwing = isDragging ? Math.sin(elapsed * 9 + rig.phaseOffset) * 0.14 : 0;
  const jumpTuck = isJumping ? -0.75 : 0;
  const kickAngle = -rig.kickBlend * 1.15;

  rig.leftHip.rotation.x = baseHipPitch + dragLegSwing + walkSwing + jumpTuck;
  rig.rightHip.rotation.x = baseHipPitch - dragLegSwing - walkSwing + jumpTuck + kickAngle;

  const swingKneePitch = isSwinging
    ? THREE.MathUtils.clamp(Math.PI / 2 - swingPump * 1.05, 0.2, 1.85)
    : Math.PI / 2;
  const baseKneePitch = THREE.MathUtils.lerp(swingKneePitch, 0, p);
  rig.leftKnee.rotation.x =
    baseKneePitch + (isMoving ? Math.max(0, -walkSwing) * 0.72 : 0) + (isJumping ? 1.1 : 0);
  rig.rightKnee.rotation.x =
    baseKneePitch + (isMoving ? Math.max(0, walkSwing) * 0.72 : 0) + (isJumping ? 1.1 : 0);

  // Left arm (gripping chain on swing, dragging, or normal idle/walk)
  const baseArmPitch = isSwinging
    ? -2.42
    : isDragging || isJumping
      ? -0.95
      : THREE.MathUtils.lerp(-0.42, -0.08 + idleWave * 0.05, p);
  rig.leftShoulder.rotation.x = baseArmPitch - walkSwing * 0.78;
  rig.leftShoulder.rotation.z = isSwinging
    ? 0.06
    : isDragging || isJumping
      ? 0.42
      : THREE.MathUtils.lerp(0.08, 0.14, p);

  // Right arm (handles swing chain grip, idle/walk, raised hand to answer, and chalk writing!)
  let rightPitch = baseArmPitch + walkSwing * 0.78;
  let rightRoll = isSwinging
    ? -0.06
    : isDragging || isJumping
      ? -0.42
      : -THREE.MathUtils.lerp(0.08, 0.14, p);

  if (r > 0.02) {
    // Excited raised right hand waving gently!
    const raisePitch = -2.65 + Math.sin(elapsed * 5.2 + rig.phaseOffset) * 0.14;
    const raiseRoll = -0.28 + Math.cos(elapsed * 4.5 + rig.phaseOffset) * 0.08;
    rightPitch = THREE.MathUtils.lerp(rightPitch, raisePitch, r);
    rightRoll = THREE.MathUtils.lerp(rightRoll, raiseRoll, r);
  }

  if (w > 0.02) {
    // Chalk writing motion on board
    const writePitch = -1.72 + Math.sin(elapsed * 12) * 0.14;
    const writeRoll = -0.18 + Math.cos(elapsed * 7) * 0.22;
    rightPitch = THREE.MathUtils.lerp(rightPitch, writePitch, w);
    rightRoll = THREE.MathUtils.lerp(rightRoll, writeRoll, w);
  }

  rig.rightShoulder.rotation.x = rightPitch;
  rig.rightShoulder.rotation.z = rightRoll;
  rig.chalkStick.visible = w > 0.35;

  // Head
  rig.headPivot.rotation.y =
    w > 0.3 ? Math.sin(elapsed * 4) * 0.08 : idleWave * (isSwinging ? 0.14 : 0.08);
  rig.headPivot.rotation.x =
    (isSwinging ? -0.1 + swingAngle * 0.22 : THREE.MathUtils.lerp(0.05, -0.03, p)) +
    answerNod +
    (w > 0.3 ? -0.14 : 0);

  // Hand-raise golden beacon
  const badgeMatInst = rig.handBadge.material as THREE.MeshStandardMaterial;
  rig.handBadge.visible = r > 0.05;
  badgeMatInst.opacity = r;
  rig.handBadge.rotation.y = elapsed * 2.5;
  rig.handBadge.position.y = 0.29 + Math.sin(elapsed * 4.2 + rig.phaseOffset) * 0.03;

  // Selection/hover halo on floor
  const ringMat = rig.selectionRing.material as THREE.MeshBasicMaterial;
  const targetRingOpacity =
    actionMode === 'raising_hand'
      ? 0.72
      : isSelected
        ? 0.92
        : isHovered
          ? 0.55
          : 0;
  ringMat.opacity = THREE.MathUtils.damp(ringMat.opacity, targetRingOpacity, 14, delta);
  if (actionMode === 'raising_hand' || actionMode === 'answering') {
    ringMat.color.setHex(0xf59e0b);
  } else if (isSelected) {
    ringMat.color.setHex(0x7c3aed);
  } else if (isHovered) {
    ringMat.color.setHex(0xb388eb);
  }
}

export function createTeacherRig(): TeacherRig {
  const root = new THREE.Group();
  root.userData.isTeacher = true;

  const teacherSkinMat = new THREE.MeshStandardMaterial({
    color: 0x6b3d24,
    roughness: 0.6,
    metalness: 0.02,
  });
  const dressMat = new THREE.MeshStandardMaterial({
    color: 0x6829bd,
    roughness: 0.74,
    metalness: 0.04,
  });
  const sashMat = new THREE.MeshStandardMaterial({
    color: 0xd8b4fe,
    roughness: 0.68,
  });
  const tabletMat = new THREE.MeshStandardMaterial({
    color: 0xcfd6e6,
    roughness: 0.25,
    metalness: 0.7,
  });
  const screenMat = new THREE.MeshStandardMaterial({
    color: 0xf4ecff,
    emissive: 0xb794f4,
    emissiveIntensity: 0.35,
    roughness: 0.2,
  });

  const haloMat = new THREE.MeshBasicMaterial({
    color: 0x9b5de5,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.35,
    depthWrite: false,
  });
  const haloRing = new THREE.Mesh(new THREE.RingGeometry(0.36, 0.44, 32), haloMat);
  haloRing.rotation.x = -Math.PI / 2;
  haloRing.position.y = 0.016;
  root.add(haloRing);

  const hitProxy = new THREE.Mesh(sharedGeometries.teacherHitProxy, hitMat);
  hitProxy.position.y = 0.82;
  hitProxy.userData.isTeacher = true;
  root.add(hitProxy);

  const hipsPivot = new THREE.Group();
  hipsPivot.position.set(0, 0.74, 0);
  root.add(hipsPivot);

  // Skirt / Lower Dress
  const skirt = new THREE.Mesh(
    new THREE.CylinderGeometry(0.16, 0.22, 0.48, 16),
    dressMat,
  );
  skirt.position.y = -0.14;
  skirt.castShadow = true;
  skirt.receiveShadow = true;
  hipsPivot.add(skirt);

  // Torso
  const torso = new THREE.Mesh(
    new THREE.CylinderGeometry(0.175, 0.15, 0.44, 16),
    dressMat,
  );
  torso.position.y = 0.26;
  torso.castShadow = true;
  torso.receiveShadow = true;
  hipsPivot.add(torso);

  // Lavender accent panel on dress (matching Bloomly welcome photo)
  const panel = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.38, 0.04), sashMat);
  panel.position.set(0.03, 0.26, 0.15);
  hipsPivot.add(panel);

  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.062, 0.09, 10), teacherSkinMat);
  neck.position.y = 0.51;
  hipsPivot.add(neck);

  const headPivot = new THREE.Group();
  headPivot.position.set(0, 0.65, 0);
  hipsPivot.add(headPivot);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.16, 20, 18), teacherSkinMat);
  head.castShadow = true;
  headPivot.add(head);

  const leftEye = new THREE.Mesh(sharedGeometries.eye, eyeMat);
  leftEye.position.set(-0.052, 0.015, 0.145);
  const rightEye = new THREE.Mesh(sharedGeometries.eye, eyeMat);
  rightEye.position.set(0.052, 0.015, 0.145);
  headPivot.add(leftEye, rightEye);

  // Braided updo bun
  const cap = new THREE.Mesh(
    new THREE.SphereGeometry(0.168, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.6),
    hairMat,
  );
  cap.position.y = 0.015;
  cap.rotation.x = -0.18;
  cap.castShadow = true;
  const bun = new THREE.Mesh(new THREE.SphereGeometry(0.095, 14, 14), hairMat);
  bun.position.set(0, 0.11, -0.14);
  bun.castShadow = true;
  headPivot.add(cap, bun);

  // Arms
  const buildTeacherArm = (side: -1 | 1) => {
    const shoulder = new THREE.Group();
    shoulder.position.set(side * 0.21, 0.43, 0);
    hipsPivot.add(shoulder);

    const sleeve = new THREE.Mesh(
      new THREE.CylinderGeometry(0.052, 0.046, 0.2, 10),
      dressMat,
    );
    sleeve.position.y = -0.09;
    sleeve.castShadow = true;
    shoulder.add(sleeve);

    const forearm = new THREE.Mesh(
      new THREE.CylinderGeometry(0.036, 0.03, 0.24, 10),
      teacherSkinMat,
    );
    forearm.position.set(0, -0.28, 0.03);
    forearm.rotation.x = -0.3;
    forearm.castShadow = true;
    shoulder.add(forearm);

    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.036, 10, 10), teacherSkinMat);
    hand.position.set(0, -0.39, 0.07);
    shoulder.add(hand);

    return { shoulder, hand };
  };

  const leftArm = buildTeacherArm(-1);
  const rightArm = buildTeacherArm(1);

  // Tablet in teacher's left hand
  const tablet = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.018, 0.18), tabletMat);
  tablet.position.set(0.04, 0.02, 0.08);
  tablet.rotation.x = 0.35;
  const tabletFace = new THREE.Mesh(new THREE.PlaneGeometry(0.21, 0.15), screenMat);
  tabletFace.rotation.x = -Math.PI / 2;
  tabletFace.position.y = 0.011;
  tablet.add(tabletFace);
  leftArm.hand.add(tablet);

  // Polished wooden teaching cane / pointer in teacher's right hand
  const caneGroup = new THREE.Group();
  caneGroup.position.set(0, -0.01, 0.03);
  const caneShaft = new THREE.Mesh(
    new THREE.CylinderGeometry(0.012, 0.008, 0.92, 10),
    new THREE.MeshStandardMaterial({ color: 0x7c4a26, roughness: 0.42, metalness: 0.08 }),
  );
  caneShaft.rotation.x = Math.PI / 2;
  caneShaft.position.z = 0.42;
  caneShaft.castShadow = true;
  const caneTip = new THREE.Mesh(
    new THREE.SphereGeometry(0.013, 10, 10),
    badgeMat,
  );
  caneTip.position.z = 0.88;
  const caneHandle = new THREE.Mesh(
    new THREE.CylinderGeometry(0.016, 0.014, 0.1, 10),
    badgeMat,
  );
  caneHandle.rotation.x = Math.PI / 2;
  caneHandle.position.z = -0.02;
  caneGroup.add(caneShaft, caneTip, caneHandle);
  rightArm.hand.add(caneGroup);

  // Legs
  const buildTeacherLeg = (side: -1 | 1) => {
    const hip = new THREE.Group();
    hip.position.set(side * 0.08, -0.26, 0);
    hipsPivot.add(hip);

    const thigh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.056, 0.048, 0.24, 10),
      teacherSkinMat,
    );
    thigh.position.y = -0.11;
    hip.add(thigh);

    const knee = new THREE.Group();
    knee.position.set(0, -0.23, 0);
    hip.add(knee);

    const calf = new THREE.Mesh(
      new THREE.CylinderGeometry(0.044, 0.034, 0.24, 10),
      teacherSkinMat,
    );
    calf.position.y = -0.11;
    knee.add(calf);

    const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.05, 0.15), shoeMat);
    shoe.position.set(0, -0.23, 0.03);
    shoe.castShadow = true;
    knee.add(shoe);

    return { hip, knee };
  };

  const leftLeg = buildTeacherLeg(-1);
  const rightLeg = buildTeacherLeg(1);

  return {
    root,
    hipsPivot,
    headPivot,
    leftShoulder: leftArm.shoulder,
    rightShoulder: rightArm.shoulder,
    leftHip: leftLeg.hip,
    rightHip: rightLeg.hip,
    leftKnee: leftLeg.knee,
    rightKnee: rightLeg.knee,
    caneGroup,
    hitProxy,
    haloRing,
    walkCycle: 0,
    gestureAmount: 0,
    pointBlend: 0,
    nodAmount: 0,
  };
}

export function updateTeacherPose(
  rig: TeacherRig,
  isWalking: boolean,
  isTalking: boolean,
  isPointingBoard: boolean,
  isPursuing: boolean,
  isHovered: boolean,
  elapsed: number,
  delta: number,
) {
  if (isWalking) {
    rig.walkCycle += delta * (isPursuing ? 11.2 : 7.8);
  } else {
    rig.walkCycle = THREE.MathUtils.damp(
      rig.walkCycle,
      Math.round(rig.walkCycle / Math.PI) * Math.PI,
      8,
      delta,
    );
  }

  rig.gestureAmount = THREE.MathUtils.damp(rig.gestureAmount, isTalking || isPursuing ? 1 : 0, 10, delta);
  rig.pointBlend = THREE.MathUtils.damp(rig.pointBlend, isPointingBoard ? 1 : 0, 10, delta);
  rig.nodAmount = THREE.MathUtils.damp(rig.nodAmount, 0, 7, delta);

  const walkSwing = isWalking ? Math.sin(rig.walkCycle) * (isPursuing ? 0.56 : 0.36) : 0;
  const walkBob = isWalking ? Math.abs(Math.sin(rig.walkCycle)) * (isPursuing ? 0.048 : 0.03) : 0;
  const g = rig.gestureAmount;
  const pt = rig.pointBlend;

  rig.hipsPivot.position.y = 0.74 + walkBob + Math.sin(elapsed * 1.8) * 0.008;

  rig.leftHip.rotation.x = walkSwing;
  rig.rightHip.rotation.x = -walkSwing;

  // Left arm holds tablet calmly
  rig.leftShoulder.rotation.x = -0.62 - walkSwing * 0.3;
  rig.leftShoulder.rotation.z = 0.12;

  // Right arm holds the teaching cane: points at blackboard, waves urgently when pursuing students on field,
  // or gestures expressively while teaching
  const idleRightX = -0.14 + Math.sin(elapsed * 1.9) * 0.04 + walkSwing * 0.45;
  const talkRightX = isPursuing
    ? -1.45 + Math.sin(elapsed * 8.5) * 0.32
    : -0.88 + Math.sin(elapsed * 5.2) * 0.18;
  const pointRightX = -1.62 + Math.sin(elapsed * 2.8) * 0.12;

  const baseRightX = THREE.MathUtils.lerp(idleRightX, talkRightX, g);
  rig.rightShoulder.rotation.x = THREE.MathUtils.lerp(baseRightX, pointRightX, pt);

  const baseRightZ = THREE.MathUtils.lerp(-0.1, isPursuing ? -0.45 : -0.26, g);
  const pointRightZ = -0.16 + Math.cos(elapsed * 2.1) * 0.14;
  rig.rightShoulder.rotation.z = THREE.MathUtils.lerp(baseRightZ, pointRightZ, pt);

  // Subtle cane tilt so tip aims cleanly forward/up toward board lines or waves during pursuit
  rig.caneGroup.rotation.x = THREE.MathUtils.lerp(isPursuing ? 0.1 : 0.55, -0.18, pt);

  rig.headPivot.rotation.x =
    (isPointingBoard
      ? -0.12 + Math.sin(elapsed * 2.2) * 0.04
      : isTalking
        ? Math.sin(elapsed * 4.5) * 0.07
        : Math.sin(elapsed * 1.3) * 0.03) + rig.nodAmount;
  rig.headPivot.rotation.y = isPointingBoard
    ? Math.sin(elapsed * 1.4) * 0.22
    : Math.sin(elapsed * 1.1) * 0.08;

  const haloMat = rig.haloRing.material as THREE.MeshBasicMaterial;
  haloMat.opacity = THREE.MathUtils.damp(
    haloMat.opacity,
    isHovered ? 0.78 : isPointingBoard || isTalking ? 0.55 : 0.25,
    10,
    delta,
  );
}
