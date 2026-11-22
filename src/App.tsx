import {VictoryFinale} from './VictoryFinale';
import {useEffect,useState,useRef,type ReactNode} from 'react';
import './style.css';
import {FounderArchive} from './FounderArchive';
import {LaboratoryOverview, badgeNames} from './LaboratoryOverview';
import {UltronTerminal} from './UltronTerminal';
import {Dummy} from './Dummy';
import {Development} from './Development';
import {CleanSlate} from './clean-slate/CleanSlate';

import {UltronBattle} from './UltronBattle';
export type Mission={edithUnlocked:boolean;stage:number;version:number;stages:string[];elementDiscovered?:number;timelineFound:number;victory:number;codeforces:number;badges:number;defenseAuthorized:number;takeoverEndsAt:number|null;takeoverDuration:number;serverTime:number;missionRun:number;recoveryRequested:number;recoveryHints:string[];ultronBattle:'inactive'|'active'|'won'};
type MissionSnapshot = Mission & {receivedAt:number; takeoverDeadline:number|null};
export function App({experiment, allowOfflineExperiment = false}: {
 experiment?: ReactNode;
 allowOfflineExperiment?: boolean;
} = {}){
 const [mission,setMission]=useState<MissionSnapshot>();const [error,setError]=useState('');const [online,setOnline]=useState(false);const [password,setPassword]=useState('');const [auth,setAuth]=useState(false);const [selected,setSelected]=useState(0);const [pending,setPending]=useState<{stage:number;version:number}>();const [busy,setBusy]=useState(false);
 const [hintDraft, setHintDraft] = useState<{stage:number; text:string}>();

 const [codeforces,setCodeforces]=useState(false);
 const [clock, setClock] = useState(0);
 const [checkedConnection, setCheckedConnection] = useState(false);
 const [command, setCommand] = useState<{path:string;label:string;version:number}>();
 const fetching=useRef(false);
 const goals=['Осмотритесь в лаборатории. Следующее задание объявит ведущая.','Получите код EDITH для текущей разработки.','Найдите структуру нового элемента.','Получите задание от ведущей.','Следуйте инструкциям резервного канала.','Исследуйте временные линии и найдите исход, ведущий к победе над Альтроном.','Верните JARVIS по инструкции ведущей.','Подготовьтесь к окончательному отключению Альтрона.','Миссия завершена. Сохраните воспоминания об этом дне.'];
 const pathname = location.pathname;
 const control = pathname === '/control';
 const isArchive = pathname === '/archive';
 const isDevelopment = pathname === '/development';
 const isCleanSlate = pathname === '/clean-slate';
 const battleWon = mission?.stage === 7 && mission.ultronBattle === 'won';
 const showBattle = !control && mission?.stage === 7 &&
   (mission.ultronBattle === 'active' || (battleWon && pathname === '/battle-with-ultron'));
 useEffect(() => {
   if (!showBattle) return;
   if (location.pathname !== '/battle-with-ultron') history.replaceState(null, '', '/battle-with-ultron');
   const previousTitle = document.title;
   document.title = 'BATTLE WITH ULTRON | SURKOV INDUSTRIES';
   return () => {
     document.title = location.pathname === '/battle-with-ultron' ? laboratoryTitle : previousTitle;
   };
 }, [showBattle]);
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
   try {acceptMission(await post(path, {version,codeforces}));}
   finally {await refresh();}
 }
 const recovery = mission?.stage === 5;
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
     {!control && mission && mission.stage === 7 && (!mission.codeforces || battleWon) && !isCleanSlate && <p><a href="/clean-slate">Открыть Clean Slate / DUM-E</a></p>}
     {!control && mission && <ul>{Boolean(mission.elementDiscovered) && <li>Найденный химический элемент</li>}{Boolean(mission.timelineFound) && <li>Успешная временная линия</li>}{Boolean(mission.victory) && <><li>Выстроена планетарная защита</li><li>Победа над Альтроном</li></>}</ul>}{!control && error && <p role="alert">{error}</p>}
   </section>
 );
 if (!control) {
   if (mission?.stage === 6) return <main><h1>Успешная временная линия</h1><img src="/assets/dr_strange.jpg" alt="Медитирующий Стрэндж среди временных линий" style={{width:"100%",maxWidth:800}} /><p>{mission.codeforces ? 'Среди множества возможных исходов найдена временная линия, ведущая к победе. Теперь вы знаете, как остановить Альтрона. Осталось воплотить этот исход' : 'Поздравляю с победой! Основные силы Альтрона уничтожены, но копии его сознания сохранились в нескольких костюмах. Запустите протокол Clean Slate, чтобы устранить угрозу окончательно'}</p><button disabled={busy || !online} onClick={() => void action(async () => {acceptMission(await post('continue-timeline',{version:mission.version,missionRun:mission.missionRun})); location.href=mission.codeforces ? '/battle-with-ultron' : '/clean-slate';})}>{mission.codeforces ? 'Воплотить' : 'Запустить Clean Slate'}</button>{error && <p role="alert">{error}</p>}</main>;

   if (mission?.stage === 8 && !new URLSearchParams(location.search).has('results')) return <VictoryFinale />;
   if (mission?.stage === 7 && !showBattle) return <CleanSlate key={mission.missionRun} mission={mission.missionRun} />;
   if (showBattle) return <UltronBattle won={battleWon} />;
   const captured = mission?.stage === 4;
   const showExperiment = Boolean(mission) || (allowOfflineExperiment && checkedConnection);
   const showOverview = mission && (captured || (!experiment && !isArchive && !isDevelopment && !isCleanSlate));
   const elapsed = (mission?.takeoverDuration ?? 0) - Math.max(0, remaining);
   return (
     <>
       {showExperiment && experiment && <div hidden={captured || recovery}>{experiment}</div>}
       {!mission && !(showExperiment && experiment) && <main>{missionSummary}<Dummy /></main>}
       {showOverview && !recovery && (
         <div className="takeover-backdrop" data-captured={captured && elapsed >= 36000} inert={captured}>
           <LaboratoryOverview key={mission.missionRun} stage={mission.stage} elementDiscovered={Boolean(mission.elementDiscovered)} badges={mission.badges}
             cleanSlateComplete={Boolean(mission.victory)} captured={captured} edithUnlocked={mission.edithUnlocked}>{missionSummary}</LaboratoryOverview>
         </div>
       )}
       {mission && isCleanSlate && !captured && !recovery && (
         (mission.stage === 8 || (mission.stage === 7 && (!mission.codeforces || mission.ultronBattle === 'won')))
           ? <CleanSlate key={mission.missionRun} mission={mission.missionRun} />
           : <main><h1>Clean Slate / DUM-E</h1><p>Панель откроется после выполнения текущего задания.</p><a href="/">В лабораторию</a></main>
       )}
       {captured && <UltronTerminal elapsed={elapsed} finished={!playing} />}
       {recovery && (
         <main className="recovery-channel">
           <header><span>SURKOV INDUSTRIES</span><small>ВНЕШНЕЕ УПРАВЛЕНИЕ</small></header>
           <h1>Резервный канал</h1><p className="recovery-status" role="status">Соединение установлено. Локальный канал доступен.</p>
           <section className="recovery-next" aria-labelledby="recovery-next-title">
             <h2 id="recovery-next-title">Будущее ещё можно изменить</h2>
             <p>Альтрон контролирует лабораторию. Исследуйте временные линии, чтобы найти исход, в котором его удастся остановить.</p>
             <a className="recovery-timeline-link" href="/timelines">Открыть временные линии <span aria-hidden="true">→</span></a>
             <p className="recovery-next-help">Если понадобится подсказка, обратитесь к Дамми ниже.</p>
           </section>
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
       {mission && !captured && !recovery && isDevelopment && <Development key={mission.missionRun} mission={mission.missionRun} unlocked={mission.edithUnlocked} onUnlock={acceptMission} />}
     </>
   );
 }

 const availableCommand = mission?.stage === 5
   ? {path:'confirm-timeline',label:'Игрок успешно нашёл временные линии',version:mission.version}
   : mission?.stage === 3 && !mission.defenseAuthorized
   ? {path:'authorize-defense', label:'Игрок успешно прошёл испытание', version:mission.version}
   : mission?.stage === 4 && !playing
     ? {path:'open-recovery', label:'Открыть резервный канал', version:mission.version}
     : mission?.stage === 7 && mission.ultronBattle === 'inactive' && Boolean(mission.codeforces)
       ? {path:'open-ultron-battle', label:'Включить BATTLE WITH ULTRON', version:mission.version}
       : mission?.stage === 7 && mission.ultronBattle === 'active'
         ? {path:'confirm-ultron-battle', label:'Подтвердить успешное решение', version:mission.version}
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
 const storyControls = auth && mission && (
   <section>
     <h2>Сюжетные команды</h2>{!availableCommand && !playing && <p>Сейчас действий ведущей не требуется. Пульт обновляется автоматически.</p>}
     {mission?.stage === 5 && <label><input type="checkbox" checked={codeforces} onChange={e=>setCodeforces(e.target.checked)} />Включить Codeforces</label>}{playing && <p>Идёт сцена захвата.</p>}
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
 return <main className="control-panel"><header><span>SURKOV INDUSTRIES</span><small>ПУЛЬТ ВЕДУЩЕЙ</small></header><h1>Управление миссией</h1><div className="control-feedback" aria-live="polite">{busy && <p role="status">Выполняем команду…</p>}{error && <p role="alert">{error}</p>}</div><div className="control-state"><p role="status">{online ? 'Связь установлена' : 'Нет связи — команды недоступны'}</p><h2>{mission?.stages[mission.stage] ?? 'Подключаемся…'}</h2></div>{storyControls}{recoveryControls}{dummyReset}{auth && mission && <section><h2>Начать заново</h2><p>Очистить достижения, открытые данные и прогресс на всех устройствах.</p><button disabled={busy || !online} onClick={() => {
 if (window.confirm('Очистить весь прогресс и вернуть квест к начальному экрану на всех устройствах?')) void action(async () => {
  try {await post('restart', {version:mission.version}); setPending(undefined); setCommand(undefined); setHintDraft(undefined); setCodeforces(false);} finally {await refresh();}
 });
}}>Restart</button></section>}{control&&!auth&&<form onSubmit={e=>{e.preventDefault();void action(async()=>{await post('login',{password});setPassword('');setAuth(true);});}}><label>Пароль ведущей<input type="password" autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)} required/></label><button disabled={busy}>Войти</button></form>}{control&&auth&&mission&&<details onToggle={e=>{if(!e.currentTarget.open)setPending(undefined);}}><summary>Аварийное управление</summary><p>Смена этапа восстановит его начальное состояние на всех устройствах. Будущие открытия и черновики будут сброшены.</p><label>Новый этап<select value={selected} onChange={e=>setSelected(Number(e.target.value))}>{mission.stages.map((s,i)=><option key={s} value={i}>{s}</option>)}</select></label><button disabled={busy||!online} onClick={()=>setPending({stage:selected,version:mission.version})}>Сменить этап…</button>{pending&&<div role="group" aria-label="Подтверждение смены этапа"><p>Переключить миссию на «{mission.stages[pending.stage]}» для всех устройств?</p><button disabled={busy||!online} onClick={()=>void action(async()=>{try{await post('mission',pending);}finally{setPending(undefined);await refresh();}})}>Подтвердить</button><button disabled={busy} onClick={()=>setPending(undefined)}>Отмена</button></div>}<button disabled={busy} onClick={()=>void action(async()=>{await post('logout',{});setAuth(false);setPending(undefined);setCommand(undefined);setHintDraft(undefined);})}>Выйти из пульта</button></details>}{auth && mission && (
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
const laboratoryTitle = document.title;
if (isArchive) document.title = 'Архив проектов основателя | SURKOV INDUSTRIES';
const isDevelopment = location.pathname === '/development';
if (isDevelopment) document.title = 'Текущая разработка | SURKOV INDUSTRIES';

if (location.pathname === '/clean-slate') document.title = 'Clean Slate / DUM-E | SURKOV INDUSTRIES';

