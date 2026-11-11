import {useMissionCompletion} from '../useMissionCompletion';
import { useEffect, useRef, useState } from 'react';
import {Dummy} from '../Dummy';
import {DummyItems, resetDummyItems} from './DummyItems';
import { createScene } from './scene';
import {
  archiveRules, buildings, confirmAttempt, freshAttempt, matchesSelection, observationElevation,
  recordExclusion, requiredExclusions, toggleBuilding, verifiedExclusions, type ArchiveRule,
  type Attempt, type ElementModel,
} from './puzzle';
import { matchesTopology } from './layout';
import './prototype.css';

const archive = [
  ['Журнал монтажа ограды', 'К фабрике протянули кабель через створ ворот. Для второй трассы проём не потребовался: к линии ограды она выходит уже за последней секцией.'],
  ['Инструкция обходчика', 'У каждого двора по одной купольной станции и по одному модулю с двойной антенной. От купола до антенны было по два участка в любую сторону. Маршрут обходчика начинался у купола: запись крыш при обходе по часовой стрелке подходила для обоих дворов.'],
  ['Ведомость сопряжения', 'Одинаковые крышные модули пытались соединить напрямую, но на испытаниях возникал резонанс. Ни на одном из двух переходов этого сочетания в рабочем проекте не осталось.'],
];
const archiveHints = [
  'Начните с журнала ограды. На время сверки включите слой коммуникаций и найдите заводскую табличку, ворота и концы ограды.',
  'Мысленно продлите ограду в обе стороны. Только один переход пересекает её в проёме и заканчивается у фабрики, второй пересекает продолжение.',
  'Если ограда подходит, сравните обходы от куполов в одном направлении. Затем сравните крыши на двух концах каждого перехода отдельно.',
];
const projectionHints = [
  'Два перехода задают ориентир. На виде сверху отметьте центр каждого.',
  'Соедините середины. Ищите вид поперёк этой линии со стороны фабрики, примерно на 30° выше плоскости макета.',
  'Три дуги замыкают кольцо. Два штриха образуют ось через верхнюю и нижнюю вершины ромба.',
];

const storageKey = 'surkov-element-test-v2';
const elementKey = 'surkov-open-element';

function readElement(value: unknown): ElementModel | undefined {
  const element = value as ElementModel | null;
  return element && Array.isArray(element.parts) && element.parts.length > 1 &&
    element.parts.every(part => part && Number.isFinite(part.radius) && part.radius > 0 &&
      Number.isInteger(part.color) && Array.isArray(part.center) && part.center.length === 3 &&
      part.center.every(Number.isFinite)) ? element : undefined;
}

function loadAttempt(): Attempt {
  let element: ElementModel | undefined;
  try {
    element = readElement(JSON.parse(localStorage.getItem(elementKey) ?? 'null'));
  } catch {
    // Попытка доступна и без постоянного хранилища.
  }
  try {
    const legacy = JSON.parse(sessionStorage.getItem('surkov-element-test-v1') ?? 'null');
    const saved = JSON.parse(sessionStorage.getItem(storageKey + ':' + (new URLSearchParams(location.search).get('run') ?? '0')) ?? 'null') as Attempt | null;
    element ??= readElement(saved?.element) ?? readElement(legacy?.element);
    if (saved && Array.isArray(saved.selected) && new Set(saved.selected).size === saved.selected.length &&
      saved.selected.every(id => buildings.some(site => site.id === id))) {
      if (saved.stage === 'selection' || saved.stage === 'archive' ||
        (saved.stage === 'projection' && matchesSelection(new Set(saved.selected))) ||
        (saved.stage === 'complete' && element)) return {
          ...saved, element, exclusions: verifiedExclusions(saved.exclusions),
          firstHypothesis: Array.isArray(saved.firstHypothesis) && saved.firstHypothesis.length === 8 &&
            matchesTopology(new Set(saved.firstHypothesis)) ? saved.firstHypothesis : undefined,
        };
    }
  } catch {
    // При повреждённой попытке открываем исходный макет.
  }
  return freshAttempt(element);
}

const selectionCondition = 'Сохраните два замкнутых контура по четыре здания. Один окружает карусель, второй — качели. У контуров нет общих зданий, между ними ровно два прямых перехода с четырьмя разными концами. Других связей между сохранёнными зданиями быть не должно. Пересечение линий без здания не создаёт связи.';
const archiveCondition = 'Найдите допустимые альтернативы. Пока каждая из них видна на макете, укажите документ, которому она противоречит. Затем выставьте подлинную реконструкцию и проверьте гипотезу.';
const projectionGoal = 'Найдите направление, при котором фрагменты образуют единую структуру. Внешняя граница замыкается, центральный проводник задаёт ось, между ними находится ядро.';
const projectionCondition = `Оптический журнал предписывает наблюдать поперёк створа переходов с фабричной стороны. Угол над плоскостью макета — ${observationElevation}°.`;

const layersInitial = { roads: true, landscape: true };
const layerLabels = { roads: 'Дороги', landscape: 'Декоративные деревья' };

export function Prototype({mission = 0}: {mission?: number} = {}) {
  const [dummyReset, setDummyReset] = useState(0);
  const host = useRef<HTMLDivElement>(null);
  const scene = useRef<ReturnType<typeof createScene> | null>(null);
  const [attempt, setAttempt] = useState(loadAttempt);
  const [layers, setLayers] = useState(layersInitial);
  const [message, setMessage] = useState('');
  const [hint, setHint] = useState(0);
  const [wires, setWires] = useState(false);
  const [survey, setSurvey] = useState(false);
  const [assembling, setAssembling] = useState(false);
  const [viewSaved, setViewSaved] = useState(false);
  const [sceneError, setSceneError] = useState(false);
  const [storageError, setStorageError] = useState(false);
  const [focusedBuilding, setFocusedBuilding] = useState<string>();
  const { stage, selected, element, exclusions = [] } = attempt;
  const excluded = exclusions.includes([...selected].sort().join(''));
  const missionSaved=useMissionCompletion(stage === 'complete', 'element-complete');
  const showingElement = viewSaved || stage === 'complete';
  const investigating = stage === 'archive';
  const selecting = (stage === 'selection' || investigating) && !showingElement;
  const projecting = stage === 'projection' && !showingElement;
  const toggle = (id: string) => {
    setAttempt(current => toggleBuilding(current, id));
    setMessage('');
  };

  function chooseBuilding(id?: string) {
    setFocusedBuilding(current => current === id ? undefined : id);
  }

  useEffect(() => {
    try {
      scene.current = createScene(host.current!, chooseBuilding);
    } catch {
      setSceneError(true);
    }
    return () => {
      scene.current?.dispose();
      scene.current = null;
    };
  }, []);

  useEffect(() => {
    scene.current?.update(attempt, { ...layers, wires, survey }, viewSaved, focusedBuilding);
  }, [attempt, layers, viewSaved, focusedBuilding, wires, survey]);

  useEffect(() => {
    try {
      sessionStorage.setItem(storageKey + ':' + (new URLSearchParams(location.search).get('run') ?? '0'), JSON.stringify({
        selected, stage, exclusions: attempt.exclusions, firstHypothesis: attempt.firstHypothesis,
      }));
    } catch {
      setStorageError(true);
    }
  }, [selected, stage, attempt.exclusions, attempt.firstHypothesis]);

  useEffect(() => {
    if (!element) return;
    try {
      localStorage.setItem(elementKey, JSON.stringify(element));
    } catch {
      setStorageError(true);
    }
  }, [element]);

  function check() {
    if (selecting) {
      const next = confirmAttempt(attempt);
      if (next === attempt) {
        const selection = new Set(selected);
        if (investigating && exclusions.length < requiredExclusions && matchesTopology(selection)) {
          setMessage('Сначала исключите альтернативы по документам. Записывайте противоречие, пока соответствующая реконструкция видна на макете.');
          return;
        }
        setMessage(matchesTopology(selection)
          ? 'Реконструкция соответствует базовой топологии, но противоречит одному или нескольким архивным свидетельствам.'
          : 'Топология комплекса не подтверждена. Проверьте замкнутость контуров и связи между ними.');
        return;
      }
      setAttempt(next);
      setHint(0);
      setMessage(investigating
        ? 'Архивная реконструкция подтверждена. Восстановленные переходы задают направление наблюдения.'
        : 'Топологическая структура восстановлена. В архиве есть несколько таких проектов. Исключите альтернативы по документам, затем подтвердите оставшуюся реконструкцию.');
    } else if (projecting && scene.current) {
      if (!scene.current.measure()) {
        setMessage('Структура пока не складывается. Продолжите исследование проекции');
        return;
      }
      setAssembling(true);
      setMessage('Структура совпала. Ядро собирается…');
      scene.current.assemble(() => {
        setAttempt(current => confirmAttempt(current, true));
        setAssembling(false);
        setMessage('Новый элемент открыт.');
      });
    }
  }

  function exclude(rule: ArchiveRule) {
    if (!matchesTopology(new Set(selected))) {
      setMessage('В журнал можно внести только реконструкцию, которая удовлетворяет базовой топологии.');
      return;
    }
    const next = recordExclusion(attempt, rule);
    if (next === attempt) {
      setMessage('Этот документ не опровергает текущую реконструкцию. Сверьте его с макетом.');
      return;
    }
    setAttempt(next);
    setMessage('Противоречие записано. ' + (next.exclusions?.length === requiredExclusions
      ? 'Верните на макет подлинную реконструкцию и проверьте гипотезу.'
      : 'Проверьте следующую допустимую реконструкцию.'));
  }

  function reset() {
    if (!window.confirm(element
      ? 'Вернуть исходный макет и начать с отбора зданий? Открытый элемент сохранится.'
      : 'Вернуть исходный макет и начать с отбора зданий?')) return;
    resetDummyItems(mission);
    setDummyReset(value => value + 1);
    scene.current?.reset();
    setFocusedBuilding(undefined);
    setAttempt(freshAttempt(element));
    setLayers(layersInitial);
    setWires(false);
    setSurvey(false);
    setHint(0);
    setAssembling(false);
    setViewSaved(false);
    setMessage('Исходный макет восстановлен.');
  }

  return (
    <main onKeyDown={event => {
      if (event.key === 'Escape' && selecting) setFocusedBuilding(undefined);
    }}>
      <header>
        <div>
          <h1>Новый элемент</h1>
          <p className="guide">Испытательный стенд SURKOV INDUSTRIES</p>
        </div>
      </header>
      <h2>{showingElement ? 'Открытый элемент' : investigating ? 'II. Архивные свидетельства' : selecting ? 'I. Восстановление топологии' : 'III. Пространственная проекция'}</h2>
      <p className="guide">
        {showingElement ? 'Вращайте открытый элемент мышью.' : selecting
          ? 'Перетаскивайте макет для вращения. Выберите здание на макете или в списке. Повторное нажатие или Esc снимает выбор.'
          : projectionGoal}
      </p>
      {selecting && (investigating ? <details open className="archive-evidence">
        <summary>Документы Говарда Старка</summary>
        <p>{archiveCondition}</p>
        <p>Исключено альтернатив: {exclusions.length} из {requiredExclusions}.
          {excluded && ' Текущая реконструкция уже исключена.'}</p>
        {archive.map(([title, entry], index) => <div key={title} className="archive-entry">
          <p><strong>{title}</strong><br />{entry}</p>
          <button type="button" disabled={excluded} aria-label={`Исключить по документу «${title}»`}
            onClick={() => exclude(archiveRules[index])}>Исключить по этому документу</button>
        </div>)}
      </details> : <p className="guide">
        {selectionCondition}
      </p>)}
      {projecting && <p className="guide">{projectionCondition}</p>}
      <div className="viewport" ref={host} aria-label={showingElement ? '3D-модель элемента' : '3D-макет выставки'}>
        {sceneError && <p role="alert">Не удалось запустить 3D. Проверьте, доступен ли WebGL в Chrome.</p>}
      </div>
      {showingElement ? <Dummy /> : (
        <DummyItems key={`${mission}-${dummyReset}-${projecting}`} mission={mission}
          stage={projecting ? 'projection' : 'selection'}
          condition={projecting ? projectionGoal + ' ' + projectionCondition : investigating ? archiveCondition : selectionCondition} />
      )}
      {selecting && <>
        <p className="guide">Пара круглых деревьев отмечает прямую связь. При выборе здания на его деревьях появляются номера пар.</p>
        <p className="guide">Видимых зданий: {selected.length} из {buildings.length}. Сохраните восемь.</p>
        <div className="buttons buildings" aria-label="Здания в отборе">
          {buildings.map(({ id }) => <button key={id} type="button"
            aria-label={`Здание ${id} · ${selected.includes(id) ? 'видно' : 'скрыто'}`}
            data-hidden={!selected.includes(id)} aria-pressed={focusedBuilding === id}
            onClick={() => chooseBuilding(id)}>{id}</button>)}
          <button type="button" disabled={!focusedBuilding}
            onClick={() => focusedBuilding && toggle(focusedBuilding)}>
            {focusedBuilding
              ? `${selected.includes(focusedBuilding) ? 'Скрыть' : 'Вернуть'} здание ${focusedBuilding}`
              : 'Выберите здание'}
          </button>
        </div>
        {investigating && attempt.firstHypothesis && <div className="buttons">
          <button type="button" onClick={() => {
            setAttempt(current => current.firstHypothesis ? { ...current, selected: current.firstHypothesis } : current);
            setFocusedBuilding(undefined);
            setMessage('');
          }}>Вернуть первую гипотезу</button>
        </div>}
        <div className="buttons" aria-label="Слои макета">
          <label><input type="checkbox" checked={wires} onChange={event => setWires(event.target.checked)} /> Коммуникации</label>
          {Object.entries(layerLabels).map(([key, label]) => {
            const layer = key as keyof typeof layers;
            return <label key={layer}><input type="checkbox" checked={layers[layer]}
              onChange={event => setLayers({ ...layers, [layer]: event.target.checked })} /> {label}</label>;
          })}
        </div>
      </>}
      {!showingElement && <div className="buttons">
        <button type="button" disabled={sceneError || assembling} onClick={() => scene.current?.planView()}>Вид сверху</button>
        <button type="button" disabled={sceneError || assembling} onClick={() => scene.current?.resetView()}>Сбросить ракурс</button>
        {projecting && <>
          <label><input type="checkbox" checked={survey} disabled={assembling}
            onChange={event => setSurvey(event.target.checked)} /> Створ переходов</label>
          <button type="button" disabled={assembling} onClick={() => {
            setAttempt(current => ({ ...current, stage: 'archive' }));
            setHint(0);
            setMessage('');
          }}>Вернуться к архиву</button>
        </>}
      </div>}
      <div className="buttons">
        {!showingElement && <>
          <button type="button" className="primary" disabled={sceneError || assembling} onClick={check}>Проверить гипотезу</button>
          {stage !== 'selection' && <button type="button" disabled={assembling || hint === 3} onClick={() => setHint(hint + 1)}>
            {hint === 3 ? 'Все подсказки открыты' : `Открыть подсказку ${hint + 1} из 3`}
          </button>}
        </>}
        {stage === 'complete' && <p>{missionSaved ? <a href="/" target="_top">Вернуться в лабораторию</a> : 'Сохраняем открытие. Ожидаем связь с лабораторией…'}</p>}
        {element && stage !== 'complete' && <button type="button" disabled={assembling}
          onClick={() => { setViewSaved(!viewSaved); setHint(0); setMessage(''); }}>
          {viewSaved ? 'Вернуться к попытке' : 'Открыть сохранённый элемент'}
        </button>}
      </div>
      <p className="feedback" role="status">{message}</p>
      {!showingElement && stage !== 'selection' && hint > 0 && <ol className="guide">
        {(investigating ? archiveHints : projectionHints).slice(0, hint).map(text => <li key={text}>{text}</li>)}
      </ol>}
      {projecting && hint === 3 && <svg className="symbol-hint" viewBox="0 0 80 80" role="img"
        aria-label="Кольцо, вертикальная ось и ромб">
        <circle cx="40" cy="40" r="34" /><path d="M40 11V69 M40 25L51 40 40 55 29 40Z" />
      </svg>}
      <div className="attempt-tools">
        <button type="button" disabled={assembling} onClick={reset}>Начать попытку заново</button>
      </div>
      {storageError && <p className="guide" role="alert">Хранилище вкладки недоступно. После перезагрузки часть данных может потеряться.</p>}
    </main>
  );
}
