import {randomBytes, timingSafeEqual, createHash} from 'node:crypto';
export const stages = ['Знакомство с лабораторией','EDITH — текущая разработка','Новый элемент','Защита Земли','Атака Альтрона','Временные линии','Восстановление JARVIS','Clean Slate','Победа'];
const takeoverDuration = 60_000;

// Общий API для Node.js/SQLite и Cloudflare Workers/D1.
export function createApi({db,auth,password,edithCode,secure=false}) {
 if(!password || password.length<16) throw Error('Задайте ADMIN_PASSWORD длиной от 16 символов');
 const state=async()=>await db.prepare('SELECT stage,version,badges FROM mission WHERE id=1').get();
 const publicMission = async () => {
  const {edithUnlocked, recoveryHints, ...mission} = await db.prepare('SELECT stage,version,badges,defenseAuthorized,takeoverEndsAt,edithUnlocked,missionRun,recoveryRequested,recoveryHints,ultronBattle,elementDiscovered,timelineFound,victory,codeforces FROM mission WHERE id=1').get();
  return {...mission, recoveryHints: JSON.parse(recoveryHints), edithUnlocked: Boolean(edithUnlocked), stages, takeoverDuration, serverTime: Date.now()};
 };
 const hash=s=>createHash('sha256').update(s).digest();
 const edithHash = edithCode?.trim() ? hash(edithCode.trim()) : undefined;

 return async function handleApi(request,clientIP='unknown') {
  const send=(status,value,headers={})=>Response.json(value,{status,headers:{'Cache-Control':'no-store',...headers}});
  try {
   const path=new URL(request.url).pathname;
    if(request.method==='GET' && path==='/api/mission') return send(200,await publicMission());
    if(request.method!=='POST') return send(405,{error:'Метод недоступен'});
    const origin=request.headers.get('origin');
    if(origin && new URL(origin).origin!==new URL(request.url).origin) return send(403,{error:'Запрос отклонён'});
    if(request.headers.get('content-type')?.split(';')[0].trim().toLowerCase()!=='application/json') return send(415,{error:'Требуется JSON'});
    const reader=request.body?.getReader();
    const chunks=[]; let size=0;
    if(reader) {
     try {
      for (;;) {
       const {done,value}=await reader.read();
       if(done) break;
       size+=value.byteLength;
       if(size>4096) { await reader.cancel(); return send(413,{error:'Слишком большой запрос'}); }
       chunks.push(value);
      }
     } finally {reader.releaseLock();}
    }
    const bytes=new Uint8Array(size); let offset=0;
    for(const chunk of chunks) {bytes.set(chunk,offset);offset+=chunk.byteLength;}
    let body;
    try {body=JSON.parse(new TextDecoder().decode(bytes));} catch {return send(400,{error:'Некорректный запрос'});}
    if(!body || typeof body!=='object' || Array.isArray(body)) return send(400,{error:'Требуется объект JSON'});
    if (path === '/api/edith') {
     const {stage} = await state();
     if (stage >= 4 && stage <= 6) return send(409, {error:'Доступ заблокирован.'});
     if (!edithHash) return send(503, {error:'Код EDITH ещё не настроен.'});
     const code = typeof body?.code === 'string' ? body.code.trim() : '';
     if (!code || !timingSafeEqual(hash(code), edithHash)) {
      return send(422, {error:'Код не подошёл. Проверьте его и попробуйте ещё раз.'});
     }
     await db.prepare('UPDATE mission SET edithUnlocked=1, stage=CASE WHEN stage<2 THEN 2 ELSE stage END, version=version+1 WHERE id=1 AND edithUnlocked=0 AND stage NOT BETWEEN 4 AND 6').run();
     const mission=await publicMission();
     if(mission.stage>=4 && mission.stage<=6) return send(409,{error:'Доступ заблокирован.'});
     return send(200, mission);
    }
    if (['/api/element-complete', '/api/clean-slate-complete', '/api/continue-timeline'].includes(path)) {
     if (!Number.isInteger(body?.version) || !Number.isInteger(body?.missionRun)) return send(400,{error:'Некорректная версия миссии'});
     const sql = path === '/api/element-complete'
      ? 'UPDATE mission SET elementDiscovered=1, stage=3, version=version+1 WHERE stage=2 AND edithUnlocked=1 AND elementDiscovered=0'
      : path === '/api/continue-timeline'
       ? "UPDATE mission SET stage=7, ultronBattle=CASE WHEN codeforces=1 THEN 'active' ELSE 'inactive' END, version=version+1 WHERE stage=6 AND timelineFound=1"
       : "UPDATE mission SET victory=1, stage=8, version=version+1 WHERE stage=7 AND (codeforces=0 OR ultronBattle='won') AND victory=0";
     const result=await db.prepare(sql+' AND version=? AND missionRun=?').run(body.version,body.missionRun);
     return send(result.changes?200:409,result.changes?await publicMission():{error:'Миссия изменилась. Обновите состояние.'});
    }
    if (path === '/api/recovery-request') {
     if (!Number.isInteger(body?.version)) return send(400, {error:'Некорректная версия миссии'});
     const result = await db.prepare(`UPDATE mission SET recoveryRequested=1, version=version+1
      WHERE id=1 AND stage IN (5,6) AND version=? AND recoveryRequested=0`).run(body.version);
     return send(result.changes ? 200 : 409, result.changes ? await publicMission() : {error:'Запрос помощи сейчас недоступен.'});
    }
    if(path==='/api/login') {
     const key=hash(clientIP).toString('hex');
     const now=Date.now(); const attempt=await auth.getAttempt(key);
     if(attempt && attempt.until>now && attempt.count>=5) return send(429,{error:'Повторите вход через 15 минут'});
     if(typeof body.password!=='string' || !timingSafeEqual(hash(body.password),hash(password))){
      const count=await auth.fail(key,now);
      return send(count>5?429:401,{error:count>5?'Повторите вход через 15 минут':'Неверный пароль'});
     }
     await auth.clearAttempt(key);
     await auth.prune(now);
     const token=randomBytes(32).toString('hex');
     await auth.createSession(hash(token).toString('hex'),now+43200000,hash(password).toString('hex'));
     return send(200,{ok:true},{'Set-Cookie':`session=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=43200${secure?'; Secure':''}`});
    }
    if (path === '/api/activate-defense') {
     if (!Number.isInteger(body?.version)) return send(400, {error:'Некорректная версия миссии'});
     const result = await db.prepare(`UPDATE mission SET stage=4, defenseAuthorized=0, takeoverEndsAt=?, version=version+1
      WHERE id=1 AND stage=3 AND defenseAuthorized=1 AND version=?`).run(Date.now() + takeoverDuration, body.version);
     return send(result.changes ? 200 : 409, result.changes ? await publicMission() : {error:'Запуск защиты сейчас недоступен.'});
    }
    const token=request.headers.get('cookie')?.split(';').map(x=>x.trim()).find(x=>x.startsWith('session='))?.slice(8);
    const sessionKey=token && /^[a-f0-9]{64}$/.test(token)?hash(token).toString('hex'):null;
    if(!sessionKey || !await auth.hasSession(sessionKey,Date.now(),hash(password).toString('hex'))) return send(401,{error:'Войдите в пульт'});
    if(path==='/api/logout'){
     await auth.deleteSession(sessionKey);
     return send(200,{ok:true},{'Set-Cookie':`session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0${secure?'; Secure':''}`});
    }
    if (path === '/api/confirm-timeline') {
     if (!Number.isInteger(body?.version) || typeof body.codeforces !== 'boolean') return send(400,{error:'Некорректная команда'});
     const result=await db.prepare('UPDATE mission SET stage=6,timelineFound=1,codeforces=?,version=version+1 WHERE stage=5 AND version=?').run(Number(body.codeforces),body.version);
     return send(result.changes?200:409,result.changes?await publicMission():{error:'Миссия уже изменилась.'});
    }
    if (path === '/api/open-ultron-battle'  || path === '/api/confirm-ultron-battle') {
     if (!Number.isInteger(body?.version)) return send(400, {error:'Некорректная версия миссии'});
     const opening = path === '/api/open-ultron-battle';
     const result = await db.prepare(`UPDATE mission SET ultronBattle=?, version=version+1
      WHERE id=1 AND stage=7 AND version=? AND ultronBattle=?`)
      .run(opening ? 'active' : 'won', body.version, opening ? 'inactive' : 'active');
     return send(result.changes ? 200 : 409, result.changes ? await publicMission() : {error:'Команда боя сейчас недоступна. Проверьте состояние миссии.'});
    }
    if (path === '/api/authorize-defense' || path === '/api/open-recovery') {
     if (!Number.isInteger(body?.version)) return send(400, {error:'Некорректная версия миссии'});
     const result = path === '/api/authorize-defense'
      ? await db.prepare(`UPDATE mission SET defenseAuthorized=1, version=version+1
        WHERE id=1 AND stage=3 AND defenseAuthorized=0 AND version=?`).run(body.version)
      : await db.prepare(`UPDATE mission SET stage=5, version=version+1
        WHERE id=1 AND stage=4 AND (takeoverEndsAt IS NULL OR takeoverEndsAt<=?) AND version=?`).run(Date.now(), body.version);
     return send(result.changes ? 200 : 409, result.changes ? await publicMission() : {error:'Команда сейчас недоступна. Проверьте состояние миссии.'});
    }
    if (path === '/api/reset-dummy') {
     if (!Number.isInteger(body?.version)) return send(400, {error:'Некорректная версия миссии'});
     const result = await db.prepare(`UPDATE mission SET missionRun=version+1, version=version+1
      WHERE id=1 AND version=? AND stage=0`).run(body.version);
     return send(result.changes ? 200 : 409, result.changes ? await publicMission() : {error:'Сброс доступен на начальном этапе.'});
    }
    if (path === '/api/recovery-hint') {
     const hint = typeof body?.hint === 'string' ? body.hint.trim() : '';
     if (!hint || hint.length > 500 || !Number.isInteger(body?.version)) {
      return send(400, {error:'Введите подсказку длиной до 500 символов.'});
     }
     const result = await db.prepare(`UPDATE mission SET recoveryHints=json_insert(recoveryHints, '$[#]', ?), recoveryRequested=0, version=version+1
      WHERE id=1 AND stage IN (5,6) AND version=?`).run(hint, body.version);
     return send(result.changes ? 200 : 409, result.changes ? await publicMission() : {error:'Этап изменился. Проверьте резервный канал.'});
    }
    if (path === '/api/badge') {
     const {badge, active, version} = body ?? {};
     if (!Number.isInteger(badge) || badge < 0 || badge > 3 || typeof active !== 'boolean' || !Number.isInteger(version)) {
      return send(400, {error:'Некорректный бейдж'});
     }
     const mask = 1 << badge;
     const result = await db.prepare('UPDATE mission SET badges = (badges & ?) | ?, version = version + 1 WHERE id = 1 AND version = ?')
      .run(~mask, active ? mask : 0, version);
     return send(result.changes ? 200 : 409, result.changes ? await state() : {error:'Миссия уже изменилась. Проверьте статус бейджа и повторите.'});
    }
    if(path==='/api/restart') body.stage=0;
    if(path!=='/api/mission' && path!=='/api/restart') return send(404,{error:'Не найдено'});
    if(!Number.isInteger(body.stage)||body.stage<0||body.stage>=stages.length||!Number.isInteger(body.version)) return send(400,{error:'Некорректный этап'});
    const result=await db.prepare(`UPDATE mission SET
     badges=CASE WHEN $stage=0 THEN 0 ELSE badges END,
     edithUnlocked=CASE WHEN $stage>=2 THEN 1 ELSE 0 END,
     elementDiscovered=CASE WHEN $stage>=3 THEN 1 ELSE 0 END,
     timelineFound=CASE WHEN $stage>=6 THEN 1 ELSE 0 END,
     victory=CASE WHEN $stage=8 THEN 1 ELSE 0 END,
     codeforces=0, defenseAuthorized=0, takeoverEndsAt=NULL,
     recoveryRequested=0, recoveryHints='[]', ultronBattle='inactive',
     missionRun=version+1,
     stage=$stage, version=version+1 WHERE id=1 AND version=$version`).run({stage:body.stage, version:body.version});
    return send(result.changes?200:409,result.changes?await state():{error:'Этап уже изменился. Обновите данные и подтвердите снова.'});
  } catch {
   return send(500,{error:'Сервис временно недоступен'});
  }
 };
}
