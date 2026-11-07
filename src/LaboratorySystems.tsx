import {useEffect, useState} from 'react';

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

export function LaboratorySystems({stage, elementDiscovered, onDiagnosis}: {
  stage?: number;
  elementDiscovered: boolean;
  onDiagnosis: (text: string) => void;
}) {
  const [step, setStep] = useState(-1);
  const [report, setReport] = useState('');
  const reactor = elementDiscovered ? 'Новый элемент установлен' : 'Исходное ядро активно';
  const nodes = [
    ['Дуговой реактор', stage === undefined ? 'Ожидаем данные' : reactor],
    ['JARVIS', 'Канал сообщений'],
    ['Дамми', 'Оборудование лаборатории'],
    ['Текущая разработка', 'Доступ закрыт · EDITH'],
  ];

  function finish() {
    const text = stage === undefined
      ? 'Ожидаем данные миссии.'
      : diagnostics[stage] + ' Реактор — ' + reactor.toLowerCase() + '.';
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
  }, [step, stage, reactor]);

  return (
    <section className="lab-panel" aria-labelledby="systems-title">
      <h2 id="systems-title">Схема систем</h2>
      <ul className="system-nodes">
        {nodes.map(([title, status], index) => (
          <li key={title} data-checking={index === step}>
            {index === 3 ? <a href="/development" target="_blank" rel="noopener">Текущая разработка <span>(новая вкладка)</span></a> : <strong>{title}</strong>}
            <span>{status}</span>
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