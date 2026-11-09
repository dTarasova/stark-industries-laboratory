import {useEffect, useState, type ReactNode} from 'react';

const replies = [
  'Дамми поднимает манипулятор в знак приветствия.',
  'Дамми поправляет инструменты и поворачивается к вам.',
  'Дамми замирает у огнетушителя в ожидании команды.',
];

export function Dummy({children, handingItem = false}: {
  children?: ReactNode;
  handingItem?: boolean;
}) {
  const [reply, setReply] = useState(-1);
  const [reacting, setReacting] = useState(false);

  useEffect(() => {
    if (!reacting) return;
    const timer = window.setTimeout(() => setReacting(false), 850);
    return () => window.clearTimeout(timer);
  }, [reacting]);

  return (
    <aside className="dum-e" data-reacting={reacting || handingItem} aria-label="Дамми">
      <h2>DUM-E</h2>
      <svg className="robot-arm" viewBox="0 0 240 180" aria-hidden="true"><g fill="none" stroke="currentColor" strokeWidth="3"><path d="M45 158H190M65 155L80 136H155L175 155Z"/><circle cx="118" cy="127" r="14"/><path d="M107 118L75 66L89 57L129 115M82 56L147 30L155 45L93 73"/><circle cx="83" cy="63" r="12"/><circle cx="150" cy="37" r="10"/><path d="M157 33L184 53L178 64L151 46M182 56L202 52L216 66M180 61L189 81L208 83"/></g></svg>
      {children ?? <>
        <button type="button" disabled={reacting} onClick={() => {
          setReply(index => (index + 1) % replies.length);
          if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) setReacting(true);
        }}>Дамми, ты здесь?</button>
        <p role="status">{reply >= 0 && replies[reply]}</p>
      </>}
    </aside>
  );
}
