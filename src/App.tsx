import {VictoryFinale} from './VictoryFinale';
import {useEffect,useState,useRef,type ReactNode} from 'react';
import './style.css';
import {FounderArchive} from './FounderArchive';
import {LaboratoryOverview, badgeNames} from './LaboratoryOverview';
import {UltronTerminal} from './UltronTerminal';
import {Dummy} from './Dummy';
import {Development} from './Development';
import {CleanSlate} from './clean-slate/CleanSlate';
import {missionAchievements} from './missionAchievements';

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
 const [checkedAuth, setCheckedAuth] = useState(false);
 const [refreshing, setRefreshing] = useState(false);
 const [lastUpdated, setLastUpdated] = useState<number>();
 const [syncClock, setSyncClock] = useState(Date.now());
 const [command, setCommand] = useState<{path:string;label:string;version:number}>();
 const fetching=useRef<Promise<void> | null>(null);
 const refreshController=useRef<AbortController | null>(null);
 const goals=['Сэр, осмотритесь. До сигнала ведущей лаборатория в вашем распоряжении.','Получите код EDITH. Архив Старка умеет хранить секреты — даже от нас.','Восстановите структуру нового элемента. Сэр, периодическая таблица явно оставила место для вашего вмешательства.','Примите задание у ведущей. Контур планетарной защиты ожидает разрешения на запуск.','Основной канал скомпрометирован. Следуйте инструкциям резервного канала.','Исследуйте временные линии. Среди возможных исходов нужен тот, в котором Альтрон проигрывает.','Восстановите JARVIS по инструкции ведущей. Лаборатории нужен её голос.','Альтрон сохранил резервные копии. Пора закрыть и этот вопрос.','Угроза устранена, сэр. Рекомендую сохранить воспоминания: такие дни не стоит оставлять только в оперативной памяти.'];
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
 function refresh(): Promise<void> {
   if(fetching.current) return fetching.current;
   const controller=new AbortController();
   refreshController.current=controller;
   const timeout=window.setTimeout(()=>controller.abort(),8000);
   setRefreshing(true);
   fetching.current=(async()=>{
     try {
       const r=await fetch(control ? '/api/control-state' : '/api/mission',{
         signal:controller.signal,cache:'no-store',credentials:'same-origin',
       });
       if(!r.ok) throw Error();
       const data=await r.json();
       if(control) {setAuth(data.authenticated===true);setCheckedAuth(true);}
       acceptMission(control ? data.mission : data);
       setLastUpdated(Date.now());setSyncClock(Date.now());setOnline(true);
     } catch {setOnline(false);}
     finally {
       window.clearTimeout(timeout);fetching.current=null;refreshController.current=null;
       setRefreshing(false);setCheckedConnection(true);
     }
   })();
   return fetching.current;
 }
 useEffect(() => {
   void refresh();
   const id = window.setInterval(refresh, 2000);
   function refreshVisibleTab() {
     if (!document.hidden) void refresh();
   }
   document.addEventListener('visibilitychange', refreshVisibleTab);
   window.addEventListener('online', refreshVisibleTab);
   window.addEventListener('focus', refreshVisibleTab);
   return () => {
     window.clearInterval(id);
     document.removeEventListener('visibilitychange', refreshVisibleTab);
     window.removeEventListener('online', refreshVisibleTab);
     window.removeEventListener('focus', refreshVisibleTab);
     refreshController.current?.abort();
   };
 }, []);
 useEffect(()=>{
   if(!control) return;
   const timer=window.setInterval(()=>setSyncClock(Date.now()),1000);
   return ()=>window.clearInterval(timer);
 },[control]);
 const stale=control && lastUpdated!==undefined && syncClock-lastUpdated>10000;
 const connected=online && !stale;
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
 const recovery = mission?.stage === 5 && new URLSearchParams(location.search).get('channel') === 'reserve';
 const recoveryAvailable = mission?.stage === 5;
 useEffect(() => {
   if (recovery && !control) document.getElementById('recovery-next-title')?.focus();
 }, [recovery, control]);
 const achievements = mission && missionAchievements(mission);
 const missionSummary = (
   <section className="mission-summary">
     <p className="connection-status" data-online={online} role="status">{online ? 'Связь с лабораторией установлена' : 'Нет связи с лабораторией'}</p>
     <h2>{mission?.stages[mission.stage] ?? 'Получаем состояние…'}</h2>
     <p>{mission?.stage === 1 && mission.edithUnlocked
       ? 'Откройте «Текущую разработку», чтобы исследовать новый элемент.'
       : mission ? goals[mission.stage] : 'Ожидайте подключения.'}</p>
     {!control && mission?.stage === 3 && (mission.defenseAuthorized
       ? <button disabled={busy || !connected} onClick={() => void action(() => runCommand('activate-defense', mission.version))}>Активировать планетарную защиту</button>
       : <p>Ожидайте разрешения ведущей на запуск.</p>)}
     {!control && mission && mission.stage === 7 && (!mission.codeforces || battleWon) && !isCleanSlate && <p><a href="/clean-slate">Открыть Clean Slate / DUM-E</a></p>}
     {!control && achievements && <ul>{achievements.elementDiscovered && <li>Найденный химический элемент</li>}{achievements.planetaryDefense && <li>Выстроена планетарная защита</li>}{achievements.timelineFound && <li>Успешная временная линия</li>}{achievements.victory && <li>Победа над Альтроном</li>}</ul>}{!control && error && <p role="alert">{error}</p>}
   </section>
 );
 if (!control) {
   if (mission?.stage === 6) return <main className="timeline-success"><h1>Нужная временная линия найдена</h1><img src="/assets/dr_strange.jpg" alt="Медитирующий Стрэндж среди временных линий" style={{width:"100%",maxWidth:800}} /><p>{mission.codeforces ? 'Среди множества возможных исходов найдена временная линия, ведущая к победе. Теперь вы знаете, как остановить Альтрона. Осталось воплотить этот исход' : 'Поздравляю с победой! Основные силы Альтрона уничтожены, но копии его сознания сохранились в нескольких костюмах. Запустите протокол Clean Slate, чтобы устранить угрозу окончательно'}</p><button disabled={busy || !connected} onClick={() => void action(async () => {acceptMission(await post('continue-timeline',{version:mission.version,missionRun:mission.missionRun})); location.href=mission.codeforces ? '/battle-with-ultron' : '/clean-slate';})}>{mission.codeforces ? 'Перейти к боевому протоколу' : 'Запустить Clean Slate'}</button>{error && <p role="alert">{error}</p>}</main>;

   if (mission?.stage === 8 && !new URLSearchParams(location.search).has('results')) return <VictoryFinale />;
   if (mission?.stage === 7 && !showBattle) return <CleanSlate key={mission.missionRun} mission={mission.missionRun} />;
   if (showBattle) return <UltronBattle won={battleWon} />;
   const captured = mission?.stage === 4 || (recoveryAvailable && !recovery);
   const showExperiment = Boolean(mission) || (allowOfflineExperiment && checkedConnection);
   const showOverview = mission && (captured || (!experiment && !isArchive && !isDevelopment && !isCleanSlate));
   const elapsed = (mission?.takeoverDuration ?? 0) - Math.max(0, remaining);
   return (
     <>
       {showExperiment && experiment && <div hidden={captured || recovery}>{experiment}</div>}
       {!mission && !(showExperiment && experiment) && <main>{missionSummary}<Dummy /></main>}
       {showOverview && !recovery && (
         <div className="takeover-backdrop" data-captured={captured && elapsed >= 36000} inert={captured}>
           <LaboratoryOverview key={mission.missionRun} stage={mission.stage} elementDiscovered={Boolean(achievements?.elementDiscovered)} badges={mission.badges}
             planetaryDefense={achievements?.planetaryDefense} cleanSlateComplete={achievements?.victory} captured={captured} edithUnlocked={mission.edithUnlocked}>{missionSummary}</LaboratoryOverview>
         </div>
       )}
       {mission && isCleanSlate && !captured && !recovery && (
         (mission.stage === 8 || (mission.stage === 7 && (!mission.codeforces || mission.ultronBattle === 'won')))
           ? <CleanSlate key={mission.missionRun} mission={mission.missionRun} />
           : <main><h1>Clean Slate / DUM-E</h1><p>Панель откроется после выполнения текущего задания.</p><a href="/">В лабораторию</a></main>
       )}
       {captured && <UltronTerminal elapsed={recoveryAvailable ? Math.max(60000, elapsed) : elapsed} finished={!playing} recoveryAvailable={recoveryAvailable} />}
       {recovery && (
         <main className="recovery-channel">
           <div className="recovery-strange-scene">
             <img className="recovery-strange" src="/assets/dr_strange.jpg" alt="Доктор Стрэндж исследует возможные варианты будущего" />
             <section className="recovery-next" aria-labelledby="recovery-next-title">
               <h1 id="recovery-next-title" tabIndex={-1}>Будущее ещё можно изменить</h1>
               <div className="recovery-dialogue">
                 <p><strong>Стрэндж</strong>Я просмотрел <b>233 280</b> различных вариантов будущего.</p>
                 <p><strong>Тони</strong>И в скольких мы побеждаем?</p>
                 <p><strong>Стрэндж</strong>В одном.</p>
               </div>
               <a className="recovery-timeline-link" href="/timelines">Исследовать временные линии <span aria-hidden="true">→</span></a>
             </section>
           </div>
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
     ? {path:'open-recovery', label:'Показать резервный канал', version:mission.version}
     : mission?.stage === 7 && mission.ultronBattle === 'inactive' && Boolean(mission.codeforces)
       ? {path:'open-ultron-battle', label:'Включить BATTLE WITH ULTRON', version:mission.version}
       : mission?.stage === 7 && mission.ultronBattle === 'active'
         ? {path:'confirm-ultron-battle', label:'Подтвердить успешное решение', version:mission.version}
         : undefined;

 const hint = mission && hintDraft?.stage === mission.stage ? hintDraft.text : '';
 const recoveryControls = auth && mission && recoveryAvailable && (
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
     <button disabled={busy || !connected || !hint.trim()}>Отправить от Дамми</button>
   </form>
 );
 const dummyReset = auth && mission?.stage === 0 && (
   <button type="button" disabled={busy || !connected} onClick={() => {
     if (window.confirm('Начать новую выдачу предметов Дамми для всех устройств?')) {
       void action(() => runCommand('reset-dummy', mission.version));
     }
   }}>Сбросить выдачу Дамми…</button>
 );
 const storyControls = auth && mission && (
   <section>
     <h2>Сюжетные команды</h2>{!availableCommand && !playing && <p>Сейчас действий ведущей не требуется. Пульт обновляется автоматически.</p>}
     {mission?.stage === 5 && <label><input type="checkbox" checked={codeforces} onChange={e=>setCodeforces(e.target.checked)} />Включить Codeforces</label>}{playing && <p>Идёт сцена захвата.</p>}
     {availableCommand && <button disabled={busy || !connected} onClick={() => setCommand(availableCommand)}>{availableCommand.label}…</button>}
     {command && command.path === availableCommand?.path && command.version === availableCommand.version && (
       <div role="group" aria-label="Подтверждение сюжетной команды">
         <p>{command.label} для всех устройств?</p>
         <button disabled={busy || !connected} onClick={() => {
           setCommand(undefined);
           void action(() => runCommand(command.path, command.version));
         }}>Подтвердить</button>
         <button disabled={busy} onClick={() => setCommand(undefined)}>Отмена</button>
       </div>
     )}
   </section>
 );
 return <main className="control-panel"><header><span>SURKOV INDUSTRIES</span><small>ПУЛЬТ ВЕДУЩЕЙ</small></header><h1>Управление миссией</h1><div className="control-feedback" aria-live="polite">{busy && <p role="status">Выполняем команду…</p>}{error && <p role="alert">{error}</p>}</div><div className="control-state"><p role="status">{connected ? 'Связь установлена' : 'Данные могут быть устаревшими — команды недоступны'}</p><h2>{mission?.stages[mission.stage] ?? 'Подключаемся…'}</h2>{lastUpdated !== undefined && <p className="control-updated">Последнее обновление: <time dateTime={new Date(lastUpdated).toISOString()}>{new Date(lastUpdated).toLocaleTimeString("ru-RU")}</time></p>}{!connected && <p role="status">{checkedConnection ? "Не удалось получить свежие данные. Повторяем подключение автоматически." : "Подключаемся к лаборатории…"}</p>}<button type="button" disabled={refreshing} onClick={()=>void refresh()}>{refreshing ? "Обновляем состояние…" : "Обновить состояние"}</button></div>{storyControls}{recoveryControls}{dummyReset}{auth && mission && <section><h2>Начать заново</h2><p>Очистить достижения, открытые данные и прогресс на всех устройствах.</p><button disabled={busy || !connected} onClick={() => {
 if (window.confirm('Очистить весь прогресс и вернуть квест к начальному экрану на всех устройствах?')) void action(async () => {
  try {await post('restart', {version:mission.version}); setPending(undefined); setCommand(undefined); setHintDraft(undefined); setCodeforces(false);} finally {await refresh();}
 });
}}>Начать миссию заново</button></section>}{control&&!checkedAuth&&<p role="status">{checkedConnection && !online ? "Проверим вход после восстановления связи." : "Проверяем вход в пульт…"}</p>}{control&&checkedAuth&&!auth&&<form onSubmit={e=>{e.preventDefault();void action(async()=>{await post('login',{password});setPassword('');await refresh();setAuth(true);});}}><label>Пароль ведущей<input type="password" autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)} required/></label><button disabled={busy}>Войти</button></form>}{control&&auth&&mission&&<details onToggle={e=>{if(!e.currentTarget.open)setPending(undefined);}}><summary>Аварийное управление</summary><p>Смена этапа восстановит его начальное состояние на всех устройствах. Будущие открытия и черновики будут сброшены.</p><label>Новый этап<select value={selected} onChange={e=>setSelected(Number(e.target.value))}>{mission.stages.map((s,i)=><option key={s} value={i}>{s}</option>)}</select></label><button disabled={busy||!connected} onClick={()=>setPending({stage:selected,version:mission.version})}>Сменить этап…</button>{pending&&<div role="group" aria-label="Подтверждение смены этапа"><p>Переключить миссию на «{mission.stages[pending.stage]}» для всех устройств?</p><button disabled={busy||!connected} onClick={()=>void action(async()=>{try{await post('mission',pending);}finally{setPending(undefined);await refresh();}})}>Подтвердить</button><button disabled={busy} onClick={()=>setPending(undefined)}>Отмена</button></div>}<button disabled={busy} onClick={()=>void action(async()=>{await post('logout',{});await refresh();setAuth(false);setPending(undefined);setCommand(undefined);setHintDraft(undefined);})}>Выйти из пульта</button></details>}{auth && mission && (
  <section>
    <h2>Бейджи основателя</h2>
    {badgeNames.map((name, badge) => {
      const active = Boolean(mission.badges & (1 << badge));
      return (
        <button key={name} type="button" disabled={busy || !connected} aria-pressed={active} onClick={() => void action(async () => {
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

