import {useEffect,useState} from 'react';
import {epilogues,selectEpilogues} from './epilogues';
import {type Route,type Result} from './engine';

export function ResultReport({result}:{result:Result}) {
 return <p className="tl-result-report">Спасено {result.saved.length}/4 · Разрушено {result.destroyed.length}/4 · Сеть: {result.network==='destroyed'?'уничтожена':result.network==='isolated'?'изолирована':'активна'}</p>;
}

type History=Record<string,string[]>;
function readHistory(key:string):History {
 try {
  const value=JSON.parse(localStorage.getItem(key)||'{}');
  if(!value||typeof value!=='object'||Array.isArray(value))return {};
  return Object.fromEntries(Object.entries(value).filter((entry):entry is [string,string[]]=>Array.isArray(entry[1])&&entry[1].every(id=>typeof id==='string'&&epilogues.some(e=>e.id===id))));
 } catch {return {};}
}

// Mount with a key matching the line: a result keeps its selection when revisited.
export function ResultEpilogues({mission,lineId,routes}:{mission:number;lineId:string;routes:Route[]}) {
 const storageKey=`surkov.timeline.epilogues.v1:${mission}`;
 const [ids]=useState(()=>{
  const history=readHistory(storageKey);
  return history[lineId]??selectEpilogues(routes,new Set(Object.values(history).flat()));
 });
 const [error,setError]=useState(false);
 useEffect(()=>{
  try {localStorage.setItem(storageKey,JSON.stringify({...readHistory(storageKey),[lineId]:ids}));setError(false);}
  catch {setError(true);}
 },[storageKey,lineId,ids]);
 if(!ids.length)return null;
 return <div className="tl-epilogues"><h3>Шуточные эпилоги</h3><p>Из событий исследованных временных линий.</p>{ids.map(id=>{
  const e=epilogues.find(e=>e.id===id)!;
  return <article key={id}><h4>{e.title}</h4><p>{e.text}</p></article>;
 })}{ids.length<4&&<p>Остальные эпилоги пока не открыты. Исследуйте другие решения.</p>}{error&&<p role="alert">Не удалось сохранить подборку эпилогов. После обновления страницы она может измениться.</p>}</div>;
}
