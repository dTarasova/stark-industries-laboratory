import {createServer} from 'node:http';
import {DatabaseSync} from 'node:sqlite';
import {randomBytes, timingSafeEqual, createHash} from 'node:crypto';
import {mkdirSync, readFileSync} from 'node:fs';
import {resolve, extname} from 'node:path';
import {isIP} from 'node:net';
export const stages = ['Знакомство с лабораторией','EDITH — текущая разработка','Новый элемент','Защита Земли','Атака Альтрона','Временные линии','Восстановление JARVIS','Clean Slate','Победа'];
const takeoverDuration = 45_000;
export function laboratory({database='data/mission.sqlite',password,edithCode,secure=false,trustedProxy=''}) {
 if (!password || password.length < 16) throw Error('Задайте ADMIN_PASSWORD длиной от 16 символов');
 const db=new DatabaseSync(database); db.exec('CREATE TABLE IF NOT EXISTS mission (id INTEGER PRIMARY KEY CHECK(id=1), stage INTEGER NOT NULL, version INTEGER NOT NULL); INSERT OR IGNORE INTO mission (id,stage,version) VALUES(1,0,0)');
 if (!db.prepare('PRAGMA table_info(mission)').all().some(column => column.name === 'badges')) {
  db.exec('ALTER TABLE mission ADD COLUMN badges INTEGER NOT NULL DEFAULT 0');
 }
 const columns = db.prepare('PRAGMA table_info(mission)').all();
 if (!columns.some(column => column.name === 'defenseAuthorized')) {
  db.exec('ALTER TABLE mission ADD COLUMN defenseAuthorized INTEGER NOT NULL DEFAULT 0');
 }
 if (!columns.some(column => column.name === 'takeoverEndsAt')) {
  db.exec('ALTER TABLE mission ADD COLUMN takeoverEndsAt INTEGER');
 }
 if (!columns.some(column => column.name === 'edithUnlocked')) {
  db.exec('ALTER TABLE mission ADD COLUMN edithUnlocked INTEGER NOT NULL DEFAULT 0');
 }
 for (const [name, type] of [
  ['elementDiscovered', 'INTEGER NOT NULL DEFAULT 0'],
  ['timelineFound', 'INTEGER NOT NULL DEFAULT 0'],
  ['victory', 'INTEGER NOT NULL DEFAULT 0'],
  ['codeforces', 'INTEGER NOT NULL DEFAULT 0'],
  ['missionRun', 'INTEGER NOT NULL DEFAULT 0'],
  ['recoveryRequested', 'INTEGER NOT NULL DEFAULT 0'],
  ['recoveryHints', "TEXT NOT NULL DEFAULT '[]'"],
  ['ultronBattle', "TEXT NOT NULL DEFAULT 'inactive'"],
 ]) {
  if (!columns.some(column => column.name === name)) db.exec(`ALTER TABLE mission ADD COLUMN ${name} ${type}`);
 }
 const sessions=new Map(); const attempts=new Map();
 const state=()=>db.prepare('SELECT stage,version,badges FROM mission WHERE id=1').get();
 const publicMission = () => {
  db.prepare("UPDATE mission SET stage=5, version=version+1 WHERE stage=4 AND takeoverEndsAt IS NOT NULL AND takeoverEndsAt<=?").run(Date.now());
  const {edithUnlocked, recoveryHints, ...mission} = db.prepare('SELECT stage,version,badges,defenseAuthorized,takeoverEndsAt,edithUnlocked,missionRun,recoveryRequested,recoveryHints,ultronBattle,elementDiscovered,timelineFound,victory,codeforces FROM mission WHERE id=1').get();
  return {...mission, recoveryHints: JSON.parse(recoveryHints), edithUnlocked: Boolean(edithUnlocked), stages, takeoverDuration, serverTime: Date.now()};
 };
 const hash=s=>createHash('sha256').update(s).digest();
 const edithHash = edithCode?.trim() ? hash(edithCode.trim()) : undefined;
 const server=createServer(async(req,res)=>{
  const send=(status,value)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(value));};
  try {
   const path=new URL(req.url,'http://localhost').pathname;
   if(path.startsWith('/api/')) {
    if(req.method==='GET' && path==='/api/mission') return send(200,publicMission());
    if(req.method!=='POST') return send(405,{error:'Метод недоступен'});
    if(req.headers.origin && new URL(req.headers.origin).host!==req.headers.host) return send(403,{error:'Запрос отклонён'});
    if(!req.headers['content-type']?.startsWith('application/json')) return send(415,{error:'Требуется JSON'});
    let raw=''; for await(const chunk of req){raw+=chunk; if(raw.length>4096) return send(413,{error:'Слишком большой запрос'});}
    let body; try {body=JSON.parse(raw);} catch {return send(400,{error:'Некорректный запрос'});}
    if (path === '/api/edith') {
     const {stage} = state();
     if (stage >= 4 && stage <= 6) return send(409, {error:'Доступ заблокирован.'});
     if (!edithHash) return send(503, {error:'Код EDITH ещё не настроен.'});
     const code = typeof body?.code === 'string' ? body.code.trim() : '';
     if (!code || !timingSafeEqual(hash(code), edithHash)) {
      return send(422, {error:'Код не подошёл. Проверьте его и попробуйте ещё раз.'});
     }
     db.prepare('UPDATE mission SET edithUnlocked=1, stage=CASE WHEN stage<2 THEN 2 ELSE stage END, version=version+1 WHERE id=1 AND edithUnlocked=0').run();
     return send(200, publicMission());
    }
    if (['/api/element-complete', '/api/clean-slate-complete', '/api/continue-timeline'].includes(path)) {
     if (!Number.isInteger(body?.version) || !Number.isInteger(body?.missionRun)) return send(400,{error:'Некорректная версия миссии'});
     const sql = path === '/api/element-complete'
      ? 'UPDATE mission SET elementDiscovered=1, stage=3, version=version+1 WHERE stage=2 AND edithUnlocked=1 AND elementDiscovered=0'
      : path === '/api/continue-timeline'
       ? "UPDATE mission SET stage=7, ultronBattle=CASE WHEN codeforces=1 THEN 'active' ELSE 'inactive' END, version=version+1 WHERE stage=6 AND timelineFound=1"
       : "UPDATE mission SET victory=1, stage=8, version=version+1 WHERE stage=7 AND (codeforces=0 OR ultronBattle='won') AND victory=0";
     const result=db.prepare(sql+' AND version=? AND missionRun=?').run(body.version,body.missionRun);
     return send(result.changes?200:409,result.changes?publicMission():{error:'Миссия изменилась. Обновите состояние.'});
    }
    if (path === '/api/recovery-request') {
     if (!Number.isInteger(body?.version)) return send(400, {error:'Некорректная версия миссии'});
     const result = db.prepare(`UPDATE mission SET recoveryRequested=1, version=version+1
      WHERE id=1 AND stage IN (5,6) AND version=? AND recoveryRequested=0`).run(body.version);
     return send(result.changes ? 200 : 409, result.changes ? publicMission() : {error:'Запрос помощи сейчас недоступен.'});
    }
    if(path==='/api/login') {
     const peer=req.socket.remoteAddress?.replace(/^::ffff:/, '');
     const visitor=req.headers['cf-connecting-ip'];
     const key=trustedProxy && peer===trustedProxy && typeof visitor==='string' && isIP(visitor) ? visitor : peer;
     const now=Date.now(); const attempt=attempts.get(key);
     if(attempt && attempt.until>now && attempt.count>=5) return send(429,{error:'Повторите вход через 15 минут'});
     if(typeof body.password!=='string' || !timingSafeEqual(hash(body.password),hash(password))){const a=attempt?.until>now?attempt:{count:0,until:now+900000};a.count++;attempts.set(key,a);return send(401,{error:'Неверный пароль'});}
     attempts.delete(key); const token=randomBytes(32).toString('hex'); sessions.set(token,now+43200000);
     res.setHeader('Set-Cookie',`session=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=43200${secure?'; Secure':''}`);return send(200,{ok:true});
    }
    if (path === '/api/activate-defense') {
     if (!Number.isInteger(body?.version)) return send(400, {error:'Некорректная версия миссии'});
     const result = db.prepare(`UPDATE mission SET stage=4, defenseAuthorized=0, takeoverEndsAt=?, version=version+1
      WHERE id=1 AND stage=3 AND defenseAuthorized=1 AND version=?`).run(Date.now() + takeoverDuration, body.version);
     return send(result.changes ? 200 : 409, result.changes ? publicMission() : {error:'Запуск защиты сейчас недоступен.'});
    }
    const token=req.headers.cookie?.split('; ').find(x=>x.startsWith('session='))?.slice(8);
    if(!token || !(sessions.get(token)>Date.now())) return send(401,{error:'Войдите в пульт'});
    if(path==='/api/logout'){sessions.delete(token);res.setHeader('Set-Cookie','session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0');return send(200,{ok:true});}
    if (path === '/api/confirm-timeline') {
     if (!Number.isInteger(body?.version) || typeof body.codeforces !== 'boolean') return send(400,{error:'Некорректная команда'});
     const result=db.prepare('UPDATE mission SET stage=6,timelineFound=1,codeforces=?,version=version+1 WHERE stage=5 AND version=?').run(Number(body.codeforces),body.version);
     return send(result.changes?200:409,result.changes?publicMission():{error:'Миссия уже изменилась.'});
    }
    if (path === '/api/open-ultron-battle'  || path === '/api/confirm-ultron-battle') {
     if (!Number.isInteger(body?.version)) return send(400, {error:'Некорректная версия миссии'});
     const opening = path === '/api/open-ultron-battle';
     const result = db.prepare(`UPDATE mission SET ultronBattle=?, version=version+1
      WHERE id=1 AND stage=7 AND version=? AND ultronBattle=?`)
      .run(opening ? 'active' : 'won', body.version, opening ? 'inactive' : 'active');
     return send(result.changes ? 200 : 409, result.changes ? publicMission() : {error:'Команда боя сейчас недоступна. Проверьте состояние миссии.'});
    }
    if (path === '/api/authorize-defense' || path === '/api/open-recovery') {
     if (!Number.isInteger(body?.version)) return send(400, {error:'Некорректная версия миссии'});
     const result = path === '/api/authorize-defense'
      ? db.prepare(`UPDATE mission SET defenseAuthorized=1, version=version+1
        WHERE id=1 AND stage=3 AND defenseAuthorized=0 AND version=?`).run(body.version)
      : db.prepare(`UPDATE mission SET stage=5, version=version+1
        WHERE id=1 AND stage=4 AND (takeoverEndsAt IS NULL OR takeoverEndsAt<=?) AND version=?`).run(Date.now(), body.version);
     return send(result.changes ? 200 : 409, result.changes ? publicMission() : {error:'Команда сейчас недоступна. Проверьте состояние миссии.'});
    }
    if (path === '/api/reset-dummy') {
     if (!Number.isInteger(body?.version)) return send(400, {error:'Некорректная версия миссии'});
     const result = db.prepare(`UPDATE mission SET missionRun=version+1, version=version+1
      WHERE id=1 AND version=? AND stage=0`).run(body.version);
     return send(result.changes ? 200 : 409, result.changes ? publicMission() : {error:'Сброс доступен на начальном этапе.'});
    }
    if (path === '/api/recovery-hint') {
     const hint = typeof body?.hint === 'string' ? body.hint.trim() : '';
     if (!hint || hint.length > 500 || !Number.isInteger(body?.version)) {
      return send(400, {error:'Введите подсказку длиной до 500 символов.'});
     }
     const result = db.prepare(`UPDATE mission SET recoveryHints=json_insert(recoveryHints, '$[#]', ?), recoveryRequested=0, version=version+1
      WHERE id=1 AND stage IN (5,6) AND version=?`).run(hint, body.version);
     return send(result.changes ? 200 : 409, result.changes ? publicMission() : {error:'Этап изменился. Проверьте резервный канал.'});
    }
    if (path === '/api/badge') {
     const {badge, active, version} = body ?? {};
     if (!Number.isInteger(badge) || badge < 0 || badge > 3 || typeof active !== 'boolean' || !Number.isInteger(version)) {
      return send(400, {error:'Некорректный бейдж'});
     }
     const mask = 1 << badge;
     const result = db.prepare('UPDATE mission SET badges = (badges & ?) | ?, version = version + 1 WHERE id = 1 AND version = ?')
      .run(~mask, active ? mask : 0, version);
     return send(result.changes ? 200 : 409, result.changes ? state() : {error:'Миссия уже изменилась. Проверьте статус бейджа и повторите.'});
    }
    if(path!=='/api/mission') return send(404,{error:'Не найдено'});
    if(!Number.isInteger(body.stage)||body.stage<0||body.stage>=stages.length||!Number.isInteger(body.version)) return send(400,{error:'Некорректный этап'});
    const result=db.prepare(`UPDATE mission SET
     defenseAuthorized=CASE WHEN stage=$stage THEN defenseAuthorized ELSE 0 END,
     takeoverEndsAt=CASE WHEN stage=$stage THEN takeoverEndsAt ELSE NULL END,
     recoveryRequested=CASE WHEN stage=$stage THEN recoveryRequested ELSE 0 END,
     recoveryHints=CASE WHEN stage=$stage THEN recoveryHints ELSE '[]' END,
     ultronBattle=CASE WHEN stage=$stage THEN ultronBattle ELSE 'inactive' END,
     stage=$stage, version=version+1 WHERE id=1 AND version=$version`).run({stage:body.stage, version:body.version});
    return send(result.changes?200:409,result.changes?state():{error:'Этап уже изменился. Обновите данные и подтвердите снова.'});
   }
   if(req.method!=='GET') return send(405,{});
   const root=resolve('dist');
   if (['/prototype', '/prototype/', '/prototype/index.html'].includes(path)) {
    res.writeHead(302, {Location:'/development'});
    return res.end();
   }
   const page=path==='/prototype_v2'||path==='/prototype_v2/'?'/prototype_v2/index.html':
    ['/', '/control', '/archive', '/development', '/clean-slate', '/battle-with-ultron', '/timelines', '/timelines/', '/timelines/debug', '/timelines/debug/'].includes(path)?'/index.html':path;
   const file=resolve(root,'.'+page);
   if(!file.startsWith(root+'/')&&!file.startsWith(root+'\\')) return send(404,{});
   try {res.setHeader('Content-Type',({'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css'})[extname(file)]||'application/octet-stream');res.end(readFileSync(file));}catch{return send(404,{error:'Не найдено'});}
  } catch {send(500,{error:'Сервис временно недоступен'});}
 });server.on('close',()=>db.close());return server;
}
if(process.argv[1]===resolve('server.mjs')) {mkdirSync('data',{recursive:true}); laboratory({password:process.env.ADMIN_PASSWORD,edithCode:process.env.EDITH_CODE,secure:process.env.NODE_ENV==='production',trustedProxy:process.env.TRUSTED_PROXY_IP}).listen(Number(process.env.PORT||3000),'0.0.0.0');}
