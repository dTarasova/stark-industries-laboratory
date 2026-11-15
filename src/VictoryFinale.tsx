import {useState} from 'react';
import {Dummy3D} from './Dummy3D';
import './VictoryFinale.css';

export function VictoryFinale() {
  const [complete, setComplete] = useState(false);
  return <main className="victory-finale">
    <div className="reactor-visual" aria-hidden="true" />
    <section className="victory-content">
      <h1>{complete ? 'С 28-летием, Максим!' : 'Альтрон побеждён.'}</h1>
      <p className="victory-lead">{complete ? 'Мир спасён. Лучшие открытия — впереди.' : 'Осталось позаботиться о герое.'}</p>
      <Dummy3D upgraded={complete} />
      <div className="victory-message" aria-live="polite"><strong>J.A.R.V.I.S.</strong>
        <p>{complete ? 'Сэр, пусть ваши идеи всегда опережают технологии. А рядом будут те, кто поможет воплотить даже самые невероятные из них. С днём рождения!' : 'Сэр, Дамми помог нам избавиться от последних остатков Альтрона. Полагаю, он заслужил кое-что получше планового техобслуживания. Рекомендую усовершенствовать его манипулятор. Для передачи нового оборудования потребуется помощь человека рядом с вами.'}</p>
        {!complete && <p className="victory-aside">Дамми обещает использовать его по назначению. Я бы не давал гарантий.</p>}
      </div>
      {complete ? <a className="victory-action" href="/?results">Вернуться в лабораторию</a> : <button className="victory-action" onClick={() => setComplete(true)}>Подарок получен · установить апгрейд</button>}
    </section>
  </main>;
}

