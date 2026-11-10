import { archiveCandidates, bridgeMidpoints, buildings, factory, matchesSelection, matchesTopology, topologyCandidates } from './layout.ts';
export { buildings, matchesSelection } from './layout.ts';

export type Point = [number, number, number];
export type ScreenPoint = [number, number];
export type ElementModel = { parts: { radius: number; color: number; center: Point }[] };
export type Attempt = { selected: string[]; stage: 'selection' | 'archive' | 'projection' | 'complete'; element?: ElementModel; exclusions?: string[]; firstHypothesis?: string[] };

export const freshAttempt = (element?: ElementModel): Attempt => ({
  selected: buildings.map(site => site.id), stage: 'selection', element,
});
export const toggleBuilding = (attempt: Attempt, id: string): Attempt => {
  if ((attempt.stage !== 'selection' && attempt.stage !== 'archive') ||
    !buildings.some(site => site.id === id)) return attempt;
  const selected = attempt.selected.includes(id)
    ? attempt.selected.filter(label => label !== id)
    : [...attempt.selected, id];
  return { ...attempt, selected };
};


export const archiveRules = ['factoryRoute', 'matchingOrder', 'differentRoofs'] as const;
export type ArchiveRule = typeof archiveRules[number];
export const requiredExclusions = topologyCandidates.length - archiveCandidates.length;

export function verifiedExclusions(keys: unknown): string[] {
  if (!Array.isArray(keys)) return [];
  return topologyCandidates.filter(candidate => keys.includes(candidate.key) &&
    archiveRules.some(rule => !candidate.rules[rule])).map(candidate => candidate.key);
}

export function recordExclusion(attempt: Attempt, rule: ArchiveRule): Attempt {
  if (attempt.stage !== 'archive') return attempt;
  const selected = new Set(attempt.selected);
  if (!matchesTopology(selected)) return attempt;
  const key = [...selected].sort().join('');
  const candidate = topologyCandidates.find(entry => entry.key === key);
  if (!candidate || candidate.rules[rule] || attempt.exclusions?.includes(key)) return attempt;
  return { ...attempt, exclusions: [...(attempt.exclusions ?? []), key] };
}

export function confirmAttempt(attempt: Attempt, aligned = false): Attempt {
  const selected = new Set(attempt.selected);
  if (attempt.stage === 'selection' && matchesTopology(selected)) {
    return { ...attempt, stage: 'archive', firstHypothesis: attempt.selected };
  }
  if (attempt.stage === 'archive' && matchesSelection(selected) &&
    verifiedExclusions(attempt.exclusions).length === requiredExclusions) return { ...attempt, stage: 'projection' };
  if (attempt.stage === 'projection' && aligned && matchesSelection(selected)) {
    return { ...attempt, stage: 'complete', element: createElement() };
  }
  return attempt;
}

export const observationElevation = 30;

export function observationDirection(candidate: typeof archiveCandidates[number]): Point {
  const [first, second] = bridgeMidpoints(candidate);
  const plant = candidate.east.find(site => site.id === factory);
  if (!first || !second || !plant) throw new Error('Нет опор для направления наблюдения');
  const x = second.z - first.z;
  const z = first.x - second.x;
  const length = Math.hypot(x, z);
  const side = x * (plant.x - first.x) + z * (plant.z - first.z);
  if (!length || !side) throw new Error('Неоднозначная сторона наблюдения');
  const elevation = observationElevation * Math.PI / 180;
  const horizontal = Math.sign(side) * Math.cos(elevation) / length;
  return [x * horizontal, Math.sin(elevation), z * horizontal];
}

export const targetDirection = observationDirection(archiveCandidates[0]);
const [tx, ty, tz] = targetDirection;
const horizontal = Math.hypot(tx, tz);
const right: Point = [tz / horizontal, 0, -tx / horizontal];
const up: Point = [-tx * ty / horizontal, horizontal, -tz * ty / horizontal];
const radius = 2.8;
export const structureCenter: Point = [1.35, 0.25, 1.4];

function spatial(x: number, y: number, depth: number): Point {
  return [
    structureCenter[0] + right[0] * x + up[0] * y + tx * depth,
    structureCenter[1] + up[1] * y + ty * depth,
    structureCenter[2] + right[2] * x + up[2] * y + tz * depth,
  ];
}

export const fragments = [
  ...[0, 1, 2].map((arc) => {
    const depth = [-1.25, 0, 1.25][arc];
    return {
      center: spatial(0, 0, depth),
      points: Array.from({ length: 25 }, (_, step) => {
        const angle = 2 * Math.PI * (arc + step / 24) / 3 + 0.26;
        return spatial(radius * Math.cos(angle), radius * Math.sin(angle), depth);
      }),
    };
  }),
  { center: spatial(0, 1.15, 2.45), points: [spatial(0, 2.3, 2.45), spatial(0, 0, 2.45)] },
  { center: spatial(0, -1.15, 2.9), points: [spatial(0, 0, 2.9), spatial(0, -2.3, 2.9)] },
  ...[-1, 1].map(side => {
    const depth = side === -1 ? -2.1 : -0.35;
    return {
      center: spatial(0, 0, depth),
      points: [spatial(0, 0.98, depth), spatial(side * 0.72, 0, depth + 1.45), spatial(0, -0.98, depth)],
    };
  }),
];

export function createElement(): ElementModel {
  return { parts: [
    { radius: 0.78, color: 0x56e3ff, center: [0, 0, 0] },
    { radius: 0.58, color: 0x85eaff, center: [0, 0, 0] },
    { radius: 0.41, color: 0xbaefff, center: [0, 0, 0] },
    { radius: 0.25, color: 0xffffff, center: [0, 0, 0] },
  ] };
}

type ProjectedFragment = { center: ScreenPoint; points: ScreenPoint[] };
const distance = (a: ScreenPoint, b: ScreenPoint) => Math.hypot(a[0] - b[0], a[1] - b[1]);
const midpoint = (a: ScreenPoint, b: ScreenPoint): ScreenPoint => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
const cross = (a: ScreenPoint, b: ScreenPoint, p: ScreenPoint) =>
  (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]);

export function projectionRelations(parts: ProjectedFragment[]) {
  const arcs = parts.slice(0, 3);
  const [upper, lower, left, rightHalf] = parts.slice(3);
  const center: ScreenPoint = [
    arcs.reduce((sum, part) => sum + part.center[0], 0) / 3,
    arcs.reduce((sum, part) => sum + part.center[1], 0) / 3,
  ];
  const scale = arcs.reduce((sum, arc) =>
    sum + arc.points.reduce((total, point) => total + distance(arc.center, point), 0) / arc.points.length, 0) / 3;
  const [axisTop, joinTop] = upper.points;
  const [joinBottom, axisBottom] = lower.points;
  const axisLength = distance(axisTop, axisBottom);
  const lineDistance = (p: ScreenPoint) => Math.abs(cross(axisTop, axisBottom, p)) / axisLength;
  const [leftTop, leftCorner, leftBottom] = left.points;
  const [rightTop, rightCorner, rightBottom] = rightHalf.points;
  const top = midpoint(leftTop, rightTop);
  const bottom = midpoint(leftBottom, rightBottom);
  const diamondMid = midpoint(top, bottom);
  const face = scale > 0 && cross(arcs[0].center, arcs[0].points[0], arcs[0].points[12]) > scale ** 2 * 0.45 &&
    axisTop[1] - axisBottom[1] > scale * 0.85;
  return {
    face,
    ring: scale > 0 && arcs.every((arc, index) =>
      distance(arc.points.at(-1)!, arcs[(index + 1) % 3].points[0]) / scale <= 0.24),
    axis: axisLength > scale && distance(joinTop, joinBottom) / scale <= 0.12 &&
      [center, joinTop, joinBottom].every(point => lineDistance(point) / scale <= 0.16),
    core: scale > 0 &&
      Math.abs(midpoint(leftCorner, rightCorner)[1] - diamondMid[1]) / scale <= 0.12 && Math.max(distance(leftTop, rightTop), distance(leftBottom, rightBottom)) / scale <= 0.24 &&
      [top, bottom].every(point => lineDistance(point) / scale <= 0.31) &&
      [leftCorner, rightCorner, top, bottom].every(point => distance(point, center) / scale <= 0.76) &&
      cross(top, bottom, rightCorner) > scale ** 2 * 0.07 &&
      cross(top, bottom, leftCorner) < -(scale ** 2) * 0.07,
  };
}

export function matchesProjection(parts: ProjectedFragment[]) {
  return Object.values(projectionRelations(parts)).every(Boolean);
}





