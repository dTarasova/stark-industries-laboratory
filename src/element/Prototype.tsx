import { useEffect, useRef, useState } from 'react';
import { createScene } from './scene';
import {
  buildings, createElement, freshAttempt, matchesSelection, projectionTolerance, toggleBuilding,
  type Attempt,
} from './puzzle';
import './prototype.css';

const storageKey = 'surkov-element-test-v1';

function loadAttempt(): Attempt {
  try {
    const saved = sessionStorage.getItem(storageKey);
    if (!saved) return freshAttempt();
    const attempt = JSON.parse(saved) as Attempt | null;
    if (!attempt || !Array.isArray(attempt.selected) ||
      !attempt.selected.every(id => buildings.some(site => site.id === id))) return freshAttempt();

    const element = attempt.element;
    const validElement = element && Array.isArray(element.parts) && element.parts.length > 1 &&
      element.parts.every(part => part && Number.isFinite(part.radius) && part.radius > 0 &&
        Number.isInteger(part.color) && Array.isArray(part.center) && part.center.length === 3 &&
        part.center.every(Number.isFinite));
    if (attempt.stage === 'selection' ||
      (attempt.stage === 'projection' && matchesSelection(new Set(attempt.selected))) ||
      (attempt.stage === 'complete' && validElement)) {
      return { ...attempt, element: validElement ? element : undefined };
    }
  } catch {
    // The prototype is still playable when browser storage is unavailable.
  }
  return freshAttempt();
}

const layersInitial = { roads: true, landscape: true, wires: false };
const layerLabels = { roads: 'Дороги', landscape: 'Деревья и рельеф', wires: 'Коммуникации' };

export function Prototype() {
  const host = useRef<HTMLDivElement>(null);
  const scene = useRef<ReturnType<typeof createScene> | null>(null);
  const [attempt, setAttempt] = useState(loadAttempt);
  const [layers, setLayers] = useState(layersInitial);
  const [message, setMessage] = useState('');
  const [hint, setHint] = useState(false);
  const [assisted, setAssisted] = useState(false);
  const [proximity, setProximity] = useState('');
  const [assembling, setAssembling] = useState(false);
  const [viewSaved, setViewSaved] = useState(false);
  const [sceneError, setSceneError] = useState(false);
  const [storageError, setStorageError] = useState(false);
  const { stage, selected, element } = attempt;
  const showingElement = viewSaved || stage === 'complete';
  const selecting = stage === 'selection' && !showingElement;
  const projecting = stage === 'projection' && !showingElement;
  const toggle = (id: string) => {
    setAttempt(current => toggleBuilding(current, id));
    setMessage('');
  };

  useEffect(() => {
    try {
      scene.current = createScene(host.current!, toggle);
    } catch {
      setSceneError(true);
    }
    return () => {
      scene.current?.dispose();
      scene.current = null;
    };
  }, []);

  useEffect(() => {
    scene.current?.update(attempt, layers, viewSaved);
  }, [attempt, layers, viewSaved]);

  useEffect(() => {
    try {
      sessionStorage.setItem(storageKey, JSON.stringify(attempt));
    } catch {
      setStorageError(true);
    }
  }, [attempt]);

  useEffect(() => {
    if (!projecting || !assisted || assembling) return;
    const update = () => {
      const error = scene.current?.measure() ?? Infinity;
      setProximity(error <= projectionTolerance ? 'Очень близко' : error <= 0.55 ? 'Близко' : 'Далеко');
    };
    update();
    const interval = window.setInterval(update, 160);
    return () => window.clearInterval(interval);
  }, [projecting, assisted, assembling]);

  function check() {
    if (selecting) {
      if (!matchesSelection(new Set(selected))) {
        setMessage('Гипотеза не подтверждена. Проверьте условия и связи.');
        return;
      }
      setAttempt(current => ({ ...current, stage: 'projection' }));
      setMessage('Исходные здания подтверждены. Найдите ракурс из образца.');
      setHint(false);
    } else if (projecting && scene.current) {
      if (scene.current.measure() > projectionTolerance) {
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
    scene.current?.reset();
    setAttempt(freshAttempt(element));
    setLayers(layersInitial);
    setHint(false);
    setAssisted(false);
    setAssembling(false);
    setViewSaved(false);
    setMessage('Исходный макет восстановлен.');
  }

  return (
    <main>
      <header>
        <div>
          <p className="eyebrow">SURKOV INDUSTRIES / ИСПЫТАТЕЛЬНЫЙ СТЕНД</p>
          <h1>Новый элемент</h1>
        </div>
        <button type="button" onClick={reset}>Сбросить попытку</button>
      </header>
      <h2>{showingElement ? 'Открытый элемент' : selecting ? '01 / Отбор зданий' : '02 / Поиск проекции'}</h2>
      <p className="guide">
        {showingElement ? 'Вращайте открытый элемент мышью.' : selecting
          ? 'Перетаскивайте макет для вращения. Нажмите на здание или его букву, чтобы изменить отбор.'
          : 'Вращайте макет и сравнивайте цветные фрагменты с образцом. Колесо мыши меняет масштаб.'}
      </p>
      <div className="viewport" ref={host} aria-label={showingElement ? '3D-модель элемента' : '3D-макет выставки'}>
        {sceneError && <p role="alert">Не удалось запустить 3D. Проверьте, доступен ли WebGL в Chrome.</p>}
      </div>
      {selecting && <>
        <div className="buttons buildings" aria-label="Здания в отборе">
          {buildings.map(({ id }) => <button key={id} type="button" aria-label={'Здание ' + id}
            aria-pressed={selected.includes(id)} onClick={() => toggle(id)}>{id}</button>)}
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
          <button type="button" aria-expanded={hint} disabled={assembling} onClick={() => setHint(!hint)}>Подсказка</button>
        </>}
        {element && stage !== 'complete' && <button type="button" disabled={assembling}
          onClick={() => { setViewSaved(!viewSaved); setHint(false); setMessage(''); }}>
          {viewSaved ? 'Вернуться к попытке' : 'Открыть сохранённый элемент'}
        </button>}
        {projecting && <label><input type="checkbox" checked={assisted} disabled={assembling}
          onChange={event => setAssisted(event.target.checked)} /> Помощь ведущей: близость</label>}
      </div>
      <p className="feedback" role="status">{message}</p>
      {hint && !showingElement && <p className="guide">{selecting
        ? 'Начните с куполов и пройдите по линиям схемы. На последнем шаге сравните положение башен с проспектом.'
        : 'Откройте в чате дополнительный фрагмент. Сначала сопоставьте две отмеченные детали.'}</p>}
      {projecting && assisted && !assembling && <p className="guide">Близость к образцу: {proximity}</p>}
      {storageError && <p className="guide" role="alert">Хранилище вкладки недоступно. Перезагрузка очистит попытку.</p>}
    </main>
  );
}
