import {replay, type Action} from './puzzle';

export function readProgress(mission: number) {
  try {
    const saved: unknown = JSON.parse(localStorage.getItem(storageKey(mission)) ?? '[]');
    if (Array.isArray(saved)) {
      return {history: saved as Action[], state: replay(saved)};
    }
  } catch {
    // Повреждённое или недоступное сохранение не блокирует игру.
  }
  return {history: [], state: replay([])};
}

export function storageKey(mission: number) {
  return `laboratory:clean-slate:v1:${mission}`;
}
