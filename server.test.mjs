import {test} from 'node:test';
import assert from 'node:assert/strict';
import {laboratory} from './server.mjs';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
test('Пульт восстанавливает вход по cookie и получает свежую миссию', async () => {
 const server=laboratory({database:':memory:',password:'test-password-only-123'});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const base=`http://127.0.0.1:${server.address().port}/api/`;
 const post=(path,body,cookie='')=>fetch(base+path,{method:'POST',headers:{'Content-Type':'application/json',cookie},body:JSON.stringify(body)});
 const get=cookie=>fetch(base+'control-state',{headers:{cookie}});
 try {
  const anonymous=await get('');
  assert.equal(anonymous.status,200);
  assert.equal((await anonymous.json()).authenticated,false);
  const login=await post('login',{password:'test-password-only-123'});
  const cookie=login.headers.get('set-cookie').split(';')[0];
  const restored=await get(cookie);
  assert.equal(restored.headers.get('Cache-Control'),'no-store');
  const initial=await restored.json();
  assert.equal(initial.authenticated,true);
  assert.equal((await post('mission',{stage:1,version:initial.mission.version},cookie)).status,200);
  assert.equal((await post('edith',{code:'not-configured'})).status,503);
  const updated=await (await get(cookie)).json();
  assert.equal(updated.authenticated,true);
  assert.equal(updated.mission.stage,1);
  assert.ok(updated.mission.version>initial.mission.version);
  await post('logout',{},cookie);
  assert.equal((await (await get(cookie)).json()).authenticated,false);
  assert.equal((await (await get('session=invalid')).json()).authenticated,false);
 } finally {await new Promise(resolve=>server.close(resolve));}
});

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

test('Ведущая может показать резервный канал после монолога, не дожидаясь двух минут', async ({mock}) => {
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
  assert.equal(mission.takeoverDuration, 60_000);
  mock.timers.tick(59_999);
  assert.equal((await post('open-recovery', {version: 3}, cookie)).status, 409);
  mock.timers.tick(1);
  const locked = await (await fetch(base + 'mission')).json();
  assert.equal(locked.stage, 4);
  assert.equal(locked.version, 3);
  assert.equal(locked.takeoverEndsAt, mission.takeoverEndsAt);
  mock.timers.tick(60_000);
  assert.equal((await (await fetch(base + 'mission')).json()).stage, 4);
  const recovery = await post('open-recovery', {version: 3}, cookie);
  assert.equal(recovery.status, 200);
  assert.equal((await recovery.json()).stage, 5);
  assert.equal((await post('open-recovery', {version: 3}, cookie)).status, 409);
 } finally {
  await new Promise(resolve => server.close(resolve));
 }
});

test('Резервный канал доступен через две минуты после полного текста и сохраняется после перезапуска', async ({mock}) => {
 mock.timers.enable({apis: ['Date']});
 const dir = mkdtempSync(join(tmpdir(), 'surkov-recovery-'));
 const options = {database: join(dir, 'mission.sqlite'), password: 'test-password-only-123'};
 let server;
 let base;
 const start = async () => {
  server = laboratory(options);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${server.address().port}/api/`;
 };
 const get = async () => (await fetch(base + 'mission')).json();
 const post = (path, body, cookie = '') => fetch(base + path, {
  method: 'POST', headers: {'Content-Type': 'application/json', cookie}, body: JSON.stringify(body),
 });
 try {
  await start();
  const cookie = (await post('login', {password: options.password})).headers.get('set-cookie').split(';')[0];
  await post('mission', {stage: 3, version: 0}, cookie);
  await post('authorize-defense', {version: 1}, cookie);
  await post('activate-defense', {version: 2});
  mock.timers.tick(158_000 - 1);
  assert.equal((await get()).stage, 4);
  await new Promise(resolve => server.close(resolve));
  await start();
  assert.equal((await get()).stage, 4);
  mock.timers.tick(1);
  const available = await get();
  assert.equal(available.stage, 5);
  assert.equal(available.version, 4);
  assert.equal((await get()).version, 4);
  await new Promise(resolve => server.close(resolve));
  await start();
  assert.equal((await get()).stage, 5);
 } finally {
  if (server?.listening) await new Promise(resolve => server.close(resolve));
  rmSync(dir, {recursive: true});
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
  assert.equal((await mission()).stage, 2);
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


test('Обе ветки сквозного сценария сохраняют достижения и защищены версией', async () => {
 for (const codeforces of [false,true]) {
  const server=laboratory({database:':memory:',password:'test-password-only-123',edithCode:'edith'});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const base='http://127.0.0.1:'+server.address().port+'/api/';
  const post=(path,body,cookie='')=>fetch(base+path,{method:'POST',headers:{'Content-Type':'application/json',cookie},body:JSON.stringify(body)});
  const get=async()=>(await fetch(base+'mission')).json();
  try {
   const login=await post('login',{password:'test-password-only-123'});
   const cookie=login.headers.get('set-cookie').split(';')[0];
   await post('edith',{code:'edith'});
   let m=await get();
   const completion={version:m.version,missionRun:m.missionRun};
   assert.equal((await post('element-complete',completion)).status,200);
   assert.equal((await post('element-complete',completion)).status,409);
   m=await get();
   assert.equal(m.elementDiscovered,1);
   await post('mission',{stage:5,version:m.version},cookie);
   m=await get();
   assert.equal(m.timelineFound,0);
   assert.equal((await post('confirm-timeline',{version:m.version,codeforces},cookie)).status,200);
   m=await get();
   assert.equal(m.stage,6);
   await post('continue-timeline',{version:m.version,missionRun:m.missionRun});
   m=await get();
   if(codeforces) {
    assert.equal((await post('clean-slate-complete',{version:m.version,missionRun:m.missionRun})).status,409);
    await post('confirm-ultron-battle',{version:m.version},cookie);
    m=await get();
   }
   assert.equal((await post('clean-slate-complete',{version:m.version,missionRun:m.missionRun})).status,200);
   m=await get();
   assert.equal(m.stage,8);
   assert.equal(m.victory,1);
   assert.equal(m.timelineFound,1);
   await post('mission',{stage:0,version:m.version},cookie);
   assert.equal((await get()).victory,0);
  } finally {await new Promise(resolve=>server.close(resolve));}
 }
});

test('Cloudflare: лимит входа доверяет IP только от заданного прокси', async () => {
 for (const trustedProxy of ['', '127.0.0.1']) {
  const server = laboratory({database: ':memory:', password: 'test-password-only-123', secure: true, trustedProxy});
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const login = (ip, password = 'wrong') => fetch(`http://127.0.0.1:${server.address().port}/api/login`, {
   method: 'POST', headers: {'Content-Type': 'application/json', 'CF-Connecting-IP': ip}, body: JSON.stringify({password}),
  });
  try {
   for (let i = 0; i < 5; i++) assert.equal((await login('203.0.113.1')).status, 401);
   assert.equal((await login('203.0.113.1')).status, 429);
   const other = await login('2001:db8::1', 'test-password-only-123');
   assert.equal(other.status, trustedProxy ? 200 : 429);
   if (trustedProxy) {
    assert.match(other.headers.get('set-cookie'), /; Secure/);
    for (let i = 0; i < 5; i++) assert.equal((await login('invalid')).status, 401);
    assert.equal((await login('also-invalid')).status, 429);
   }
  } finally { await new Promise(resolve => server.close(resolve)); }
 }
});

test('Аварийные этапы восстанавливают открытия, Restart очищает миссию и отвергает старое завершение', async () => {
 const server=laboratory({database:':memory:',password:'test-password-only-123'});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const base=`http://127.0.0.1:${server.address().port}/api/`;
 const post=(path,body,cookie='')=>fetch(base+path,{method:'POST',headers:{'Content-Type':'application/json',cookie},body:JSON.stringify(body)});
 const get=async()=>(await fetch(base+'mission')).json();
 try {
  const login=await post('login',{password:'test-password-only-123'});const cookie=login.headers.get('set-cookie').split(';')[0];
  assert.equal((await post('restart',{version:0})).status,401);
  await post('mission',{stage:2,version:0},cookie);
  let m=await get();assert.equal(m.edithUnlocked,true);assert.equal(m.elementDiscovered,0);
  assert.equal((await post('element-complete',{version:m.version,missionRun:m.missionRun})).status,200);
  m=await get();assert.equal(m.elementDiscovered,1);
  await post('mission',{stage:8,version:m.version},cookie);m=await get();assert.equal(m.victory,1);
  await post('mission',{stage:5,version:m.version},cookie);m=await get();
  assert.equal(m.elementDiscovered,1);assert.equal(m.timelineFound,0);assert.equal(m.victory,0);assert.deepEqual(m.recoveryHints,[]);
  await post('mission',{stage:1,version:m.version},cookie);m=await get();assert.equal(m.edithUnlocked,false);assert.equal(m.elementDiscovered,0);
  await post('badge',{badge:0,active:true,version:m.version},cookie);m=await get();
  const oldRun=m.missionRun;
  assert.equal((await post('restart',{version:m.version},cookie)).status,200);m=await get();
  assert.equal(m.stage,0);assert.equal(m.badges,0);assert.equal(m.edithUnlocked,false);assert.equal(m.victory,0);assert.notEqual(m.missionRun,oldRun);
  assert.equal((await post('element-complete',{version:m.version,missionRun:oldRun})).status,409);
 } finally {await new Promise(r=>server.close(r));}
});
