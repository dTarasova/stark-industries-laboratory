import {test} from 'node:test';
import assert from 'node:assert/strict';
import {missionAchievements} from './src/missionAchievements.ts';

test('Достижения появляются по хронологии и остаются на последующих этапах', () => {
 for (let stage=0;stage<=8;stage++) {
  // Даже сохранённые флаги не должны раскрывать будущие достижения.
  assert.deepEqual(missionAchievements({stage,elementDiscovered:1,timelineFound:1,victory:1}), {
   elementDiscovered:stage>=3,planetaryDefense:stage>=4,timelineFound:stage>=6,victory:stage>=8,
  });
 }
});

test('Этап не подменяет подтверждение результата элемента, временной линии и Clean Slate', () => {
 assert.deepEqual(missionAchievements({stage:8,elementDiscovered:0,timelineFound:0,victory:0}), {
  elementDiscovered:false,planetaryDefense:true,timelineFound:false,victory:false,
 });
});
