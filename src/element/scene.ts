import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import {
  avenueX, buildings, crossroadZ, fragments, links, projectionError, targetDirection,
  type Attempt, type ElementModel, type ScreenPoint,
} from './puzzle';

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
  context.font = 'bold 39px sans-serif';
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
  split: () => new THREE.BoxGeometry(0.42, 0.52, 1.06),
};
const roofColor = { dome: 0x409dff, spire: 0xe1e7ef, amber: 0xffaa39, split: 0xaf82d9 };

function building(site: typeof buildings[number]) {
  const { id, x, z, height, roof } = site;
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  group.add(box(1.55, height, 1.35, 0x668198, 0, height / 2, 0));
  const cap = mesh(roofGeometry[roof](), roofColor[roof], roof === 'split' ? -0.46 : 0,
    height + (roof === 'dome' ? 0 : 0.18));
  group.add(cap);
  if (roof === 'split') {
    const second = cap.clone();
    second.position.x = 0.46;
    group.add(second);
  }
  const badge = label(id, 0.48);
  badge.position.y = height + 0.99;
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

export function createScene(host: HTMLElement, onBuilding: (id: string) => void) {
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
  const table = box(16, 0.65, 12, 0x354b59, 0, -0.36, 0);
  const roads = new THREE.Group();
  roads.add(
    box(1, 0.025, 12, 0x6c8290, avenueX, 0, 0),
    box(16, 0.025, 0.8, 0x6c8290, 0, 0, crossroadZ),
  );
  for (const [text, x, z] of [['С', 0, -5.65], ['Ю', 0, 5.65], ['З', -7.5, 2], ['В', 7.5, 2]] as const) {
    const marker = label(text, 0.42);
    marker.position.set(x, 0.45, z);
    roads.add(marker);
  }
  const landscape = new THREE.Group();
  for (const [x, z] of [[-7, -2.4], [-4, -5], [3.8, -5], [7, 4.9], [-7, 5.2], [4.5, 5.25]]) {
    landscape.add(mesh(new THREE.SphereGeometry(0.7, 12, 8), 0x435c58, x, -0.37, z));
    landscape.add(mesh(new THREE.ConeGeometry(0.3, 0.95, 7), 0x507f69, x, 0.58, z));
  }

  const shells = new Map(buildings.map(site => [site.id as string, building(site)]));
  const wires = links.map(pair => {
    const start = shells.get(pair[0])!.position.clone().setY(0.36);
    const end = shells.get(pair[1])!.position.clone().setY(0.36);
    const line = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([start, end]),
      new THREE.LineBasicMaterial({ color: 0x48f2db }),
    );
    expo.add(line);
    return { pair, line };
  });
  const pieces = new THREE.Group();
  const fragmentObjects = fragments.map(({ ring: isRing, position, color, radius }) => {
    const part = isRing ? ring(radius, color) : new THREE.Mesh(
      new THREE.IcosahedronGeometry(radius, 0), new THREE.MeshBasicMaterial({ color }),
    );
    part.position.set(...position);
    pieces.add(part);
    return part;
  });
  expo.add(table, roads, landscape, pieces, ...shells.values());

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

  function update(attempt: Attempt, layers: { roads: boolean; landscape: boolean; wires: boolean }, viewSaved: boolean) {
    currentStage = attempt.stage;
    const transparent = currentStage !== 'selection';
    const visible = new Set(attempt.selected);
    const showResult = Boolean(attempt.element && (viewSaved || currentStage === 'complete'));
    controls.minZoom = showResult ? 4 : 0.65;
    controls.maxZoom = showResult ? 14 : 2.3;
    if (showResult && !showingResult) {
      attemptView = { position: camera.position.clone(), zoom: camera.zoom };
      resetView();
      renderResult(attempt.element!);
      camera.zoom = 7;
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
    wires.forEach(({ pair, line }) => {
      line.visible = layers.wires && !transparent && visible.has(pair[0]) && visible.has(pair[1]);
    });
    for (const [id, shell] of shells) {
      shell.visible = visible.has(id);
      shell.traverse(object => {
        if (object instanceof THREE.Sprite) object.visible = !transparent;
        if (object instanceof THREE.Mesh) {
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
    const direction = camera.position.clone().sub(controls.target).normalize();
    const points = fragmentObjects.map(part => {
      const projected = part.position.clone().project(camera);
      return [projected.x * (camera.right - camera.left), projected.y * (camera.top - camera.bottom)] as ScreenPoint;
    });
    return projectionError(points, direction.dot(target));
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
    const halfHeight = Math.max(8, 10 * height / width);
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
    if (!pointerStart || currentStage !== 'selection' || showingResult) return;
    if (Math.hypot(event.clientX - pointerStart.x, event.clientY - pointerStart.y) > 5) return;
    const rect = canvas.getBoundingClientRect();
    ray.setFromCamera(new THREE.Vector2(
      (event.clientX - rect.left) / rect.width * 2 - 1,
      1 - (event.clientY - rect.top) / rect.height * 2,
    ), camera);
    const meshes = [...shells.values()].filter(shell => shell.visible).flatMap(shell => shell.children);
    const hit = ray.intersectObjects(meshes, false)[0];
    const clicked = [...shells].find(([, shell]) => shell === hit?.object.parent);
    if (clicked) onBuilding(clicked[0]);
  };
  canvas.addEventListener('pointerdown', pointerDown);
  canvas.addEventListener('pointerup', pointerUp);

  renderer.setAnimationLoop(time => {
    if (animation) {
      const turn = THREE.MathUtils.smoothstep(time - animation.start, 0, 580);
      const merge = THREE.MathUtils.smoothstep(time - animation.start, 580, 1380);
      const rotation = new THREE.Quaternion().slerp(animation.turn, turn);
      camera.position.copy(animation.from).applyQuaternion(rotation).add(controls.target);
      const center = new THREE.Vector3(0, 0.25, 0);
      fragmentObjects.forEach((part, index) => {
        part.position.set(...fragments[index].position).lerp(center, merge);
        if (!fragments[index].ring) part.scale.setScalar(1 - 0.99 * merge);
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
    update, measure, assemble,
    reset() {
      animation = undefined;
      attemptView = undefined;
      controls.enabled = true;
      fragmentObjects.forEach((part, index) => {
        part.position.set(...fragments[index].position);
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
