import {events} from './src/timeline/data.ts';
import {simulate,emptyRoute} from './src/timeline/engine.ts';
const totals={},anomalies=new Set(),examples={},unique=new Set();let count=0;const r=emptyRoute();
function visit(i){if(i===events.length){const a=simulate(r);count++;if(JSON.stringify(a)!==JSON.stringify(simulate(r)))throw Error('Недетерминированный результат');unique.add(events.filter(e=>e.id!=='05P'||a.vision).map(e=>r.choices[e.id]).join(''));totals[a.quality]=(totals[a.quality]||0)+1;a.anomalies.forEach(x=>anomalies.add(x));examples[a.ending]??=events.map(e=>r.choices[e.id]).join('');return;}for(const c of events[i].choices){r.choices[events[i].id]=c.key;visit(i+1);}}
visit(0);console.log(JSON.stringify({count,unique:unique.size,totals,anomalies:[...anomalies].sort(),examples},null,2));

if(Object.keys(totals).length!==10||anomalies.size!==7)throw Error('Не все финалы или аномалии достижимы');
