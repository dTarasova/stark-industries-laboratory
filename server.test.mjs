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

test('Защита запускается один раз после допуска, а резервный канал открывает ведущая', async ({mock}) => {
 mock.timers.enable({apis: ['Date']});
 const server = laboratory({database: ':memory:', password: 'test-password-only-123'});
 await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
 const base = 'http://127.0.0.1:' + server.address().port + '/api/';
 const post = (path, body, cookie = '') => fetch(base + path, {
  method: 'POST', headers: {'Content-Type': 'application/json', cookie}, body: JSON.stringify(body),
 });
 try {
  const login = await post('login', {password: 'test-password-only-123'});
  const cookie = login.headers.get('set-cookie').split(';')[0];
  assert.equal((await post('mission', {stage: 3, version: 0}, cookie)).status, 200);
  assert.equal((await post('activate-defense', {version: 1})).status, 409);
  assert.equal((await post('authorize-defense', {version: 1})).status, 401);
  assert.equal((await post('authorize-defense', {version: 1}, cookie)).status, 200);
  const attempts = await Promise.all([post('activate-defense', {version: 2}), post('activate-defense', {version: 2})]);
  assert.deepEqual(attempts.map(response => response.status).sort(), [200, 409]);
  const mission = await (await fetch(base + 'mission')).json();
  assert.equal(mission.stage, 4);
  assert.ok(mission.takeoverEndsAt > mission.serverTime);
  assert.equal((await post('open-recovery', {version: 3})).status, 401);
  assert.equal((await post('open-recovery', {version: 3}, cookie)).status, 409);
  mock.timers.tick(45_000);
  const locked = await (await fetch(base + 'mission')).json();
  assert.equal(locked.stage, 4);
  assert.equal(locked.takeoverEndsAt, mission.takeoverEndsAt);
  const recovery = await post('open-recovery', {version: 3}, cookie);
  assert.equal(recovery.status, 200);
  assert.equal((await recovery.json()).stage, 5);
 } finally {
  await new Promise(resolve => server.close(resolve));
 }
});

test('EDITH открывает разработку для общей миссии и сохраняет допуск', async () => {
 const dir = mkdtempSync(join(tmpdir(), 'surkov-edith-'));
 const options = {
  database: join(dir, 'mission.sqlite'),
  password: 'test-admin-password-123',
  edithCode: 'test-edith',
 };
 let server;
 async function start() {
  server = laboratory(options);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  return 'http://127.0.0.1:' + server.address().port;
 }
 try {
  let url = await start();
  const mission = async () => (await fetch(url + '/api/mission')).json();
  const post = (path, body) => fetch(url + '/api/' + path, {
   method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(body),
  });
  const initial = await mission();
  assert.equal(initial.edithUnlocked, false);
  const legacyPage = await fetch(url + '/prototype/index.html', {redirect: 'manual'});
  assert.equal(legacyPage.status, 302);
  assert.equal(legacyPage.headers.get('location'), '/development');
  assert.equal((await post('edith', {code: 'wrong'})).status, 422);
  assert.equal((await mission()).edithUnlocked, false);
  assert.equal((await post('edith', {code: options.edithCode})).status, 200);
  assert.equal((await mission()).stage, initial.stage);
  const unlocked = await mission();
  assert.equal(unlocked.edithUnlocked, true);
  assert.equal((await post('edith', {code: options.edithCode})).status, 200);
  assert.equal((await mission()).version, unlocked.version);
  assert.equal((await post('mission', {stage: 2, version: initial.version})).status, 401);
  await new Promise(resolve => server.close(resolve));
  url = await start();
  assert.equal((await mission()).edithUnlocked, true);
 } finally {
  if (server?.listening) await new Promise(resolve => server.close(resolve));
  rmSync(dir, {recursive: true});
 }
});
