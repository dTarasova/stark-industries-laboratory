import {useState} from 'react';

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

export function LaboratorySystems({stage, elementDiscovered}: {
  stage: number;
  elementDiscovered: boolean;
}) {
  const [diagnosedStage, setDiagnosedStage] = useState<number>();
  const reactor = elementDiscovered ? 'Новый элемент установлен' : 'Исходное ядро активно';

  return (
    <section aria-labelledby="systems-title">
      <h2 id="systems-title">Системы лаборатории</h2>
      <div className="reactor-status">
        <span className="reactor" data-upgraded={elementDiscovered} aria-hidden="true" />
        <div>
          <strong>Дуговой реактор</strong>
          <p>{reactor}</p>
        </div>
      </div>
      <button type="button" onClick={() => setDiagnosedStage(stage)}>Запустить диагностику</button>
      <div role="status">
        {diagnosedStage === stage && <p>{diagnostics[stage]} Реактор — {reactor.toLowerCase()}.</p>}
      </div>
      <h3>Достижения миссии</h3>
      {elementDiscovered ? (
        <ul><li><strong>Новый элемент</strong> — структура найдена и применена в реакторе.</li></ul>
      ) : (
        <p>Достижений пока нет.</p>
      )}
    </section>
  );
}
