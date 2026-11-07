import React,{useEffect,useState,useRef} from 'react';
import {createRoot} from 'react-dom/client';
import './style.css';
import {FounderArchive} from './FounderArchive';
import {LaboratoryOverview, badgeNames} from './LaboratoryOverview';
type Mission={stage:number;version:number;stages:string[];elementDiscovered?:boolean;badges:number};
function App(){
 const [mission,setMission]=useState<Mission>();const [error,setError]=useState('');const [online,setOnline]=useState(false);const [password,setPassword]=useState('');const [auth,setAuth]=useState(false);const [selected,setSelected]=useState(0);const [pending,setPending]=useState<{stage:number;version:number}>();const [busy,setBusy]=useState(false);
 const fetching=useRef(false);
 const goals=['Осмотритесь в лаборатории. Следующее задание объявит ведущая.','Получите код EDITH для текущей разработки.','Найдите структуру нового элемента.','Подготовьте защиту Земли по заданию ведущей.','Следуйте инструкциям резервного канала.','Исследуйте варианты будущего по материалам ведущей.','Верните JARVIS по инструкции ведущей.','Подготовьтесь к окончательному отключению Альтрона.','Миссия завершена. Сохраните воспоминания об этом дне.'];
 const control=location.pathname==='/control';
 async function refresh(){if(fetching.current)return;fetching.current=true;try{const r=await fetch('/api/mission',{signal:AbortSignal.timeout(8000)});if(!r.ok)throw Error();const next:Mission=await r.json();setMission(current=>!current||next.version>=current.version?next:current);setOnline(true);}catch{setOnline(false);}finally{fetching.current=false;}}
 useEffect(()=>{void refresh();const id=setInterval(refresh,2000);return()=>clearInterval(id);},[]);
 async function post(path:string,body:unknown){const r=await fetch('/api/'+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});const data=await r.json();if(!r.ok){if(r.status===401)setAuth(false);throw Error(data.error);}return data;}
 async function action(fn:()=>Promise<void>){setBusy(true);setError('');try{await fn();}catch(e){setError(e instanceof Error?e.message:'Нет связи. Повторите попытку.');}finally{setBusy(false);}}
 const missionSummary = (
   <section>
     <p role="status">{online ? 'Связь с лабораторией установлена' : 'Нет связи с лабораторией'}</p>
     <h2>{mission?.stages[mission.stage] ?? 'Получаем состояние…'}</h2>
     <p>{mission ? goals[mission.stage] : 'Ожидайте подключения.'}</p>
   </section>
 );
 if (!control) return <LaboratoryOverview stage={mission?.stage} elementDiscovered={mission?.elementDiscovered === true} badges={mission?.badges}>{missionSummary}</LaboratoryOverview>;

 return <main><header><span>SURKOV INDUSTRIES</span><small>ЛАБОРАТОРИЯ · 28</small></header><h1>Пульт ведущей</h1>{missionSummary}{control&&!auth&&<form onSubmit={e=>{e.preventDefault();void action(async()=>{await post('login',{password});setPassword('');setAuth(true);});}}><label>Пароль ведущей<input type="password" autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)} required/></label><button disabled={busy}>Войти</button></form>}{control&&auth&&mission&&<section><label>Новый этап<select value={selected} onChange={e=>setSelected(Number(e.target.value))}>{mission.stages.map((s,i)=><option key={s} value={i}>{s}</option>)}</select></label><button disabled={busy||!online} onClick={()=>setPending({stage:selected,version:mission.version})}>Сменить этап…</button>{pending&&<div role="group" aria-label="Подтверждение смены этапа"><p>Переключить миссию на «{mission.stages[pending.stage]}» для всех устройств?</p><button disabled={busy||!online} onClick={()=>void action(async()=>{try{await post('mission',pending);}finally{setPending(undefined);await refresh();}})}>Подтвердить</button><button disabled={busy} onClick={()=>setPending(undefined)}>Отмена</button></div>}<button disabled={busy} onClick={()=>void action(async()=>{await post('logout',{});setAuth(false);setPending(undefined);})}>Выйти</button></section>}{auth && mission && (
  <section>
    <h2>Бейджи основателя</h2>
    {badgeNames.map((name, badge) => {
      const active = Boolean(mission.badges & (1 << badge));
      return (
        <button key={name} type="button" disabled={busy || !online} aria-pressed={active} onClick={() => void action(async () => {
          try {
            const updated = await post('badge', {badge, active: !active, version: mission.version}) as Pick<Mission, 'stage' | 'version' | 'badges'>;
            setMission(current => current && updated.version >= current.version ? {...current, ...updated} : current);
          } finally {
            await refresh();
          }
        })}>{name} · {active ? 'Вручён' : 'Ожидает вручения'}</button>
      );
    })}
  </section>
)}{error&&<p role="alert">{error}</p>}<footer>29 ноября 2026 · Личная лаборатория</footer></main>;
}

const isArchive = location.pathname === '/archive';
if (isArchive) document.title = 'Архив проектов основателя | SURKOV INDUSTRIES';
const isDevelopment = location.pathname === '/development';
if (isDevelopment) document.title = 'Текущая разработка | SURKOV INDUSTRIES';

function ClosedDevelopment() {
  return (
    <main>
      <header><span>SURKOV INDUSTRIES</span><a href="/">Лаборатория</a></header>
      <h1>Текущая разработка</h1>
      <p>Доступ закрыт · EDITH</p>
      <p>Проверка кода пока недоступна.</p>
    </main>
  );
}

createRoot(document.getElementById('root')!).render(
  isArchive ? <FounderArchive /> : isDevelopment ? <ClosedDevelopment /> : <App />
);

