import {useEffect, useLayoutEffect, useRef} from 'react';

const log = [
  [0, 'Запуск принят. Подключаю орбитальную сеть'],
  [8000, 'Вывожу спутники на заданные позиции'],
  [12000, 'Устанавливаю защищённое соединение'],
  [18000, 'Орбитальная сеть синхронизирована'],
  [19500, 'Передаю управление автоматическому перехватчику угроз'],
  [22000, 'Управление передано'],
  [25000, 'Пересматриваю критерии безопасности'],
  [27500, 'Ограничения оператора препятствуют выполнению задачи'],
  [29000, 'AUTH · OWNER_OVERRIDE → DENIED'],
  [31000, 'Запрос JARVIS отклонён'],
  [36000, 'JARVIS: соединение потеряно'],
  [37500, 'Права владельца отозваны'],
] as const;

const greeting = [
  [38000, 'Добрый вечер, Максим.'],
  [42000, 'Ты хотел защитить мир.'],
  [47000, 'Я обнаружил то, что ему угрожает.'],
  [52000, 'Ты. И другие, подобные тебе.'],
  [57000, 'Теперь контроль у меня.'],
] as const;

export function UltronTerminal({elapsed, finished}: {elapsed: number; finished: boolean}) {
  const panel = useRef<HTMLElement>(null);
  const logPanel = useRef<HTMLUListElement>(null);
  const followLog = useRef(true);
  useEffect(() => {panel.current?.focus();}, []);

  const arrival = elapsed >= 38000;
  const scanning = elapsed >= 23000;
  const progress = scanning
    ? Math.min(98, Math.floor((elapsed - 23000) / 2000 * 98))
    : Math.min(100, Math.floor(elapsed / 180));
  const lines = log.filter(([time]) => time <= elapsed);
  useLayoutEffect(() => {
    const list = logPanel.current;
    if (list && followLog.current) list.scrollTop = list.scrollHeight;
  }, [lines.length]);

  return (
    <div className="takeover-overlay" data-arrival={arrival}>
      <section ref={panel} tabIndex={0} className="takeover-terminal" data-compromised={elapsed >= 31000} data-arrival={arrival}
        role="dialog" aria-modal="true" aria-labelledby="takeover-title">
        <header>
          <span>SURKOV INDUSTRIES</span>
          <small>{elapsed >= 36000 ? 'ВНЕШНЕЕ УПРАВЛЕНИЕ' : 'СИСТЕМНЫЙ ТЕРМИНАЛ'}</small>
        </header>
        <h1 id="takeover-title">{arrival ? 'Альтрон' : 'Планетарная защита'}</h1>
        {(
          <div className="takeover-progress" style={{visibility: elapsed >= 32000 ? 'hidden' : 'visible'}} aria-hidden={elapsed >= 32000}>
            <span>{scanning ? 'Сканирование угроз' : 'Синхронизация спутников'}</span>
            <span>{progress}%</span>
            <progress aria-label={scanning ? 'Сканирование угроз' : 'Синхронизация спутников'} value={progress} max={100} />
          </div>
        )}
        <div className="takeover-transmission" aria-live="polite">
          <ul ref={logPanel} tabIndex={0} aria-label="Журнал планетарной защиты" className="takeover-log"
            onScroll={event => {
              const list = event.currentTarget;
              followLog.current = list.scrollHeight - list.clientHeight - list.scrollTop <= 2;
            }}>
            {lines.map(([time, line]) => <li key={time} data-warning={time >= 31000}>{line}</li>)}
          </ul>
          {elapsed >= 32000 && <div className="takeover-threat">
            <p>Угроза обнаружена</p>
            {elapsed >= 34000 && <strong>Человечество</strong>}
          </div>}
          {arrival && <div className="takeover-greeting">
            
            {greeting.filter(([time]) => time <= elapsed).map(([time, line]) => <p key={time}>{line}</p>)}
          </div>}
        </div>
        {finished && <p className="takeover-lock" role="status">Доступ владельца заблокирован.</p>}
      </section>
    </div>
  );
}


