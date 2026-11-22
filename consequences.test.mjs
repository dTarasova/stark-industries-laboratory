import assert from 'node:assert/strict';
import test from 'node:test';
import {consequenceText} from './src/timeline/consequences.ts';
import {emptyRoute,simulate} from './src/timeline/engine.ts';
const route=()=>({...emptyRoute(),choices:Object.fromEntries(['01','02','03','04','05','05P','06','07','08','09','11'].map((id,i)=>[id,'АБААААГБВВБ'[i]]))});
const text=(r,id)=>{const log=simulate(r).log;return consequenceText(r,log.find(e=>e.event===id),log).dialogue;};
test('Ванда получает только реплики подходящего переговорщика',()=>{
 const replies={
  'А':'Ты говорил ему то же самое',
  'Б':'Ты создал Альтрона',
  'В':'Но эти данные не лгут',
  'Г':'А что осталось за кадром',
 };
 for(const [negotiator,reply] of Object.entries(replies)) {
  const r=route();r.choices['01']=negotiator;
  const dialogue=text(r,'04');
  assert.ok(dialogue.includes(reply));
  for(const other of Object.values(replies).filter(value=>value!==reply)) assert.ok(!dialogue.includes(other));
  assert.doesNotMatch(dialogue,/Проверь|СТАТУС/);
 }
});
test('Тор и Халк раскрывают только выбранную музыкальную ветку',()=>{const r=route();r.choices['06']='А';assert.match(text(r,'06'),/НАША система/);r.choices['03']='Б';assert.match(text(r,'06'),/КОРОЛЕВСКИЕ/);assert.doesNotMatch(text(r,'06'),/НАША система/);r.choices['08']='Б';r.choices['03']='В';assert.match(text(r,'08'),/парковаться/);assert.doesNotMatch(text(r,'08'),/Дороги больше нет/);});
test('Последствия не показывают универсальный отчёт и инструкции ведущей',()=>{const r=route(),log=simulate(r).log;for(const event of log){const t=consequenceText(r,event,log).dialogue;assert.ok(t.length);assert.doesNotMatch(t,/Отчёт по операции готов|Проверь|Отметь|ведущая|СПОСОБНОСТЬ/);}});
