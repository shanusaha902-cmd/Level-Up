// main.js
// App initialization only. Wiring, not business logic — the real logic
// lives in habits.js / tasks.js / completions.js / streaks.js / xp.js.

import { openDatabase, ensureDefaultSettings } from './db.js';
import { createHabit, getAllHabits } from './habits.js';
import { renderDashboard, initHabitControls } from './render.js';

const DEFAULT_HABITS = [
  { name: 'Study', icon: '📚', xp: 50, schedule: { type: 'daily' } },
  { name: 'Workout', icon: '💪', xp: 40, schedule: { type: 'daily' } },
  { name: 'Read', icon: '📖', xp: 20, schedule: { type: 'daily' } },
  { name: 'No mindless scrolling', icon: '📵', xp: 30, schedule: { type: 'daily' } },
  { name: 'Sleep on time', icon: '🌙', xp: 30, schedule: { type: 'daily' } },
];

/**
 * Seed the default habit set, but only on true first run (no habits
 * exist yet at all). Never re-adds habits the user has deleted.
 */
async function seedDefaultHabitsIfEmpty() {
  const existing = await getAllHabits();
  if (existing.length > 0) return;

  for (const habit of DEFAULT_HABITS) {
    await createHabit(habit);
  }
}

async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  try {
    await navigator.serviceWorker.register('./service-worker.js');
  } catch (err) {
    // Non-fatal: the app still works online without the service worker,
    // it just won't be installable/offline-capable until this succeeds.
    console.error('Service worker registration failed:', err);
  }
}

async function init() {
  await openDatabase();
  await ensureDefaultSettings();
  await seedDefaultHabitsIfEmpty();
  initHabitControls();
  await renderDashboard();
  await registerServiceWorker();
}

document.addEventListener('DOMContentLoaded', () => {
  init().catch((err) => {
    console.error('LEVEL UP failed to initialize:', err);
    const el = document.getElementById('app-error');
    if (el) {
      el.textContent = 'Something went wrong loading LEVEL UP. Check the console.';
      el.hidden = false;
    }
  });
});
