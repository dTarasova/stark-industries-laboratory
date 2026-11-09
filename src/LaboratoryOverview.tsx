import {useEffect, useRef, useState, type ReactNode} from 'react';
import {LaboratorySystems} from './LaboratorySystems';
import {ProjectIllustration} from './ProjectIllustration';

export const badgeNames = ['GENIUS / Гений', 'BILLIONAIRE / Биллионер', 'PLAYBOY / Плейбой', 'PHILANTHROPIST / Филантроп'];

const replies = [
  'Дамми поднимает манипулятор в знак приветствия.',
  'Дамми поправляет инструменты и поворачивается к вам.',
  'Дамми замирает у огнетушителя в ожидании команды.',
];
const greeting = 'Добро пожаловать, мистер Сурков. Сканирование дугового реактора завершено. Лаборатория открыта.';

export function LaboratoryOverview({stage, elementDiscovered, badges, children, captured, edithUnlocked}: {
  stage?: number;
  elementDiscovered: boolean;
  edithUnlocked: boolean;
  badges?: number;
  children: ReactNode;
  captured?: boolean;
}) {
  const [scanState, setScan] = useState<'ready' | 'scanning' | 'done'>('ready');
  const scan = captured ? 'done' : scanState;
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
        <ul className="badge-list top-badges" aria-label="Бейджи основателя">{badgeNames.map((name,index) => <li key={name} data-active={Boolean((badges ?? 0) & (1 << index))}><strong>{name.split(' / ')[0]}</strong><span>{name.split(' / ')[1]} · {badges === undefined ? 'Ожидание' : (badges & (1 << index)) ? 'Вручён' : 'Не вручён'}</span></li>)}</ul>
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
          <h1 ref={heading} tabIndex={-1}>{scan === 'done' ? 'Лаборатория' : 'Дуговой реактор'}</h1>
          {scan !== 'done' && (
            <>
              <button type="button" onClick={startScan} disabled={scan === 'scanning'}>
                {scan === 'scanning' ? 'Сканируем реактор…' : 'Сканировать реактор'}
              </button>
              <p role="status">{scan === 'scanning' ? 'Проверяем питание и состояние ядра.' : 'JARVIS ожидает команды.'}</p>
            </>
          )}
        </div>
        <div className="reactor-visual" aria-hidden="true" data-upgraded={elementDiscovered} />
      </div>
      {scan === 'done' && (
        <div className="lab-workspace">
          <LaboratorySystems stage={stage} edithUnlocked={edithUnlocked} elementDiscovered={elementDiscovered} onDiagnosis={announce}/>
          <div className="mission-column">{children}</div>
          <section className="lab-panel" aria-labelledby="founder-achievements">
            <h2 id="founder-achievements">Личные достижения</h2>
            <ul className="achievement-list">
              <li><ProjectIllustration project="research" /><strong>Исследовательская программа</strong><p>Текст диссертации подготовлен.</p></li>
              <li><ProjectIllustration project="graduate" /><strong>Аспирантура</strong><p>Аспирантура окончена.</p></li>
              <li><ProjectIllustration project="algorithms" /><strong>Алгоритмическая школа</strong><p>4 из 13 стажёров завершили первый раунд и повысили рейтинг на Codeforces.</p></li>
            </ul>
          </section>
          <aside className="dum-e" data-reacting={reacting}><h2>DUM-E</h2><svg className="robot-arm" viewBox="0 0 240 180" aria-hidden="true"><g fill="none" stroke="currentColor" strokeWidth="3"><path d="M45 158H190M65 155L80 136H155L175 155Z"/><circle cx="118" cy="127" r="14"/><path d="M107 118L75 66L89 57L129 115M82 56L147 30L155 45L93 73"/><circle cx="83" cy="63" r="12"/><circle cx="150" cy="37" r="10"/><path d="M157 33L184 53L178 64L151 46M182 56L202 52L216 66M180 61L189 81L208 83"/></g></svg>
            <button type="button" disabled={reacting} onClick={() => {
              setReply(index => (index + 1) % replies.length);
              setReacting(true);
            }}>Дамми, ты здесь?</button>
            <p role="status">{reply >= 0 && replies[reply]}</p>
          </aside>
        </div>
      )}
    </main>
  );
}
