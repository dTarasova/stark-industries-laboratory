import {ProjectIllustration} from './ProjectIllustration';

const projects = [
  {
    title: 'Диссертация',
    illustration: 'research',
    status: 'Рукопись подготовлена',
    description: 'Текст диссертации написан. Тема исследования пока не указана. Сведения о защите ожидают подтверждения.',
    material: 'Рукопись и обложка пока не добавлены.',
  },
  {
    title: 'Аспирантура',
    illustration: 'graduate',
    status: 'Программа окончена',
    description: 'Основатель SURKOV INDUSTRIES окончил аспирантуру.',
    material: 'Фотографии и документы пока не добавлены.',
  },
  {
    title: 'Стажировка по алгоритмическому программированию',
    illustration: 'algorithms',
    status: 'Первый раунд завершён',
    description: 'В первом раунде участвовали 13 стажёров. Четверо успешно завершили раунд и повысили свой рейтинг на Codeforces.',
    material: 'Фотографии и учебные материалы пока не добавлены.',
  },
] as const;

export function FounderArchive() {
  return (
    <main>
      <header>
        <span>SURKOV INDUSTRIES</span>
        <a href="/">В лабораторию</a>
      </header>
      <h1>Архив проектов основателя</h1>
      {projects.map(({title, status, description, material, illustration}) => (
        <details className="archive-card" key={title}>
          <summary>
            <strong>{title}</strong>
            <span className="archive-status">{status}</span>
          </summary>
          <div className="archive-dossier">
            <ProjectIllustration project={illustration} />
            <p>{description}</p>
            <h2>Материалы проекта</h2>
            <p>{material}</p>
          </div>
        </details>
      ))}
    </main>
  );
}
