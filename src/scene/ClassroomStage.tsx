import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import {
  createStudentRig,
  createTeacherRig,
  inferHairVariant,
  StudentActionMode,
  StudentRig,
  updateStudentPose,
  updateTeacherPose,
} from './characterBuilder';
import {
  buildClassroomEnvironment,
  ChairSlot,
  GroupPadZone,
  WindowZone,
} from './furnitureBuilder';
import { soundEngine } from './soundEffects';

export type CameraPreset =
  | 'overview'
  | 'chairs'
  | 'groups'
  | 'board'
  | 'field'
  | 'playground'
  | 'welcome'
  | 'results';

export interface ClassroomLearner {
  id: string;
  name: string;
  ability: string;
  learningStyle: string;
  personality: string;
  socialSkill: string;
  behaviour: string;
  note: string;
  avatar: string;
}

export interface BoardTask {
  studentId: string;
  author: string;
  text: string;
  key: number;
}

interface ClassroomStageProps {
  learners: ClassroomLearner[];
  assignments: Record<string, number>;
  selectedLearnerId: string | null;
  cameraPreset: CameraPreset;
  interactive: boolean;
  raisedHandIds: string[];
  answeringStudentId: string | null;
  teacherTalking: boolean;
  boardTask: BoardTask | null;
  boardHistory: Array<{ author: string; text: string }>;
  fieldStudentIds: string[];
  swingStudentIds: string[];
  recallingFromField: boolean;
  teacherPursuitActive: boolean;
  onSelectLearner: (id: string | null) => void;
  onHoverLearner: (id: string | null) => void;
  onAssignLearner: (learnerId: string, groupId: number) => boolean;
  onUnassignLearner: (learnerId: string) => void;
  onSendToBoard: (learnerId: string) => void;
  onBoardComplete: (learnerId: string) => void;
  onAnswerStudent: (learnerId: string) => void;
  onTeacherClick: () => void;
  onWindowClick: () => void;
  onSwingClick?: () => void;
  onDoorClick?: () => void;
  onSendToField: (learnerId: string) => void;
  onSendToSwing?: (learnerId: string) => void;
  onReturnStudentFromField: (learnerId: string) => void;
  onReturnStudentFromSwing?: (learnerId: string) => void;
  onGoalScored?: (scorerName: string) => void;
}

const CAMERA_PRESETS: Record<
  CameraPreset,
  { pos: [number, number, number]; target: [number, number, number] }
> = {
  welcome: { pos: [7.2, 5.2, 8.4], target: [-1.4, 1.0, -0.8] },
  overview: { pos: [6.8, 5.6, 7.6], target: [-1.2, 1.1, -1.0] },
  chairs: { pos: [-1.6, 4.4, 6.2], target: [-2.9, 0.85, 0.4] },
  groups: { pos: [4.2, 5.8, 6.4], target: [4.2, 0.45, 0.2] },
  board: { pos: [-0.85, 2.55, -0.45], target: [-1.85, 2.35, -5.65] },
  field: { pos: [-14.8, 6.2, 7.8], target: [-24.5, 0.7, -2.0] },
  playground: { pos: [-11.8, 3.6, 9.2], target: [-15.8, 1.1, 4.2] },
  results: { pos: [4.2, 4.4, 6.1], target: [4.2, 0.65, 0.2] },
};

const TEACHER_PATROL_STOPS = [
  { pos: new THREE.Vector3(-3.35, 0, -4.55), lookAt: new THREE.Vector3(-1.85, 2.5, -5.65), dwell: 4.5, pointBoard: true },
  { pos: new THREE.Vector3(-0.95, 0, -3.55), lookAt: new THREE.Vector3(-2.8, 0.9, 0.8), dwell: 3.0, pointBoard: false },
  { pos: new THREE.Vector3(-2.5, 0, -2.05), lookAt: new THREE.Vector3(-2.9, 0.8, 1.2), dwell: 2.8, pointBoard: false },
  { pos: new THREE.Vector3(0.75, 0, -0.35), lookAt: new THREE.Vector3(4.0, 0.7, 0.2), dwell: 3.0, pointBoard: false },
  { pos: new THREE.Vector3(0.25, 0, -4.55), lookAt: new THREE.Vector3(-1.85, 2.5, -5.65), dwell: 4.5, pointBoard: true },
];

const OUTDOOR_PRESETS = new Set<CameraPreset>(['field', 'playground']);

type FieldPhase =
  | 'to_window_inside'
  | 'hopping_out'
  | 'playing'
  | 'to_door_outside'
  | 'walking_in_door';

interface StudentFieldAnim {
  phase: FieldPhase;
  windowIdx: 0 | 1;
  hopProgress: number;
  pitchSpot: THREE.Vector3;
  retargetTimer: number;
}

type SwingPhase =
  | 'to_window_inside'
  | 'hopping_out'
  | 'to_swing'
  | 'swinging'
  | 'to_door_outside'
  | 'walking_in_door';

interface StudentSwingAnim {
  phase: SwingPhase;
  windowIdx: 0 | 1;
  seatIndex: 0 | 1;
  hopProgress: number;
}

// Pre-allocated math helpers (Zero-GC in animation loop)
const _pointer = new THREE.Vector2();
const _raycaster = new THREE.Raycaster();
const _dragPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const _planeHit = new THREE.Vector3();
const _targetPos = new THREE.Vector3();
const _swingPos = new THREE.Vector3();
const _teacherGoal = new THREE.Vector3();
const _camGoalPos = new THREE.Vector3();
const _camGoalTarget = new THREE.Vector3();

function rotateToward(obj: THREE.Object3D, targetAngleY: number, factor: number) {
  let diff = targetAngleY - obj.rotation.y;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  obj.rotation.y += diff * Math.min(1, factor);
}

function randomPitchSpot(idx: number): THREE.Vector3 {
  const spots: Array<[number, number]> = [
    [-22.2, -5.2],
    [-27.2, -5.0],
    [-23.2, -1.8],
    [-26.4, -2.0],
    [-22.4, 2.0],
    [-27.0, 2.2],
    [-24.8, -6.8],
    [-24.8, 3.2],
  ];
  const base = spots[idx % spots.length];
  return new THREE.Vector3(
    base[0] + (Math.random() - 0.5) * 2.2,
    0,
    base[1] + (Math.random() - 0.5) * 2.2,
  );
}

export function ClassroomStage({
  learners,
  assignments,
  selectedLearnerId,
  cameraPreset,
  interactive,
  raisedHandIds,
  answeringStudentId,
  teacherTalking,
  boardTask,
  boardHistory,
  fieldStudentIds,
  swingStudentIds,
  recallingFromField,
  teacherPursuitActive,
  onSelectLearner,
  onHoverLearner,
  onAssignLearner,
  onUnassignLearner,
  onSendToBoard,
  onBoardComplete,
  onAnswerStudent,
  onTeacherClick,
  onWindowClick,
  onSwingClick,
  onDoorClick,
  onSendToField,
  onSendToSwing,
  onReturnStudentFromField,
  onReturnStudentFromSwing,
  onGoalScored,
}: ClassroomStageProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [contextLost, setContextLost] = useState(false);

  const assignmentsRef = useRef(assignments);
  const selectedRef = useRef(selectedLearnerId);
  const interactiveRef = useRef(interactive);
  const raisedHandRef = useRef(raisedHandIds);
  const answeringRef = useRef(answeringStudentId);
  const teacherTalkingRef = useRef(teacherTalking);
  const boardHistoryRef = useRef(boardHistory);
  const fieldStudentIdsRef = useRef(fieldStudentIds);
  const swingStudentIdsRef = useRef(swingStudentIds);
  const recallingRef = useRef(recallingFromField);
  const teacherPursuitRef = useRef(teacherPursuitActive);
  const prevPresetRef = useRef<CameraPreset>(cameraPreset);
  const cameraPresetRef = useRef<CameraPreset>(cameraPreset);

  const activeBoardAnimRef = useRef<{
    key: number;
    studentId: string;
    author: string;
    text: string;
    phase: 'walking_to_board' | 'writing' | 'returning';
    writeProgress: number;
    writeElapsed: number;
  } | null>(null);

  const cameraQueueRef = useRef<
    Array<{ pos: THREE.Vector3; target: THREE.Vector3; speed: number }>
  >([]);

  const callbacksRef = useRef({
    onSelectLearner,
    onHoverLearner,
    onAssignLearner,
    onUnassignLearner,
    onSendToBoard,
    onBoardComplete,
    onAnswerStudent,
    onTeacherClick,
    onWindowClick,
    onSwingClick,
    onDoorClick,
    onSendToField,
    onSendToSwing,
    onReturnStudentFromField,
    onReturnStudentFromSwing,
    onGoalScored,
  });

  useEffect(() => {
    assignmentsRef.current = assignments;
  }, [assignments]);

  useEffect(() => {
    selectedRef.current = selectedLearnerId;
  }, [selectedLearnerId]);

  useEffect(() => {
    interactiveRef.current = interactive;
  }, [interactive]);

  useEffect(() => {
    raisedHandRef.current = raisedHandIds;
  }, [raisedHandIds]);

  useEffect(() => {
    answeringRef.current = answeringStudentId;
  }, [answeringStudentId]);

  useEffect(() => {
    teacherTalkingRef.current = teacherTalking;
  }, [teacherTalking]);

  useEffect(() => {
    boardHistoryRef.current = boardHistory;
  }, [boardHistory]);

  useEffect(() => {
    fieldStudentIdsRef.current = fieldStudentIds;
  }, [fieldStudentIds]);

  useEffect(() => {
    swingStudentIdsRef.current = swingStudentIds;
  }, [swingStudentIds]);

  useEffect(() => {
    recallingRef.current = recallingFromField;
  }, [recallingFromField]);

  useEffect(() => {
    teacherPursuitRef.current = teacherPursuitActive;
  }, [teacherPursuitActive]);

  useEffect(() => {
    if (!boardTask) {
      activeBoardAnimRef.current = null;
      return;
    }
    if (activeBoardAnimRef.current?.key !== boardTask.key) {
      activeBoardAnimRef.current = {
        key: boardTask.key,
        studentId: boardTask.studentId,
        author: boardTask.author,
        text: boardTask.text,
        phase: 'walking_to_board',
        writeProgress: 0,
        writeElapsed: 0,
      };
    }
  }, [boardTask]);

  useEffect(() => {
    callbacksRef.current = {
      onSelectLearner,
      onHoverLearner,
      onAssignLearner,
      onUnassignLearner,
      onSendToBoard,
      onBoardComplete,
      onAnswerStudent,
      onTeacherClick,
      onWindowClick,
      onSwingClick,
      onDoorClick,
      onSendToField,
      onSendToSwing,
      onReturnStudentFromField,
      onReturnStudentFromSwing,
      onGoalScored,
    };
  }, [
    onSelectLearner,
    onHoverLearner,
    onAssignLearner,
    onUnassignLearner,
    onSendToBoard,
    onBoardComplete,
    onAnswerStudent,
    onTeacherClick,
    onWindowClick,
    onSwingClick,
    onDoorClick,
    onSendToField,
    onSendToSwing,
    onReturnStudentFromField,
    onReturnStudentFromSwing,
    onGoalScored,
  ]);

  useEffect(() => {
    const prev = prevPresetRef.current;
    prevPresetRef.current = cameraPreset;
    cameraPresetRef.current = cameraPreset;
    const preset = CAMERA_PRESETS[cameraPreset];

    const wasOutside = OUTDOOR_PRESETS.has(prev);
    const goingOutside = OUTDOOR_PRESETS.has(cameraPreset);

    if (!wasOutside && goingOutside) {
      cameraQueueRef.current = [
        {
          pos: new THREE.Vector3(-7.4, 3.05, 1.2),
          target: new THREE.Vector3(-15.5, 2.0, 0.5),
          speed: 5.5,
        },
        {
          pos: new THREE.Vector3(-12.2, 3.2, 1.2),
          target: new THREE.Vector3(-22.5, 1.2, -0.4),
          speed: 6.0,
        },
        {
          pos: new THREE.Vector3(...preset.pos),
          target: new THREE.Vector3(...preset.target),
          speed: 4.5,
        },
      ];
    } else if (wasOutside && !goingOutside) {
      cameraQueueRef.current = [
        {
          pos: new THREE.Vector3(-12.4, 3.2, 1.2),
          target: new THREE.Vector3(-7.0, 2.2, -0.6),
          speed: 5.5,
        },
        {
          pos: new THREE.Vector3(-7.2, 3.2, 1.2),
          target: new THREE.Vector3(-1.8, 1.5, -2.8),
          speed: 6.0,
        },
        {
          pos: new THREE.Vector3(...preset.pos),
          target: new THREE.Vector3(...preset.target),
          speed: 5.0,
        },
      ];
    } else {
      cameraQueueRef.current = [
        {
          pos: new THREE.Vector3(...preset.pos),
          target: new THREE.Vector3(...preset.target),
          speed: 6.0,
        },
      ];
    }
  }, [cameraPreset]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const isSoftwareGl = (() => {
      const probe = document.createElement('canvas').getContext('webgl2');
      if (!probe) return true;
      const ext = probe.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : probe.RENDERER;
      const gpu = String(probe.getParameter(param));
      probe.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xdbeafe);
    scene.fog = new THREE.Fog(0xeff6ff, 26, 72);

    const camera = new THREE.PerspectiveCamera(44, width / height, 0.1, 110);
    const initialPreset = CAMERA_PRESETS[cameraPreset];
    camera.position.set(...initialPreset.pos);

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.06;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const roomEnv = new RoomEnvironment();
    const envTarget = pmremGenerator.fromScene(roomEnv, 0.04);
    scene.environment = envTarget.texture;
    roomEnv.dispose();
    pmremGenerator.dispose();

    const hemiLight = new THREE.HemisphereLight(0xf6f8ff, 0x9fc28e, 0.95);
    hemiLight.position.set(0, 14, 0);
    scene.add(hemiLight);

    const sunLight = new THREE.DirectionalLight(0xfff1dc, 1.55);
    sunLight.position.set(-14, 13, 6.5);
    sunLight.castShadow = !isSoftwareGl;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 1;
    sunLight.shadow.camera.far = 48;
    sunLight.shadow.camera.left = -24;
    sunLight.shadow.camera.right = 14;
    sunLight.shadow.camera.top = 14;
    sunLight.shadow.camera.bottom = -14;
    sunLight.shadow.bias = -0.0005;
    sunLight.shadow.normalBias = 0.02;
    scene.add(sunLight);

    const rimLight = new THREE.DirectionalLight(0xe6dcff, 0.55);
    rimLight.position.set(9, 6, -6);
    scene.add(rimLight);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(...initialPreset.target);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.07;
    controls.minDistance = 3.2;
    controls.maxDistance = 32;
    controls.minPolarAngle = 0.22;
    controls.maxPolarAngle = Math.PI / 2.12;
    controls.addEventListener('start', () => {
      cameraQueueRef.current = [];
    });

    const studentIds = learners.map((l) => l.id);
    const {
      chairs,
      groupZones,
      boardZone,
      windowZones,
      doorZone,
      soccerBall,
      swingSeats,
      swingHitMesh,
    } = buildClassroomEnvironment(
      scene,
      renderer,
      studentIds,
    );

    const chairByStudent = new Map<string, ChairSlot>();
    chairs.forEach((c) => chairByStudent.set(c.studentId, c));

    const rigsByStudent = new Map<string, StudentRig>();
    const hitProxies: THREE.Object3D[] = [];
    const zoneHitMeshes: THREE.Object3D[] = [
      ...groupZones.map((g) => g.hitMesh),
      boardZone.hitMesh,
    ];

    // Student field escape, swing & football physics state
    const studentFieldMap = new Map<string, StudentFieldAnim>();
    const studentSwingMap = new Map<string, StudentSwingAnim>();
    let initialFieldIdx = 0;
    let initialSwingIdx = 0;

    learners.forEach((learner, idx) => {
      const rig = createStudentRig(
        learner.id,
        idx,
        inferHairVariant(learner.avatar),
      );

      if (swingStudentIdsRef.current.includes(learner.id) && initialSwingIdx < 2) {
        const seatIdx = initialSwingIdx as 0 | 1;
        initialSwingIdx++;
        const slot = swingSeats[seatIdx];
        slot.riderAnchor.getWorldPosition(_swingPos);
        rig.root.position.copy(_swingPos);
        rig.root.rotation.y = slot.swingYaw;
        studentSwingMap.set(learner.id, {
          phase: 'swinging',
          windowIdx: 1,
          seatIndex: seatIdx,
          hopProgress: 1,
        });
      } else if (fieldStudentIdsRef.current.includes(learner.id)) {
        const spot = randomPitchSpot(initialFieldIdx);
        rig.root.position.copy(spot);
        rig.root.rotation.y = Math.atan2(
          soccerBall.position.x - spot.x,
          soccerBall.position.z - spot.z,
        );
        studentFieldMap.set(learner.id, {
          phase: 'playing',
          windowIdx: initialFieldIdx % 2 === 0 ? 0 : 1,
          hopProgress: 1,
          pitchSpot: spot.clone(),
          retargetTimer: 1.0 + initialFieldIdx * 0.4,
        });
        initialFieldIdx++;
      } else {
        const chair = chairByStudent.get(learner.id)!;
        rig.root.position.copy(chair.seatPosition);
        rig.root.rotation.y = chair.chairGroup.rotation.y;
      }

      scene.add(rig.root);
      rigsByStudent.set(learner.id, rig);
      hitProxies.push(rig.hitProxy);
    });

    const teacherRig = createTeacherRig();
    teacherRig.root.position.copy(TEACHER_PATROL_STOPS[0].pos);
    teacherRig.root.rotation.y = 0.25;
    scene.add(teacherRig.root);
    hitProxies.push(teacherRig.hitProxy);

    windowZones.forEach((wz) => hitProxies.push(wz.hitMesh));
    hitProxies.push(swingHitMesh);
    hitProxies.push(doorZone.hitMesh);

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    let hoveredStudentId: string | null = null;
    let teacherHovered = false;
    let hoveredWindowId: string | null = null;
    let hoveredDoor = false;
    let draggingStudentId: string | null = null;
    let hoveredGroupId: number | null = null;
    let hoveredBoard = false;
    let pointerDownPos = { x: 0, y: 0 };
    let didDragMove = false;
    let lastHoverCheck = 0;

    const ballVel = new THREE.Vector3(0, 0, 0);
    let ballKickCooldown = 0;
    let lastScorerName = 'Class';

    // Teacher patrol + outdoor chase & door entry state
    let patrolIndex = 0;
    let patrolPauseElapsed = 0;
    let teacherSide:
      | 'inside'
      | 'hopping_out'
      | 'outside'
      | 'to_door_outside'
      | 'walking_in_door' = 'inside';
    let teacherHopProgress = 0;
    let pursuitIdx = 0;
    let pursuitSwitchTimer = 0;
    let recallTagTimer = 0;

    const updatePointer = (event: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      _pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      _pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    };

    const findNearestGroupZone = (pos: THREE.Vector3): GroupPadZone | null => {
      let best: GroupPadZone | null = null;
      let bestDist = 1.72;
      for (const zone of groupZones) {
        const dist = Math.hypot(pos.x - zone.center.x, pos.z - zone.center.z);
        if (dist < bestDist) {
          bestDist = dist;
          best = zone;
        }
      }
      return best;
    };

    const findNearestWindow = (pos: THREE.Vector3): { zone: WindowZone; idx: 0 | 1 } => {
      const d0 = Math.hypot(pos.x - windowZones[0].center.x, pos.z - windowZones[0].center.z);
      const d1 = Math.hypot(pos.x - windowZones[1].center.x, pos.z - windowZones[1].center.z);
      return d0 <= d1 ? { zone: windowZones[0], idx: 0 } : { zone: windowZones[1], idx: 1 };
    };

    const isOverBoardZone = (pos: THREE.Vector3): boolean => {
      return Math.hypot(pos.x - boardZone.center.x, pos.z - boardZone.center.z) < 1.5;
    };

    const isOverWindowExit = (pos: THREE.Vector3): WindowZone | null => {
      if (pos.x <= -8.4) {
        return findNearestWindow(pos).zone;
      }
      return null;
    };

    const onPointerDown = (event: PointerEvent) => {
      if (!interactiveRef.current || event.button !== 0) return;
      updatePointer(event);
      _raycaster.setFromCamera(_pointer, camera);

      const hits = _raycaster.intersectObjects(hitProxies, false);
      if (hits.length > 0) {
        const hitData = hits[0].object.userData;
        if (hitData.isWindow) {
          if (selectedRef.current && !fieldStudentIdsRef.current.includes(selectedRef.current)) {
            callbacksRef.current.onSendToField(selectedRef.current);
            return;
          }
          soundEngine.playPickup();
          callbacksRef.current.onWindowClick();
          return;
        }
        if (hitData.isDoor) {
          soundEngine.playPickup();
          callbacksRef.current.onDoorClick?.();
          return;
        }
        if (hitData.isSwing) {
          if (selectedRef.current && !swingStudentIdsRef.current.includes(selectedRef.current)) {
            callbacksRef.current.onSendToSwing?.(selectedRef.current);
            return;
          }
          soundEngine.playPickup();
          callbacksRef.current.onSwingClick?.();
          return;
        }
        if (hitData.isTeacher) {
          teacherRig.nodAmount = 0.2;
          callbacksRef.current.onTeacherClick();
          return;
        }

        const studentId = hitData.studentId as string;
        draggingStudentId = studentId;
        didDragMove = false;
        pointerDownPos = { x: event.clientX, y: event.clientY };
        controls.enabled = false;
        renderer.domElement.setPointerCapture(event.pointerId);
        renderer.domElement.style.cursor = 'grabbing';
        soundEngine.playPickup();
        callbacksRef.current.onHoverLearner(studentId);
        return;
      }

      if (selectedRef.current) {
        const zoneHits = _raycaster.intersectObjects(zoneHitMeshes, false);
        if (zoneHits.length > 0) {
          const hitData = zoneHits[0].object.userData;
          const sid = selectedRef.current;
          if (hitData.boardZone) {
            callbacksRef.current.onSendToBoard(sid);
            return;
          }
          if (hitData.groupId) {
            const ok = callbacksRef.current.onAssignLearner(sid, hitData.groupId as number);
            if (ok) {
              const rig = rigsByStudent.get(sid);
              if (rig) rig.bounce = 0.24;
            }
            return;
          }
        } else {
          callbacksRef.current.onSelectLearner(null);
        }
      }
    };

    const onPointerMove = (event: PointerEvent) => {
      if (!interactiveRef.current) return;
      updatePointer(event);

      if (draggingStudentId) {
        const moveDist = Math.hypot(
          event.clientX - pointerDownPos.x,
          event.clientY - pointerDownPos.y,
        );
        if (moveDist > 6) didDragMove = true;

        _raycaster.setFromCamera(_pointer, camera);
        if (_raycaster.ray.intersectPlane(_dragPlane, _planeHit)) {
          const rig = rigsByStudent.get(draggingStudentId);
          if (rig) {
            rig.root.position.x = THREE.MathUtils.clamp(_planeHit.x, -10.2, 8.0);
            rig.root.position.z = THREE.MathUtils.clamp(_planeHit.z, -5.1, 4.8);
          }
          const nearZone = findNearestGroupZone(_planeHit);
          hoveredGroupId = nearZone ? nearZone.groupId : null;
          hoveredBoard = !nearZone && isOverBoardZone(_planeHit);
          const winHover = !nearZone && !hoveredBoard ? isOverWindowExit(_planeHit) : null;
          hoveredWindowId = winHover ? winHover.id : null;
        }
        return;
      }

      const now = performance.now();
      if (now - lastHoverCheck < 40) return;
      lastHoverCheck = now;

      _raycaster.setFromCamera(_pointer, camera);
      const hits = _raycaster.intersectObjects(hitProxies, false);
      let nextStudent: string | null = null;
      let nextTeacher = false;
      let nextWindow: string | null = null;
      let nextSwing = false;
      let nextDoor = false;

      if (hits.length > 0) {
        const hitData = hits[0].object.userData;
        if (hitData.isWindow) {
          nextWindow = hitData.windowId as string;
        } else if (hitData.isDoor) {
          nextDoor = true;
        } else if (hitData.isSwing) {
          nextSwing = true;
        } else if (hitData.isTeacher) {
          nextTeacher = true;
        } else {
          nextStudent = hitData.studentId as string;
        }
      }

      teacherHovered = nextTeacher;
      hoveredWindowId = nextWindow;
      hoveredDoor = nextDoor;
      if (nextStudent !== hoveredStudentId) {
        hoveredStudentId = nextStudent;
        callbacksRef.current.onHoverLearner(nextStudent);
      }

      if (nextWindow || nextTeacher || nextSwing || nextDoor) {
        renderer.domElement.style.cursor = 'pointer';
        hoveredGroupId = null;
        hoveredBoard = false;
      } else if (nextStudent) {
        renderer.domElement.style.cursor = 'grab';
        hoveredGroupId = null;
        hoveredBoard = false;
      } else if (selectedRef.current) {
        const zHits = _raycaster.intersectObjects(zoneHitMeshes, false);
        if (zHits.length > 0) {
          const hd = zHits[0].object.userData;
          hoveredBoard = Boolean(hd.boardZone);
          hoveredGroupId = hd.groupId ? (hd.groupId as number) : null;
          renderer.domElement.style.cursor = 'pointer';
        } else {
          hoveredBoard = false;
          hoveredGroupId = null;
          renderer.domElement.style.cursor = 'default';
        }
      } else {
        hoveredBoard = false;
        hoveredGroupId = null;
        renderer.domElement.style.cursor = 'default';
      }
    };

    const onPointerUp = (event: PointerEvent) => {
      if (!draggingStudentId) return;
      const studentId = draggingStudentId;
      const rig = rigsByStudent.get(studentId);
      draggingStudentId = null;
      controls.enabled = true;

      if (renderer.domElement.hasPointerCapture(event.pointerId)) {
        renderer.domElement.releasePointerCapture(event.pointerId);
      }
      renderer.domElement.style.cursor = hoveredStudentId ? 'grab' : 'default';

      if (!didDragMove) {
        if (swingStudentIdsRef.current.includes(studentId)) {
          callbacksRef.current.onReturnStudentFromSwing?.(studentId);
          return;
        }
        if (fieldStudentIdsRef.current.includes(studentId)) {
          callbacksRef.current.onReturnStudentFromField(studentId);
          return;
        }
        if (raisedHandRef.current.includes(studentId)) {
          callbacksRef.current.onAnswerStudent(studentId);
          if (rig) rig.bounce = 0.22;
          hoveredGroupId = null;
          hoveredBoard = false;
          return;
        }
        const nextSel = selectedRef.current === studentId ? null : studentId;
        callbacksRef.current.onSelectLearner(nextSel);
        hoveredGroupId = null;
        hoveredBoard = false;
        return;
      }

      if (rig) {
        if (isOverWindowExit(rig.root.position)) {
          callbacksRef.current.onSendToField(studentId);
        } else if (isOverBoardZone(rig.root.position)) {
          callbacksRef.current.onSendToBoard(studentId);
        } else {
          const dropZone = findNearestGroupZone(rig.root.position);
          if (dropZone) {
            const ok = callbacksRef.current.onAssignLearner(studentId, dropZone.groupId);
            if (ok) {
              rig.bounce = 0.28;
            }
          } else if (assignmentsRef.current[studentId]) {
            callbacksRef.current.onUnassignLearner(studentId);
            soundEngine.playReturnToChair();
          }
        }
      }
      hoveredGroupId = null;
      hoveredBoard = false;
      hoveredWindowId = null;
    };

    const onContextLost = (event: Event) => {
      event.preventDefault();
      setContextLost(true);
    };
    const onContextRestored = () => {
      setContextLost(false);
    };

    const canvas = renderer.domElement;
    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerup', onPointerUp);
    canvas.addEventListener('pointercancel', onPointerUp);
    canvas.addEventListener('webglcontextlost', onContextLost);
    canvas.addEventListener('webglcontextrestored', onContextRestored);

    const onResize = () => {
      if (!container) return;
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

    let frameId = 0;
    let disposed = false;
    const clock = new THREE.Clock();

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        if (disposed) return;
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    }

    function tick() {
      if (disposed) return;
      const delta = Math.min(clock.getDelta(), 0.05);
      const elapsed = clock.getElapsedTime();

      // Smooth multi-waypoint camera animation (including escape out the window!)
      if (cameraQueueRef.current.length > 0) {
        const goal = cameraQueueRef.current[0];
        _camGoalPos.copy(goal.pos);
        _camGoalTarget.copy(goal.target);
        camera.position.x = THREE.MathUtils.damp(camera.position.x, _camGoalPos.x, goal.speed, delta);
        camera.position.y = THREE.MathUtils.damp(camera.position.y, _camGoalPos.y, goal.speed, delta);
        camera.position.z = THREE.MathUtils.damp(camera.position.z, _camGoalPos.z, goal.speed, delta);
        controls.target.x = THREE.MathUtils.damp(controls.target.x, _camGoalTarget.x, goal.speed, delta);
        controls.target.y = THREE.MathUtils.damp(controls.target.y, _camGoalTarget.y, goal.speed, delta);
        controls.target.z = THREE.MathUtils.damp(controls.target.z, _camGoalTarget.z, goal.speed, delta);

        const posDist = camera.position.distanceTo(_camGoalPos);
        const tgtDist = controls.target.distanceTo(_camGoalTarget);
        const thresh = cameraQueueRef.current.length > 1 ? 0.85 : 0.05;
        if (posDist < thresh && tgtDist < thresh) {
          cameraQueueRef.current.shift();
        }
      }

      controls.maxDistance = OUTDOOR_PRESETS.has(cameraPresetRef.current) ? 32 : 19;
      controls.update();

      // Highlight interactive windows & door on hover
      for (const wz of windowZones) {
        const isWinHovered = hoveredWindowId === wz.id;
        wz.frameMat.emissive.setHex(isWinHovered ? 0x6b4720 : 0x000000);
      }
      doorZone.frameMat.emissive.setHex(hoveredDoor ? 0x5c3615 : 0x000000);

      // Sync field escape / door return entries with React's fieldStudentIds prop
      const wantedFieldIds = fieldStudentIdsRef.current;
      wantedFieldIds.forEach((sid, idx) => {
        const existing = studentFieldMap.get(sid);
        const rig = rigsByStudent.get(sid);
        if (!existing && rig) {
          const { idx: wIdx } = findNearestWindow(rig.root.position);
          studentFieldMap.set(sid, {
            phase: rig.root.position.x < -10.8 ? 'playing' : 'to_window_inside',
            windowIdx: wIdx,
            hopProgress: 0,
            pitchSpot: randomPitchSpot(idx),
            retargetTimer: 1.5 + idx * 0.4,
          });
        } else if (
          existing &&
          (existing.phase === 'to_door_outside' || existing.phase === 'walking_in_door')
        ) {
          existing.phase = 'playing';
        }
      });

      studentFieldMap.forEach((anim, sid) => {
        if (!wantedFieldIds.includes(sid)) {
          if (
            anim.phase === 'playing' ||
            anim.phase === 'hopping_out' ||
            anim.phase === 'to_window_inside'
          ) {
            if (anim.phase === 'to_window_inside') {
              studentFieldMap.delete(sid);
            } else {
              anim.phase = 'to_door_outside';
            }
          }
        }
      });

      // Sync swing riders with React's swingStudentIds prop (up to 2 swing seats)
      const wantedSwingIds = swingStudentIdsRef.current;
      wantedSwingIds.forEach((sid) => {
        const existing = studentSwingMap.get(sid);
        const rig = rigsByStudent.get(sid);
        if (!existing && rig) {
          const usedSeats = new Set<0 | 1>();
          studentSwingMap.forEach((sa) => usedSeats.add(sa.seatIndex));
          const seatIndex: 0 | 1 = !usedSeats.has(0) ? 0 : 1;
          const { idx: wIdx } = findNearestWindow(rig.root.position);
          studentSwingMap.set(sid, {
            phase: rig.root.position.x < -10.8 ? 'to_swing' : 'to_window_inside',
            windowIdx: wIdx,
            seatIndex,
            hopProgress: 0,
          });
        } else if (
          existing &&
          (existing.phase === 'to_door_outside' || existing.phase === 'walking_in_door')
        ) {
          existing.phase = 'to_swing';
        }
      });

      studentSwingMap.forEach((anim, sid) => {
        if (!wantedSwingIds.includes(sid)) {
          if (
            anim.phase === 'swinging' ||
            anim.phase === 'to_swing' ||
            anim.phase === 'hopping_out' ||
            anim.phase === 'to_window_inside'
          ) {
            if (anim.phase === 'to_window_inside') {
              studentSwingMap.delete(sid);
            } else {
              if (anim.phase === 'swinging') {
                const slot = swingSeats[anim.seatIndex];
                const sRig = rigsByStudent.get(sid);
                if (sRig) {
                  sRig.root.position.set(slot.approachPos.x, 0, slot.approachPos.z);
                }
              }
              anim.phase = 'to_door_outside';
            }
          }
        }
      });

      // Automatically swing Classroom Door wide open whenever students or Teacher are entering through it
      let someoneAtDoor =
        teacherSide === 'to_door_outside' || teacherSide === 'walking_in_door';
      if (!someoneAtDoor) {
        studentFieldMap.forEach((anim, sid) => {
          if (anim.phase === 'to_door_outside' || anim.phase === 'walking_in_door') {
            const rig = rigsByStudent.get(sid);
            if (rig && Math.hypot(rig.root.position.x - doorZone.center.x, rig.root.position.z - doorZone.center.z) < 4.0) {
              someoneAtDoor = true;
            }
          }
        });
      }
      if (!someoneAtDoor) {
        studentSwingMap.forEach((anim, sid) => {
          if (anim.phase === 'to_door_outside' || anim.phase === 'walking_in_door') {
            const rig = rigsByStudent.get(sid);
            if (rig && Math.hypot(rig.root.position.x - doorZone.center.x, rig.root.position.z - doorZone.center.z) < 4.0) {
              someoneAtDoor = true;
            }
          }
        });
      }
      const targetDoorAngle = someoneAtDoor ? 1.48 : hoveredDoor ? 0.55 : 0.28;
      doorZone.doorPivot.rotation.y = THREE.MathUtils.damp(
        doorZone.doorPivot.rotation.y,
        targetDoorAngle,
        7,
        delta,
      );

      // Animate both swingset pivots (joyful deep swing when occupied, gentle breeze sway when empty)
      const swingingIds: string[] = [];
      const occupiedSeatSet = new Set<0 | 1>();
      studentSwingMap.forEach((sa, sid) => {
        if (sa.phase === 'swinging') {
          occupiedSeatSet.add(sa.seatIndex);
          swingingIds.push(sid);
        }
      });
      swingSeats.forEach((slot) => {
        const targetAngle = occupiedSeatSet.has(slot.seatIndex)
          ? Math.sin(elapsed * 2.45 + slot.phaseOffset) * 0.54
          : Math.sin(elapsed * 1.4 + slot.phaseOffset) * 0.04;
        slot.pivotGroup.rotation.x = THREE.MathUtils.damp(
          slot.pivotGroup.rotation.x,
          targetAngle,
          8,
          delta,
        );
      });

      // Find which playing student is closest to the soccer ball
      const playingIds: string[] = [];
      studentFieldMap.forEach((anim, sid) => {
        if (anim.phase === 'playing') playingIds.push(sid);
      });

      let closestBallStudentId: string | null = null;
      let closestBallDist = Infinity;
      for (const sid of playingIds) {
        const rig = rigsByStudent.get(sid);
        if (!rig) continue;
        const d = Math.hypot(
          rig.root.position.x - soccerBall.position.x,
          rig.root.position.z - soccerBall.position.z,
        );
        if (d < closestBallDist) {
          closestBallDist = d;
          closestBallStudentId = sid;
        }
      }

      // Update soccer ball physics when students are playing
      ballKickCooldown = Math.max(0, ballKickCooldown - delta);
      if (playingIds.length > 0) {
        soccerBall.position.x += ballVel.x * delta;
        soccerBall.position.z += ballVel.z * delta;
        soccerBall.position.y += ballVel.y * delta;
        ballVel.y -= 9.8 * delta;

        if (soccerBall.position.y <= 0.19) {
          soccerBall.position.y = 0.19;
          if (Math.abs(ballVel.y) > 0.45) {
            ballVel.y *= -0.5;
          } else {
            ballVel.y = 0;
          }
        }

        const drag = Math.exp(-1.55 * delta);
        ballVel.x *= drag;
        ballVel.z *= drag;
        soccerBall.rotation.z -= ballVel.x * delta * 3.5;
        soccerBall.rotation.x += ballVel.z * delta * 3.5;

        // Keep ball within pitch sides
        if (soccerBall.position.x < -29.8 || soccerBall.position.x > -19.8) {
          soccerBall.position.x = THREE.MathUtils.clamp(soccerBall.position.x, -29.8, -19.8);
          ballVel.x *= -0.7;
        }
        // Check goals!
        const inGoalX = Math.abs(soccerBall.position.x - -24.8) < 1.5;
        if (inGoalX && (soccerBall.position.z < -9.35 || soccerBall.position.z > 4.95)) {
          soundEngine.playGroupComplete();
          callbacksRef.current.onGoalScored?.(lastScorerName);
          soccerBall.position.set(-24.8, 0.45, -2.2);
          ballVel.set((Math.random() - 0.5) * 2.5, 2.2, (Math.random() - 0.5) * 2.5);
        } else if (soccerBall.position.z < -9.8 || soccerBall.position.z > 5.4) {
          soccerBall.position.z = THREE.MathUtils.clamp(soccerBall.position.z, -9.8, 5.4);
          ballVel.z *= -0.7;
        }
      } else {
        soccerBall.position.x = THREE.MathUtils.damp(soccerBall.position.x, -24.8, 6, delta);
        soccerBall.position.y = THREE.MathUtils.damp(soccerBall.position.y, 0.19, 8, delta);
        soccerBall.position.z = THREE.MathUtils.damp(soccerBall.position.z, -2.2, 6, delta);
        ballVel.set(0, 0, 0);
      }

      // Advance active board-writing sequence
      const boardAnim = activeBoardAnimRef.current;
      if (boardAnim && boardAnim.phase === 'writing') {
        boardAnim.writeElapsed += delta;
        boardAnim.writeProgress = Math.min(1, boardAnim.writeElapsed / 2.2);
        if (boardAnim.writeElapsed >= 2.5) {
          boardAnim.phase = 'returning';
        }
      }

      // Update dynamic Civic Education chalkboard canvas
      const boardEntries = boardHistoryRef.current.map((h) => ({
        author: h.author,
        text: h.text,
        progress: 1,
      }));
      if (boardAnim && (boardAnim.phase === 'writing' || boardAnim.phase === 'returning')) {
        const already = boardEntries.some(
          (e) => e.author === boardAnim.author && e.text === boardAnim.text,
        );
        if (!already) {
          boardEntries.push({
            author: boardAnim.author,
            text: boardAnim.text,
            progress: boardAnim.writeProgress,
          });
        }
      }
      boardZone.drawBoard(boardEntries);

      const bMat = boardZone.rugMesh.material as THREE.MeshStandardMaterial;
      bMat.opacity = THREE.MathUtils.damp(
        bMat.opacity,
        hoveredBoard || boardAnim ? 0.56 : 0.28,
        10,
        delta,
      );

      const currentAssignments = assignmentsRef.current;
      const groupMembers: Record<number, string[]> = { 1: [], 2: [], 3: [], 4: [] };
      for (const l of learners) {
        const gid = currentAssignments[l.id];
        if (gid && groupMembers[gid]) {
          groupMembers[gid].push(l.id);
        }
      }

      for (const zone of groupZones) {
        const count = groupMembers[zone.groupId].length;
        const rugMat = zone.rugMesh.material as THREE.MeshStandardMaterial;
        const targetOpacity =
          hoveredGroupId === zone.groupId ? 0.56 : count === 5 ? 0.42 : 0.28;
        rugMat.opacity = THREE.MathUtils.damp(rugMat.opacity, targetOpacity, 10, delta);

        zone.slotRings.forEach((disc, idx) => {
          const mat = disc.material as THREE.MeshStandardMaterial;
          const occupied = idx < count;
          const targetEmissive = occupied ? 0.52 : hoveredGroupId === zone.groupId ? 0.35 : 0.14;
          mat.emissiveIntensity = THREE.MathUtils.damp(
            mat.emissiveIntensity,
            targetEmissive,
            10,
            delta,
          );
        });
      }

      // Update each student's movement, window escape, football play, board writing & pose
      for (const learner of learners) {
        const rig = rigsByStudent.get(learner.id);
        if (!rig) continue;

        const isDragging = draggingStudentId === learner.id;
        const assignedGroupId = currentAssignments[learner.id];
        const isRaisingHand = raisedHandRef.current.includes(learner.id);
        const isAnswering = answeringRef.current === learner.id;
        const isOnBoardTask = boardAnim?.studentId === learner.id;
        const fieldAnim = studentFieldMap.get(learner.id);
        const swingAnim = studentSwingMap.get(learner.id);
        let activeSwingAngle = 0;

        let homeX = 0;
        let homeZ = 0;
        let homeRotY = 0;

        if (assignedGroupId) {
          const zone = groupZones.find((z) => z.groupId === assignedGroupId)!;
          const slotIdx = groupMembers[assignedGroupId].indexOf(learner.id);
          const slotPos = zone.slotPositions[Math.max(0, slotIdx)];
          homeX = slotPos.x;
          homeZ = slotPos.z;
          homeRotY = Math.atan2(zone.center.x - slotPos.x, zone.center.z - slotPos.z);
        } else {
          const chair = chairByStudent.get(learner.id)!;
          homeX = chair.seatPosition.x;
          homeZ = chair.seatPosition.z;
          homeRotY = chair.chairGroup.rotation.y;

          if ((isRaisingHand || isAnswering) && !isDragging && !isOnBoardTask && !fieldAnim) {
            homeX += Math.sin(homeRotY) * 0.42;
            homeZ += Math.cos(homeRotY) * 0.42;
          }
        }

        let actionMode: StudentActionMode = assignedGroupId ? 'standing' : 'seated';
        let targetRotY = homeRotY;

        if (isDragging) {
          rig.root.position.y = THREE.MathUtils.damp(rig.root.position.y, 0, 12, delta);
          actionMode = 'standing';
          targetRotY = 0;
        } else if (swingAnim) {
          const wz = windowZones[swingAnim.windowIdx];
          const slot = swingSeats[swingAnim.seatIndex];

          if (swingAnim.phase === 'to_window_inside') {
            rig.root.position.y = THREE.MathUtils.damp(rig.root.position.y, 0, 12, delta);
            const dx = wz.insidePos.x - rig.root.position.x;
            const dz = wz.insidePos.z - rig.root.position.z;
            const dist = Math.hypot(dx, dz);
            if (dist > 0.14) {
              const step = Math.min(dist, delta * 3.5);
              rig.root.position.x += (dx / dist) * step;
              rig.root.position.z += (dz / dist) * step;
              targetRotY = Math.atan2(dx, dz);
              actionMode = 'playing_football';
            } else {
              swingAnim.phase = 'hopping_out';
              swingAnim.hopProgress = 0;
              actionMode = 'jumping_window';
            }
          } else if (swingAnim.phase === 'hopping_out') {
            swingAnim.hopProgress = Math.min(1, swingAnim.hopProgress + delta * 1.45);
            const t = swingAnim.hopProgress;
            rig.root.position.x = THREE.MathUtils.lerp(wz.insidePos.x, wz.outsidePos.x, t);
            rig.root.position.z = wz.center.z;
            rig.root.position.y = Math.sin(t * Math.PI) * 2.05;
            targetRotY = -Math.PI / 2;
            actionMode = 'jumping_window';
            if (t >= 1) {
              rig.root.position.y = 0;
              swingAnim.phase = 'to_swing';
            }
          } else if (swingAnim.phase === 'to_swing') {
            rig.root.position.y = THREE.MathUtils.damp(rig.root.position.y, 0, 12, delta);
            const dx = slot.approachPos.x - rig.root.position.x;
            const dz = slot.approachPos.z - rig.root.position.z;
            const dist = Math.hypot(dx, dz);
            if (dist > 0.18) {
              const step = Math.min(dist, delta * 3.4);
              rig.root.position.x += (dx / dist) * step;
              rig.root.position.z += (dz / dist) * step;
              targetRotY = Math.atan2(dx, dz);
              actionMode = 'playing_football';
            } else {
              swingAnim.phase = 'swinging';
              actionMode = 'swinging';
            }
          } else if (swingAnim.phase === 'swinging') {
            slot.riderAnchor.getWorldPosition(_swingPos);
            rig.root.position.copy(_swingPos);
            targetRotY = slot.swingYaw;
            activeSwingAngle = slot.pivotGroup.rotation.x;
            actionMode = 'swinging';
          } else if (swingAnim.phase === 'to_door_outside') {
            rig.root.position.y = THREE.MathUtils.damp(rig.root.position.y, 0, 12, delta);
            const dx = doorZone.outsidePos.x - rig.root.position.x;
            const dz = doorZone.outsidePos.z - rig.root.position.z;
            const dist = Math.hypot(dx, dz);
            if (dist > 0.22) {
              const step = Math.min(dist, delta * 3.8);
              rig.root.position.x += (dx / dist) * step;
              rig.root.position.z += (dz / dist) * step;
              targetRotY = Math.atan2(dx, dz);
              actionMode = 'playing_football';
            } else {
              swingAnim.phase = 'walking_in_door';
              actionMode = 'walking';
            }
          } else {
            // walking_in_door: walk cleanly through the classroom door inside!
            rig.root.position.y = THREE.MathUtils.damp(rig.root.position.y, 0, 12, delta);
            const dx = doorZone.insidePos.x - rig.root.position.x;
            const dz = doorZone.insidePos.z - rig.root.position.z;
            const dist = Math.hypot(dx, dz);
            if (dist > 0.22) {
              const step = Math.min(dist, delta * 3.1);
              rig.root.position.x += (dx / dist) * step;
              rig.root.position.z += (dz / dist) * step;
              targetRotY = Math.atan2(dx, dz);
              actionMode = 'walking';
            } else {
              studentSwingMap.delete(learner.id);
            }
          }
        } else if (fieldAnim) {
          const wz = windowZones[fieldAnim.windowIdx];

          if (fieldAnim.phase === 'to_window_inside') {
            rig.root.position.y = THREE.MathUtils.damp(rig.root.position.y, 0, 12, delta);
            const dx = wz.insidePos.x - rig.root.position.x;
            const dz = wz.insidePos.z - rig.root.position.z;
            const dist = Math.hypot(dx, dz);
            if (dist > 0.14) {
              const step = Math.min(dist, delta * 3.5);
              rig.root.position.x += (dx / dist) * step;
              rig.root.position.z += (dz / dist) * step;
              targetRotY = Math.atan2(dx, dz);
              actionMode = 'playing_football';
            } else {
              fieldAnim.phase = 'hopping_out';
              fieldAnim.hopProgress = 0;
              actionMode = 'jumping_window';
            }
          } else if (fieldAnim.phase === 'hopping_out') {
            fieldAnim.hopProgress = Math.min(1, fieldAnim.hopProgress + delta * 1.45);
            const t = fieldAnim.hopProgress;
            rig.root.position.x = THREE.MathUtils.lerp(wz.insidePos.x, wz.outsidePos.x, t);
            rig.root.position.z = wz.center.z;
            rig.root.position.y = Math.sin(t * Math.PI) * 2.05;
            targetRotY = -Math.PI / 2;
            actionMode = 'jumping_window';
            if (t >= 1) {
              rig.root.position.y = 0;
              fieldAnim.phase = 'playing';
            }
          } else if (fieldAnim.phase === 'playing') {
            rig.root.position.y = 0;
            actionMode = 'playing_football';

            const isBallChaser = closestBallStudentId === learner.id;
            if (isBallChaser) {
              _targetPos.copy(soccerBall.position);
            } else {
              fieldAnim.retargetTimer -= delta;
              if (fieldAnim.retargetTimer <= 0) {
                fieldAnim.retargetTimer = 2.0 + Math.random() * 2.0;
                fieldAnim.pitchSpot.set(
                  THREE.MathUtils.clamp(soccerBall.position.x + (Math.random() - 0.5) * 7.5, -29.2, -20.2),
                  0,
                  THREE.MathUtils.clamp(soccerBall.position.z + (Math.random() - 0.5) * 8.5, -8.8, 4.5),
                );
              }
              _targetPos.copy(fieldAnim.pitchSpot);
            }

            const dx = _targetPos.x - rig.root.position.x;
            const dz = _targetPos.z - rig.root.position.z;
            const dist = Math.hypot(dx, dz);
            if (dist > 0.25) {
              const speed = isBallChaser ? 4.2 : 3.0;
              const step = Math.min(dist, delta * speed);
              rig.root.position.x += (dx / dist) * step;
              rig.root.position.z += (dz / dist) * step;
              targetRotY = Math.atan2(dx, dz);
            } else {
              targetRotY = Math.atan2(
                soccerBall.position.x - rig.root.position.x,
                soccerBall.position.z - rig.root.position.z,
              );
            }

            // Kick the soccer ball when close!
            if (isBallChaser && dist < 0.65 && ballKickCooldown <= 0) {
              ballKickCooldown = 0.72;
              rig.kickBlend = 1;
              lastScorerName = learner.name.split(' ')[0];
              soundEngine.playBallKick();

              const shootGoal = Math.random() < 0.45 || playingIds.length < 2;
              let aimX = -24.8 + (Math.random() - 0.5) * 2.2;
              let aimZ = soccerBall.position.z > -2.2 ? -9.4 : 5.0;

              if (!shootGoal) {
                const mates = playingIds.filter((id) => id !== learner.id);
                const mateRig = rigsByStudent.get(mates[Math.floor(Math.random() * mates.length)]);
                if (mateRig) {
                  aimX = mateRig.root.position.x + (Math.random() - 0.5) * 1.4;
                  aimZ = mateRig.root.position.z + (Math.random() - 0.5) * 1.4;
                }
              }

              const kdx = aimX - soccerBall.position.x;
              const kdz = aimZ - soccerBall.position.z;
              const kLen = Math.max(0.1, Math.hypot(kdx, kdz));
              const kickPower = shootGoal ? 7.4 : 5.4;
              ballVel.set((kdx / kLen) * kickPower, shootGoal ? 2.6 : 1.7, (kdz / kLen) * kickPower);
            }
          } else if (fieldAnim.phase === 'to_door_outside') {
            rig.root.position.y = 0;
            const dx = doorZone.outsidePos.x - rig.root.position.x;
            const dz = doorZone.outsidePos.z - rig.root.position.z;
            const dist = Math.hypot(dx, dz);
            if (dist > 0.22) {
              const step = Math.min(dist, delta * 3.8);
              rig.root.position.x += (dx / dist) * step;
              rig.root.position.z += (dz / dist) * step;
              targetRotY = Math.atan2(dx, dz);
              actionMode = 'playing_football';
            } else {
              fieldAnim.phase = 'walking_in_door';
              actionMode = 'walking';
            }
          } else {
            // walking_in_door: walk cleanly through the classroom door inside!
            rig.root.position.y = 0;
            const dx = doorZone.insidePos.x - rig.root.position.x;
            const dz = doorZone.insidePos.z - rig.root.position.z;
            const dist = Math.hypot(dx, dz);
            if (dist > 0.22) {
              const step = Math.min(dist, delta * 3.1);
              rig.root.position.x += (dx / dist) * step;
              rig.root.position.z += (dz / dist) * step;
              targetRotY = Math.atan2(dx, dz);
              actionMode = 'walking';
            } else {
              studentFieldMap.delete(learner.id);
            }
          }
        } else if (isOnBoardTask && boardAnim) {
          rig.root.position.y = THREE.MathUtils.damp(rig.root.position.y, 0, 12, delta);
          if (boardAnim.phase === 'walking_to_board') {
            _targetPos.copy(boardZone.writePosition);
            const dx = _targetPos.x - rig.root.position.x;
            const dz = _targetPos.z - rig.root.position.z;
            const dist = Math.hypot(dx, dz);
            if (dist > 0.08) {
              const step = Math.min(dist, delta * 2.8);
              rig.root.position.x += (dx / dist) * step;
              rig.root.position.z += (dz / dist) * step;
              targetRotY = Math.atan2(dx, dz);
              actionMode = 'walking';
            } else {
              boardAnim.phase = 'writing';
              soundEngine.playChalkWrite();
              actionMode = 'writing_board';
              targetRotY = boardZone.boardFacingAngle + Math.PI;
            }
          } else if (boardAnim.phase === 'writing') {
            actionMode = 'writing_board';
            targetRotY = boardZone.boardFacingAngle + Math.PI;
            rig.root.position.x = THREE.MathUtils.damp(
              rig.root.position.x,
              boardZone.writePosition.x + Math.sin(elapsed * 2.5) * 0.28,
              6,
              delta,
            );
            rig.root.position.z = THREE.MathUtils.damp(
              rig.root.position.z,
              boardZone.writePosition.z,
              8,
              delta,
            );
          } else {
            const dx = homeX - rig.root.position.x;
            const dz = homeZ - rig.root.position.z;
            const dist = Math.hypot(dx, dz);
            if (dist > 0.08) {
              const step = Math.min(dist, delta * 2.8);
              rig.root.position.x += (dx / dist) * step;
              rig.root.position.z += (dz / dist) * step;
              targetRotY = Math.atan2(dx, dz);
              actionMode = 'walking';
            } else {
              activeBoardAnimRef.current = null;
              callbacksRef.current.onBoardComplete(learner.id);
            }
          }
        } else {
          rig.root.position.y = THREE.MathUtils.damp(rig.root.position.y, 0, 12, delta);
          const homeDx = homeX - rig.root.position.x;
          const homeDz = homeZ - rig.root.position.z;
          const homeDist = Math.hypot(homeDx, homeDz);

          if (homeDist > 0.25 && !isRaisingHand && !isAnswering) {
            const step = Math.min(homeDist, delta * 3.15);
            rig.root.position.x += (homeDx / homeDist) * step;
            rig.root.position.z += (homeDz / homeDist) * step;
            targetRotY = Math.atan2(homeDx, homeDz);
            actionMode = 'walking';
          } else {
            rig.root.position.x = THREE.MathUtils.damp(rig.root.position.x, homeX, 8, delta);
            rig.root.position.z = THREE.MathUtils.damp(rig.root.position.z, homeZ, 8, delta);

            if (isAnswering) {
              actionMode = 'answering';
              targetRotY = Math.atan2(
                teacherRig.root.position.x - rig.root.position.x,
                teacherRig.root.position.z - rig.root.position.z,
              );
            } else if (isRaisingHand) {
              actionMode = 'raising_hand';
              targetRotY = Math.atan2(
                teacherRig.root.position.x - rig.root.position.x,
                teacherRig.root.position.z - rig.root.position.z,
              );
            }
          }
        }

        rotateToward(rig.root, targetRotY, delta * 10);

        updateStudentPose(
          rig,
          actionMode,
          isDragging,
          hoveredStudentId === learner.id,
          selectedRef.current === learner.id,
          elapsed,
          delta,
          activeSwingAngle,
        );
      }

      // Teacher movement: chases escaped students through window onto football field & swings OR patrols classroom!
      const anyStudentOutside = studentFieldMap.size > 0 || studentSwingMap.size > 0;
      const shouldPursueOutside = teacherPursuitRef.current && anyStudentOutside;
      const teacherWindow = windowZones[1];
      let teacherTargetRotY = 0.25;
      let isPointingBoard = false;
      let isPursuing = false;
      let teacherWalking = false;

      if (shouldPursueOutside) {
        isPursuing = true;

        // If teacher is recalling students back to class, tag players on field & swings back inside
        if (recallingRef.current && (playingIds.length > 0 || swingingIds.length > 0)) {
          recallTagTimer += delta;
          if (recallTagTimer >= 0.72) {
            recallTagTimer = 0;
            if (playingIds.length > 0) {
              callbacksRef.current.onReturnStudentFromField(playingIds[0]);
            } else if (swingingIds.length > 0) {
              callbacksRef.current.onReturnStudentFromSwing?.(swingingIds[0]);
            }
          }
        } else {
          recallTagTimer = 0;
        }

        if (teacherSide === 'inside') {
          _teacherGoal.copy(teacherWindow.insidePos);
          const dx = _teacherGoal.x - teacherRig.root.position.x;
          const dz = _teacherGoal.z - teacherRig.root.position.z;
          const dist = Math.hypot(dx, dz);
          if (dist > 0.16) {
            const step = Math.min(dist, delta * 3.4);
            teacherRig.root.position.x += (dx / dist) * step;
            teacherRig.root.position.z += (dz / dist) * step;
            teacherTargetRotY = Math.atan2(dx, dz);
            teacherWalking = true;
          } else {
            teacherSide = 'hopping_out';
            teacherHopProgress = 0;
          }
        } else if (teacherSide === 'hopping_out') {
          teacherHopProgress = Math.min(1, teacherHopProgress + delta * 1.35);
          const t = teacherHopProgress;
          teacherRig.root.position.x = THREE.MathUtils.lerp(
            teacherWindow.insidePos.x,
            teacherWindow.outsidePos.x,
            t,
          );
          teacherRig.root.position.z = teacherWindow.center.z;
          teacherRig.root.position.y = Math.sin(t * Math.PI) * 2.05;
          teacherTargetRotY = -Math.PI / 2;
          if (t >= 1) {
            teacherRig.root.position.y = 0;
            teacherSide = 'outside';
          }
        } else if (teacherSide === 'outside') {
          teacherRig.root.position.y = 0;
          const chaseList =
            playingIds.length > 0 || swingingIds.length > 0
              ? [...playingIds, ...swingingIds]
              : [...Array.from(studentFieldMap.keys()), ...Array.from(studentSwingMap.keys())];
          pursuitSwitchTimer += delta;
          if (pursuitSwitchTimer > 2.8) {
            pursuitSwitchTimer = 0;
            pursuitIdx++;
          }
          const chaseId = chaseList[pursuitIdx % Math.max(1, chaseList.length)];
          const chaseRig = chaseId ? rigsByStudent.get(chaseId) : null;

          if (chaseRig) {
            _teacherGoal.set(chaseRig.root.position.x, 0, chaseRig.root.position.z);
            const dx = _teacherGoal.x - teacherRig.root.position.x;
            const dz = _teacherGoal.z - teacherRig.root.position.z;
            const dist = Math.hypot(dx, dz);
            if (dist > 1.25) {
              const step = Math.min(dist - 1.0, delta * 3.3);
              teacherRig.root.position.x += (dx / dist) * step;
              teacherRig.root.position.z += (dz / dist) * step;
              teacherTargetRotY = Math.atan2(dx, dz);
              teacherWalking = true;
            } else {
              teacherTargetRotY = Math.atan2(dx, dz);
              pursuitSwitchTimer += delta * 2.2;
            }
          }
        }
      } else {
        // Nobody is outside anymore -> bring Teacher back inside through the Classroom Door!
        if (teacherSide === 'outside' || teacherSide === 'hopping_out') {
          teacherSide = 'to_door_outside';
        }
        if (teacherSide === 'to_door_outside') {
          isPursuing = true;
          _teacherGoal.copy(doorZone.outsidePos);
          const dx = _teacherGoal.x - teacherRig.root.position.x;
          const dz = _teacherGoal.z - teacherRig.root.position.z;
          const dist = Math.hypot(dx, dz);
          teacherRig.root.position.y = 0;
          if (dist > 0.22) {
            const step = Math.min(dist, delta * 3.3);
            teacherRig.root.position.x += (dx / dist) * step;
            teacherRig.root.position.z += (dz / dist) * step;
            teacherTargetRotY = Math.atan2(dx, dz);
            teacherWalking = true;
          } else {
            teacherSide = 'walking_in_door';
            teacherWalking = true;
          }
        } else if (teacherSide === 'walking_in_door') {
          _teacherGoal.copy(doorZone.insidePos);
          const dx = _teacherGoal.x - teacherRig.root.position.x;
          const dz = _teacherGoal.z - teacherRig.root.position.z;
          const dist = Math.hypot(dx, dz);
          teacherRig.root.position.y = 0;
          if (dist > 0.22) {
            const step = Math.min(dist, delta * 2.9);
            teacherRig.root.position.x += (dx / dist) * step;
            teacherRig.root.position.z += (dz / dist) * step;
            teacherTargetRotY = Math.atan2(dx, dz);
            teacherWalking = true;
          } else {
            teacherSide = 'inside';
          }
        } else {
          // Normal classroom teaching & patrol!
          teacherRig.root.position.y = 0;
          if (boardAnim) {
            _teacherGoal.set(-3.55, 0, -4.45);
            teacherTargetRotY = Math.atan2(
              boardZone.boardPosition.x - teacherRig.root.position.x,
              boardZone.boardPosition.z - teacherRig.root.position.z,
            );
            isPointingBoard = true;
          } else if (answeringRef.current) {
            const studentRig = rigsByStudent.get(answeringRef.current);
            if (studentRig) {
              const homeRef = TEACHER_PATROL_STOPS[1].pos;
              const vx = homeRef.x - studentRig.root.position.x;
              const vz = homeRef.z - studentRig.root.position.z;
              const len = Math.max(0.01, Math.hypot(vx, vz));
              _teacherGoal.set(
                THREE.MathUtils.clamp(studentRig.root.position.x + (vx / len) * 1.45, -6.5, 6.8),
                0,
                THREE.MathUtils.clamp(studentRig.root.position.z + (vz / len) * 1.45, -4.4, 3.8),
              );
              teacherTargetRotY = Math.atan2(
                studentRig.root.position.x - teacherRig.root.position.x,
                studentRig.root.position.z - teacherRig.root.position.z,
              );
            }
          } else {
            const stop = TEACHER_PATROL_STOPS[patrolIndex % TEACHER_PATROL_STOPS.length];
            _teacherGoal.copy(stop.pos);
            const distToStop = Math.hypot(
              _teacherGoal.x - teacherRig.root.position.x,
              _teacherGoal.z - teacherRig.root.position.z,
            );
            if (distToStop <= 0.14) {
              teacherTargetRotY = Math.atan2(
                stop.lookAt.x - teacherRig.root.position.x,
                stop.lookAt.z - teacherRig.root.position.z,
              );
              isPointingBoard = stop.pointBoard;
              patrolPauseElapsed += delta;
              if (patrolPauseElapsed >= stop.dwell) {
                patrolPauseElapsed = 0;
                patrolIndex = (patrolIndex + 1) % TEACHER_PATROL_STOPS.length;
              }
            }
          }

          const tdx = _teacherGoal.x - teacherRig.root.position.x;
          const tdz = _teacherGoal.z - teacherRig.root.position.z;
          const tDist = Math.hypot(tdx, tdz);
          teacherWalking = tDist > 0.12;

          if (teacherWalking) {
            const step = Math.min(tDist, delta * 1.85);
            teacherRig.root.position.x += (tdx / tDist) * step;
            teacherRig.root.position.z += (tdz / tDist) * step;
            teacherTargetRotY = Math.atan2(tdx, tdz);
            isPointingBoard = false;
          }
        }
      }

      rotateToward(teacherRig.root, teacherTargetRotY, delta * 7.5);
      updateTeacherPose(
        teacherRig,
        teacherWalking,
        teacherTalkingRef.current || Boolean(boardAnim) || Boolean(answeringRef.current),
        isPointingBoard && !teacherWalking,
        isPursuing,
        teacherHovered,
        elapsed,
        delta,
      );

      renderer.render(scene, camera);
      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        frameId = requestAnimationFrame(tick);
      }
    }

    if (isSoftwareGl) {
      tick();
    } else {
      frameId = requestAnimationFrame(tick);
    }

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      window.removeEventListener('resize', onResize);
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerup', onPointerUp);
      canvas.removeEventListener('pointercancel', onPointerUp);
      canvas.removeEventListener('webglcontextlost', onContextLost);
      canvas.removeEventListener('webglcontextrestored', onContextRestored);
      controls.dispose();
      envTarget.dispose();
      scene.traverse((obj) => {
        if ((obj as THREE.Mesh).isMesh) {
          const mesh = obj as THREE.Mesh;
          mesh.geometry?.dispose();
          if (Array.isArray(mesh.material)) {
            mesh.material.forEach((m) => m.dispose());
          } else {
            mesh.material?.dispose();
          }
        }
      });
      renderer.dispose();
      if (canvas.parentElement === container) {
        container.removeChild(canvas);
      }
    };
  }, [learners]);

  return (
    <div className="stage-3d-shell">
      <div ref={mountRef} className="stage-3d-canvas" />
      {contextLost && (
        <div className="stage-3d-fallback">
          <p>3D classroom paused. Restoring WebGL view...</p>
        </div>
      )}
    </div>
  );
}
