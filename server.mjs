import {createServer} from 'node:http';
import {DatabaseSync} from 'node:sqlite';
import {randomBytes, timingSafeEqual, createHash} from 'node:crypto';
import {mkdirSync, readFileSync} from 'node:fs';
import {resolve, extname} from 'node:path';
export const stages = ['Знакомство с лабораторией','EDITH — текущая разработка','Новый элемент','Защита Земли','Атака Альтрона','Временные линии','Восстановление JARVIS','Clean Slate','Победа'];
export function laboratory({database='data/mission.sqlite',password,secure=false}) {
 if (!password || password.length < 16) throw Error('Задайте ADMIN_PASSWORD длиной от 16 символов');
 const db=new DatabaseSync(database); db.exec('CREATE TABLE IF NOT EXISTS mission (id INTEGER PRIMARY KEY CHECK(id=1), stage INTEGER NOT NULL, version INTEGER NOT NULL); INSERT OR IGNORE INTO mission VALUES(1,0,0)');
 const sessions=new Map(); const attempts=new Map();
 const state=()=>db.prepare('SELECT stage,version FROM mission WHERE id=1').get();
 const hash=s=>createHash('sha256').update(s).digest();
 const server=createServer(async(req,res)=>{
  const send=(status,value)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(value));};
  try {
   const path=new URL(req.url,'http://localhost').pathname;
   if(path.startsWith('/api/')) {
    if(req.method==='GET' && path==='/api/mission') return send(200,{...state(),stages});
    if(req.method!=='POST') return send(405,{error:'Метод недоступен'});
    if(req.headers.origin && new URL(req.headers.origin).host!==req.headers.host) return send(403,{error:'Запрос отклонён'});
    if(!req.headers['content-type']?.startsWith('application/json')) return send(415,{error:'Требуется JSON'});
    let raw=''; for await(const chunk of req){raw+=chunk; if(raw.length>4096) return send(413,{error:'Слишком большой запрос'});}
    let body; try {body=JSON.parse(raw);} catch {return send(400,{error:'Некорректный запрос'});}
    if(path==='/api/login') {
     const key=req.socket.remoteAddress; const now=Date.now(); const attempt=attempts.get(key);
     if(attempt && attempt.until>now && attempt.count>=5) return send(429,{error:'Повторите вход через 15 минут'});
     if(typeof body.password!=='string' || !timingSafeEqual(hash(body.password),hash(password))){const a=attempt?.until>now?attempt:{count:0,until:now+900000};a.count++;attempts.set(key,a);return send(401,{error:'Неверный пароль'});}
     attempts.delete(key); const token=randomBytes(32).toString('hex'); sessions.set(token,now+43200000);
     res.setHeader('Set-Cookie',`session=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=43200${secure?'; Secure':''}`);return send(200,{ok:true});
    }
    const token=req.headers.cookie?.split('; ').find(x=>x.startsWith('session='))?.slice(8);
    if(!token || !(sessions.get(token)>Date.now())) return send(401,{error:'Войдите в пульт'});
    if(path==='/api/logout'){sessions.delete(token);res.setHeader('Set-Cookie','session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0');return send(200,{ok:true});}
    if(path!=='/api/mission') return send(404,{error:'Не найдено'});
    if(!Number.isInteger(body.stage)||body.stage<0||body.stage>=stages.length||!Number.isInteger(body.version)) return send(400,{error:'Некорректный этап'});
    const result=db.prepare('UPDATE mission SET stage=?, version=version+1 WHERE id=1 AND version=?').run(body.stage,body.version);
    return send(result.changes?200:409,result.changes?state():{error:'Этап уже изменился. Обновите данные и подтвердите снова.'});
   }
   if(req.method!=='GET') return send(405,{});
   const root=resolve('dist');const file=path==='/'||path==='/control'?resolve(root,'index.html'):resolve(root,'.'+path);
   if(!file.startsWith(root+'/')&&!file.startsWith(root+'\\')) return send(404,{});
   try {res.setHeader('Content-Type',({'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css'})[extname(file)]||'application/octet-stream');res.end(readFileSync(file));}catch{return send(404,{error:'Не найдено'});}
  } catch {send(500,{error:'Сервис временно недоступен'});}
 });server.on('close',()=>db.close());return server;
}
if(process.argv[1]===resolve('server.mjs')) {mkdirSync('data',{recursive:true}); laboratory({password:process.env.ADMIN_PASSWORD,secure:process.env.NODE_ENV==='production'}).listen(Number(process.env.PORT||3000),'0.0.0.0');}
