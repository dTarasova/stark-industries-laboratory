import {createServer} from 'node:http';
import {DatabaseSync} from 'node:sqlite';
import {mkdirSync, readFileSync} from 'node:fs';
import {resolve, extname} from 'node:path';
import {isIP} from 'node:net';
export {stages} from './api.mjs';
import {createApi} from './api.mjs';
import {memoryAuth} from './auth.mjs';
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
 const api=createApi({db,auth:memoryAuth(),password,edithCode,secure});
 const server=createServer(async(req,res)=>{
  const send=(status,value)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(value));};
  try {
   const path=new URL(req.url,'http://localhost').pathname;
   if(path.startsWith('/api/')) {
    const peer=req.socket.remoteAddress?.replace(/^::ffff:/, '');
    const visitor=req.headers['cf-connecting-ip'];
    const clientIP=trustedProxy && peer===trustedProxy && typeof visitor==='string' && isIP(visitor)?visitor:peer;
    const request=new Request(`${secure?'https':'http'}://${req.headers.host}${req.url}`,{
     method:req.method,headers:req.headers,
     ...(!['GET','HEAD'].includes(req.method)?{body:req,duplex:'half'}:{}),
    });
    const response=await api(request,clientIP);
    res.writeHead(response.status,Object.fromEntries(response.headers));
    return res.end(Buffer.from(await response.arrayBuffer()));
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