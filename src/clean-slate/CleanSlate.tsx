import {useEffect, useState, type CSSProperties} from 'react';
import {Dummy} from '../Dummy';
import {apply, quarantineWarning, replay, type Action} from './puzzle';
import {readProgress, storageKey} from './storage';
import './clean-slate.css';

const names = {
  P: 'Силовой стабилизатор',
  A: 'Регистратор JARVIS',
  U: 'Заражённый интерфейс',
  L: 'Локальный инициатор',
  D: 'Односторонний изолятор',
};
const hints = [
  'Чтобы освободить среднюю часть панели, придётся временно убрать с места даже силовой стабилизатор. Именно поэтому нужен BACKUP.',
  'Цель — верхняя цепь P–D–L. Снизу карантин U и журнал A, последняя ячейка свободна. Не пытайтесь выстроить всю верхнюю цепь одним проходом.',
  'Со стартовой раскладки сдвиньте D из ячейки 5 в 6, затем L из 4 в 5. Теперь можно сдвинуть P из 1 в 4.',
];
const finale = [
  'CLEAN SLATE PROTOCOL · ARMED',
  'LOCAL SIGNAL · VERIFIED',
  'EXTERNAL UPLINK · QUARANTINED',
  'J.A.R.V.I.S. CORE · STABLE',
  'ARMOR UNIT 01 · DECOMMISSIONED',
  'ARMOR UNIT 02 · DECOMMISSIONED',
  'ARMOR UNIT 03 · DECOMMISSIONED',
  'THREAT SIGNATURES · 0',
  'CLEAN SLATE · COMPLETE',
];

export function CleanSlate({mission}: {mission: number}) {
  const [history, setHistory] = useState(() => readProgress(mission).history);
  const state = replay(history);
  const [panel, setPanel] = useState(() => history.length > 0);
  const [hintCount, setHintCount] = useState(0);
  const [message, setMessage] = useState('');
  const [storageFailed, setStorageFailed] = useState(false);
  const [motion, setMotion] = useState<{action: Action; destination: number; id: number}>();
  const [lines, setLines] = useState(() => state.complete ? finale.length : 0);

  useEffect(() => {
    if (!state.complete || lines === finale.length) return;
    const timer = window.setTimeout(() => setLines(lines + 1), 2000);
    return () => window.clearTimeout(timer);
  }, [state.complete, lines]);

  useEffect(() => {
    if (!panel || state.complete) return;
    const timer = window.setTimeout(() => setMessage('Дамми ждёт инструкции. Это, пожалуй, его самый безопасный режим.'), 60000);
    return () => window.clearTimeout(timer);
  }, [panel, state.complete, history, message]);

  function save(next: Action[]) {
    setHistory(next);
    try {
      localStorage.setItem(storageKey(mission), JSON.stringify(next));
      setStorageFailed(false);
    } catch {
      setStorageFailed(true);
    }
  }

  function command(action: Action) {
    const next = apply(state, action);
    if (typeof next === 'string') {
      setMessage(next);
      return;
    }
    setMessage('');
    if (action === 'key') setLines(0);
    setMotion(action === 'reset' ? undefined : {
      action, destination: state.modules.indexOf(null), id: history.length + 1,
    });
    save([...history, action]);
  }

  function undo() {
    setMotion(undefined);
    setMessage('');
    setLines(finale.length);
    save(history.slice(0, -1));
  }

  return (
    <main className="clean-slate">
      <header><span>SURKOV INDUSTRIES</span><a href="/">В лабораторию</a></header>
      <h1>Clean Slate / DUM-E</h1>
      <p><strong>JARVIS · Аварийное обслуживание</strong></p>
      <p>Сэр, Альтрон оставил резервный интерфейс в системе управления бронёй. Дистанционное переключение исключено. Дамми поможет восстановить локальную шину. Сохраните питание моего ядра, изолируйте заражённый модуль и установите односторонний барьер. Пожалуйста, не заставляйте Дамми импровизировать.</p>
      <details className="slate-journal">
        <summary>Открыть журнал обслуживания</summary>
        <h2>Акт 47-B / Аварийная реконфигурация шины</h2>
        <ol>
          <li>В верхней цепи разместите силовой стабилизатор, изолятор и локальный инициатор по порядку.</li>
          <li>Заражённый интерфейс поместите в левый нижний отсек. Средний нижний отсек связан с диагностикой ядра JARVIS и запрещён для заражённой кассеты.</li>
          <li>Регистратор установите справа от карантина. Правый нижний отсек оставьте пустым.</li>
          <li>Сигнал идёт по верхней цепи справа налево. Направьте стрелку изолятора по ходу сигнала.</li>
          <li>Перейдите на резервное питание перед вскрытием кассеты. Верните основное питание после сборки и закрытия.</li>
          <li>Сдвигайте по одной кассете в соседний по стороне пустой отсек.</li>
        </ol>
      </details>
      {!panel && <button onClick={() => setPanel(true)}>Открыть панель Дамми</button>}
      {panel && (
        <section className="slate-panel" aria-labelledby="slate-panel-title">
          <h2 id="slate-panel-title">Коммутационная шина</h2>
          <div className="slate-controls">
            <button disabled={state.fuse} onClick={() => command('fuse')}>{state.fuse ? 'Предохранитель установлен' : 'Установить предохранитель'}</button>
            <button disabled={state.complete} onClick={() => command('power')}>{state.power} → {state.power === 'MAIN' ? 'BACKUP' : 'MAIN'}</button>
            <button disabled={state.complete} onClick={() => command('hatch')}>{state.open ? 'Закрыть кассету' : 'Открыть кассету'}</button>
            <button disabled={state.complete} onClick={() => command('rotate')}>Повернуть изолятор</button>
            
          </div>
          <p className="slate-power">Питание <strong>{state.power}</strong> · Кассета {state.open ? 'открыта' : 'закрыта'}</p>
          <p className="slate-instruction">Выберите кассету — Дамми переместит её в соседний свободный отсек.</p><div className="slate-workbench">
            <div className="slate-grid" role="group" aria-label="Шесть отсеков коммутационной шины">
              {state.modules.map((module, index) => {
                const source = motion?.action;
                const sliding = typeof source === 'number' && motion?.destination === index;
                const style = sliding ? {
                  '--slide-x': `${(source % 3 - index % 3) * 100}%`,
                  '--slide-y': `${(Math.floor(source / 3) - Math.floor(index / 3)) * 100}%`,
                } as CSSProperties : undefined;
                return (
                  <button key={index} className="slate-slot" data-empty={!module}
                    data-danger={index === 4 && message === quarantineWarning}
                    disabled={!module || state.complete} onClick={() => command(index)}>
                    <small>{index + 1}{index === 3 && ' · Карантин'}{index === 4 && ' · Диагностика'}</small>
                    <span key={sliding ? motion.id : module} className={sliding ? 'slate-slide' : undefined} style={style}>
                      {module ? <><strong>{module}{module === 'D' && (state.left ? ' ←' : ' →')}</strong>{names[module]}</> : 'Свободно'}
                    </span>
                  </button>
                );
              })}
              {typeof motion?.action === 'number' && (
                <div key={motion.id} className="slate-claw-track" aria-hidden="true" style={{
                  '--from-x': `${(motion.action % 3 + .5) / 3 * 100}%`,
                  '--from-y': `${(Math.floor(motion.action / 3) + .5) * 50}%`,
                  '--to-x': `${(motion.destination % 3 + .5) / 3 * 100}%`,
                  '--to-y': `${(Math.floor(motion.destination / 3) + .5) * 50}%`,
                } as CSSProperties}>
                  <svg viewBox="0 0 400 32"><path d="M400 16H19M19 16L12 5H4V11M19 16L12 27H4V21" /><circle cx="28" cy="16" r="5" /></svg>
                </div>
              )}
            </div>
            <div className={motion ? 'slate-robot slate-motion' : 'slate-robot'}>
              <Dummy />
            </div>
          </div>
          <p className="slate-status" role="status">{message && <><strong>JARVIS</strong> · {message}</>}</p>
          <div className="slate-activation"><div><h3>Запуск Clean Slate</h3><p>После сборки закройте кассету и верните основное питание.</p></div><button disabled={state.complete} onClick={() => command('key')}>Повернуть ключ Clean Slate</button></div>
          {storageFailed && <p role="alert">Браузер не сохранил прогресс. Оставьте страницу открытой, чтобы продолжить.</p>}
          <div className="slate-controls">
            <button disabled={!history.length} onClick={undo}>Отменить действие</button>
            <button disabled={!history.length} onClick={() => {setHintCount(0); command('reset');}}>Сбросить панель</button>
            <button disabled={hintCount === hints.length} onClick={() => setHintCount(hintCount + 1)}>Открыть подсказку {hintCount < hints.length ? hintCount + 1 : ''}</button>
          </div>
          {hintCount > 0 && <ol aria-label="Подсказки">{hints.slice(0, hintCount).map(hint => <li key={hint}>{hint}</li>)}</ol>}
          {state.complete && (
            <section className="slate-finale" aria-label="Ход протокола Clean Slate">
              <ol role="log">{finale.slice(0, lines).map(line => <li key={line}>{line}</li>)}</ol>
              {lines === finale.length && <p>JARVIS · Невероятно. Дамми выполнил последовательность без серьёзных повреждений оборудования. Сэр, я рекомендую внести в бюджет модернизацию его манипулятора.</p>}
            </section>
          )}
        </section>
      )}
    </main>
  );
}



