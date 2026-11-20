import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import {
  createStudentRig,
  inferHairVariant,
  StudentRig,
  updateStudentPose,
} from './characterBuilder';
import {
  buildClassroomEnvironment,
  ChairSlot,
  GroupPadZone,
} from './furnitureBuilder';
import { soundEngine } from './soundEffects';

export type CameraPreset = 'overview' | 'chairs' | 'groups' | 'welcome' | 'results';

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

interface ClassroomStageProps {
  learners: ClassroomLearner[];
  assignments: Record<string, number>;
  selectedLearnerId: string | null;
  cameraPreset: CameraPreset;
  interactive: boolean;
  onSelectLearner: (id: string | null) => void;
  onHoverLearner: (id: string | null) => void;
  onAssignLearner: (learnerId: string, groupId: number) => boolean;
  onUnassignLearner: (learnerId: string) => void;
  onDropOutside?: (learnerId: string) => void;
}

const CAMERA_PRESETS: Record<
  CameraPreset,
  { pos: [number, number, number]; target: [number, number, number] }
> = {
  welcome: { pos: [6.2, 5.2, 8.6], target: [-0.4, 0.7, 0.1] },
  overview: { pos: [0.4, 7.6, 8.8], target: [0.4, 0.45, 0.0] },
  chairs: { pos: [-2.8, 5.2, 6.2], target: [-2.9, 0.55, 0.4] },
  groups: { pos: [4.2, 5.8, 6.4], target: [4.2, 0.4, 0.0] },
  results: { pos: [4.2, 4.4, 6.1], target: [4.2, 0.65, 0.0] },
};

// Pre-allocated math helpers (Zero-GC in animation loop)
const _pointer = new THREE.Vector2();
const _raycaster = new THREE.Raycaster();
const _dragPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const _planeHit = new THREE.Vector3();
const _targetPos = new THREE.Vector3();
const _camGoalPos = new THREE.Vector3();
const _camGoalTarget = new THREE.Vector3();

export function ClassroomStage({
  learners,
  assignments,
  selectedLearnerId,
  cameraPreset,
  interactive,
  onSelectLearner,
  onHoverLearner,
  onAssignLearner,
  onUnassignLearner,
}: ClassroomStageProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [contextLost, setContextLost] = useState(false);

  // Mutable refs so React state changes never tear down WebGL
  const assignmentsRef = useRef(assignments);
  const selectedRef = useRef(selectedLearnerId);
  const interactiveRef = useRef(interactive);
  const cameraGoalRef = useRef<{
    active: boolean;
    pos: THREE.Vector3;
    target: THREE.Vector3;
  }>({
    active: true,
    pos: new THREE.Vector3(...CAMERA_PRESETS[cameraPreset].pos),
    target: new THREE.Vector3(...CAMERA_PRESETS[cameraPreset].target),
  });

  const callbacksRef = useRef({
    onSelectLearner,
    onHoverLearner,
    onAssignLearner,
    onUnassignLearner,
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
    callbacksRef.current = {
      onSelectLearner,
      onHoverLearner,
      onAssignLearner,
      onUnassignLearner,
    };
  }, [onSelectLearner, onHoverLearner, onAssignLearner, onUnassignLearner]);

  useEffect(() => {
    const preset = CAMERA_PRESETS[cameraPreset];
    cameraGoalRef.current.pos.set(...preset.pos);
    cameraGoalRef.current.target.set(...preset.target);
    cameraGoalRef.current.active = true;
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
    scene.background = new THREE.Color(0xfdf1ea);
    scene.fog = new THREE.Fog(0xfdf1ea, 16, 36);

    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 80);
    const initialPreset = CAMERA_PRESETS[cameraPreset];
    camera.position.set(...initialPreset.pos);

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    // Studio Environment Reflections
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const roomEnv = new RoomEnvironment();
    const envTarget = pmremGenerator.fromScene(roomEnv, 0.04);
    scene.environment = envTarget.texture;
    roomEnv.dispose();
    pmremGenerator.dispose();

    // Warm/Cool 3-Point Classroom Lighting
    const hemiLight = new THREE.HemisphereLight(0xf6f8ff, 0xe8c7b0, 0.95);
    hemiLight.position.set(0, 12, 0);
    scene.add(hemiLight);

    const sunLight = new THREE.DirectionalLight(0xfff1dc, 1.55);
    sunLight.position.set(-8, 10.5, 5.5);
    sunLight.castShadow = !isSoftwareGl;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 1;
    sunLight.shadow.camera.far = 32;
    sunLight.shadow.camera.left = -10;
    sunLight.shadow.camera.right = 10;
    sunLight.shadow.camera.top = 8;
    sunLight.shadow.camera.bottom = -8;
    sunLight.shadow.bias = -0.0005;
    sunLight.shadow.normalBias = 0.02;
    scene.add(sunLight);

    const rimLight = new THREE.DirectionalLight(0xe6dcff, 0.55);
    rimLight.position.set(9, 6, -6);
    scene.add(rimLight);

    // OrbitControls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(...initialPreset.target);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.07;
    controls.minDistance = 4.2;
    controls.maxDistance = 17.5;
    controls.minPolarAngle = 0.28;
    controls.maxPolarAngle = Math.PI / 2.22;
    controls.addEventListener('start', () => {
      cameraGoalRef.current.active = false;
    });

    // Build classroom & characters
    const studentIds = learners.map((l) => l.id);
    const { chairs, groupZones } = buildClassroomEnvironment(scene, renderer, studentIds);

    const chairByStudent = new Map<string, ChairSlot>();
    chairs.forEach((c) => chairByStudent.set(c.studentId, c));

    const rigsByStudent = new Map<string, StudentRig>();
    const hitProxies: THREE.Object3D[] = [];
    const groupHitMeshes: THREE.Object3D[] = groupZones.map((g) => g.hitMesh);

    learners.forEach((learner, idx) => {
      const rig = createStudentRig(
        learner.id,
        idx,
        inferHairVariant(learner.avatar),
      );
      const chair = chairByStudent.get(learner.id)!;
      rig.root.position.copy(chair.seatPosition);
      rig.root.rotation.y = chair.chairGroup.rotation.y;
      scene.add(rig.root);
      rigsByStudent.set(learner.id, rig);
      hitProxies.push(rig.hitProxy);
    });

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    // Drag & Hover State
    let hoveredStudentId: string | null = null;
    let draggingStudentId: string | null = null;
    let hoveredGroupId: number | null = null;
    let pointerDownPos = { x: 0, y: 0 };
    let didDragMove = false;
    let lastHoverCheck = 0;

    const updatePointer = (event: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      _pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      _pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    };

    const findNearestGroupZone = (pos: THREE.Vector3): GroupPadZone | null => {
      let best: GroupPadZone | null = null;
      let bestDist = 1.72;
      for (const zone of groupZones) {
        const dx = pos.x - zone.center.x;
        const dz = pos.z - zone.center.z;
        const dist = Math.hypot(dx, dz);
        if (dist < bestDist) {
          bestDist = dist;
          best = zone;
        }
      }
      return best;
    };

    const onPointerDown = (event: PointerEvent) => {
      if (!interactiveRef.current || event.button !== 0) return;
      updatePointer(event);
      _raycaster.setFromCamera(_pointer, camera);

      const hits = _raycaster.intersectObjects(hitProxies, false);
      if (hits.length > 0) {
        const studentId = hits[0].object.userData.studentId as string;
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

      // Check if clicking a group zone while a learner is selected
      if (selectedRef.current) {
        const groupHits = _raycaster.intersectObjects(groupHitMeshes, false);
        if (groupHits.length > 0) {
          const groupId = groupHits[0].object.userData.groupId as number;
          const sid = selectedRef.current;
          const ok = callbacksRef.current.onAssignLearner(sid, groupId);
          if (ok) {
            const rig = rigsByStudent.get(sid);
            if (rig) rig.bounce = 0.24;
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
            rig.root.position.x = THREE.MathUtils.clamp(_planeHit.x, -7.2, 8.0);
            rig.root.position.z = THREE.MathUtils.clamp(_planeHit.z, -4.2, 4.4);
          }
          const nearZone = findNearestGroupZone(_planeHit);
          hoveredGroupId = nearZone ? nearZone.groupId : null;
        }
        return;
      }

      const now = performance.now();
      if (now - lastHoverCheck < 40) return;
      lastHoverCheck = now;

      _raycaster.setFromCamera(_pointer, camera);
      const hits = _raycaster.intersectObjects(hitProxies, false);
      const nextHover =
        hits.length > 0 ? (hits[0].object.userData.studentId as string) : null;
      if (nextHover !== hoveredStudentId) {
        hoveredStudentId = nextHover;
        callbacksRef.current.onHoverLearner(nextHover);
      }

      if (nextHover) {
        renderer.domElement.style.cursor = 'grab';
      } else if (selectedRef.current) {
        const gHits = _raycaster.intersectObjects(groupHitMeshes, false);
        hoveredGroupId =
          gHits.length > 0 ? (gHits[0].object.userData.groupId as number) : null;
        renderer.domElement.style.cursor = hoveredGroupId ? 'pointer' : 'default';
      } else {
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
        // Click toggle selection
        const nextSel = selectedRef.current === studentId ? null : studentId;
        callbacksRef.current.onSelectLearner(nextSel);
        hoveredGroupId = null;
        return;
      }

      if (rig) {
        const dropZone = findNearestGroupZone(rig.root.position);
        if (dropZone) {
          const ok = callbacksRef.current.onAssignLearner(studentId, dropZone.groupId);
          if (ok) {
            rig.bounce = 0.28;
          }
        } else if (assignmentsRef.current[studentId]) {
          // Dragged out of group zones -> return to sit on their chair
          callbacksRef.current.onUnassignLearner(studentId);
          soundEngine.playReturnToChair();
        }
      }
      hoveredGroupId = null;
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

    // Animation loop with Software WebGL pacing
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

      // Smooth camera preset damping
      if (cameraGoalRef.current.active) {
        _camGoalPos.copy(cameraGoalRef.current.pos);
        _camGoalTarget.copy(cameraGoalRef.current.target);
        camera.position.x = THREE.MathUtils.damp(camera.position.x, _camGoalPos.x, 6, delta);
        camera.position.y = THREE.MathUtils.damp(camera.position.y, _camGoalPos.y, 6, delta);
        camera.position.z = THREE.MathUtils.damp(camera.position.z, _camGoalPos.z, 6, delta);
        controls.target.x = THREE.MathUtils.damp(controls.target.x, _camGoalTarget.x, 6, delta);
        controls.target.y = THREE.MathUtils.damp(controls.target.y, _camGoalTarget.y, 6, delta);
        controls.target.z = THREE.MathUtils.damp(controls.target.z, _camGoalTarget.z, 6, delta);

        if (
          camera.position.distanceTo(_camGoalPos) < 0.04 &&
          controls.target.distanceTo(_camGoalTarget) < 0.04
        ) {
          cameraGoalRef.current.active = false;
        }
      }

      controls.update();

      // Compute group slot assignments in deterministic order
      const currentAssignments = assignmentsRef.current;
      const groupMembers: Record<number, string[]> = { 1: [], 2: [], 3: [], 4: [] };
      for (const l of learners) {
        const gid = currentAssignments[l.id];
        if (gid && groupMembers[gid]) {
          groupMembers[gid].push(l.id);
        }
      }

      // Highlight group pads & slots
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

      // Update each student's 3D position & seated/standing pose
      for (const learner of learners) {
        const rig = rigsByStudent.get(learner.id);
        if (!rig) continue;

        const isDragging = draggingStudentId === learner.id;
        const assignedGroupId = currentAssignments[learner.id];
        let targetPose = 0; // 0 = seated on chair
        let targetRotY = chairByStudent.get(learner.id)!.chairGroup.rotation.y;

        if (isDragging) {
          targetPose = 0.72; // Mid-air standing transition while held!
          targetRotY = 0;
        } else if (assignedGroupId) {
          targetPose = 1; // Standing upright in group!
          const zone = groupZones.find((z) => z.groupId === assignedGroupId)!;
          const slotIdx = groupMembers[assignedGroupId].indexOf(learner.id);
          const slotPos = zone.slotPositions[Math.max(0, slotIdx)];
          _targetPos.copy(slotPos);

          // Face slightly inward toward the center of their group circle
          targetRotY = Math.atan2(
            zone.center.x - slotPos.x,
            zone.center.z - slotPos.z,
          );

          rig.root.position.x = THREE.MathUtils.damp(rig.root.position.x, _targetPos.x, 10, delta);
          rig.root.position.z = THREE.MathUtils.damp(rig.root.position.z, _targetPos.z, 10, delta);
        } else {
          const chair = chairByStudent.get(learner.id)!;
          _targetPos.copy(chair.seatPosition);
          rig.root.position.x = THREE.MathUtils.damp(rig.root.position.x, _targetPos.x, 10, delta);
          rig.root.position.z = THREE.MathUtils.damp(rig.root.position.z, _targetPos.z, 10, delta);
        }

        // Smooth shortest-angle rotation
        let diff = targetRotY - rig.root.rotation.y;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        rig.root.rotation.y += diff * Math.min(1, delta * 10);

        updateStudentPose(
          rig,
          targetPose,
          isDragging,
          hoveredStudentId === learner.id,
          selectedRef.current === learner.id,
          elapsed,
          delta,
        );
      }

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
