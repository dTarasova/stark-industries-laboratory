import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import worker from './worker.mjs';
import {missionAchievements} from './src/missionAchievements.ts';

// SQL выполняется в настоящем SQLite, интерфейс — асинхронный контракт D1.
// Эти проверки не подменяют проверку wrangler dev в среде Cloudflare.
function fixture(t) {
 const sqlite=new DatabaseSync(':memory:');
 sqlite.exec(readFileSync(new URL('./migrations/0001_laboratory.sql',import.meta.url),'utf8'));
 t.after(()=>sqlite.close());
 const binding={
  withSession(mode) {
   assert.equal(mode,'first-primary');
   return {prepare(sql) {
    const prepared=sqlite.prepare(sql);
    function bound(args) {
     return {
      async first() {return prepared.get(...args) ?? null;},
      async run() {return {meta:{changes:prepared.run(...args).changes}};},
     };
    }
    return {...bound([]),bind:(...args)=>bound(args)};
   }};
  },
 };
 const env={DB:binding,ADMIN_PASSWORD:'test-admin-password-123',EDITH_CODE:'test-edith',
  ASSETS:{fetch:async request=>new Response(new URL(request.url).pathname,{headers:{'Content-Type':'text/html'}})}};
 function request(path,body,{cookie='',ip='203.0.113.1',headers={},method=body===undefined?'GET':'POST'}={}) {
  return worker.fetch(new Request('https://lab.example'+path,{
   method,headers:{'content-type':'application/json','CF-Connecting-IP':ip,cookie,...headers},
   ...(body===undefined?{}:{body:typeof body==='string'?body:JSON.stringify(body)}),
  }),env);
 }
 const post=(path,body,options)=>request('/api/'+path,body,options);
 const get=async()=>{
  const response=await request('/api/mission');
  assert.equal(response.status,200);
  assert.equal(response.headers.get('Cache-Control'),'no-store');
  return response.json();
 };
 const login=async()=>{
  const response=await post('login',{password:env.ADMIN_PASSWORD});
  assert.equal(response.status,200);
  assert.match(response.headers.get('set-cookie'),/HttpOnly; SameSite=Strict;.*; Secure/);
  return response.headers.get('set-cookie').split(';')[0];
 };
 return {sqlite,env,request,post,get,login};
}

test('Workers/D1: пульт восстанавливает сессию, видит действия участника и истечение входа',async t=>{
 const {request,post,login,sqlite}=fixture(t);
 assert.equal((await (await request('/api/control-state')).json()).authenticated,false);
 const cookie=await login();
 const read=()=>request('/api/control-state',undefined,{cookie});
 const initial=await (await read()).json();
 assert.equal(initial.authenticated,true);
 await post('edith',{code:'test-edith'});
 const updated=await read();
 assert.equal(updated.headers.get('Cache-Control'),'no-store');
 const state=await updated.json();
 assert.equal(state.authenticated,true);
 assert.equal(state.mission.stage,2);
 assert.ok(state.mission.version>initial.mission.version);
 sqlite.prepare('UPDATE sessions SET expires_at=?').run(Date.now()-1);
 assert.equal((await (await read()).json()).authenticated,false);
});

test('Workers/D1: обе ветки от EDITH до победы, подсказки, бейджи и полный сброс',async t=>{
 for(const codeforces of [false,true]) {
  const {post,get,login,sqlite}=fixture(t);
  const cookie=await login();
  const admin={cookie};
  assert.equal((await post('mission',{stage:1,version:0})).status,401);
  assert.equal((await post('edith',{code:'wrong'})).status,422);
  assert.equal((await post('edith',{code:'test-edith'})).status,200);
  let m=await get();
  assert.equal(m.stage,2);
  assert.equal(m.edithUnlocked,true);
  const completion={version:m.version,missionRun:m.missionRun};
  const simultaneous=await Promise.all([post('element-complete',completion),post('element-complete',completion)]);
  assert.deepEqual(simultaneous.map(r=>r.status).sort(),[200,409]);
  m=await get();
  assert.equal(m.stage,3);
  assert.equal((await post('activate-defense',{version:m.version})).status,409);
  assert.equal((await post('authorize-defense',{version:m.version},admin)).status,200);
  m=await get();
  assert.equal((await post('activate-defense',{version:m.version})).status,200);
  m=await get();
  assert.equal(m.stage,4);
  assert.equal((await post('edith',{code:'test-edith'})).status,409);
  assert.equal((await post('open-recovery',{version:m.version},admin)).status,409);
  sqlite.prepare('UPDATE mission SET takeoverEndsAt=? WHERE id=1').run(Date.now()-1);
  assert.equal((await post('open-recovery',{version:m.version},admin)).status,200);
  m=await get();
  assert.equal((await post('recovery-request',{version:m.version})).status,200);
  m=await get();
  assert.equal((await post('recovery-hint',{version:m.version,hint:'Проверь соединение шины.'},admin)).status,200);
  m=await get();
  assert.deepEqual(m.recoveryHints,['Проверь соединение шины.']);
  assert.equal(m.recoveryRequested,0);
  assert.equal((await post('confirm-timeline',{version:m.version,codeforces},admin)).status,200);
  m=await get();
  assert.equal((await post('continue-timeline',{version:m.version,missionRun:m.missionRun})).status,200);
  m=await get();
  if(codeforces) {
   assert.equal(m.ultronBattle,'active');
   assert.equal((await post('clean-slate-complete',{version:m.version,missionRun:m.missionRun})).status,409);
   assert.equal((await post('confirm-ultron-battle',{version:m.version},admin)).status,200);
   m=await get();
  }
  assert.equal((await post('clean-slate-complete',{version:m.version,missionRun:m.missionRun})).status,200);
  m=await get();
  assert.equal(m.stage,8);
  assert.equal(m.victory,1);
  assert.equal((await post('badge',{badge:3,active:true,version:m.version},admin)).status,200);
  m=await get();
  assert.equal(m.badges,8);
  const oldRun=m.missionRun;
  assert.equal((await post('restart',{version:m.version},admin)).status,200);
  m=await get();
  assert.equal(m.stage,0);
  assert.equal(m.badges,0);
  assert.equal(m.victory,0);
  assert.equal(m.edithUnlocked,false);
  assert.deepEqual(m.recoveryHints,[]);
  assert.notEqual(m.missionRun,oldRun);
  assert.equal((await post('element-complete',{version:m.version,missionRun:oldRun})).status,409);
 }
});

test('Достижения следуют этапу при откате с победы; Restart очищает все результаты',async t=>{
 const {post,get,login}=fixture(t);
 const cookie=await login();
 let mission=await get();
 for(const stage of [8,7,6,5,4,3,2,1,0,8]) {
  assert.equal((await post('mission',{stage,version:mission.version},{cookie})).status,200);
  mission=await get();
  assert.deepEqual(missionAchievements(mission),{
   elementDiscovered:stage>=3,planetaryDefense:stage>=4,timelineFound:stage>=6,victory:stage===8,
  });
 }
 assert.equal((await post('restart',{version:mission.version},{cookie})).status,200);
 assert.deepEqual(missionAchievements(await get()),{
  elementDiscovered:false,planetaryDefense:false,timelineFound:false,victory:false,
 });
});

test('Workers/D1: вход сохраняется между экземплярами, истекает, отзывается и не хранит токен открыто',async t=>{
 const {post,get,login,sqlite,env}=fixture(t);
 let cookie=await login();
 const stored=sqlite.prepare('SELECT * FROM sessions').get();
 assert.notEqual(stored.token_hash,cookie.slice('session='.length));
 assert.equal((await post('mission',{stage:2,version:(await get()).version},{cookie})).status,200);
 assert.equal((await post('logout',{}, {cookie})).status,200);
 assert.equal((await post('restart',{version:1},{cookie})).status,401);
 cookie=await login();
 sqlite.exec('UPDATE sessions SET expires_at=0');
 assert.equal((await post('restart',{version:1},{cookie})).status,401);
 cookie=await login();
 env.ADMIN_PASSWORD='different-password-12345';
 assert.equal((await post('restart',{version:1},{cookie})).status,401);
 assert.equal((await get()).stage,2);
});

test('Workers/D1: блокировка входа общая, атомарная, по IP и с истечением',async t=>{
 const {post,sqlite}=fixture(t);
 const responses=await Promise.all(Array.from({length:7},()=>post('login',{password:'wrong'})));
 assert.equal(responses.filter(r=>r.status===401).length,5);
 assert.equal(responses.filter(r=>r.status===429).length,2);
 assert.equal((await post('login',{password:'test-admin-password-123'})).status,429);
 assert.equal((await post('login',{password:'test-admin-password-123'},{ip:'2001:db8::1'})).status,200);
 sqlite.exec('UPDATE login_attempts SET expires_at=0');
 assert.equal((await post('login',{password:'test-admin-password-123'})).status,200);
 assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM login_attempts').get().n,0);
});

test('Workers/D1: ошибки API всегда JSON; чужой Origin и большие/неверные тела отклоняются',async t=>{
 const {request,post,env}=fixture(t);
 for(const value of ['','{','null','[]','"text"']) {
  assert.equal((await post('login',value)).status,400);
 }
 assert.equal((await post('login',{}, {headers:{origin:'https://attacker.example'}})).status,403);
 assert.equal((await post('login',{}, {headers:{'content-type':'text/plain'}})).status,415);
 assert.equal((await post('login',{password:'я'.repeat(3000)})).status,413);
 assert.equal((await request('/api/mission',undefined,{method:'DELETE'})).status,405);
 env.ADMIN_PASSWORD='short';
 const response=await request('/api/mission');
 assert.equal(response.status,503);
 assert.ok((await response.json()).error);
 env.ADMIN_PASSWORD='test-admin-password-123';
 env.DB={withSession:()=>({prepare:()=>{throw Error('Database unavailable');}})};
 const unavailable=await request('/api/mission');
 assert.equal(unavailable.status,500);
 assert.ok((await unavailable.json()).error);
 env.DB={withSession:()=>{throw Error('Binding unavailable');}};
 const brokenBinding=await request('/api/mission');
 assert.equal(brokenBinding.status,500);
 assert.ok((await brokenBinding.json()).error);
});

test('Workers: API обходит статику, страницы и прототипы передаются ASSETS',async t=>{
 const {request}=fixture(t);
 assert.match((await request('/api/mission')).headers.get('content-type'),/application\/json/);
 for(const path of ['/','/control','/archive','/development','/timelines/debug/','/clean-slate','/battle-with-ultron']) {
  assert.equal(await (await request(path)).text(),path);
 }
 for(const path of ['/prototype','/prototype/','/prototype/index.html']) {
  const response=await request(path);
  assert.equal(response.status,302);
  assert.equal(response.headers.get('location'),'https://lab.example/development');
 }
 assert.equal(await (await request('/prototype_v2/')).text(),'/prototype_v2/');
});

test('Workers: диагностика отличает привязку D1, отсутствующий пароль и короткий пароль без раскрытия секретов',async t=>{
 const {request,env}=fixture(t);
 const binding=env.DB;
 const password=env.ADMIN_PASSWORD;
 async function diagnostic() {
  const response=await request('/api/mission');
  assert.equal(response.status,503);
  assert.equal(response.headers.get('cache-control'),'no-store');
  const body=await response.text();
  assert.ok(!body.includes(password));
  return JSON.parse(body).error;
 }
 delete env.DB;
 assert.match(await diagnostic(),/D1-привязка с именем DB/);
 assert.doesNotMatch(await diagnostic(),/ADMIN_PASSWORD/);
 env.DB=binding;
 delete env.ADMIN_PASSWORD;
 assert.match(await diagnostic(),/не задан ADMIN_PASSWORD/);
 assert.doesNotMatch(await diagnostic(),/D1-привязка/);
 env.ADMIN_PASSWORD='short';
 assert.match(await diagnostic(),/меньше 16 символов/);
 delete env.DB;
 const both=await diagnostic();
 assert.match(both,/D1-привязка/);
 assert.match(both,/меньше 16 символов/);
 env.DB=binding;
 env.ADMIN_PASSWORD=password;
 assert.equal((await request('/api/mission')).status,200);
});
