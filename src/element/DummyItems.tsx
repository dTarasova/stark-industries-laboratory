import {useEffect, useState} from 'react';
import {Dummy} from '../Dummy';

const items = {
  wrench: ['Гаечный ключ', 'Дамми уверенно указывает на гайку, которой здесь нет.'],
  extinguisher: ['Огнетушитель', 'Дамми готов тушить даже научные споры.'],
  duck: ['Резиновая уточка', 'Дамми торжественно представляет лабораторного консультанта.'],
  banana: ['Банан', 'Дамми предлагает использовать его как эталон длины.'],
  paper: ['Обрывок бумаги', 'Дамми нашёл запись об этом этапе.'],
};
type Item = keyof typeof items;
type Stage = 'selection' | 'projection';
type Draws = {queue: Item[]; count: number};

const storageKey = (mission: number, stage: Stage) => `surkov-dummy-${mission}-${stage}`;

function loadDraws(key: string): Draws {
  const queue = Object.keys(items) as Item[];
  try {
    const saved = JSON.parse(sessionStorage.getItem(key) ?? 'null');
    if (saved && Array.isArray(saved.queue) && saved.queue.length === queue.length &&
        queue.every(item => saved.queue.includes(item)) &&
        Number.isInteger(saved.count) && saved.count >= 0 && saved.count <= queue.length) return saved;
  } catch {
    // Выдача доступна и без хранилища.
  }
  for (let i = queue.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [queue[i], queue[j]] = [queue[j], queue[i]];
  }
  return {queue, count: 0};
}

export function resetDummyItems(mission: number) {
  try {
    sessionStorage.removeItem(storageKey(mission, 'selection'));
    sessionStorage.removeItem(storageKey(mission, 'projection'));
  } catch {
    // Текущая выдача сбрасывается при повторном монтаже.
  }
}

export function DummyItems({stage, mission, condition}: {stage: Stage; mission: number; condition: string}) {
  const key = storageKey(mission, stage);
  const [draws, setDraws] = useState(() => loadDraws(key));
  const [reacting, setReacting] = useState(false);
  const item = draws.queue[draws.count - 1];
  const hasPaper = draws.queue.indexOf('paper') < draws.count;

  useEffect(() => {
    if (!reacting) return;
    const timer = window.setTimeout(() => setReacting(false), 400);
    return () => window.clearTimeout(timer);
  }, [reacting]);

  function draw() {
    if (reacting || draws.count >= draws.queue.length) return;
    const next = {...draws, count: draws.count + 1};
    setDraws(next);
    try {
      sessionStorage.setItem(key, JSON.stringify(next));
    } catch {
      // Текущая выдача остаётся доступной.
    }
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setReacting(true);
    }
  }

  return (
    <Dummy handingItem={reacting}>
      <button type="button" disabled={reacting || draws.count === draws.queue.length} onClick={draw}>
        {draws.count === draws.queue.length ? 'Все предметы выданы' : 'Дамми, что у тебя?'}
      </button>
      <div role="status">{item && <p><strong>{items[item][0]}</strong> · {items[item][1]}</p>}</div>
      {hasPaper && <details open>
        <summary>Прочитать обрывок бумаги</summary>
        <p>{condition}</p>
      </details>}
    </Dummy>
  );
}
