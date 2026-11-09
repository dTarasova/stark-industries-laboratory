import {lazy, Suspense, useState, type FormEvent} from 'react';
import type {Mission} from './App';
import './development.css';

const Experiment = lazy(async () => ({default: (await import('./element/Prototype')).Prototype}));

function focusExperiment(container: HTMLDivElement | null) {
  const title = container?.querySelector('h1');
  if (title) {
    title.tabIndex = -1;
    title.focus();
  }
}

export function Development({unlocked, onUnlock}: {
  unlocked: boolean;
  onUnlock: (mission: Mission) => void;
}) {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [checking, setChecking] = useState(false);
  const Entry = unlocked ? 'div' : 'main';

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (checking) return;
    if (!code.trim()) {
      setError('Введите код доступа');
      return;
    }
    setChecking(true);
    setError('');
    try {
      const response = await fetch('/api/edith', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({code}),
        signal: AbortSignal.timeout(8000),
      });
      if (response.ok) {
        const mission: Mission = await response.json();
        setCode('');
        onUnlock(mission);
      } else if ([409, 422, 503].includes(response.status)) {
        const result = await response.json();
        setError(result.error);
      } else {
        throw new Error();
      }
    } catch {
      setError('Не удалось проверить код. Повторите попытку.');
    } finally {
      setChecking(false);
    }
  }

  return (
    <>
      <Entry className="development-entry">
        <header><span>SURKOV INDUSTRIES</span><a href="/">Лаборатория</a></header>
        <h1>Текущая разработка</h1>
        {unlocked ? <p role="status">EDITH · Доступ открыт</p> : (
          <form className="development-access" onSubmit={submit}>
            <h2>Доступ закрыт · EDITH</h2>
            <label>
              Введите код доступа EDITH
              <input type="password" value={code} onChange={event => setCode(event.target.value)}
                disabled={checking} aria-describedby={error ? 'edith-error' : undefined} />
            </label>
            <button disabled={checking}>{checking ? 'Проверяем код…' : 'Открыть доступ'}</button>
            {error && <p id="edith-error" role="alert">{error}</p>}
          </form>
        )}
      </Entry>
      {unlocked && (
        <Suspense fallback={<p role="status">Загружаем рабочее пространство…</p>}>
          <div className="element-experiment" ref={focusExperiment}><Experiment /></div>
        </Suspense>
      )}
    </>
  );
}
