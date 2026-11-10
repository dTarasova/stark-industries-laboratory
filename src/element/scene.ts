import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import {
  fragments, matchesProjection, structureCenter, targetDirection,
  type Attempt, type ElementModel, type ScreenPoint,
} from './puzzle';
import { archiveCandidates, bridgeMidpoints, buildings, carousel, factory, fence, links, swings, visibleLinks } from './layout';

const target = new THREE.Vector3(...targetDirection);
const initialDirection = new THREE.Vector3(-0.4, 0.8, 1).normalize();
const axis = new THREE.Vector3(0, 0, 1);

function material(color: number) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.65 });
}

function mesh(geometry: THREE.BufferGeometry, color: number, x = 0, y = 0, z = 0) {
  const object = new THREE.Mesh(geometry, material(color));
  object.position.set(x, y, z);
  return object;
}

function box(width: number, height: number, depth: number, color: number, x: number, y: number, z: number) {
  return mesh(new THREE.BoxGeometry(width, height, depth), color, x, y, z);
}

function label(text: string, scale = 0.7) {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 64;
  const context = canvas.getContext('2d')!;
  context.fillStyle = '#101e2b';
  context.fillRect(0, 0, 128, 64);
  context.fillStyle = '#e8f8ff';
  context.font = text.length > 2 ? 'bold 27px sans-serif' : 'bold 39px sans-serif';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText(text, 64, 33);
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(canvas), depthTest: false }));
  sprite.scale.set(scale * 2, scale, 1);
  return sprite;
}

const roofGeometry = {
  dome: () => new THREE.SphereGeometry(0.63, 20, 12, 0, 2 * Math.PI, 0, Math.PI / 2),
  spire: () => new THREE.ConeGeometry(0.48, 1.05, 6),
  amber: () => new THREE.CylinderGeometry(0.56, 0.62, 0.23, 6),
  split: () => new THREE.CylinderGeometry(0.07, 0.13, 0.76, 10),
};
const roofColor = { dome: 0x409dff, spire: 0xe1e7ef, amber: 0xffaa39, split: 0xaf82d9 };

function building(site: typeof buildings[number]) {
  const { id, x, z, height, roof } = site;
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  const industrial = id === factory;
  group.add(box(industrial ? 3.1 : 1.5, height, industrial ? 2.1 : 1.25, 0x668198, 0, height / 2, 0));
  if (industrial) {
    for (const x of [-1, 0, 1]) group.add(box(0.58, 0.72, 0.08, 0x293e4a, x, 0.5, 1.06));
    const sign = label('ЗАВОД', 0.64);
    sign.position.set(0, 0.77, 1.17);
    group.add(sign);
  }
  const cap = mesh(roofGeometry[roof](), roofColor[roof], roof === 'split' ? -0.46 : 0,
    height + ({ dome: 0, split: 0.36, spire: 0.51, amber: 0.1 }[roof]));
  group.add(cap);
  if (roof === 'split') {
    const second = cap.clone();
    second.position.x = 0.46;
    group.add(second);
  }
  const badge = label(id, 0.42);
  badge.position.y = height + 1.32;
  group.add(badge);
  return group;
}

function ring(radius: number, color: number) {
  const part = new THREE.Mesh(
    new THREE.TorusGeometry(radius, 0.055, 10, 48),
    new THREE.MeshBasicMaterial({ color }),
  );
  part.quaternion.setFromUnitVectors(axis, target);
  return part;
}

function dispose(group: THREE.Object3D) {
  group.traverse(object => {
    if (object instanceof THREE.Mesh || object instanceof THREE.Line) {
      object.geometry.dispose();
      object.material.dispose();
    } else if (object instanceof THREE.Sprite) {
      object.material.map?.dispose();
      object.material.dispose();
    }
  });
}

export function createScene(host: HTMLElement, onBuilding: (id?: string) => void) {
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  const canvas = renderer.domElement;
  host.append(canvas);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x101a25);
  scene.add(new THREE.HemisphereLight(0xe3f5ff, 0x526276, 2.4));
  const light = new THREE.DirectionalLight(0xffffff, 2);
  light.position.set(4, 12, 6);
  scene.add(light);

  const camera = new THREE.OrthographicCamera(-10, 10, 8, -8, 0.1, 120);
  const controls = new OrbitControls(camera, canvas);
  controls.enablePan = false;
  controls.minZoom = 0.65;
  controls.maxZoom = 2.3;
  controls.minPolarAngle = 0.04;
  controls.maxPolarAngle = Math.PI - 0.04;
  function resetView() {
    controls.target.set(0, 0.7, 0);
    camera.position.copy(initialDirection).multiplyScalar(26).add(controls.target);
    camera.zoom = 1;
    camera.updateProjectionMatrix();
    controls.update();
  }
  resetView();

  const expo = new THREE.Group();
  const result = new THREE.Group();
  scene.add(expo, result);
  const table = box(28, 0.65, 19, 0x354b59, 0, -0.36, 0);
  const roads = new THREE.Group();
  roads.add(box(1, 0.025, 19, 0x6c8290, 13.4, 0, 0), box(28, 0.025, 0.8, 0x6c8290, 0, 0, 8.7));
  const compass = new THREE.Group();
  for (const [text, x, z] of [['С', 0, -8.9], ['Ю', 0, 9], ['З', -13.4, 0], ['В', 13.4, 0]] as const) {
    const marker = label(text, 0.58);
    marker.position.set(x, 0.42, z);
    compass.add(marker);
  }
  const landscape = new THREE.Group();
  for (const [x, z] of [[-13,-2], [-7,-7.5], [5,-7.9], [13,2.7], [-13,7], [11,7.2]]) {
    landscape.add(box(0.16, 0.65, 0.16, 0x725444, x, 0.3, z));
    landscape.add(mesh(new THREE.ConeGeometry(0.4, 1.1, 7), 0x507f69, x, 0.84, z));
  }

  const landmarks = new THREE.Group();
  for (const [start, end] of [[fence.start, fence.gateStart], [fence.gateEnd, fence.end]]) {
    for (let z = start + 0.12; z < end - 0.06; z += 0.26) {
      landmarks.add(box(0.11, 0.59, 0.11, 0xc4ac7b, fence.x, 0.29, z));
    }
    for (const y of [0.16, 0.46]) {
      landmarks.add(box(0.11, 0.09, end - start, 0xc4ac7b, fence.x, y, (start + end) / 2));
    }
  }
  for (const z of [fence.gateStart, fence.gateEnd]) {
    landmarks.add(box(0.24, 0.94, 0.2, 0xf4d39c, fence.x, 0.47, z));
  }
  for (const y of [0.09, 1.12]) {
    landmarks.add(mesh(new THREE.CylinderGeometry(0.95, 0.95, 0.12, 24),
      0xd0996b, carousel.x, y, carousel.z));
  }
  landmarks.add(box(0.13, 1.1, 0.13, 0xf4d39c, carousel.x, 0.57, carousel.z));
  for (let index = 0; index < 4; index++) {
    const angle = index * Math.PI / 2;
    const x = carousel.x + 0.66 * Math.cos(angle);
    const z = carousel.z + 0.66 * Math.sin(angle);
    landmarks.add(box(0.07, 1, 0.07, 0xf4d39c, x, 0.62, z));
    landmarks.add(box(0.26, 0.25, 0.42, 0xb96759, x, 0.54, z));
  }
  for (const x of [swings.x - 0.85, swings.x + 0.85]) {
    for (const side of [-1, 1]) {
      const leg = box(0.09, 1.56, 0.09, 0xb8d4dc, x, 0.73, swings.z + side * 0.27);
      leg.rotation.x = -side * 0.34;
      landmarks.add(leg);
    }
  }
  landmarks.add(box(1.85, 0.1, 0.1, 0xb8d4dc, swings.x, 1.44, swings.z));
  for (const x of [swings.x - 0.4, swings.x + 0.4]) {
    landmarks.add(box(0.46, 0.07, 0.3, 0xe5af72, x, 0.47, swings.z));
    for (const offset of [-0.18, 0.18]) {
      landmarks.add(box(0.035, 0.96, 0.035, 0xb8d4dc, x + offset, 0.96, swings.z));
    }
  }

  const shells = new Map(buildings.map(site => [site.id as string, building(site)]));
  // Сдвиги вдоль трасс оставляют просвет у корпусов и соседних крон.
  const treeOffsets: Record<string, [number, number]> = {
    GK: [0.44, 0.68], KI: [0.36, 0.68], CJ: [0.4, 0.68],
    AL: [0.36, 0.64], LD: [0.32, 0.72],
  };
  const wires = links.map((pair, index) => {
    const start = shells.get(pair[0])!.position.clone().setY(0.36);
    const end = shells.get(pair[1])!.position.clone().setY(0.36);
    const line = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([start, end]),
      new THREE.LineBasicMaterial({ color: 0x48f2db }),
    );
    const trees = new THREE.Group();
    const markers = [];
    for (const distance of treeOffsets[pair] ?? [0.32, 0.68]) {
      const { x, z } = start.clone().lerp(end, distance);
      trees.add(
        box(0.09, 0.25, 0.09, 0xa27a4d, x, 0.125, z),
        mesh(new THREE.SphereGeometry(0.22, 12, 8), 0x93bc60, x, 0.36, z),
      );
      const badge = label(String(index + 1), 0.3);
      badge.position.set(x, 0.8, z);
      trees.add(badge);
      markers.push(badge);
    }
    expo.add(line, trees);
    return { pair, line, trees, markers };
  });
  const survey = new THREE.Group();
  const markers = bridgeMidpoints(archiveCandidates[0]).map(({ x, z }) => {
    survey.add(mesh(new THREE.SphereGeometry(0.19), 0xffc479, x, 0.55, z));
    return new THREE.Vector3(x, 0.55, z);
  });
  survey.add(new THREE.Line(
    new THREE.BufferGeometry().setFromPoints(markers),
    new THREE.LineBasicMaterial({ color: 0xffc479 }),
  ));
  expo.add(survey);
  const pieces = new THREE.Group();
  const fragmentObjects = fragments.map(({ center, points }) => {
    const origin = new THREE.Vector3(...center);
    const path = new THREE.CurvePath<THREE.Vector3>();
    const local = points.map(point => new THREE.Vector3(...point).sub(origin));
    local.slice(1).forEach((point, index) => path.add(new THREE.LineCurve3(local[index], point)));
    const part = new THREE.Mesh(
      new THREE.TubeGeometry(path, (points.length - 1) * 4, 0.052, 8),
      new THREE.MeshBasicMaterial({ color: 0xa5edfa }),
    );
    part.position.copy(origin);
    pieces.add(part);
    return part;
  });
  expo.add(table, roads, landscape, landmarks, compass, pieces, ...shells.values());

  let currentStage: Attempt['stage'] = 'selection';
  let showingResult = false;
  let attemptView: { position: THREE.Vector3; zoom: number } | undefined;
  let animation: { start: number; from: THREE.Vector3; turn: THREE.Quaternion; done: () => void } | undefined;

  function renderResult(element: ElementModel) {
    dispose(result);
    result.clear();
    element.parts.forEach(({ color, radius, center }, index) => {
      const part = index === element.parts.length - 1
        ? mesh(new THREE.IcosahedronGeometry(radius, 1), color)
        : ring(radius, color);
      part.position.set(...center);
      part.quaternion.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), index * 0.75));
      result.add(part);
    });
  }

  function update(attempt: Attempt, layers: { roads: boolean; landscape: boolean; wires: boolean; survey: boolean }, viewSaved: boolean, focusedBuilding?: string) {
    currentStage = attempt.stage;
    const transparent = currentStage === 'projection' || currentStage === 'complete';
    const visible = new Set(attempt.selected);
    const showResult = Boolean(attempt.element && (viewSaved || currentStage === 'complete'));
    controls.minZoom = showResult ? 4 : 0.65;
    controls.maxZoom = showResult ? 14 : 2.3;
    if (showResult && !showingResult) {
      attemptView = { position: camera.position.clone(), zoom: camera.zoom };
      resetView();
      renderResult(attempt.element!);
      camera.zoom = 9;
      camera.updateProjectionMatrix();
    } else if (!showResult && showingResult && attemptView) {
      camera.position.copy(attemptView.position);
      camera.zoom = attemptView.zoom;
      camera.updateProjectionMatrix();
      controls.update();
      attemptView = undefined;
    }
    showingResult = showResult;
    expo.visible = !showResult;
    result.visible = showResult;
    roads.visible = layers.roads && !transparent;
    landscape.visible = layers.landscape && !transparent;
    pieces.visible = transparent;
    landmarks.visible = !transparent;
    survey.visible = currentStage === 'projection' && layers.survey;
    const activeLinks = new Set(visibleLinks(visible));
    wires.forEach(({ pair, line, trees, markers }) => {
      trees.visible = !transparent && activeLinks.has(pair);
      line.visible = trees.visible && layers.wires;
      markers.forEach(marker => {
        marker.visible = focusedBuilding !== undefined && pair.includes(focusedBuilding);
      });
    });
    for (const [id, shell] of shells) {
      shell.visible = visible.has(id);
      shell.traverse(object => {
        if (object instanceof THREE.Sprite) object.visible = !transparent || id === factory;
        if (object instanceof THREE.Mesh) {
          if (object.material instanceof THREE.MeshStandardMaterial) {
            object.material.emissive.setHex(!transparent && id === focusedBuilding ? 0x20505a : 0x000000);
          }
          object.material.transparent = transparent;
          object.material.depthWrite = !transparent;
          object.material.opacity = transparent ? 0.2 : 1;
        }
      });
    }
    table.material.transparent = transparent;
    table.material.depthWrite = !transparent;
    table.material.opacity = transparent ? 0.2 : 1;
  }

  function measure() {
    camera.updateMatrixWorld();
    const project = (point: [number, number, number]): ScreenPoint => {
      const projected = new THREE.Vector3(...point).project(camera);
      return [projected.x * (camera.right - camera.left), projected.y * (camera.top - camera.bottom)];
    };
    return matchesProjection(fragments.map(({ center, points }) => ({
      center: project(center), points: points.map(project),
    })));
  }

  function assemble(done: () => void) {
    const from = camera.position.clone().sub(controls.target);
    const turn = new THREE.Quaternion().setFromUnitVectors(from.clone().normalize(), target);
    animation = { start: performance.now(), from, turn, done };
    controls.enabled = false;
  }

  const resize = new ResizeObserver(() => {
    const { clientWidth: width, clientHeight: height } = host;
    if (!width || !height) return;
    const halfHeight = Math.max(10.8, 15.5 * height / width);
    const halfWidth = halfHeight * width / height;
    Object.assign(camera, { left: -halfWidth, right: halfWidth, top: halfHeight, bottom: -halfHeight });
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
  });
  resize.observe(host);

  const ray = new THREE.Raycaster();
  let pointerStart: { x: number; y: number } | undefined;
  const pointerDown = (event: PointerEvent) => {
    pointerStart = event.isPrimary && event.button === 0 ? { x: event.clientX, y: event.clientY } : undefined;
  };
  const pointerUp = (event: PointerEvent) => {
    if (!pointerStart || showingResult || (currentStage !== 'selection' && currentStage !== 'archive')) return;
    if (Math.hypot(event.clientX - pointerStart.x, event.clientY - pointerStart.y) > 5) return;
    const rect = canvas.getBoundingClientRect();
    ray.setFromCamera(new THREE.Vector2(
      (event.clientX - rect.left) / rect.width * 2 - 1,
      1 - (event.clientY - rect.top) / rect.height * 2,
    ), camera);
    const meshes = [...shells.values()].filter(shell => shell.visible).flatMap(shell => shell.children);
    const hit = ray.intersectObjects(meshes, false)[0];
    const clicked = [...shells].find(([, shell]) => shell === hit?.object.parent);
    onBuilding(clicked?.[0]);
  };
  canvas.addEventListener('pointerdown', pointerDown);
  canvas.addEventListener('pointerup', pointerUp);

  renderer.setAnimationLoop(time => {
    if (animation) {
      const turn = THREE.MathUtils.smoothstep(time - animation.start, 0, 580);
      const merge = THREE.MathUtils.smoothstep(time - animation.start, 580, 1380);
      const rotation = new THREE.Quaternion().slerp(animation.turn, turn);
      camera.position.copy(animation.from).applyQuaternion(rotation).add(controls.target);
      const center = new THREE.Vector3(...structureCenter);
      fragmentObjects.forEach((part, index) => {
        part.position.set(...fragments[index].center).lerp(center, merge);
        part.scale.setScalar(1 - 0.88 * merge);
      });
      if (merge === 1) {
        const { done } = animation;
        animation = undefined;
        controls.enabled = true;
        done();
      }
    }
    controls.update();
    renderer.render(scene, camera);
  });

  return {
    update, measure, assemble, resetView,
    planView() {
      camera.position.copy(controls.target).add(new THREE.Vector3(0, 26, 1.05));
      camera.zoom = 1;
      camera.updateProjectionMatrix();
      controls.update();
    },
    reset() {
      animation = undefined;
      attemptView = undefined;
      controls.minZoom = 0.65;
      controls.maxZoom = 2.3;
      controls.enabled = true;
      fragmentObjects.forEach((part, index) => {
        part.position.set(...fragments[index].center);
        part.scale.setScalar(1);
      });
      resetView();
    },
    dispose() {
      renderer.setAnimationLoop(null);
      resize.disconnect();
      canvas.removeEventListener('pointerdown', pointerDown);
      canvas.removeEventListener('pointerup', pointerUp);
      controls.dispose();
      dispose(scene);
      renderer.dispose();
      canvas.remove();
    },
  };
}
