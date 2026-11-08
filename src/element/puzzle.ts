export const buildings = [
  { id: 'A', x: -6, z: -4, roof: 'dome', height: 1.4 },
  { id: 'B', x: -2, z: -4, roof: 'spire', height: 2.1 },
  { id: 'C', x: 2, z: -4, roof: 'amber', height: 1.6 },
  { id: 'D', x: 6, z: -4, roof: 'split', height: 2.2 },
  { id: 'E', x: -6, z: 0, roof: 'split', height: 1.3 },
  { id: 'F', x: -2, z: 0, roof: 'amber', height: 2.4 },
  { id: 'G', x: 2, z: 0, roof: 'spire', height: 1.9 },
  { id: 'H', x: 6, z: 0, roof: 'dome', height: 2.5 },
  { id: 'I', x: -6, z: 4, roof: 'amber', height: 1.8 },
  { id: 'J', x: -2, z: 4, roof: 'split', height: 1.5 },
  { id: 'K', x: 2, z: 4, roof: 'amber', height: 1.2 },
  { id: 'L', x: 6, z: 4, roof: 'split', height: 2.6 },
] as const;

export const avenueX = 0;
export const crossroadZ = 2;
export const links = ['AB', 'BF', 'FE', 'HG', 'GI', 'IJ', 'GK', 'KL', 'CD', 'GC', 'ED'];

export function matchesSelection(selected: ReadonlySet<string>) {
  if (selected.size !== 4) return false;
  const sites = buildings.filter(({ id }) => selected.has(id));
  const dome = sites.find(site => site.roof === 'dome');
  const spire = sites.find(site => site.roof === 'spire');
  const amber = sites.find(site => site.roof === 'amber' && site.z > crossroadZ);
  const split = sites.find(site => site.roof === 'split' && site.x < avenueX);
  if (!dome || !spire || !amber || !split) return false;
  const chain = [dome.id + spire.id, spire.id + amber.id, amber.id + split.id];
  return chain.every(pair => links.some(link => link === pair || link === pair[1] + pair[0]));
}

export type Point = [number, number, number];
export type ScreenPoint = [number, number];
export type ElementModel = { parts: { radius: number; color: number; center: Point }[] };
export type Attempt = { selected: string[]; stage: 'selection' | 'projection' | 'complete'; element?: ElementModel };

export const freshAttempt = (element?: ElementModel): Attempt => ({
  selected: buildings.map(site => site.id), stage: 'selection', element,
});
export const toggleBuilding = (attempt: Attempt, id: string): Attempt => {
  if (attempt.stage !== 'selection') return attempt;
  const selected = attempt.selected.includes(id)
    ? attempt.selected.filter(label => label !== id)
    : [...attempt.selected, id];
  return { ...attempt, selected };
};

export const targetDirection: Point = [0.6, 0.48, Math.sqrt(1 - 0.6 ** 2 - 0.48 ** 2)];
const depthPoint = (depth: number): Point => [
  targetDirection[0] * depth,
  0.25 + targetDirection[1] * depth,
  targetDirection[2] * depth,
];

export const fragments: { position: Point; color: number; radius: number; ring?: boolean }[] = [
  { position: [6, 2.1, 0], color: 0x56e3ff, radius: 0.42 },
  { position: [2, 2.65, 0], color: 0xffce73, radius: 0.35 },
  { position: [-6, 1.1, 4], color: 0xcf9cff, radius: 0.5 },
  { position: [-2, 1.95, 4], color: 0x79ffd0, radius: 0.3 },
  { position: depthPoint(-4), color: 0x56e3ff, radius: 0.78, ring: true },
  { position: depthPoint(1), color: 0xffce73, radius: 0.49, ring: true },
  { position: depthPoint(5), color: 0xffffff, radius: 0.19, ring: true },
];

export function createElement(): ElementModel {
  return { parts: [
    ...fragments.filter(part => part.ring).map(({ radius, color }): ElementModel['parts'][number] =>
      ({ radius, color, center: [0, 0, 0] })),
    { radius: 0.14, color: 0xffffff, center: [0, 0, 0] },
  ] };
}

export function referenceProjection(): ScreenPoint[] {
  const [x, y, z] = targetDirection;
  const horizontal = Math.hypot(x, z);
  return fragments.map(({ position: [px, py, pz] }) => [
    (z * px - x * pz) / horizontal,
    (-x * y * px - z * y * pz) / horizontal + horizontal * py,
  ]);
}

function normalize(points: ScreenPoint[]) {
  const meanX = points.reduce((sum, [x]) => sum + x, 0) / points.length;
  const meanY = points.reduce((sum, [, y]) => sum + y, 0) / points.length;
  const centered = points.map(([x, y]) => [x - meanX, y - meanY] as const);
  const scale = Math.sqrt(centered.reduce((sum, [x, y]) => sum + x * x + y * y, 0) / points.length);
  return scale > 0 ? centered.map(([x, y]) => [x / scale, y / scale]) : [];
}

const reference = normalize(referenceProjection());

export function projectionError(points: ScreenPoint[], facing: number) {
  if (points.length !== reference.length || facing < 0.35) return Infinity;
  const normalized = normalize(points);
  if (normalized.length === 0) return Infinity;
  return Math.sqrt(normalized.reduce((sum, [x, y], index) => {
    const [rx, ry] = reference[index];
    return sum + (x - rx) ** 2 + (y - ry) ** 2;
  }, 0) / normalized.length);
}

export const projectionTolerance = 0.29;
