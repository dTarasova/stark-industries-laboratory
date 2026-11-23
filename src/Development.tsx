import {Dummy} from './Dummy';
import {useState, type FormEvent} from 'react';
import type {Mission} from './App';
import './development.css';

export function Development({unlocked, onUnlock, mission}: {
  unlocked: boolean;
  mission: number;
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
      setError('Сэр, для допуска нужен код EDITH. Введите его в поле выше.');
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
      setError('Сэр, канал проверки не отвечает. Ваш код остался в поле — попробуйте ещё раз.');
    } finally {
      setChecking(false);
    }
  }

  return (
    <>
      <Entry className={unlocked ? "development-navigation" : "development-entry"}>
        <header><span>SURKOV INDUSTRIES</span><span>Текущая разработка</span><a href="/">Лаборатория</a></header>
        {!unlocked && (
          <div className="edith-gate" data-state={checking ? 'checking' : error ? 'denied' : 'locked'}>
          <div className="edith-optics" aria-hidden="true">
            <svg viewBox="0 0 420 320" fill="none">
              <path className="edith-frame" d="M40 118 98 60h224l58 58v84l-58 58H98l-58-58z" />
              <path className="edith-traces" d="M0 134h64l28-28h66m262 28h-64l-28-28h-66M0 186h64l28 28h66m262-28h-64l-28 28h-66M148 0v60m124-60v60M148 260v60m124-60v60" />
              <path className="edith-lenses" d="m86 130 14 65h66l24-56h40l24 56h66l14-65-34-14h-55l-15 12h-40l-15-12h-55z" />
              <path className="edith-focus" d="M126 150h32m-16-16v32m120-16h32m-16-16v32M180 220h60" />
              <path className="edith-sweep" d="M70 160h280" />
            </svg>
            <span>E.D.I.T.H.</span>
            <p>{checking ? 'Проверка допуска' : error ? 'Допуск не подтверждён' : 'Ожидание кода доступа'}</p>
          </div>
          <form className="development-access" onSubmit={submit}>
            <h1>Только для глаз основателя</h1>
            <p className="edith-brief">Сэр, архив Говарда Старка готов к реконструкции. EDITH просит код допуска. Я бы назвал это формальностью, если бы она умела шутить.</p>
            <label>
              Код доступа EDITH
              <input type="password" value={code} onChange={event => setCode(event.target.value)}
                disabled={checking} aria-invalid={Boolean(error)} aria-describedby={error ? 'edith-error' : undefined} />
            </label>
            <button disabled={checking}>{checking ? 'EDITH проверяет допуск…' : 'Подтвердить допуск'}</button>
            {error && <p id="edith-error" role="alert">{error}</p>}
          </form>
          </div>
        )}
        {!unlocked && <Dummy />}
      </Entry>
      {unlocked && (
        <iframe key={mission} className="development-puzzle" src={`/prototype_v2/?run=${mission}`} title="Проект 0 / Нулевой элемент" />
      )}
    </>
  );
}
