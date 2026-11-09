type Roof = 'dome' | 'spire' | 'amber' | 'split';
type Building = { id: string; x: number; z: number; roof: Roof; height: number };
type PlanPoint = { x: number; z: number };

export const buildings: Building[] = [
  { id: 'A', x: -9.7, z: -3, roof: 'dome', height: 1.5 },
  { id: 'B', x: -3, z: -4, roof: 'spire', height: 1.7 },
  { id: 'C', x: -3.9, z: 2.6, roof: 'split', height: 1.6 },
  { id: 'D', x: -8, z: 4.45, roof: 'amber', height: 1.4 },
  { id: 'E', x: -5.5, z: -7.7, roof: 'spire', height: 1.5 },
  { id: 'F', x: -1.25, z: 6.3, roof: 'split', height: 1.3 },
  { id: 'G', x: 3, z: -4, roof: 'dome', height: 1.85 },
  { id: 'H', x: 9.4, z: -2.8, roof: 'spire', height: 1.6 },
  { id: 'I', x: 8, z: 5.7, roof: 'split', height: 1.8 },
  { id: 'J', x: 3, z: 3.4, roof: 'amber', height: 1.5 },
  { id: 'K', x: 7, z: -7, roof: 'amber', height: 1.2 },
  { id: 'L', x: -12, z: -5.4, roof: 'spire', height: 1.35 },
  { id: 'M', x: -12, z: 0.5, roof: 'amber', height: 1.3 },
  { id: 'N', x: -12, z: 5.2, roof: 'dome', height: 1.25 },
  { id: 'O', x: -8, z: 7.5, roof: 'amber', height: 1.4 },
  { id: 'P', x: 1.8, z: 7.5, roof: 'spire', height: 1.45 },
  { id: 'Q', x: 6, z: 7.5, roof: 'dome', height: 1.2 },
  { id: 'R', x: 12, z: 5, roof: 'amber', height: 1.25 },
  { id: 'S', x: 12, z: 0, roof: 'dome', height: 1.35 },
  { id: 'T', x: 12, z: -6.3, roof: 'split', height: 1.5 },
];

export const factory = 'G';
export const carousel = { x: -6.5, z: 0 };
export const swings = { x: 6, z: 0 };
export const fence = { x: 0, start: -7.35, gateStart: -4.7, gateEnd: -3.2, end: 1.8 };
export const links = [
  'AB', 'BC', 'CD', 'DA', 'AE', 'EC', 'BF', 'FD',
  'GH', 'HI', 'IJ', 'JG', 'GK', 'KI',
  'BG', 'EG', 'CJ', 'FI', 'EK',
  'AM', 'CM', 'MH', 'AL', 'LB', 'LD', 'LM', 'MN', 'ND', 'NO', 'OF', 'FP', 'PQ', 'IR', 'RS', 'ST', 'TK', 'HS',
];

const edge = (a: string, b: string) => [a, b].sort().join('');
const edges = new Set(links.map(([a, b]) => edge(a, b)));
const connected = (a: Building, b: Building) => edges.has(edge(a.id, b.id));

function orientation(a: PlanPoint, b: PlanPoint, c: PlanPoint) {
  return (b.x - a.x) * (c.z - a.z) - (b.z - a.z) * (c.x - a.x);
}

function segmentsMeet(a: PlanPoint, b: PlanPoint, c: PlanPoint, d: PlanPoint) {
  return Math.max(Math.min(a.x, b.x), Math.min(c.x, d.x)) <= Math.min(Math.max(a.x, b.x), Math.max(c.x, d.x)) &&
    Math.max(Math.min(a.z, b.z), Math.min(c.z, d.z)) <= Math.min(Math.max(a.z, b.z), Math.max(c.z, d.z)) &&
    orientation(a, b, c) * orientation(a, b, d) <= 0 &&
    orientation(c, d, a) * orientation(c, d, b) <= 0;
}

function sides(sites: Building[]) {
  return sites.map((site, index) => [site, sites[(index + 1) % sites.length]] as const);
}

function inside(sites: Building[], point: PlanPoint) {
  let crossings = 0;
  for (const [a, b] of sides(sites)) {
    if (segmentsMeet(a, b, point, point)) return false;
    if ((a.z > point.z) !== (b.z > point.z) &&
      point.x < a.x + (b.x - a.x) * (point.z - a.z) / (b.z - a.z)) crossings++;
  }
  return crossings % 2 === 1;
}

function findCycles() {
  const cycles: Building[][] = [];
  for (const a of buildings) for (const b of buildings) {
    if (b.id <= a.id || !connected(a, b)) continue;
    for (const c of buildings) {
      if (c.id <= a.id || c === b || !connected(b, c) || connected(a, c)) continue;
      for (const d of buildings) {
        if (d.id <= b.id || d === c || !connected(c, d) || !connected(d, a) || connected(b, d)) continue;
        if (segmentsMeet(a, b, c, d) || segmentsMeet(b, c, d, a)) continue;
        const loop = [a, b, c, d];
        if (sides(loop).some(([first, second], index) => orientation(first, second, loop[(index + 2) % 4]) === 0)) continue;
        const area = sides(loop).reduce((sum, [p, q]) => sum + p.x * q.z - q.x * p.z, 0);
        cycles.push(area > 0 ? loop : loop.reverse());
      }
    }
  }
  return cycles;
}

function roofSequence(loop: Building[]) {
  const dome = loop.findIndex(site => site.roof === 'dome');
  if (dome < 0 || loop.filter(site => site.roof === 'dome').length !== 1 ||
    loop.filter(site => site.roof === 'split').length !== 1 ||
    loop[(dome + 2) % 4].roof !== 'split') return '';
  return [...loop.slice(dome), ...loop.slice(0, dome)].map(site => site.roof).join('/');
}

function fenceCrossing(a: Building, b: Building) {
  if ((a.x < fence.x) === (b.x < fence.x)) return undefined;
  return a.z + (b.z - a.z) * (fence.x - a.x) / (b.x - a.x);
}


const cycles = findCycles();
const validSelections = new Set<string>();

// Перебираем все простые индуцированные циклы, затем все допустимые пары.
export const candidatePartitions = cycles.filter(loop => inside(loop, carousel)).flatMap(west =>
  cycles.filter(loop => inside(loop, swings)).flatMap(east => {
    if (west.some(site => east.includes(site)) || inside(west, swings) || inside(east, carousel) ||
      sides(west).some(([a, b]) => sides(east).some(([c, d]) => segmentsMeet(a, b, c, d)))) return [];
    const bridges = west.flatMap(a => east.filter(b => connected(a, b)).map(b => [a, b] as const));
    const transitionCount = bridges.length === 2 && new Set(bridges.flat()).size === 4;
    const gate = bridges.find(([a, b]) => {
      const z = fenceCrossing(a, b);
      return b.id === factory && z !== undefined && z > fence.gateStart && z < fence.gateEnd;
    });
    const factoryRoute = Boolean(gate && bridges.some(pair => {
      const z = fenceCrossing(...pair);
      return pair !== gate && z !== undefined && (z < fence.start || z > fence.end);
    }));
    const leftRoof = roofSequence(west);
    const rightRoof = roofSequence(east);
    const rules = {
      transitionCount,
      factoryRoute,
      roofTypes: Boolean(leftRoof && rightRoof),
      matchingOrder: Boolean(leftRoof && leftRoof === rightRoof),
      differentRoofs: bridges.every(([a, b]) => a.roof !== b.roof),
    };
    const key = [...west, ...east].map(site => site.id).sort().join('');
    if (Object.values(rules).every(Boolean)) validSelections.add(key);
    return [{ key, rules }];
  }),
);

export function matchesSelection(selected: ReadonlySet<string>) {
  return selected.size === 8 && validSelections.has([...selected].sort().join(''));
}

export const visibleLinks = (selected: ReadonlySet<string>) =>
  links.filter(([a, b]) => selected.has(a) && selected.has(b));



