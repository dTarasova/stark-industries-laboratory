import {useState} from 'react';
import type {events} from './data';
export function MetricIcon({kind}:{kind:'time'|'power'}){return <svg className="tl-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">{kind==='time'?<><circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 2"/></>:<path d="m13 2-8 12h6l-1 8 9-13h-6z"/>}</svg>}
const people=['ТОНИ','СТИВ','НАТАША','ТОР','БРЮС','КЛИНТ','ФЬЮРИ','ВАНДА','ПЬЕТРО','ВИЖЕН','РОУДИ','АЛЬТРОН'];
const portraitFiles=["Tony_Stark","Steve_Rogers","Natasha_Romanoff","Thor","Bruce_Banner","Clint_Barton","Nick_Fury","Wanda_Maximoff","Pietro_Maximoff","Vision","James_Rhodes","Ultron"];
function Portrait({name}:{name:string}){const index=people.findIndex(p=>name.toUpperCase().includes(p));return index<0?null:index===10?<span className="tl-portrait" aria-hidden="true" style={{backgroundImage:"url(/portraits/James_Rhodes.jpg)",backgroundSize:"200% auto",backgroundPosition:"right 15%"}}/>:<img className="tl-portrait" src={'/portraits/'+portraitFiles[index]+'.jpg'} alt="" style={{background:'none',objectFit:'cover',objectPosition:index===10?'right center':'center 25%'}}/>;}
const clean=(text:string)=>text.replace(/\*|`/g,'');
function ChoiceArtwork({title}: {title:string}) {
 const titleWords=title.toUpperCase().split(/[^А-ЯЁ]+/);
 const hasPortrait=people.some(person=>titleWords.includes(person));
 return <span className="tl-choice-art" aria-hidden="true">{hasPortrait ? <Portrait name={title}/> : <svg viewBox="0 0 96 72" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M8 36h24l24-24h32M32 36l24 24h32M32 36h56"/><circle cx="8" cy="36" r="4"/><circle cx="88" cy="12" r="4"/><circle cx="88" cy="36" r="4"/><circle cx="88" cy="60" r="4"/></svg>}</span>;
}
export function Story({text}:{text:string}){const [expanded,setExpanded]=useState(false);const paragraphs=clean(text).split(/\n\s*\n/).filter(Boolean);const long=text.length>2200;return <div className="tl-story"><div>{(long&&!expanded?paragraphs.slice(0,8):paragraphs).map((p,i)=>{const match=p.match(/^([^:]{2,35}):\s*(.*)$/s);return match?<blockquote key={i} data-speaker={match[1].split(' ')[0]}><span className="tl-speaker"><Portrait name={match[1]}/><strong>{match[1]}</strong></span><p>{match[2]}</p></blockquote>:<p className="tl-narration" key={i}>{p}</p>;})}</div>{long&&<button onClick={()=>setExpanded(!expanded)}>{expanded?'Свернуть длинный диалог':'Показать оставшиеся реплики'}</button>}</div>}
export function PilotScene({scene,selected,choose,previous,next,chapterTitle,decision,total}:{chapterTitle:string;decision:number;total:number;scene:typeof events[number];selected?:string;choose:(value:string)=>void;previous?:()=>void;next:()=>void}){
 return <article className="tl-pilot" data-scene={scene.id}>
  <div className="tl-scene-heading"><h2>{scene.id==='02'?'Обед перед битвой':scene.title}</h2><p>Решение {decision} из {total} · {chapterTitle}</p></div>
  <Story text={scene.front}/>
  <div className="tl-pilot-options">{scene.choices.map(c=><button className="tl-option" key={c.key} aria-pressed={selected===c.key} onClick={()=>choose(c.key)}>
   <ChoiceArtwork title={c.title}/><strong>{c.title}</strong><span>{clean(c.front).split('\n\n')[0]}</span><small>{selected===c.key?'Решение принято':'Выбрать этот вариант'}</small>
  </button>)}</div>
  {selected&&<section className="tl-selected-dialogue" aria-label="Реакция команды" key={selected}><Story text={scene.choices.find(c=>c.key===selected)!.front}/></section>}
  <div className="tl-scene-actions">{previous&&<button onClick={previous}>К предыдущему решению</button>}<button disabled={!selected} onClick={next}>{decision===total?'Проверить решения главы':'К следующей ситуации'}</button></div>
 </article>;
}
