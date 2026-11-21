// Совместимый с общим API адаптер асинхронных запросов D1.
export function d1Database(binding) {
 // Свежая миссия на каждом устройстве, даже если включена репликация D1.
 const session=binding.withSession('first-primary');
 return {
  prepare(sql) {
   function bind(args) {
    let query=sql;
    if(args.length===1 && args[0] && typeof args[0]==='object') {
     const values=args[0];
     args=[];
     query=query.replace(/\$([a-zA-Z]\w*)/g,(_,name)=>{
      if(!Object.hasOwn(values,name)) throw Error('Не задан параметр SQL');
      args.push(values[name]);
      return '?';
     });
    }
    const statement=session.prepare(query);
    return args.length?statement.bind(...args):statement;
   }
   return {
    get:(...args)=>bind(args).first(),
    async run(...args) {
     const result=await bind(args).run();
     return {changes:result.meta.changes};
    },
   };
  },
 };
}
