import test from 'node:test';
import assert from 'node:assert/strict';
import { OrthographicCamera, Vector3 } from 'three';
import { archiveCandidates, bridgeMidpoints, buildings, candidatePartitions, findCycles, links, matchesTopology, topologyCandidates, visibleLinks } from './src/element/layout.ts';
import {
  confirmAttempt, createElement, fragments, freshAttempt, matchesSelection, projectionRelations, recordExclusion, targetDirection, toggleBuilding, verifiedExclusions,
} from './src/element/puzzle.ts';

const passes = rules => Object.values(rules).every(Boolean);

test('перебор всех восьмёрок даёт четыре топологии и один архивный ответ', () => {
  const accepted = [];
  const topologies = [];
  let counted = 0;
  function visit(index, chosen) {
    if (chosen.length === 8) {
      counted++;
      if (matchesTopology(new Set(chosen))) topologies.push(chosen.join(''));
      if (matchesSelection(new Set(chosen))) accepted.push(chosen.join(''));
      return;
    }
    for (let i = index; i <= buildings.length - (8 - chosen.length); i++) {
      visit(i + 1, [...chosen, buildings[i].id]);
    }
  }
  visit(0, []);
  assert.equal(counted, 125970);
  assert.deepEqual(topologies, ['ABCDGHIJ', 'ABCDGIJK', 'ABDFGHIJ', 'ACDEGHIJ']);
  assert.deepEqual(accepted, ['ABCDGHIJ']);
  const conditions = ['factoryRoute', 'matchingOrder', 'differentRoofs'];
  let remaining = topologyCandidates;
  for (const [index, condition] of conditions.entries()) {
    assert.equal(topologyCandidates.filter(({ rules }) => !rules[condition]).length, 1);
    remaining = remaining.filter(({ rules }) => rules[condition]);
    assert.equal(remaining.length, 3 - index);
  }
});

test('граф содержит индуцированные циклы и переходы с разными концами', () => {
  assert.equal(buildings.map(site => site.id).join(''), 'ABCDEFGHIJKLMNOPQRST');
  const edges = links.map(pair => [...pair].sort().join(''));
  assert.equal(new Set(edges).size, links.length);
  assert.ok(links.every(pair => /^[A-T]{2}$/.test(pair) && pair[0] !== pair[1]));
  const cycles = findCycles();
  assert.equal(new Set(cycles.map(loop => loop.map(site => site.id).sort().join(''))).size, cycles.length);
  for (const cycle of cycles) {
    assert.equal(new Set(cycle).size, 4);
    assert.equal(visibleLinks(new Set(cycle.map(site => site.id))).length, 4);
  }
  for (const { west, east, bridges, key } of topologyCandidates) {
    assert.equal(new Set([...west, ...east]).size, 8);
    assert.equal(bridges.length, 2);
    assert.equal(new Set(bridges.flat()).size, 4);
    assert.equal(visibleLinks(new Set(key)).length, 10);
  }
  assert.ok(candidatePartitions.some(({ rules }) => !rules.transitionCount));
  assert.equal(matchesTopology(new Set(['AB', 'B', 'C', 'D', 'G', 'H', 'I', 'J'])), false);
});

test('ложный вариант допускается в архив, подлинный проходит до открытия элемента', () => {
  const initial = freshAttempt();
  assert.equal(confirmAttempt(initial), initial);
  const decoy = confirmAttempt({ ...initial, selected: [...'ABCDGIJK'] });
  assert.equal(decoy.stage, 'archive');
  assert.deepEqual(decoy.selected, [...'ABCDGIJK']);
  assert.equal(confirmAttempt(decoy), decoy);
  const corrected = toggleBuilding(toggleBuilding(decoy, 'K'), 'H');
  assert.equal(confirmAttempt(corrected), corrected);
  assert.equal(recordExclusion(decoy, 'factoryRoute'), decoy);
  const noted = recordExclusion(decoy, 'matchingOrder');
  assert.equal(recordExclusion(noted, 'matchingOrder'), noted);
  const second = recordExclusion({ ...noted, selected: [...'ABDFGHIJ'] }, 'differentRoofs');
  const third = recordExclusion({ ...second, selected: [...'ACDEGHIJ'] }, 'factoryRoute');
  assert.deepEqual(verifiedExclusions([...third.exclusions, 'ABCDGHIJ', 'garbage']), third.exclusions);
  const projection = confirmAttempt({ ...corrected, exclusions: third.exclusions });
  assert.equal(projection.stage, 'projection');
  assert.equal(confirmAttempt(projection), projection);
  assert.equal(toggleBuilding(projection, 'A'), projection);
  const complete = confirmAttempt(projection, passes(measuredAt(target)));
  assert.equal(complete.stage, 'complete');
  assert.deepEqual(complete.element, createElement());
  assert.deepEqual(freshAttempt(complete.element).element, complete.element);
});

test('направление перпендикулярно створу, смотрит со стороны фабрики и поднято на 30°', () => {
  const [a, b] = bridgeMidpoints(archiveCandidates[0]);
  const [x, y, z] = targetDirection;
  const plant = buildings.find(site => site.id === 'G');
  assert.ok(Math.abs(x * (b.x - a.x) + z * (b.z - a.z)) < 1e-10);
  assert.ok(x * (plant.x - a.x) + z * (plant.z - a.z) > 0);
  assert.ok(Math.abs(y - 0.5) < 1e-10);
  assert.ok(Math.abs(Math.hypot(x, y, z) - 1) < 1e-10);
});

function measuredAt(direction, zoom = 1, pan = new Vector3(), mirror = false) {
  const camera = new OrthographicCamera(-16, 16, 11, -11, 0.1, 100);
  camera.position.copy(direction).multiplyScalar(25).add(pan);
  camera.lookAt(pan);
  camera.zoom = zoom;
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld();
  const project = position => {
    const point = new Vector3(...position).project(camera);
    return [point.x * (mirror ? -32 : 32), point.y * 22];
  };
  return projectionRelations(fragments.map(({ center, points }) => ({
    center: project(center), points: points.map(project),
  })));
}

const target = new Vector3(...targetDirection);
const worldUp = new Vector3(0, 1, 0);
const right = new Vector3().crossVectors(worldUp, target).normalize();

test('проекция принимает близкие виды, перенос и изменение масштаба', () => {
  const variants = [
    target,
    ...[-1, 1].flatMap(sign => [worldUp, right].map(axis =>
      target.clone().applyAxisAngle(axis, sign * Math.PI / 18))),
  ];
  for (const direction of variants) {
    assert.ok(passes(measuredAt(direction)), JSON.stringify(measuredAt(direction)));
    assert.ok(passes(measuredAt(direction, 1.8, new Vector3(2, 1, 3))));
  }
});

test('отклоняет зеркальный, обратный, боковой и явно неверный вид', () => {
  assert.equal(passes(measuredAt(target, 1, new Vector3(), true)), false);
  for (const direction of [target.clone().negate(), right, target.clone().applyAxisAngle(worldUp, Math.PI / 3)]) {
    assert.equal(passes(measuredAt(direction)), false);
  }
});

test('выборка сферы отделяет частичные совпадения от общей области', () => {
  const partial = new Set();
  const wins = new Map();
  const individual = { ring: 0, axis: 0, core: 0 };
  let maxAngle = 0;
  for (let elevation = -87; elevation <= 87; elevation += 3) {
    for (let azimuth = 0; azimuth < 360; azimuth += 3) {
      const e = elevation * Math.PI / 180;
      const a = azimuth * Math.PI / 180;
      const direction = new Vector3(Math.cos(e) * Math.sin(a), Math.sin(e), Math.cos(e) * Math.cos(a));
      const relations = measuredAt(direction);
      if (relations.face) {
        for (const key of Object.keys(individual)) {
          if (relations[key]) individual[key]++;
        }
      }
      if (passes(relations)) {
        wins.set(elevation + ":" + azimuth, [elevation, azimuth]);
        maxAngle = Math.max(maxAngle, direction.angleTo(target));
      } else if (relations.face) {
        partial.add(['ring', 'axis', 'core'].filter(key => relations[key]).join(','));
      }
    }
  }
  assert.ok(wins.size > 20);
  const pending = new Map(wins);
  const queue = [pending.values().next().value];
  pending.delete(queue[0].join(':'));
  for (const [elevation, azimuth] of queue) {
    for (const [de, da] of [[0, 3], [0, -3], [3, 0], [-3, 0]]) {
      const key = [elevation + de, (azimuth + da + 360) % 360].join(':');
      if (pending.has(key)) {
        queue.push(pending.get(key));
        pending.delete(key);
      }
    }
  }
  assert.equal(pending.size, 0);
  assert.ok(Object.values(individual).every(count => count > wins.size * 1.2));
  assert.ok(maxAngle < Math.PI / 9);
  for (const key of ['ring', 'axis', 'core']) {
    assert.ok([...partial].some(pattern => pattern.split(',').includes(key)), [...partial].join(' | '));
    assert.ok([...partial].some(pattern => pattern.split(',').length === 2 && !pattern.split(',').includes(key)),
      [...partial].join(' | '));
  }
});

test('скрытие и возврат здания обновляют линии, сброс сохраняет элемент', () => {
  const element = JSON.parse(JSON.stringify(createElement()));
  const initial = freshAttempt(element);
  const links = visibleLinks(new Set(initial.selected));
  const hidden = toggleBuilding(initial, 'A');
  assert.equal(hidden.selected.includes('A'), false);
  assert.deepEqual(visibleLinks(new Set(hidden.selected)), links.filter(pair => !pair.includes('A')));
  assert.deepEqual(visibleLinks(new Set(toggleBuilding(hidden, 'A').selected)), links);
  const reset = freshAttempt(hidden.element);
  assert.equal(reset.selected.length, 20);
  assert.equal(reset.stage, 'selection');
  assert.deepEqual(reset.element, element);
});
