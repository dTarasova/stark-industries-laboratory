import {Dummy} from './Dummy';
import {useEffect, useRef, useState, type ReactNode} from 'react';
import {LaboratorySystems} from './LaboratorySystems';
import {ProjectIllustration} from './ProjectIllustration';

export const badgeNames = ['GENIUS / Гений', 'BILLIONAIRE / Биллионер', 'PLAYBOY / Плейбой', 'PHILANTHROPIST / Филантроп'];

const greeting = 'Добро пожаловать, мистер Сурков. Сканирование дугового реактора завершено. Лаборатория открыта.';

export function LaboratoryOverview({stage, elementDiscovered, badges, children, captured, edithUnlocked, cleanSlateComplete}: {
  stage?: number;
  elementDiscovered: boolean;
  edithUnlocked: boolean;
  badges?: number;
  children: ReactNode;
  captured?: boolean;
  cleanSlateComplete?: boolean;
}) {
  const [scanState, setScan] = useState<'ready' | 'scanning' | 'done'>('ready');
  const scan = captured ? 'done' : scanState;
  const [message, setMessage] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const historyPanel = useRef<HTMLDetailsElement>(null);
  const [unread, setUnread] = useState(0);
  const heading = useRef<HTMLHeadingElement>(null);
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
      {scan !== 'done' && <Dummy />}
      {scan === 'done' && (
        <div className="lab-workspace">
          <LaboratorySystems stage={stage} edithUnlocked={edithUnlocked} elementDiscovered={elementDiscovered} onDiagnosis={announce}/>
          <div className="mission-column">{children}</div>
          <section className="lab-panel" aria-labelledby="founder-achievements">
            <h2 id="founder-achievements">Личные достижения</h2>
            <ul className="achievement-list">
              {cleanSlateComplete && <li><strong>Протокол Clean Slate</strong><p>Дамми восстановил аварийную шину. Заражённые костюмы выведены из строя.</p></li>}
              <li><ProjectIllustration project="research" /><strong>Исследовательская программа</strong><p>Текст диссертации подготовлен.</p></li>
              <li><ProjectIllustration project="graduate" /><strong>Аспирантура</strong><p>Аспирантура окончена.</p></li>
              <li><ProjectIllustration project="algorithms" /><strong>Алгоритмическая школа</strong><p>4 из 13 стажёров завершили первый раунд и повысили рейтинг на Codeforces.</p></li>
            </ul>
          </section>
          {!captured && <Dummy />}
        </div>
      )}
    </main>
  );
}
