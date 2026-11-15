import {test} from 'node:test';
import assert from 'node:assert/strict';
import {laboratory} from './server.mjs';

test('сервер открывает временные линии и диагностику по прямой ссылке', async () => {
 const server=laboratory({database:':memory:',password:'test-timeline-password-123'});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 try {
  for (const path of ['/timelines','/timelines/','/timelines/debug','/timelines/debug/']) {
   const response=await fetch(`http://127.0.0.1:${server.address().port}${path}`);
   assert.equal(response.status,200,path);
   assert.match(response.headers.get('content-type'),/text\/html/);
   assert.match(await response.text(),/id="root"/);
  }
 } finally {await new Promise(resolve=>server.close(resolve));}
});
