import {test} from 'node:test';
import assert from 'node:assert/strict';
import {PassThrough} from 'node:stream';
import {laboratory} from './server.mjs';

// Проверка HTTP-адаптера без сетевых портов: среда может запрещать loopback.
function transport(server) {
 return function post(path,body,{cookie='',headers={}}={}) {
  const req=new PassThrough();
  Object.assign(req,{
   url:'/api/'+path,method:'POST',socket:{remoteAddress:'127.0.0.1'},
   headers:{host:'lab.example','content-type':'application/json',cookie,...headers},
  });
  return new Promise(resolve=>{
   let status=200;
   const responseHeaders=new Headers();
   const res={
    writeHead(code,values) {status=code;for(const [key,value] of Object.entries(values)) responseHeaders.set(key,value);},
    end(value) {resolve(new Response(value,{status,headers:responseHeaders}));},
   };
   server.emit('request',req,res);
   req.end(JSON.stringify(body));
  });
 };
}

test('Node.js: HTTP-адаптер сохраняет JSON, cookie, проверку Origin и команды после выделения общего API',async t=>{
 const server=laboratory({database:':memory:',password:'test-password-only-123',edithCode:'edith',secure:true});
 t.after(()=>server.emit('close'));
 const post=transport(server);
 assert.equal((await post('mission',{stage:2,version:0})).status,401);
 assert.equal((await post('login',{password:'test-password-only-123'},{headers:{origin:'https://foreign.example'}})).status,403);
 const login=await post('login',{password:'test-password-only-123'},{headers:{origin:'https://lab.example'}});
 assert.equal(login.status,200);
 assert.match(login.headers.get('set-cookie'),/; Secure/);
 const cookie=login.headers.get('set-cookie').split(';')[0];
 const changed=await post('mission',{stage:2,version:0},{cookie});
 assert.equal(changed.status,200);
 assert.deepEqual(await changed.json(),{stage:2,version:1,badges:0});
 assert.equal((await post('mission',{stage:3,version:0},{cookie})).status,409);
 assert.equal((await post('element-complete',{version:1,missionRun:1})).status,200);
 assert.equal((await post('logout',{}, {cookie})).status,200);
 assert.equal((await post('restart',{version:2},{cookie})).status,401);
});

test('Node.js: подмена CF-Connecting-IP не обходит лимит без доверенного прокси',async t=>{
 for(const trustedProxy of ['', '127.0.0.1']) {
  const server=laboratory({database:':memory:',password:'test-password-only-123',trustedProxy});
  t.after(()=>server.emit('close'));
  const post=transport(server);
  const headers={'cf-connecting-ip':'203.0.113.1'};
  for(let i=0;i<5;i++) assert.equal((await post('login',{password:'wrong'},{headers})).status,401);
  assert.equal((await post('login',{password:'wrong'},{headers})).status,429);
  const other=await post('login',{password:'test-password-only-123'},{headers:{'cf-connecting-ip':'2001:db8::1'}});
  assert.equal(other.status,trustedProxy?200:429);
 }
});
