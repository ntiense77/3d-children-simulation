import * as THREE from 'three';

export type HairVariant = 'cornrows' | 'fade' | 'bun' | 'short' | 'puffs';

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
  selectionRing: THREE.Mesh;
  hitProxy: THREE.Mesh;
  poseBlend: number; // 0 = seated, 1 = standing
  bounce: number;
  phaseOffset: number;
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
  hitProxy: new THREE.CylinderGeometry(0.28, 0.28, 1.08, 10),
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

  // Invisible hit proxy for smooth raycasting & drag picking
  const hitProxy = new THREE.Mesh(sharedGeometries.hitProxy, hitMat);
  hitProxy.position.y = 0.54;
  hitProxy.userData.studentId = studentId;
  root.add(hitProxy);

  // Body pivot moves vertically between seated (on chair) and standing (on pad)
  const bodyPivot = new THREE.Group();
  root.add(bodyPivot);

  // Pelvis / Hips pivot (at bottom of torso)
  const hipsPivot = new THREE.Group();
  hipsPivot.position.set(0, 0.44, 0);
  bodyPivot.add(hipsPivot);

  const pelvis = new THREE.Mesh(sharedGeometries.pelvis, skirtOrTrouserMat);
  pelvis.castShadow = true;
  pelvis.receiveShadow = true;
  hipsPivot.add(pelvis);

  // Torso (Purple school vest)
  const torso = new THREE.Mesh(sharedGeometries.torso, vestMat);
  torso.position.y = 0.21;
  torso.castShadow = true;
  torso.receiveShadow = true;
  hipsPivot.add(torso);

  // Gold crest badge on vest
  const badge = new THREE.Mesh(sharedGeometries.badge, badgeMat);
  badge.position.set(0.065, 0.26, 0.128);
  hipsPivot.add(badge);

  // Lavender shirt collar
  const collar = new THREE.Mesh(sharedGeometries.collar, shirtMat);
  collar.position.y = 0.37;
  collar.castShadow = true;
  hipsPivot.add(collar);

  // Neck + Head
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

  // Eyes
  const leftEye = new THREE.Mesh(sharedGeometries.eye, eyeMat);
  leftEye.position.set(-0.048, 0.015, 0.133);
  const rightEye = new THREE.Mesh(sharedGeometries.eye, eyeMat);
  rightEye.position.set(0.048, 0.015, 0.133);
  headPivot.add(leftEye, rightEye);

  // Hair cap & silhouette accents
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

  // Arms (left & right shoulder pivots)
  const buildArm = (side: -1 | 1) => {
    const shoulder = new THREE.Group();
    shoulder.position.set(side * 0.175, 0.34, 0);
    hipsPivot.add(shoulder);

    // Lavender sleeve + arm
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

    return shoulder;
  };

  const leftShoulder = buildArm(-1);
  const rightShoulder = buildArm(1);

  // Legs (articulated hip -> thigh -> knee -> calf -> shoe)
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
    leftShoulder,
    rightShoulder,
    leftHip: leftLeg.hip,
    rightHip: rightLeg.hip,
    leftKnee: leftLeg.knee,
    rightKnee: rightLeg.knee,
    selectionRing,
    hitProxy,
    poseBlend: 0, // Starts seated on chair!
    bounce: 0,
    phaseOffset: index * 0.65,
  };
}

/**
 * Updates articulated seated <-> standing kinematics smoothly.
 * poseBlend = 0 -> seated flush on a 0.42m chair seat.
 * poseBlend = 1 -> standing upright flush on ground/pad (y = 0).
 */
export function updateStudentPose(
  rig: StudentRig,
  targetPose: number,
  isDragging: boolean,
  isHovered: boolean,
  isSelected: boolean,
  elapsed: number,
  delta: number,
) {
  rig.poseBlend = THREE.MathUtils.damp(rig.poseBlend, targetPose, 11, delta);
  rig.bounce = THREE.MathUtils.damp(rig.bounce, 0, 8, delta);

  const p = rig.poseBlend;
  const idleWave = Math.sin(elapsed * 2.1 + rig.phaseOffset);

  // Seated hips at y=0.39 (sits squarely on 0.41m chair seat with thighs horizontal),
  // Standing hips at y=0.44 so shoes rest flush at y=0.0!
  const hipY = THREE.MathUtils.lerp(0.39, 0.45, p) + (isDragging ? 0.42 : 0) + rig.bounce;
  rig.hipsPivot.position.y = hipY;

  // Seated hip pitch = -Math.PI/2 (thighs forward), Standing = 0 (vertical)
  const hipPitch = THREE.MathUtils.lerp(-Math.PI / 2, 0, p);
  const legSwing = isDragging ? Math.sin(elapsed * 9 + rig.phaseOffset) * 0.14 : 0;
  rig.leftHip.rotation.x = hipPitch + legSwing;
  rig.rightHip.rotation.x = hipPitch - legSwing;

  // Seated knee pitch = +Math.PI/2 (calves down), Standing = 0 (straight)
  const kneePitch = THREE.MathUtils.lerp(Math.PI / 2, 0, p);
  rig.leftKnee.rotation.x = kneePitch;
  rig.rightKnee.rotation.x = kneePitch;

  // Arms: resting forward on lap when seated, relaxed / happy slight sway when standing
  const armPitch = isDragging
    ? -0.65
    : THREE.MathUtils.lerp(-0.42, -0.08 + idleWave * 0.05, p);
  const armSpread = isDragging ? 0.35 : THREE.MathUtils.lerp(0.08, 0.14, p);
  rig.leftShoulder.rotation.x = armPitch;
  rig.rightShoulder.rotation.x = armPitch;
  rig.leftShoulder.rotation.z = armSpread;
  rig.rightShoulder.rotation.z = -armSpread;

  // Subtle head curiosity / look around
  rig.headPivot.rotation.y = idleWave * 0.08;
  rig.headPivot.rotation.x = THREE.MathUtils.lerp(0.05, -0.03, p);

  // Selection/hover halo on floor
  const ringMat = rig.selectionRing.material as THREE.MeshBasicMaterial;
  const targetRingOpacity = isSelected ? 0.92 : isHovered ? 0.55 : 0;
  ringMat.opacity = THREE.MathUtils.damp(ringMat.opacity, targetRingOpacity, 14, delta);
  if (isSelected) {
    ringMat.color.setHex(0x7c3aed);
  } else if (isHovered) {
    ringMat.color.setHex(0xb388eb);
  }
}
