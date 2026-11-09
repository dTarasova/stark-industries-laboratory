import {useEffect,useState,useRef,type ReactNode} from 'react';
import './style.css';
import {FounderArchive} from './FounderArchive';
import {LaboratoryOverview, badgeNames} from './LaboratoryOverview';
import {UltronTerminal} from './UltronTerminal';
import {Dummy} from './Dummy';
import {Development} from './Development';
export type Mission={edithUnlocked:boolean;stage:number;version:number;stages:string[];elementDiscovered?:boolean;badges:number;defenseAuthorized:number;takeoverEndsAt:number|null;takeoverDuration:number;serverTime:number;missionRun:number;recoveryRequested:number;recoveryHints:string[]};
type MissionSnapshot = Mission & {receivedAt:number; takeoverDeadline:number|null};
export function App({experiment, allowOfflineExperiment = false}: {
 experiment?: ReactNode;
 allowOfflineExperiment?: boolean;
} = {}){
 const [mission,setMission]=useState<MissionSnapshot>();const [error,setError]=useState('');const [online,setOnline]=useState(false);const [password,setPassword]=useState('');const [auth,setAuth]=useState(false);const [selected,setSelected]=useState(0);const [pending,setPending]=useState<{stage:number;version:number}>();const [busy,setBusy]=useState(false);
 const [hintDraft, setHintDraft] = useState<{stage:number; text:string}>();
 const [clock, setClock] = useState(0);
 const [checkedConnection, setCheckedConnection] = useState(false);
 const [command, setCommand] = useState<{path:string;label:string;version:number}>();
 const fetching=useRef(false);
 const goals=['Осмотритесь в лаборатории. Следующее задание объявит ведущая.','Получите код EDITH для текущей разработки.','Найдите структуру нового элемента.','Подготовьте защиту Земли по заданию ведущей.','Следуйте инструкциям резервного канала.','Исследуйте варианты будущего по материалам ведущей.','Верните JARVIS по инструкции ведущей.','Подготовьтесь к окончательному отключению Альтрона.','Миссия завершена. Сохраните воспоминания об этом дне.'];
 const control=location.pathname==='/control';
 function acceptMission(next: Mission) {
   const receivedAt = performance.now();
   setMission(current => {
     if (current && (next.version < current.version ||
       (next.version === current.version && next.serverTime < current.serverTime))) return current;
     const deadline = next.takeoverEndsAt === null ? null : receivedAt + next.takeoverEndsAt - next.serverTime;
     const sameTakeover = current?.takeoverEndsAt === next.takeoverEndsAt;
     const takeoverDeadline = deadline !== null && sameTakeover && current?.takeoverDeadline != null
       ? Math.min(deadline, current.takeoverDeadline)
       : deadline;
     return {...next, receivedAt, takeoverDeadline};
   });
 }
 async function refresh(){if(fetching.current)return;fetching.current=true;try{const r=await fetch('/api/mission',{signal:AbortSignal.timeout(8000)});if(!r.ok)throw Error();acceptMission(await r.json());setOnline(true);}catch{setOnline(false);}finally{fetching.current=false;setCheckedConnection(true);}}
 useEffect(() => {
   void refresh();
   const id = window.setInterval(refresh, 2000);
   function refreshVisibleTab() {
     if (!document.hidden) void refresh();
   }
   document.addEventListener('visibilitychange', refreshVisibleTab);
   return () => {
     window.clearInterval(id);
     document.removeEventListener('visibilitychange', refreshVisibleTab);
   };
 }, []);
 const remaining = mission?.takeoverDeadline != null
   ? mission.takeoverDeadline - Math.max(clock, mission.receivedAt)
   : 0;
 const playing = mission?.stage === 4 && remaining > 0;
 useEffect(() => {
   if (!playing) return;
   const tick = () => setClock(performance.now());
   tick();
   const timer = window.setInterval(tick, 100);
   return () => window.clearInterval(timer);
 }, [playing]);
 async function post(path:string,body:unknown){const r=await fetch('/api/'+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});const data=await r.json();if(!r.ok){if(r.status===401)setAuth(false);throw Error(data.error);}return data;}
 async function action(fn:()=>Promise<void>){setBusy(true);setError('');try{await fn();}catch(e){setError(e instanceof Error?e.message:'Нет связи. Повторите попытку.');}finally{setBusy(false);}}
 async function runCommand(path:string, version:number) {
   try {acceptMission(await post(path, {version}));}
   finally {await refresh();}
 }
 const recovery = mission?.stage === 5 || mission?.stage === 6;
 const missionSummary = (
   <section>
     <p role="status">{online ? 'Связь с лабораторией установлена' : 'Нет связи с лабораторией'}</p>
     <h2>{mission?.stages[mission.stage] ?? 'Получаем состояние…'}</h2>
     <p>{mission?.stage === 1 && mission.edithUnlocked
       ? 'Откройте «Текущую разработку», чтобы исследовать новый элемент.'
       : mission ? goals[mission.stage] : 'Ожидайте подключения.'}</p>
     {!control && mission?.stage === 3 && (mission.defenseAuthorized
       ? <button disabled={busy || !online} onClick={() => void action(() => runCommand('activate-defense', mission.version))}>Активировать планетарную защиту</button>
       : <p>Ожидайте разрешения ведущей на запуск.</p>)}
     {!control && error && <p role="alert">{error}</p>}
   </section>
 );
 if (!control) {
   const captured = mission?.stage === 4;
   const showExperiment = Boolean(mission) || (allowOfflineExperiment && checkedConnection);
   const showOverview = mission && (captured || (!experiment && !isArchive && !isDevelopment));
   const elapsed = (mission?.takeoverDuration ?? 0) - Math.max(0, remaining);
   return (
     <>
       {showExperiment && experiment && <div hidden={captured || recovery}>{experiment}</div>}
       {!mission && !(showExperiment && experiment) && <main>{missionSummary}<Dummy /></main>}
       {showOverview && !recovery && (
         <div className="takeover-backdrop" data-captured={captured && elapsed >= 36000} inert={captured}>
           <LaboratoryOverview stage={mission.stage} elementDiscovered={mission.elementDiscovered === true} badges={mission.badges}
             captured={captured} edithUnlocked={mission.edithUnlocked}>{missionSummary}</LaboratoryOverview>
         </div>
       )}
       {captured && <UltronTerminal elapsed={elapsed} finished={!playing} />}
       {recovery && (
         <main className="recovery-channel">
           <header><span>SURKOV INDUSTRIES</span><small>ВНЕШНЕЕ УПРАВЛЕНИЕ</small></header>
           <h1>Резервный канал</h1><p className="recovery-status" role="status">Локальный канал открыт. Восстановление доступно.</p>
           {missionSummary}
           <Dummy>
             <button type="button" disabled={busy || !online || Boolean(mission.recoveryRequested)}
               onClick={() => void action(() => runCommand('recovery-request', mission.version))}>
               {mission.recoveryRequested ? 'Запрос передан ведущей' : 'Дамми, помоги'}
             </button>
             <div role="log" aria-label="Подсказки Дамми">
               {mission.recoveryHints.map((hint, index) => <p key={index}>{hint}</p>)}
             </div>
           </Dummy>
         </main>
       )}
       {mission && !captured && !recovery && isArchive && <FounderArchive />}
       {mission && !captured && !recovery && isDevelopment && <Development mission={mission.missionRun} unlocked={mission.edithUnlocked} onUnlock={acceptMission} />}
     </>
   );
 }

 const availableCommand = mission?.stage === 3 && !mission.defenseAuthorized
   ? {path:'authorize-defense', label:'Разрешить запуск планетарной защиты', version:mission.version}
   : mission?.stage === 4 && !playing
     ? {path:'open-recovery', label:'Открыть резервный канал', version:mission.version}
     : undefined;

 const hint = mission && hintDraft?.stage === mission.stage ? hintDraft.text : '';
 const recoveryControls = auth && mission && recovery && (
   <form onSubmit={event => {
     event.preventDefault();
     void action(async () => {
       try {
         acceptMission(await post('recovery-hint', {hint, version: mission.version}));
         setHintDraft(undefined);
       } finally {
         await refresh();
       }
     });
   }}>
     <h2>Помощь Дамми</h2>
     <p role="status">{mission.recoveryRequested ? 'Участник просит помощи' : 'Новых запросов нет'}</p>
     <label>Подсказка участнику
       <textarea value={hint} maxLength={500} required disabled={busy}
         onChange={event => setHintDraft({stage:mission.stage, text:event.target.value})} />
     </label>
     <button disabled={busy || !online || !hint.trim()}>Отправить от Дамми</button>
   </form>
 );
 const dummyReset = auth && mission?.stage === 0 && (
   <button type="button" disabled={busy || !online} onClick={() => {
     if (window.confirm('Начать новую выдачу предметов Дамми для всех устройств?')) {
       void action(() => runCommand('reset-dummy', mission.version));
     }
   }}>Сбросить выдачу Дамми…</button>
 );
 const storyControls = auth && (availableCommand || playing) && (
   <section>
     <h2>Планетарная защита</h2>
     {playing && <p>Идёт сцена захвата.</p>}
     {availableCommand && <button disabled={busy || !online} onClick={() => setCommand(availableCommand)}>{availableCommand.label}…</button>}
     {command && command.path === availableCommand?.path && command.version === availableCommand.version && (
       <div role="group" aria-label="Подтверждение сюжетной команды">
         <p>{command.label} для всех устройств?</p>
         <button disabled={busy || !online} onClick={() => {
           setCommand(undefined);
           void action(() => runCommand(command.path, command.version));
         }}>Подтвердить</button>
         <button disabled={busy} onClick={() => setCommand(undefined)}>Отмена</button>
       </div>
     )}
   </section>
 );
 return <main><header><span>SURKOV INDUSTRIES</span><small>ЛАБОРАТОРИЯ · 28</small></header><h1>Пульт ведущей</h1>{missionSummary}{storyControls}{recoveryControls}{dummyReset}{control&&!auth&&<form onSubmit={e=>{e.preventDefault();void action(async()=>{await post('login',{password});setPassword('');setAuth(true);});}}><label>Пароль ведущей<input type="password" autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)} required/></label><button disabled={busy}>Войти</button></form>}{control&&auth&&mission&&<section><label>Новый этап<select value={selected} onChange={e=>setSelected(Number(e.target.value))}>{mission.stages.map((s,i)=><option key={s} value={i}>{s}</option>)}</select></label><button disabled={busy||!online} onClick={()=>setPending({stage:selected,version:mission.version})}>Сменить этап…</button>{pending&&<div role="group" aria-label="Подтверждение смены этапа"><p>Переключить миссию на «{mission.stages[pending.stage]}» для всех устройств?</p><button disabled={busy||!online} onClick={()=>void action(async()=>{try{await post('mission',pending);}finally{setPending(undefined);await refresh();}})}>Подтвердить</button><button disabled={busy} onClick={()=>setPending(undefined)}>Отмена</button></div>}<button disabled={busy} onClick={()=>void action(async()=>{await post('logout',{});setAuth(false);setPending(undefined);setCommand(undefined);setHintDraft(undefined);})}>Выйти</button></section>}{auth && mission && (
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
