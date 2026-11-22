import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyRoute,simulate} from './src/timeline/engine.ts';
import {epilogues,selectEpilogues} from './src/timeline/epilogues.ts';

const route=letters=>({...emptyRoute(),choices:Object.fromEntries(['01','02','03','04','05','05P','06','07','08','09','11'].map((id,i)=>[id,letters[i]]))});
const available=r=>epilogues.filter(e=>e.available(r.choices,simulate(r))).map(e=>e.id);

test('эпилоги открываются только событиями завершённых маршрутов',()=>{
 const r=route('АБААААГБВВБ');
 assert.deepEqual(available(r),['J04','J08','J10','J11']);
 assert.deepEqual(new Set(selectEpilogues([r],new Set())),new Set(available(r)));
});
test('ABBA различает отвлечение Тором и другим участником, Вижен требует успешного создания',()=>{
 const r=route('БГББААААААА');
 assert.ok(available(r).includes('J02'));
 assert.ok(!available(r).includes('J03'));
 assert.ok(!available(r).includes('J08'));
 r.choices['06']='Б';
 assert.ok(!available(r).includes('J02'));
 assert.ok(available(r).includes('J03'));
 assert.ok(available(r).includes('J05'));
});
test('четыре случайных эпилога без дублей, новые имеют приоритет над показанными',()=>{
 const routes=[route('АБААААГБВВБ'),route('ВГБАААААААА')];
 const unlocked=new Set(routes.flatMap(available));
 const unseen=['J02','J06','J07','J13'];
 const seen=new Set([...unlocked].filter(id=>!unseen.includes(id)));
 const selected=selectEpilogues(routes,seen,()=>0);
 assert.equal(selected.length,4);
 assert.equal(new Set(selected).size,4);
 assert.deepEqual(new Set(selected),new Set(unseen));
 assert.notDeepEqual(selectEpilogues(routes,new Set(),()=>0),selectEpilogues(routes,new Set(),()=>.99));
});
test('не подставляет закрытые эпилоги, если подходящих меньше четырёх',()=>{
 const r=route('АВВАААДБВВА');
 const selected=selectEpilogues([r],new Set());
 assert.ok(selected.length<4);
 assert.deepEqual(new Set(selected),new Set(available(r)));
 assert.deepEqual(selectEpilogues([],new Set()),[]);
});
