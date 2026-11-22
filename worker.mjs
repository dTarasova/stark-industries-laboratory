import {createApi} from './api.mjs';
import {d1Auth} from './auth.mjs';
import {d1Database} from './cloudflare-db.mjs';

export default {
 async fetch(request,env) {
  const path=new URL(request.url).pathname;
  if(path.startsWith('/api/')) {
   const configurationErrors=[];
   if(!env.DB) configurationErrors.push('В работающем Worker отсутствует D1-привязка с именем DB.');
   if(typeof env.ADMIN_PASSWORD!=='string' || !env.ADMIN_PASSWORD.length) {
    configurationErrors.push('В работающем Worker не задан ADMIN_PASSWORD. Добавьте его в Settings → Variables and Secrets самого Worker.');
   } else if(env.ADMIN_PASSWORD.length<16) {
    configurationErrors.push('ADMIN_PASSWORD задан, но содержит меньше 16 символов.');
   }
   if(configurationErrors.length) {
    return Response.json({error:configurationErrors.join(' ')},
     {status:503,headers:{'Cache-Control':'no-store'}});
   }
   try {
    const db=d1Database(env.DB);
    const api=createApi({db,auth:d1Auth(db),password:env.ADMIN_PASSWORD,edithCode:env.EDITH_CODE,
     secure:new URL(request.url).protocol==='https:'});
    // В Workers этот заголовок устанавливает Cloudflare, а не браузер посетителя.
    return await api(request,request.headers.get('CF-Connecting-IP') || 'local');
   } catch {
    return Response.json({error:'Сервис временно недоступен. Проверьте подключение и миграции D1.'},
     {status:500,headers:{'Cache-Control':'no-store'}});
   }
  }
  if(['/prototype','/prototype/','/prototype/index.html'].includes(path)) {
   return Response.redirect(new URL('/development',request.url),302);
  }
  return env.ASSETS.fetch(request);
 },
};
