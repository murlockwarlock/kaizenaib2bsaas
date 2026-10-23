export type TrackedGeneration = {
  taskId: number;
  category: string;
  startedAt: number;
};

const STORAGE_KEY = 'globus-tracked-generations';
const TRACKER_EVENT = 'globus:tracked-generations-change';

function canUseStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

export function getTrackedGenerations(): TrackedGeneration[] {
  if (!canUseStorage()) return [];

  try {
    const rawValue = window.localStorage.getItem(STORAGE_KEY);
    if (!rawValue) return [];
    const parsed = JSON.parse(rawValue);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveTrackedGenerations(items: TrackedGeneration[]) {
  if (!canUseStorage()) return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  window.dispatchEvent(new CustomEvent(TRACKER_EVENT, { detail: { count: items.length } }));
}

export function trackGeneration(item: TrackedGeneration) {
  const currentItems = getTrackedGenerations();
  const nextItems = currentItems.filter((entry) => entry.taskId !== item.taskId);
  nextItems.push(item);
  saveTrackedGenerations(nextItems);
}

export function untrackGeneration(taskId: number) {
  const nextItems = getTrackedGenerations().filter((entry) => entry.taskId !== taskId);
  saveTrackedGenerations(nextItems);
}

export function subscribeTrackedGenerations(callback: (items: TrackedGeneration[]) => void) {
  if (typeof window === 'undefined') {
    return () => {};
  }

  const emitCurrent = () => callback(getTrackedGenerations());

  const handleCustomEvent = () => {
    emitCurrent();
  };

  const handleStorage = (event: StorageEvent) => {
    if (event.key && event.key !== STORAGE_KEY) return;
    emitCurrent();
  };

  window.addEventListener(TRACKER_EVENT, handleCustomEvent as EventListener);
  window.addEventListener('storage', handleStorage);

  return () => {
    window.removeEventListener(TRACKER_EVENT, handleCustomEvent as EventListener);
    window.removeEventListener('storage', handleStorage);
  };
}
