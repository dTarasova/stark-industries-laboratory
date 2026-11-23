import {useEffect, useState} from 'react';
import {OrbitalDisplay} from './OrbitalDisplay';

const diagnostics = [
  'Системы лаборатории готовы к работе.',
  'Канал EDITH на связи. Ожидается допуск к разработке.',
  'Контур исследования готов принять результат.',
  'Лаборатория готова к этапу защиты Земли.',
  'Основной канал недоступен. Следуйте инструкциям резервного канала.',
  'Лаборатория готова к исследованию временных линий.',
  'Идёт восстановление канала JARVIS.',
  'Системы готовы к протоколу Clean Slate.',
  'Миссия завершена. Лаборатория в режиме ожидания.',
];

const systemSymbols = [
  'M12 3l8 4.5v9L12 21l-8-4.5v-9z M12 8l4 2.2v3.6L12 16l-4-2.2v-3.6z',
  'M3 12h4l2-5 4 10 2-5h6',
  'M4 21h16 M9 21v-4l-4-5 4-6 6 2 3 4 M18 12l-3 3m3-3 3 3 M8 17h4',
  'M5 3h10l4 4v14H5z M15 3v5h4 M8 12h8 M8 16h5',
];

export function LaboratorySystems({stage, elementDiscovered, edithUnlocked, onDiagnosis}: {
  stage?: number;
  elementDiscovered: boolean;
  edithUnlocked: boolean;
  onDiagnosis: (text: string) => void;
}) {
  const [step, setStep] = useState(-1);
  const [report, setReport] = useState('');
  const reactor = elementDiscovered ? 'Новый элемент установлен' : 'Исходное ядро активно';
  const nodes = [
    ['Дуговой реактор', stage === undefined ? 'Ожидаем данные' : reactor],
    ['JARVIS', 'Канал сообщений'],
    ['Дамми', 'Оборудование лаборатории'],
    ['Текущая разработка', edithUnlocked ? 'Доступ открыт · EDITH' : 'Доступ закрыт · EDITH'],
  ];

  function finish() {
    const text = stage === undefined
      ? 'Ожидаем данные миссии.'
      : (stage === 1 && edithUnlocked ? 'EDITH открыла доступ к разработке.' : diagnostics[stage]) + ' Реактор — ' + reactor.toLowerCase() + '.';
    setStep(-1);
    setReport(text);
    onDiagnosis(text);
  }

  useEffect(() => {
    if (step < 0) return;
    const timer = window.setTimeout(() => {
      if (step === 2) finish();
      else setStep(step + 1);
    }, 450);
    return () => window.clearTimeout(timer);
  }, [step, stage, reactor, edithUnlocked]);

  return (
    <section className="lab-panel" aria-labelledby="systems-title">
      <h2 id="systems-title">Схема систем</h2>
      {stage === 3 && <OrbitalDisplay />}
      <ul className="system-nodes">
        {nodes.map(([title, status], index) => (
          <li key={title} data-checking={index === step}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d={systemSymbols[index]} /></svg>
            {index === 3 ? <a href="/development" target="_blank" rel="noopener">{title}</a> : <strong>{title}</strong>}
            <span>{status}</span>
            {index === 3 && <span>Откроется в новой вкладке</span>}
          </li>
        ))}
      </ul>
      <button type="button" disabled={step >= 0} onClick={() => {
        setReport('');
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) finish();
        else setStep(0);
      }}>{step >= 0 ? 'Проверяем системы…' : 'Диагностика лаборатории'}</button>
      {report && <p>{report}</p>}
      <h3>Достижения миссии</h3>
      <p>{elementDiscovered ? 'Новый элемент — структура найдена и применена в реакторе.' : stage === undefined ? 'Ожидаем данные миссии.' : 'Достижений пока нет.'}</p>
    </section>
  );
}
