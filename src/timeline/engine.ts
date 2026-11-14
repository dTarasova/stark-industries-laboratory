import {events} from './data.ts';
export const districts = ['Жилой квартал','Центр','Промзона','Транспортный узел'];
export type Route = {choices: Record<string,string>; evacuation: number[]; losses: number[]};
export const emptyRoute = (): Route => ({choices:{},evacuation:[0,1,2,3],losses:[2,3,1,0]});
export function validate(r: Route): string[] {
 const errors=events.filter(e=>!e.choices.some(c=>c.key===r.choices[e.id])).map(e=>`Выберите вариант ${e.id}: ${e.title}`);
 for(const [name,order] of [['эвакуации',r.evacuation],['потерь',r.losses]] as const) if(order.length!==4 || new Set(order).size!==4 || order.some(x=>!Number.isInteger(x)||x<0||x>3)) errors.push(`Приоритет ${name}: укажите каждый район ровно один раз`);
 return errors;
}
export function normalize(r: Route): Route {return {...r,choices:Object.fromEntries(events.filter(e=>e.choices.some(c=>c.key===r.choices[e.id])).map(e=>[e.id,r.choices[e.id]]))};}
export function simulate(r: Route) {
 const errors=validate(r); if(errors.length) throw Error(errors.join('\n'));
 const c=r.choices;const is=(id:string,k:string)=>c[id]===k;const tony=is('01','Б');
 let time=0,power=0;const destroyed=new Set<number>(),saved=new Set<number>();
 const log: {event:string;text:string;time:number;power:number}[]=[];
 const record=(event:string,text:string)=>log.push({event,text,time,power});
 const add=(id:string,t:number,p:number,text:string)=>{time+=t;power+=p;record(id,text);};
 const loss=(protect=false)=>{const d=r.losses.find(d=>!destroyed.has(d)&&!(protect&&d===1));if(d!==undefined)destroyed.add(d);};
 const rescue=(eligible:(d:number)=>boolean=()=>true)=>{const d=r.evacuation.find(d=>!saved.has(d)&&eligible(d));if(d!==undefined)saved.add(d);};
 const base01:Record<string,number[]>={'А':[1,0],'Б':[2,0],'В':[-1,1],'Г':[0,0]};
 add('01',...base01[c['01']] as [number,number], 'Переговоры завершены.');
 const base02:Record<string,number[]>={'А':[0,-2],'Б':[0,0],'В':[1,-1],'Г':[-1,1]};add('02',...base02[c['02']] as [number,number],'Подготовка команды завершена.');
 add('03',0,is('03','А')?1:-1,'Плейлист выбран.');
 const wanda=is('04','В')?'agreement':is('04','А')?(['А','В'].includes(c['01'])?'ally':'neutral'):is('01','Г')?'ally':tony?'enemy':'neutral';
 record('04',`Ванда: ${{ally:'союзница',neutral:'нейтральна',enemy:'противник',agreement:'временное соглашение'}[wanda]}.`);
 let vision=false,data=false,taken=false;
 if(is('05','А')) {taken=wanda==='enemy';vision=!taken&&(wanda==='ally'||tony);if(vision)time++;}
 if(is('05','Б')) {time-=2;power--;vision=tony&&(wanda==='ally'||wanda==='neutral');data=!vision;}
 if(is('05','В')) {time--;vision=wanda!=='enemy'||tony;}
 record('05',taken?'Колыбель захвачена Альтроном.':vision?'Вижен создан.':data?'Тело уничтожено, данные сохранены.':'Тело уничтожено, данные не получены.');
 const principle=vision?c['05P']:null;record('05P',vision?`Принцип: ${events[5].choices.find(x=>x.key===principle)!.title}`:'Вижен не создан. Принцип не применяется.');
 const thorBroken=is('06','А')&&!is('03','Б');
 const distract:Record<string,number[]>={'А':[thorBroken?-1:2,0],'Б':[1,-1],'В':[1,0],'Г':[2,-1],'Д':[0,0]};add('06',...distract[c['06']] as [number,number],thorBroken?'Энергоузел повреждён.':'Манёвр завершён.');
 add('07',0,is('07','А')?(data?1:vision?0:-1):0,is('07','Б')?'Ракета сохранена.':data?'Командный узел уничтожен.':vision?'Вспомогательный узел повреждён.':'Цель не поражена.');
 if(is('08','А')){power++;destroyed.add(2);}if(is('08','Б')){saved.add(0);if(!is('03','В'))destroyed.add(0);}record('08',is('08','В')?'Халк оставлен в резерве.':is('08','А')?'Промзона разрушена.':'Жители жилого квартала спасены.');
 if(!vision||tony)power++;record('09-0',!vision?'Роуди перехватил первую волну.':tony?'Связка Старка и Вижена.':'Цифровой перехват Вижена.');
 const dome=is('09','Б'),legion=is('09','В');const hacked=legion&&tony&&!vision;
 if(is('09','А')){if(wanda==='enemy')power-=2;if(is('08','В')){power+=2;if(!is('03','В'))loss();}}
 if(dome){if(wanda==='enemy'){power--;destroyed.add(1);}else if(wanda!=='ally'&&power<2)destroyed.add(1);if(thorBroken){destroyed.add(2);destroyed.add(3);}}
 if(legion){if(is('03','А'))power++;if(wanda==='enemy'){power--;loss();}if(hacked){power-=2;loss();}}
 const battle=power>=(dome?-2:legion?-1:0);
 if(battle&&power<(dome||legion?1:2)&&!(dome&&principle==='Б'))loss(dome&&wanda==='ally');
 record('09',`Главная битва ${battle?'выиграна':'проиграна'}.${hacked?' Протоколы легиона скомпрометированы.':''}`);
 const blocked=dome&&thorBroken;
 if(wanda==='agreement')saved.add(1);
 if(['Б','Г'].includes(c['02']))rescue(d=>d===0||d===1);
 if(principle==='В'&&(['Б','В','Г'].includes(c['06'])||(is('06','А')&&is('03','Б'))))rescue(d=>!(blocked&&d===0));
 let ordinary=time<0?1:time<2?2:time<4?3:4;if(dome)ordinary=Math.min(ordinary,2);if(legion)ordinary=Math.max(1,ordinary-1);
 for(let i=0;i<ordinary;i++)rescue(d=>!(blocked&&d===0));record('10',`Эвакуированы: ${[...saved].map(d=>districts[d]).join(', ')}.`);
 let network='active';const infected=is('11','В')&&(hacked||(tony&&!vision));
 if(is('11','А'))network='isolated';
 if(is('11','Б')&&(vision||data)){network='destroyed';if(principle!=='А'&&!data || !vision&&data)loss();}
 if(is('11','В')&&!infected)network='destroyed';
 record('11',`Резервная сеть: ${{active:'активна',isolated:'изолирована',destroyed:'уничтожена'}[network]}.`);
 const military=battle&&network!=='active'&&saved.size>=2&&(saved.has(0)||saved.has(1))&&!taken&&!infected;
 const betrayal=military&&principle==='Б';const arrest=military&&(destroyed.size>=3||(destroyed.size>=2&&(hacked||[0,1].some(d=>destroyed.has(d)&&!saved.has(d)))));
 let ending='F3',quality='Неприемлемое будущее';
 if(taken){ending='F1';quality='Новый Альтрон';}else if(infected){ending='F2';quality='Заражённая армия Старка';}else if(betrayal){ending='F4';quality='Проект «Идеальный мир»';}else if(arrest){ending='F5';quality='Последний день Мстителей';}else if(military){
 if(vision&&principle!=='Б'&&saved.size===4&&destroyed.size===0&&network==='destroyed'){ending='F6';quality='Идеальное будущее';}
 else if(saved.size===4&&destroyed.size<=1&&network==='destroyed'){ending='F7';quality='Почти идеальное будущее';}
 else {ending='F8';quality='Приемлемое будущее — '+(saved.size>=3&&destroyed.size<=1&&network==='destroyed'?'хорошее':saved.size>=3&&destroyed.size<=2?'среднее':'плохое');}}
 const anomalies=[wanda==='enemy',infected,is('06','А')&&(is('03','Б')||dome),betrayal,ending==='F5',battle&&power<0,network==='isolated'].flatMap((v,i)=>v?[`A0${i+1}`]:[]);
 return {time,power,wanda,vision,principle,data,taken,thorBroken,hacked,battle,network,military,betrayal,arrest,ending,quality,saved:[...saved],destroyed:[...destroyed],anomalies,log};
}
export type Result=ReturnType<typeof simulate>;
export type Entry={id:string;date:string;route:Route;result:Result};
export type Save={version:1;route:Route;archive:Entry[];screen:string;opened:string[];physical:boolean;active:string|null};
export function restore(raw:string|null):Save {const fallback:Save={version:1,route:emptyRoute(),archive:[],screen:'intro',opened:[],physical:false,active:null};try{const s=JSON.parse(raw||'null');if(s?.version!==1||!Array.isArray(s.archive))return fallback;const route=normalize(s.route);if(!Array.isArray(route.evacuation)||!Array.isArray(route.losses))return fallback;const archive=s.archive.filter((e:Entry)=>typeof e.id==='string'&&validate(e.route).length===0).map((e:Entry)=>({...e,result:simulate(e.route)}));return {...fallback,...s,route,archive,opened:Array.isArray(s.opened)?s.opened:[],screen:['intro','edit','archive','simulation','consequences','result'].includes(s.screen)?s.screen:'edit'};}catch{return fallback;}}
