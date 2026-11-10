type Module = 'P' | 'A' | 'U' | 'L' | 'D' | null;
type State = {
  modules: readonly Module[];
  fuse: boolean;
  power: 'MAIN' | 'BACKUP';
  open: boolean;
  left: boolean;
  complete: boolean;
};

export type Action = number | 'fuse' | 'power' | 'hatch' | 'rotate' | 'key' | 'reset';

export const initial: State = {
  modules: ['P', 'A', 'U', 'L', 'D', null],
  fuse: false,
  power: 'MAIN',
  open: false,
  left: false,
  complete: false,
};
const target = ['P', 'D', 'L', 'U', 'A', null];
const neighbors = [[1, 3], [0, 2, 4], [1, 5], [0, 4], [1, 3, 5], [2, 4]];

function assemblyIssue(state: State) {
  if (!state.modules.every((module, index) => module === target[index])) {
    return 'Шина ещё не собрана. Сверьте расположение кассет с журналом.';
  }
  if (!state.left) {
    return 'Контур собран, но изолятор пропускает сигнал не в ту сторону. Впечатляюще, но бесполезно.';
  }
}

export const quarantineWarning = 'Остановитесь. Там открытая диагностическая линия моего ядра. Это было бы крайне неудачным способом проверить антивирус.';

export function apply(state: State, action: unknown): State | string {
  if (action === 'reset') return initial;
  if (state.complete) return 'Протокол Clean Slate уже завершён.';
  switch (action) {
    case 'fuse':
      return state.fuse ? 'Предохранитель уже установлен.' : {...state, fuse: true};
    case 'power': {
      if (state.power === 'MAIN') {
        return state.fuse ? {...state, power: 'BACKUP'} : 'Сначала установите резервный предохранитель.';
      }
      const issue = assemblyIssue(state);
      if (issue) return issue;
      return state.open ? 'Сначала закройте сервисную кассету.' : {...state, power: 'MAIN'};
    }
    case 'hatch': {
      if (state.power !== 'BACKUP') return 'Пока вы не переведёте меня на резервное питание, я предпочёл бы сохранить работоспособность.';
      const issue = state.open ? assemblyIssue(state) : undefined;
      return issue ?? {...state, open: !state.open};
    }
    case 'rotate':
      return state.open && state.power === 'BACKUP' && state.modules[1] === 'D'
        ? {...state, left: !state.left}
        : 'Дамми может повернуть изолятор только в открытой кассете, в ячейке 2.';
    case 'key':
      return state.power === 'MAIN' && !state.open && !assemblyIssue(state)
        ? {...state, complete: true}
        : 'Протокол Clean Slate недоступен: аппаратная конфигурация не прошла проверку.';
  }
  if (typeof action !== 'number' || !neighbors[action]) return 'Неизвестная команда.';
  if (!state.open || state.power !== 'BACKUP') return 'Перейдите на BACKUP и откройте сервисную кассету.';
  const empty = state.modules.indexOf(null);
  if (!neighbors[action].includes(empty)) {
    return 'Дамми не может перескочить через кассету, сэр. Его возможности всё ещё ограничены физикой.';
  }
  if (state.modules[action] === 'U' && empty === 4) return quarantineWarning;
  const modules = [...state.modules];
  modules[empty] = modules[action];
  modules[action] = null;
  return {...state, modules};
}

export function replay(history: readonly unknown[]) {
  let state = initial;
  for (const action of history) {
    const next = apply(state, action);
    if (typeof next === 'string') throw new Error(next);
    state = next;
  }
  return state;
}
