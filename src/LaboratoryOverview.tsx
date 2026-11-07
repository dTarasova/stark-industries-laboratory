import {useEffect, useRef, useState, type ReactNode} from 'react';
import {LaboratorySystems} from './LaboratorySystems';

export const badgeNames = ['GENIUS / Гений', 'BILLIONAIRE / Биллионер', 'PLAYBOY / Плейбой', 'PHILANTHROPIST / Филантроп'];

const replies = [
  'Дамми поднимает манипулятор в знак приветствия.',
  'Дамми поправляет инструменты и поворачивается к вам.',
  'Дамми замирает у огнетушителя в ожидании команды.',
];
const greeting = 'Добро пожаловать, мистер Сурков. Обзор лаборатории открыт.';

export function LaboratoryOverview({stage, elementDiscovered, badges, children}: {
  stage?: number;
  elementDiscovered: boolean;
  badges?: number;
  children: ReactNode;
}) {
  const [scan, setScan] = useState<'ready' | 'scanning' | 'done'>('ready');
  const [message, setMessage] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const historyPanel = useRef<HTMLDetailsElement>(null);
  const [unread, setUnread] = useState(0);
  const heading = useRef<HTMLHeadingElement>(null);
  const [reply, setReply] = useState(-1);
  const [reacting, setReacting] = useState(false);

  function announce(text: string) {
    setMessage(text);
    if (!historyPanel.current?.open) setUnread(count => count + 1);
    setHistory(items => [...items, text]);
  }

  useEffect(() => {
    if (scan !== 'scanning') return;
    const timer = window.setTimeout(() => {
      setScan('done');
      announce(greeting);
    }, 1100);
    return () => window.clearTimeout(timer);
  }, [scan]);

  useEffect(() => {
    if (!message) return;
    const timer = window.setTimeout(() => setMessage(''), 6500);
    return () => window.clearTimeout(timer);
  }, [message, history]);

  useEffect(() => {
    if (!reacting) return;
    const timer = window.setTimeout(() => setReacting(false), 850);
    return () => window.clearTimeout(timer);
  }, [reacting]);

  useEffect(() => {
    if (scan === 'done') heading.current?.focus();
  }, [scan]);

  function startScan() {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setScan('done');
      announce(greeting);
    } else {
      setScan('scanning');
    }
  }

  return (
    <main className="founder-lab" data-scan={scan}>
      <header>
        <span>SURKOV INDUSTRIES</span>
        <a href="/archive">Архив проектов</a>
        {scan === 'done' && (
          <details className="message-history" ref={historyPanel} onToggle={event => { if (event.currentTarget.open) setUnread(0); }}>
            <summary>История JARVIS{unread > 0 ? ' · новых: ' + unread : ''}</summary>
            <ol>{history.map((text, index) => <li key={index}>{text}</li>)}</ol>
          </details>
        )}
      </header>
      <div className="jarvis-message" role="status">{message && <p><strong>JARVIS</strong> · {message}</p>}</div>
      <div className="scan-stage">
        <div>
          <h1 ref={heading} tabIndex={-1}>Максим Сурков</h1>
          {scan !== 'done' && (
            <>
              <p>Дуговой реактор</p>
              <button type="button" onClick={startScan} disabled={scan === 'scanning'}>
                {scan === 'scanning' ? 'Сканирование…' : 'Сканировать'}
              </button>
              {scan === 'scanning' && <p role="status">Питание · Связь · Оборудование</p>}
            </>
          )}
        </div>
        <div className="reactor-visual" aria-hidden="true" data-upgraded={elementDiscovered} />
      </div>
      {scan === 'done' && (
        <>
          <LaboratorySystems stage={stage} elementDiscovered={elementDiscovered} onDiagnosis={announce}/>
          {children}
          <section className="lab-panel" aria-labelledby="founder-achievements">
            <h2 id="founder-achievements">Личные достижения</h2>
            <ul className="achievement-list">
              <li><strong>Исследовательская программа</strong><p>Текст диссертации подготовлен.</p></li>
              <li><strong>Аспирантура</strong><p>Аспирантура окончена.</p></li>
              <li><strong>Алгоритмическая школа</strong><p>Первый раунд завершён. 4 из 13 стажёров успешно завершили раунд и повысили рейтинг на Codeforces.</p></li>
            </ul>
          </section>
          <section className="lab-panel">
            <h2>Бейджи основателя</h2>
            <ul className="badge-list">
              {badgeNames.map((name, index) => {
                const active = badges !== undefined && Boolean(badges & (1 << index));
                return <li key={name} data-active={active}><strong>{name}</strong><span>{badges === undefined ? 'Ожидаем данные' : active ? 'Вручён' : 'Ожидает вручения'}</span></li>;
              })}
            </ul>
          </section>
          <aside className="dum-e">
            <button type="button" disabled={reacting} onClick={() => {
              setReply(index => (index + 1) % replies.length);
              setReacting(true);
            }}>Дамми, ты здесь?</button>
            <p role="status">{reply >= 0 && replies[reply]}</p>
          </aside>
        </>
      )}
    </main>
  );
}
