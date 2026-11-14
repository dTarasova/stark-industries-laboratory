import assert from 'node:assert/strict';
import test from 'node:test';
import {emptyRoute,simulate,validate,normalize,restore} from './src/timeline/engine.ts';
const route=(letters='АБААААГБВВБ')=>({...emptyRoute(),choices:Object.fromEntries(['01','02','03','04','05','05P','06','07','08','09','11'].map((id,i)=>[id,letters[i]]))});
test('V8: безопасный Вижен и спасённый город дают идеал',()=>{const s=simulate(route());assert.equal(s.ending,'F6');assert.equal(s.time,4);assert.equal(s.power,1);assert.equal(s.saved.length,4);assert.equal(s.destroyed.length,0);});
test('Ванда зависит от переговоров; захват колыбели даёт F1',()=>{const s=simulate(route('ББАБААВБВАБ'));assert.equal(s.wanda,'enemy');assert.equal(s.taken,true);assert.equal(s.ending,'F1');assert.ok(s.anomalies.includes('A01'));});
test('резервирование всегда стоит время и боеготовность; неудача сохраняет данные',()=>{const s=simulate(route('АБААБАВБВАБ'));assert.equal(s.vision,false);assert.equal(s.data,true);assert.equal(s.time,0);assert.equal(s.power,3);});
test('созданный ответственный Вижен предаёт после успешной операции',()=>{assert.equal(simulate(route('АБАААБВБВАА')).ending,'F4');});
test('подключение протоколов Тони без Вижена вызывает F2',()=>{const s=simulate(route('ББАВБАВБВВВ'));assert.equal(s.vision,false);assert.equal(s.hacked,true);assert.equal(s.ending,'F2');});
test('Сомнение предотвращает позднюю контратаку',()=>{assert.equal(simulate(route()).destroyed.length,0);assert.equal(simulate(route('АБАААВГБВВБ')).destroyed.length,1);});
test('перехват Роуди работает без расхода ракеты',()=>{const s=simulate(route('АБААБАВБВАА'));const before=s.log.find(l=>l.event==='08');const after=s.log.find(l=>l.event==='09-0');assert.equal(after.power-before.power,1);});
test('редактирование сохраняет совместимые решения, неизвестный ответ удаляется',()=>{const r=route();r.choices['01']='Г';assert.equal(normalize(r).choices['11'],'Б');r.choices['07']='Д';assert.ok(validate(normalize(r)).some(x=>x.includes('07')));});
test('приоритеты должны быть перестановками',()=>{const r=route();r.losses=[0,0,2,3];assert.throws(()=>simulate(r),/каждый район/);});
test('сохранение восстанавливает маршрут и открытые карточки',()=>{const r=route();const entry={id:'1',date:'2026-11-14',route:r,result:simulate(r)};const s=restore(JSON.stringify({version:1,route:r,archive:[entry],screen:'consequences',opened:['01']}));assert.deepEqual(s.archive[0].result,entry.result);assert.deepEqual(s.opened,['01']);assert.equal(restore('{broken').screen,'intro');assert.equal(restore('{"version":2}').archive.length,0);});

test('авария Тора под куполом блокирует обычный жилой маршрут, Пьетро спасает его отдельно',()=>{const r=route('АААААААБВБА');const s=simulate(r);assert.equal(s.thorBroken,true);assert.ok(s.destroyed.includes(2));assert.ok(s.destroyed.includes(3));assert.ok(!s.saved.includes(0));r.choices['02']='Б';assert.ok(simulate(r).saved.includes(0));});
test('Casta Diva сохраняет здания при эвакуации Халком',()=>{const r=route();r.choices['03']='В';r.choices['08']='Б';r.choices['09']='А';const s=simulate(r);assert.ok(s.saved.includes(0));assert.ok(!s.destroyed.includes(0));});
test('порог купола позволяет победу при отрицательной боеготовности',()=>{const s=simulate(route('АББААААБВБА'));assert.equal(s.battle,true);assert.ok(s.power<0);assert.ok(s.anomalies.includes('A06'));});

