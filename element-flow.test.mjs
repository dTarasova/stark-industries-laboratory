import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import * as THREE from 'three';
import {laboratory} from './server.mjs';

test('Финальная сборка элемента в открываемом эксперименте переводит миссию к защите Земли', async () => {
 const server=laboratory({database:':memory:',password:'test-password-only-123',edithCode:'edith'});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const base=`http://127.0.0.1:${server.address().port}/api/`;
 const post=(path,body)=>fetch(base+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
 try {
  await post('edith',{code:'edith'});
  const mission=await (await fetch(base+'mission')).json();
  let completion;
  const source=readFileSync(new URL('./prototype_v2/scene.js',import.meta.url),'utf8');
  const start=source.indexOf('function animateAssembly(time)');
  const end=source.indexOf('\nconst hints=',start);
  assert.ok(start>=0 && end>start);
  const context={
   THREE, assembly:{start:0,turn:new THREE.Quaternion(),aim:new THREE.Vector3(),from:new THREE.Vector3(),zoom:1,positions:[]},
   controls:{target:new THREE.Vector3()},camera:new THREE.OrthographicCamera(),
   atomCenter:new THREE.Vector3(),projectionGroup:new THREE.Group(),targetViewingDirection:new THREE.Vector3(),
   scene:new THREE.Group(),mat:()=>new THREE.MeshBasicMaterial(),$:()=>({}),
   stepDisplay(){},updateView(){},setStatus(){},
   reportElementComplete(){completion=post('element-complete',{version:mission.version,missionRun:mission.missionRun});},
  };
  runInNewContext(source.slice(start,end)+'\nanimateAssembly(Infinity);',context);
  assert.ok(completion,'Фактический эксперимент должен передать завершение в общую миссию');
  assert.equal((await completion).status,200);
  const next=await (await fetch(base+'mission')).json();
  assert.equal(next.stage,3);
  assert.equal(next.elementDiscovered,1);
  assert.equal(next.defenseAuthorized,0,'Физическое испытание подтверждает ведущая');
 } finally {await new Promise(resolve=>server.close(resolve));}
});
