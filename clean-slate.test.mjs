import assert from 'node:assert/strict';
import {test} from 'node:test';
import {initial, apply, replay} from './src/clean-slate/puzzle.ts';

const setup = ['fuse', 'power', 'hatch'];
const route = [4, 3, 0, 1, 2, 5, 4, 3, 0, 1, 4, 3, 0, 1, 2, 5];
const goal = ['P', 'D', 'L', 'U', 'A', null];

test('Дамми восстанавливает шину за 16 сдвигов и запускает протокол один раз', () => {
  assert.deepEqual(initial.modules, ['P', 'A', 'U', 'L', 'D', null]);
  for (const action of ['power', 'hatch', 4, 'key']) {
    assert.equal(typeof apply(initial, action), 'string');
  }
  const open = replay(setup);
  assert.equal(open.power, 'BACKUP');
  assert.equal(open.open, true);
  assert.equal(typeof apply(open, 0), 'string');
  assert.equal(typeof apply(open, 'rotate'), 'string');
  assert.equal(typeof apply(replay([...setup, ...route.slice(0, 7)]), 1), 'string');
  assert.deepEqual(replay([...setup, 4, 5]), open);
  const assembled = replay([...setup, ...route]);
  assert.deepEqual(assembled.modules, goal);
  for (const action of ['hatch', 'power', 'key']) {
    assert.equal(typeof apply(assembled, action), 'string');
  }
  const history = [...setup, ...route, 'rotate', 'hatch', 'power', 'key'];
  const finished = replay(history);
  assert.equal(finished.power, 'MAIN');
  assert.equal(finished.open, false);
  assert.equal(finished.left, true);
  assert.equal(finished.complete, true);
  assert.equal(typeof apply(finished, 'key'), 'string');
  assert.equal(replay(history.slice(0, -1)).complete, false);
  assert.deepEqual(replay([...history, 'reset']), initial);
});
