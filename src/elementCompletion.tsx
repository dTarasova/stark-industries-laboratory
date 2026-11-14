import {createRoot} from 'react-dom/client';
import {useMissionCompletion} from './useMissionCompletion';

function CompletionStatus() {
  const saved = useMissionCompletion(true, 'element-complete');
  return <>
    <p role="status">{saved
      ? 'Элемент открыт. Получите задание от ведущей для подготовки планетарной защиты Земли.'
      : 'Сохраняем открытие в лаборатории. При потере связи повторим отправку.'}</p>
    {saved && <a className="primary" href="/" target="_top">Вернуться в лабораторию</a>}
  </>;
}

let reported = false;

export function reportElementComplete() {
  if (reported) return;
  reported = true;
  const host = document.createElement('div');
  document.getElementById('panelSuccess')!.append(host);
  createRoot(host).render(<CompletionStatus />);
}
