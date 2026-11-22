import {simulate,type Route} from './engine.ts';

// Тексты и условия из temporal_lines_cards_v8_host.md, раздел J.
export const epilogues = [
 {id:"J01",title:"Шаверменная",text:"Мстители единогласно решили никогда больше не ходить в шаверменную. Халк воздержался: он не помнит, что произошло",available:(c:Route['choices'],result:ReturnType<typeof simulate>)=>c['02']==='А'},
 {id:"J02",title:"ABBA + Тор",text:"Тор подал заявку на „Танцы со звёздами“. В графе „Опыт“ указал: „Полторы тысячи лет асгардских церемоний и битва за Соковию“",available:(c:Route['choices'],result:ReturnType<typeof simulate>)=>c['03']==='Б'&&c['06']==='А'},
 {id:"J03",title:"ABBA без Тора",text:"Тор объявил Dancing Queen новым гимном Асгарда. Один пока не ответил на запрос об утверждении",available:(c:Route['choices'],result:ReturnType<typeof simulate>)=>c['03']==='Б'&&c['06']!=='А'},
 {id:"J04",title:"AC/DC",text:"Тони заказал новую звуковую систему для брони. Пятница зарегистрировала превышение допустимой громкости в 400 раз",available:(c:Route['choices'],result:ReturnType<typeof simulate>)=>c['03']==='А'},
 {id:"J05",title:"Клинт отвлекал Альтрона",text:"В официальном отчёте Альтрон описал Клинта как „человека с луком“. Клинт требует исправить на „высокотехнологичный тактический комплекс“",available:(c:Route['choices'],result:ReturnType<typeof simulate>)=>c['06']==='Б'},
 {id:"J06",title:"Полноценный обед",text:"Тони распорядился добавить отдельную кухню в проект следующей базы: „Спасение человечества не должно зависеть от качества шавермы“",available:(c:Route['choices'],result:ReturnType<typeof simulate>)=>c['02']==='Г'},
 {id:"J07",title:"Фьюри",text:"Заявление Альтрона на регистрацию независимого искусственного интеллекта всё ещё находится на рассмотрении в Щ.И.Т.",available:(c:Route['choices'],result:ReturnType<typeof simulate>)=>c['01']==='В'},
 {id:"J08",title:"Вижен создан",text:"Роуди приготовился рассказать, как уничтожил сбегающих роботов, но Вижен сбил последнего до кульминации истории",available:(c:Route['choices'],result:ReturnType<typeof simulate>)=>result.vision},
 {id:"J09",title:"Промзона и Халк",text:"Район предложили переименовать в „Мемориальный кратер имени Брюса Бэннера“",available:(c:Route['choices'],result:ReturnType<typeof simulate>)=>c['08']==='А'},
 {id:"J10",title:"Супермаркет",text:"Касса самообслуживания до сих пор ищет „неожиданный товар в зоне упаковки“. Пьетро уже спас мир и вернулся домой",available:(c:Route['choices'],result:ReturnType<typeof simulate>)=>c['02']==='Б'},
 {id:"J11",title:"Ловушка Тони",text:"Старк запатентовал магнитную ловушку из дронов Альтрона. В графе „Исходные материалы“ указал: „Любезно предоставлены противником“",available:(c:Route['choices'],result:ReturnType<typeof simulate>)=>c['06']==='Г'},
 {id:"J12",title:"Наташа танцевала с Альтроном",text:"Клинт предложил записать Наташу на турнир по бальным танцам. Наташа ответила, что партнёр уже выбыл из соревнования",available:(c:Route['choices'],result:ReturnType<typeof simulate>)=>c['06']==='В'},
 {id:"J13",title:"Ракетный удар Роуди",text:"На базе появилась табличка: „БАМ! Вы это искали?“ — использовать только после проверки координат",available:(c:Route['choices'],result:ReturnType<typeof simulate>)=>c['07']==='А'},
];
export function selectEpilogues(routes:Route[],seen:ReadonlySet<string>,random=Math.random):string[] {
 const results=routes.map(route=>({route,result:simulate(route)}));
 const eligible=epilogues.filter(e=>results.some(({route,result})=>e.available(route.choices,result)));
 const shuffle=(ids:string[])=>{for(let i=ids.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[ids[i],ids[j]]=[ids[j],ids[i]];}return ids;};
 return [...shuffle(eligible.filter(e=>!seen.has(e.id)).map(e=>e.id)),...shuffle(eligible.filter(e=>seen.has(e.id)).map(e=>e.id))].slice(0,4);
}
