import { useEffect, useRef, useState } from 'react';
import { createScene } from './scene';
import {
  buildings, createElement, freshAttempt, matchesSelection, toggleBuilding,
  type Attempt, type ElementModel,
} from './puzzle';
import './prototype.css';

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
    const saved = JSON.parse(sessionStorage.getItem(storageKey) ?? 'null') as Attempt | null;
    element ??= readElement(saved?.element) ?? readElement(legacy?.element);
    if (saved && Array.isArray(saved.selected) && new Set(saved.selected).size === saved.selected.length &&
      saved.selected.every(id => buildings.some(site => site.id === id))) {
      if (saved.stage === 'selection' ||
        (saved.stage === 'projection' && matchesSelection(new Set(saved.selected))) ||
        (saved.stage === 'complete' && element)) return { ...saved, element };
    }
  } catch {
    // При повреждённой попытке открываем исходный макет.
  }
  return freshAttempt(element);
}

const layersInitial = { roads: true, landscape: true };
const layerLabels = { roads: 'Дороги', landscape: 'Декоративные деревья' };

export function Prototype() {
  const host = useRef<HTMLDivElement>(null);
  const scene = useRef<ReturnType<typeof createScene> | null>(null);
  const [attempt, setAttempt] = useState(loadAttempt);
  const [layers, setLayers] = useState(layersInitial);
  const [message, setMessage] = useState('');
  const [hint, setHint] = useState(false);
  const [assembling, setAssembling] = useState(false);
  const [viewSaved, setViewSaved] = useState(false);
  const [sceneError, setSceneError] = useState(false);
  const [storageError, setStorageError] = useState(false);
  const [focusedBuilding, setFocusedBuilding] = useState<string>();
  const { stage, selected, element } = attempt;
  const showingElement = viewSaved || stage === 'complete';
  const selecting = stage === 'selection' && !showingElement;
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
    scene.current?.update(attempt, { ...layers, wires: hint }, viewSaved, focusedBuilding);
  }, [attempt, layers, viewSaved, focusedBuilding, hint]);

  useEffect(() => {
    try {
      sessionStorage.setItem(storageKey, JSON.stringify({ selected, stage }));
    } catch {
      setStorageError(true);
    }
  }, [selected, stage]);

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
      if (!matchesSelection(new Set(selected))) {
        setMessage('Гипотеза не подтверждена. Проверьте условия и связи.');
        return;
      }
      setAttempt(current => ({ ...current, stage: 'projection' }));
      setMessage('Отбор подтверждён. В макете проявились фрагменты.');
      setHint(false);
    } else if (projecting && scene.current) {
      if (!scene.current.measure()) {
        setMessage('Структура пока не складывается. Продолжите исследование проекции');
        return;
      }
      setAssembling(true);
      setMessage('Структура совпала. Ядро собирается…');
      scene.current.assemble(() => {
        setAttempt(current => ({ ...current, stage: 'complete', element: createElement() }));
        setAssembling(false);
        setMessage('Новый элемент открыт.');
      });
    }
  }

  function reset() {
    if (!window.confirm(element
      ? 'Вернуть исходный макет и начать с отбора зданий? Открытый элемент сохранится.'
      : 'Вернуть исходный макет и начать с отбора зданий?')) return;
    scene.current?.reset();
    setFocusedBuilding(undefined);
    setAttempt(freshAttempt(element));
    setLayers(layersInitial);
    setHint(false);
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
      <h2>{showingElement ? 'Открытый элемент' : selecting ? 'Отбор зданий' : 'Поиск проекции'}</h2>
      <p className="guide">
        {showingElement ? 'Вращайте открытый элемент мышью.' : selecting
          ? 'Перетаскивайте макет для вращения. Выберите здание на макете или в списке. Повторное нажатие или Esc снимает выбор.'
          : 'Совместите кольцо, ось и ромб. Колесо мыши меняет масштаб.'}
      </p>
      <div className="viewport" ref={host} aria-label={showingElement ? '3D-модель элемента' : '3D-макет выставки'}>
        {sceneError && <p role="alert">Не удалось запустить 3D. Проверьте, доступен ли WebGL в Chrome.</p>}
      </div>
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
        <div className="buttons" aria-label="Слои макета">
          {Object.entries(layerLabels).map(([key, label]) => {
            const layer = key as keyof typeof layers;
            return <label key={layer}><input type="checkbox" checked={layers[layer]}
              onChange={event => setLayers({ ...layers, [layer]: event.target.checked })} /> {label}</label>;
          })}
        </div>
      </>}
      <div className="buttons">
        {!showingElement && <>
          <button type="button" className="primary" disabled={sceneError || assembling} onClick={check}>Проверить гипотезу</button>
          <button type="button" aria-expanded={hint} disabled={assembling} onClick={() => {
            setHint(!hint);
          }}>Подсказка</button>
        </>}
        {element && stage !== 'complete' && <button type="button" disabled={assembling}
          onClick={() => { setViewSaved(!viewSaved); setHint(false); setMessage(''); }}>
          {viewSaved ? 'Вернуться к попытке' : 'Открыть сохранённый элемент'}
        </button>}
      </div>
      <p className="feedback" role="status">{message}</p>
      {hint && !showingElement && <p className="guide">{selecting
        ? 'На макете показаны линии между видимыми зданиями. По меткам сторон света проверьте, какая трасса проходит в ворота, а какая огибает конец забора.'
        : 'Сравните концы двух длинных штрихов ближе к середине. У ромба ищите два коротких уголка: их верхние вершины должны встретиться, как и нижние.'}</p>}
      <div className="attempt-tools">
        <button type="button" disabled={assembling} onClick={reset}>Начать попытку заново</button>
      </div>
      {storageError && <p className="guide" role="alert">Хранилище вкладки недоступно. После перезагрузки часть данных может потеряться.</p>}
    </main>
  );
}
