import {useState} from 'react';
import {Dummy} from './Dummy';
import './VictoryFinale.css';

export function VictoryFinale() {
  const [complete, setComplete] = useState(false);
  return <main className="victory-finale">
    <div className="reactor-visual" aria-hidden="true" />
    <section className="victory-content">
      <h1>{complete ? 'С 28-летием, Максим!' : 'Альтрон побеждён.'}</h1>
      <p className="victory-lead">{complete ? 'Мир спасён. Лучшие открытия — впереди.' : 'Осталось позаботиться о герое.'}</p>
      <div className="victory-stage" aria-label="Дамми с модернизированным манипулятором и огнетушителем">
        <Dummy><span className="victory-module">Модуль пожаротушения · подключён</span></Dummy>
        <svg className="victory-extinguisher" viewBox="0 0 180 240" role="img" aria-label="Новый огнетушитель Дамми">
          <g fill="none" stroke="#d3eef0" strokeWidth="5" strokeLinejoin="round"><path d="M91 46V25h34M91 30L65 17M105 41c60 0 51 60 42 87l-15 19"/><path fill="#b83332" d="M64 64Q64 45 90 45Q116 45 116 64V201Q90 217 64 201Z"/><path d="M64 85h52M64 181h52"/><path fill="#e9eeee" d="M77 103h26v53H77z"/><path stroke="#b83332" d="M90 112v35m-7-18h14"/><circle cx="90" cy="43" r="9" fill="#132a31"/></g>
          <g className="victory-foam" fill="#d5f9f5"><circle cx="142" cy="162" r="8"/><circle cx="156" cy="184" r="12"/><circle cx="142" cy="209" r="17"/></g>
        </svg>
      </div>
      <div className="victory-message" aria-live="polite"><strong>J.A.R.V.I.S.</strong>
        <p>{complete ? 'Сэр, пусть ваши идеи всегда опережают технологии. А рядом будут те, кто поможет воплотить даже самые невероятные из них. С днём рождения!' : 'Сэр, Дамми спас лабораторию. Но диагностика однозначна: его манипулятору требуется апгрейд. Новый огнетушитель уже готов. Для передачи оборудования потребуется помощь человека рядом с вами.'}</p>
        {!complete && <p className="victory-aside">Дамми обещает использовать его по назначению. Я бы не давал гарантий.</p>}
      </div>
      {complete ? <a className="victory-action" href="/?results">Вернуться в лабораторию</a> : <button className="victory-action" onClick={() => setComplete(true)}>Подарок получен · продолжить</button>}
    </section>
  </main>;
}
