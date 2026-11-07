import {test} from 'node:test';
import assert from 'node:assert/strict';
import {laboratory} from './server.mjs';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
test('Общая миссия, защита и сохранение после перезапуска',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'surkov-'));const options={database:join(dir,'mission.sqlite'),password:'test-password-only-123'};
 let server=laboratory(options);await new Promise(r=>server.listen(0,'127.0.0.1',r));let url=`http://127.0.0.1:${server.address().port}`;
 const post=(path,body,cookie='')=>fetch(url+'/api/'+path,{method:'POST',headers:{'Content-Type':'application/json',cookie},body:JSON.stringify(body)});
 try{
 assert.equal((await post('mission',{stage:1,version:0})).status,401);
 assert.equal((await post('login',{password:'EDITH'})).status,401);
 const login=await post('login',{password:options.password});const cookie=login.headers.get('set-cookie').split(';')[0];
 assert.equal((await post('mission',{stage:2,version:0},cookie)).status,200);
 assert.equal((await post('mission',{stage:3,version:0},cookie)).status,409);
 for(let i=0;i<2;i++)assert.equal((await(await fetch(url+'/api/mission')).json()).stage,2);
 assert.equal((await post('mission',{stage:99,version:1},cookie)).status,400);
 assert.equal((await post('badge',{badge:1,active:true,version:1})).status,401);
 assert.equal((await post('badge',{badge:4,active:true,version:1},cookie)).status,400);
 assert.deepEqual(await (await post('badge',{badge:1,active:true,version:1},cookie)).json(), {stage:2,version:2,badges:2});
 assert.equal((await post('badge',{badge:0,active:true,version:1},cookie)).status,409);
 assert.deepEqual(await (await post('badge',{badge:3,active:true,version:2},cookie)).json(), {stage:2,version:3,badges:10});
 assert.deepEqual(await (await post('badge',{badge:1,active:false,version:3},cookie)).json(), {stage:2,version:4,badges:8});
 await new Promise(r=>server.close(r));server=laboratory(options);await new Promise(r=>server.listen(0,'127.0.0.1',r));url=`http://127.0.0.1:${server.address().port}`;
 const restored=await (await fetch(url+'/api/mission')).json();
 assert.equal(restored.stage,2);
 assert.equal(restored.badges,8);
 assert.equal((await post('mission',{stage:3,version:4},cookie)).status,401);
 }finally{if(server.listening) await new Promise(r=>server.close(r));rmSync(dir,{recursive:true});}
});
