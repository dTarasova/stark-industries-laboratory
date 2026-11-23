import {useMissionCompletion} from '../useMissionCompletion';
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
  'Чтобы освободить среднюю часть панели, придётся временно убрать с места даже силовой стабилизатор. Именно поэтому нужно резервное питание.',
  'Цель — верхняя цепь P–D–L. Снизу карантин U и журнал A, последняя ячейка свободна. Не пытайтесь выстроить всю верхнюю цепь одним проходом.',
  'Со стартовой раскладки сдвиньте D из ячейки 5 в 6, затем L из 4 в 5. Теперь можно сдвинуть P из 1 в 4.',
];
const modulePaths = {
  P: 'M5 24h8l5-12 10 24 5-12h10M10 8v6m28-6v6M10 34v6m28-6v6',
  A: 'M12 7h24v34H12zM18 15h12M18 23h12M18 31h8',
  U: 'M8 8h10v10H8zM30 30h10v10H30zM18 13h16v11m-21-6v16h11M20 20l8 8m0-8-8 8',
  L: 'm24 5 15 19-15 19L9 24zM17 24h14M24 17v14',
  D: 'M5 24h12m14 0h12M17 13l14 11-14 11zM31 12v24',
};
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
  const missionSaved=useMissionCompletion(state.complete, 'clean-slate-complete');
  const [panel, setPanel] = useState(() => history.length > 0);
  const [hintCount, setHintCount] = useState(0);
  const [message, setMessage] = useState('');
  const [storageFailed, setStorageFailed] = useState(false);
  const [motion, setMotion] = useState<{action: Action; destination: number; id: number}>();
  const [lines, setLines] = useState(() => state.complete ? finale.length : 0);
  const canMove = state.open && state.power === 'BACKUP' && !state.complete;

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
    setMessage(typeof action === 'number'
      ? `Модуль ${state.modules[action]} перемещён в ячейку ${state.modules.indexOf(null) + 1}.`
      : action === 'fuse' ? 'Резервный предохранитель установлен.'
      : action === 'power' ? `Питание переключено на ${next.power === 'MAIN' ? 'основную' : 'резервную'} линию.`
      : action === 'hatch' ? `Крышка панели ${next.open ? 'открыта' : 'закрыта'}.`
      : action === 'rotate' ? 'Направление стрелки изолятора изменено.' : '');
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
      <h1>Clean Slate. Ручной запуск</h1>
      <section className="slate-brief" aria-labelledby="slate-goal">
        <h2 id="slate-goal">Восстановите локальную цепь запуска Clean Slate</h2>
        <p>Сэр, дистанционный доступ скомпрометирован. Остаются ваши руки и манипулятор Дамми. Условия исправной сборки — в журнале обслуживания.</p>
        <details className="slate-journal">
          <summary>Прочитать условия сборки</summary>
          <h3>Акт 47-B / Аварийная реконфигурация шины</h3>
          <ol>
            <li>В верхней цепи разместите силовой стабилизатор, изолятор и локальный инициатор по порядку.</li>
            <li>Заражённый интерфейс поместите в левую нижнюю ячейку. Средняя нижняя ячейка связана с диагностикой ядра JARVIS и запрещена для заражённого модуля.</li>
            <li>Регистратор установите справа от карантина. Правую нижнюю ячейку оставьте пустой.</li>
            <li>Сигнал идёт по верхней цепи справа налево. Направьте стрелку изолятора по ходу сигнала.</li>
          </ol>
        </details>
      </section>
      <div className="slate-layout" data-complete={state.complete} data-power={state.power} data-open={state.open}>
        <div key={motion?.id ?? 'idle'} className={motion ? 'reactor-visual slate-reactor slate-reactor-pulse' : 'reactor-visual slate-reactor'} aria-hidden="true" />
      {!panel && <button onClick={() => setPanel(true)}>Открыть панель Дамми</button>}
      {panel && (
        <section className="slate-panel" aria-labelledby="slate-panel-title">
          <h2 id="slate-panel-title">Коммутационная шина</h2>
          <h3>Обслуживание</h3>
          <dl className="slate-equipment" aria-label="Состояние оборудования">
            <div data-ready={state.fuse}><dt>Предохранитель</dt><dd>{state.fuse ? 'Установлен' : 'Отсутствует'}</dd></div>
            <div data-ready={state.power === 'MAIN'}><dt>Питание</dt><dd>{state.power === 'MAIN' ? 'Основное · MAIN' : 'Резервное · BACKUP'}</dd></div>
            <div data-ready={!state.open}><dt>Крышка панели</dt><dd>{state.open ? 'Открыта' : 'Закрыта'}</dd></div>
          </dl>
          <div className="slate-controls">
            {!state.fuse && <button disabled={state.complete} onClick={() => command('fuse')}>Установить предохранитель</button>}
            <button disabled={state.complete} onClick={() => command('power')}>Переключить на {state.power === 'MAIN' ? 'резервное' : 'основное'} питание</button>
            <button disabled={state.complete} onClick={() => command('hatch')}>{state.open ? 'Закрыть' : 'Открыть'} крышку панели</button>
          </div>
          <p className="slate-service-note">Резервная линия требует предохранителя. Работать с модулями можно только при резервном питании и открытой крышке.</p>
          <h3 className="slate-assembly-title">Сборка цепи</h3>
          <p className="slate-instruction" id="slate-move-rule">Нажмите на модуль рядом с пустой ячейкой — Дамми сдвинет его по стороне. Можно отменить действие.</p>
          <p className="slate-access" role="status">{state.complete ? 'Сборка завершена.' : canMove ? 'Панель открыта для перемещения модулей.' : 'Доступ к модулям закрыт: нужны резервное питание и открытая крышка.'}</p>
          <div className="slate-workbench">
            <div className="slate-grid" role="group" aria-label="Шесть ячеек коммутационной шины" aria-describedby="slate-move-rule">
              {state.modules.map((module, index) => {
                const source = motion?.action;
                const sliding = typeof source === 'number' && motion?.destination === index;
                const style = sliding ? {
                  '--slide-x': `${(source % 3 - index % 3) * 100}%`,
                  '--slide-y': `${(Math.floor(source / 3) - Math.floor(index / 3)) * 100}%`,
                } as CSSProperties : undefined;
                return (
                  <button key={index} className="slate-slot" data-empty={!module} data-module={module ?? 'empty'}
                    data-danger={index === 4 && message === quarantineWarning}
                    disabled={!module || !canMove} onClick={() => command(index)}>
                    <small>{index + 1}{index === 3 && ' · Карантин'}{index === 4 && ' · Диагностика'}</small>
                    <span key={sliding ? motion.id : module} className={sliding ? 'slate-slide' : undefined} style={style}>
                      {module ? <><svg className="slate-module-glyph" viewBox="0 0 48 48" aria-hidden="true"><path d={modulePaths[module]} transform={module === 'D' && state.left ? 'rotate(180 24 24)' : undefined}/></svg><strong>{module}{module === 'D' && (state.left ? ' ←' : ' →')}</strong>{names[module]}</> : <span className="slate-empty">Свободная ячейка</span>}
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
          </div>
          <div className="slate-controls slate-isolator">
            <button disabled={!canMove} onClick={() => command('rotate')}>Развернуть стрелку изолятора</button>
          </div>
          <p className="slate-status" role="status">{message && <><strong>Локальная диагностика</strong> · {message}</>}</p>
          <div className="slate-activation"><div><h3>Запуск протокола</h3><p>Для запуска нужны исправная сборка, закрытая крышка и основное питание.</p></div><button disabled={state.complete} onClick={() => command('key')}>Повернуть ключ Clean Slate</button></div>
          {storageFailed && <p role="alert">Браузер не сохранил прогресс. Оставьте страницу открытой, чтобы продолжить.</p>}
          <div className="slate-controls">
            <button disabled={!history.length} onClick={undo}>Отменить действие</button>
            <button disabled={!history.length} onClick={() => {setHintCount(0); command('reset');}}>Сбросить панель</button>
            <button disabled={hintCount === hints.length} onClick={() => setHintCount(hintCount + 1)}>{hintCount === 2 ? 'Показать первые ходы' : hintCount === hints.length ? 'Все подсказки открыты' : `Открыть подсказку ${hintCount + 1}`}</button>
          </div>
          {hintCount > 0 && <ol aria-label="Подсказки">{hints.slice(0, hintCount).map(hint => <li key={hint}>{hint}</li>)}</ol>}
          {state.complete && (
            <section className="slate-finale" aria-label="Ход протокола Clean Slate">
              <ol role="log">{finale.slice(0, lines).map(line => <li key={line}>{line}</li>)}</ol>
              {lines === finale.length && missionSaved && <p>JARVIS · Невероятно. Дамми выполнил последовательность без серьёзных повреждений оборудования. Сэр, я рекомендую внести в бюджет модернизацию его манипулятора.</p>}
            </section>
          )}
        </section>
      )}
      {state.complete && lines === finale.length && <section>{missionSaved ? <><h2>С 28-летием, Максим!</h2><p>Лаборатория восстановлена. Пусть впереди будет ещё больше открытий, смелых проектов и побед!</p><a href="/">Вернуться в лабораторию</a></> : <p role="status">Передаём результат в лабораторию…</p>}</section>}
      <div className="slate-stage" data-complete={state.complete} data-power={state.power}>
        <div className="slate-robot"><Dummy /></div>
        <p className="slate-stage-caption">{state.complete ? 'Протокол завершён · Угроза устранена' : 'DUM-E · Локальное управление'}</p>
      </div>
      <aside className="slate-guide" aria-label="Инструкция и локальный журнал">
      <p><strong>DUM-E · Аварийное обслуживание</strong></p>
      <p>Сэр, Альтрон оставил резервный интерфейс в системе управления бронёй. Дистанционное переключение исключено. Дамми поможет восстановить локальную шину. Сохраните питание ядра JARVIS, изолируйте заражённый модуль и установите односторонний барьер. Пожалуйста, не заставляйте Дамми импровизировать.</p>
      </aside>
      </div>
    </main>
  );
}



