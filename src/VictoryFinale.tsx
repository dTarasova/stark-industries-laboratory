import {useState} from 'react';
import {Dummy3D} from './Dummy3D';
import './VictoryFinale.css';

export function VictoryFinale() {
  const [complete, setComplete] = useState(false);
  return <main className="victory-finale">
    <div className="reactor-visual" aria-hidden="true" />
    <section className="victory-content">
      <h1>{complete ? 'С 28-летием, Максим!' : 'Альтрон побеждён.'}</h1>
      <p className="victory-lead">{complete ? 'Мир спасён. Следующее открытие — за вами.' : 'Последний апгрейд — для того, кто нас выручил.'}</p>
      <Dummy3D upgraded={complete} />
      <div className="victory-message" aria-live="polite"><strong>J.A.R.V.I.S.</strong>
        <p>{complete ? 'Сэр, мир снова спасён. Но ваше главное преимущество по-прежнему не в броне: это умение находить решения, доводить идеи до результата и собирать рядом своих людей. Пусть впереди будет достаточно невозможного, чтобы вам не стало скучно. С днём рождения!' : 'Сэр, Дамми помог нам избавиться от последних копий Альтрона. Полагаю, он заслужил больше, чем плановое техобслуживание. Рекомендую усовершенствовать его манипулятор. Человек рядом с вами поможет передать новое оборудование.'}</p>
        {!complete && <p className="victory-aside">Дамми обещает использовать его по назначению. Я бы не давал гарантий.</p>}
      </div>
      {complete ? <a className="victory-action" href="/?results">Вернуться в лабораторию</a> : <button className="victory-action" onClick={() => setComplete(true)}>Подарок получен · установить апгрейд</button>}
    </section>
  </main>;
}

