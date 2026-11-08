import test from 'node:test';
import assert from 'node:assert/strict';
import { matchesSelection } from './src/element/puzzle.ts';

test('проверка гипотезы принимает только один набор из двенадцати зданий', () => {
  const labels = [...'ABCDEFGHIJKL'];
  const accepted = [];
  for (let mask = 0; mask < 1 << labels.length; mask++) {
    const selection = labels.filter((_, index) => mask & (1 << index));
    if (matchesSelection(new Set(selection))) accepted.push(selection.join(''));
  }
  assert.deepEqual(accepted, ['GHIJ']);
});

import { OrthographicCamera, Vector3 } from 'three';
import {
  createElement, fragments, freshAttempt, projectionError, projectionTolerance, targetDirection, toggleBuilding,
} from './src/element/puzzle.ts';

function measuredAt(direction, zoom = 1, pan = new Vector3()) {
  const camera = new OrthographicCamera(-10, 10, 8, -8, 0.1, 100);
  camera.position.copy(direction).multiplyScalar(25).add(pan);
  camera.lookAt(pan);
  camera.zoom = zoom;
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld();
  const points = fragments.map(({ position }) => {
    const point = new Vector3(...position).project(camera);
    return [point.x * 20, point.y * 16];
  });
  return { points, facing: direction.dot(new Vector3(...targetDirection)) };
}

test('проверка допускает небольшой поворот, перенос и изменение масштаба', () => {
  const direction = new Vector3(...targetDirection);
  const turned = direction.clone().applyAxisAngle(new Vector3(0, 1, 0), Math.PI / 15);
  for (const view of [measuredAt(direction), measuredAt(turned), measuredAt(turned, 1.8, new Vector3(2, 1, 3))]) {
    assert.ok(projectionError(view.points, view.facing) <= projectionTolerance);
  }
});

test('проверка отклоняет обратный, боковой, зеркальный и явно неверный вид', () => {
  const direction = new Vector3(...targetDirection);
  const side = direction.clone().cross(new Vector3(0, 1, 0)).normalize();
  const targetView = measuredAt(direction);
  const wrong = direction.clone().applyAxisAngle(new Vector3(0, 1, 0), Math.PI / 3);
  for (const view of [
    measuredAt(direction.clone().negate()),
    measuredAt(side),
    measuredAt(wrong),
    { ...targetView, points: targetView.points.map(([x, y]) => [-x, y]) },
  ]) {
    assert.ok(projectionError(view.points, view.facing) > projectionTolerance);
  }
});

test('скрытое здание возвращается, а сброс сохраняет открытый элемент', () => {
  const element = JSON.parse(JSON.stringify(createElement()));
  const initial = freshAttempt(element);
  const hidden = toggleBuilding(initial, 'A');
  assert.equal(hidden.selected.includes('A'), false);
  assert.equal(toggleBuilding(hidden, 'A').selected.includes('A'), true);
  const reset = freshAttempt(hidden.element);
  assert.equal(reset.selected.length, 12);
  assert.equal(reset.stage, 'selection');
  assert.deepEqual(reset.element, element);
  assert.ok(reset.element.parts.length > 1);
});
