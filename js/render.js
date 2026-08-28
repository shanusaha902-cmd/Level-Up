
// render.js
// Dashboard rendering, plus the habit management UI (create/edit/
// deactivate) added in this step. Task rendering and all existing
// XP/streak/rank/completion behavior is unchanged from before.

import { getAllHabits, isHabitScheduledForWeekday, deactivateHabit } from './habits.js';
import { getTasksForDate } from './tasks.js';
import { getRecord, STORE_SETTINGS, getSettingsId } from './db.js';
import {
  getRank,
  getNextRank,
  getXPIntoCurrentRank,
  getXPRequiredForNextRank,
  getRankProgress,
} from './xp.js';
import { getTodayXP, isCompletedOn, completeItem } from './completions.js';
import { calculateCurrentStreak } from './streaks.js';
import { getLocalToday, getWeekdayNumber } from './date-utils.js';
import { openHabitForm } from './habit-form.js';

/**
 * Re-render the entire dashboard from current data.
 * Safe to call repeatedly (e.g. after every completion).
 */
export async function renderDashboard() {
  const today = getLocalToday();
  const weekday = getWeekdayNumber(today);

  const [settings, allHabits, todaysTasks, todayXP, currentStreak] =
    await Promise.all([
      getRecord(STORE_SETTINGS, getSettingsId()),
      getAllHabits(),
      getTasksForDate(today),
      getTodayXP(today),
      calculateCurrentStreak(today),
    ]);

  const totalXP = settings ? settings.totalXP : 0;

  renderStats(totalXP, todayXP, currentStreak);
  renderTodayLabel(today);

  const activeHabitsToday = allHabits
    .filter((h) => h.active)
    .filter((h) => isHabitScheduledForWeekday(h, weekday));

  await renderHabitList(activeHabitsToday, today);
  await renderTaskList(todaysTasks, today);
}

/**
 * Wire up static, one-time-only UI controls (currently just the
 * "+ Habit" button). Called once from main.js during init — kept
 * separate from renderDashboard() so the listener isn't re-attached
 * on every re-render.
 */
export function initHabitControls() {
  const addBtn = document.getElementById('add-habit-btn');
  if (!addBtn) return;

  addBtn.addEventListener('click', () => {
    openHabitForm({
      mode: 'create',
      onSaved: renderDashboard,
    });
  });
}

function renderStats(totalXP, todayXP, currentStreak) {
  const rank = getRank(totalXP);
  const next = getNextRank(totalXP);
  const progress = getRankProgress(totalXP);
  const xpInto = getXPIntoCurrentRank(totalXP);
  const xpNeeded = getXPRequiredForNextRank(totalXP);

  document.getElementById('total-xp').textContent = totalXP;
  document.getElementById('today-xp').textContent = todayXP;
  document.getElementById('current-rank').textContent = rank.name;
  document.getElementById('current-streak').textContent = currentStreak;

  const progressBar = document.getElementById('rank-progress-bar');
  progressBar.style.width = `${Math.round(progress * 100)}%`;

  const progressLabel = document.getElementById('rank-progress-label');
  if (next) {
    progressLabel.textContent = `${xpInto} / ${xpInto + xpNeeded} XP to ${next.name}`;
  } else {
    progressLabel.textContent = `Max rank reached (${rank.name})`;
  }
}

function renderTodayLabel(today) {
  document.getElementById('today-date').textContent = today;
}

async function renderHabitList(habits, today) {
  const container = document.getElementById('habit-list');
  container.innerHTML = '';

  if (habits.length === 0) {
    container.innerHTML = '<p class="empty-state">No habits scheduled for today.</p>';
    return;
  }

  for (const habit of habits) {
    const completed = await isCompletedOn('habit', habit.id, today);
    container.appendChild(
      buildHabitRow({
        habit,
        completed,
        onToggle: async () => {
          await completeItem('habit', habit.id, today);
          await renderDashboard();
        },
      })
    );
  }
}

async function renderTaskList(tasks, today) {
  const container = document.getElementById('task-list');
  container.innerHTML = '';

  if (tasks.length === 0) {
    container.innerHTML = '<p class="empty-state">No tasks for today.</p>';
    return;
  }

  for (const task of tasks) {
    const completed = await isCompletedOn('task', task.id, today);
    container.appendChild(buildItemRow({
      icon: task.time ? '🕒' : '📌',
      name: task.time ? `${task.name} (${task.time})` : task.name,
      xp: task.xp,
      completed,
      onToggle: async () => {
        await completeItem('task', task.id, today);
        await renderDashboard();
      },
    }));
  }
}

/**
 * Build a single task row with a checkbox-style toggle button.
 * Completed items become non-toggleable (per V1 spec: no undo yet).
 */
function buildItemRow({ icon, name, xp, completed, onToggle }) {
  const row = document.createElement('div');
  row.className = 'item-row' + (completed ? ' item-row--completed' : '');

  const button = buildToggleButton(completed, onToggle);

  const label = document.createElement('span');
  label.className = 'item-label';
  label.textContent = `${icon} ${name}`;

  const xpBadge = document.createElement('span');
  xpBadge.className = 'item-xp';
  xpBadge.textContent = `+${xp} XP`;

  row.appendChild(button);
  row.appendChild(label);
  row.appendChild(xpBadge);
  return row;
}

/**
 * Build a habit row: same toggle-button behavior as a task row, plus
 * Edit and Delete (deactivate) controls.
 */
function buildHabitRow({ habit, completed, onToggle }) {
  const row = document.createElement('div');
  row.className = 'item-row' + (completed ? ' item-row--completed' : '');

  const button = buildToggleButton(completed, onToggle);

  const label = document.createElement('span');
  label.className = 'item-label';
  label.textContent = `${habit.icon} ${habit.name}`;

  const xpBadge = document.createElement('span');
  xpBadge.className = 'item-xp';
  xpBadge.textContent = `+${habit.xp} XP`;

  const editBtn = document.createElement('button');
  editBtn.type = 'button';
  editBtn.className = 'item-action item-action--edit';
  editBtn.setAttribute('aria-label', `Edit ${habit.name}`);
  editBtn.textContent = '✎';
  editBtn.addEventListener('click', () => {
    openHabitForm({
      mode: 'edit',
      habit,
      onSaved: renderDashboard,
    });
  });

  const deleteBtn = document.createElement('button');
  deleteBtn.type = 'button';
  deleteBtn.className = 'item-action item-action--delete';
  deleteBtn.setAttribute('aria-label', `Delete ${habit.name}`);
  deleteBtn.textContent = '🗑';
  deleteBtn.addEventListener('click', async () => {
    const confirmed = window.confirm(
      'Delete this habit?\nYour historical XP records will be preserved.'
    );
    if (!confirmed) return;
    await deactivateHabit(habit.id);
    await renderDashboard();
  });

  row.appendChild(button);
  row.appendChild(label);
  row.appendChild(xpBadge);
  row.appendChild(editBtn);
  row.appendChild(deleteBtn);
  return row;
}

function buildToggleButton(completed, onToggle) {
  const button = document.createElement('button');
  button.className = 'item-checkbox';
  button.type = 'button';
  button.setAttribute('aria-pressed', String(completed));
  button.textContent = completed ? '✔' : '○';
  button.disabled = completed;
  if (!completed) {
    button.addEventListener('click', onToggle, { once: true });
  }
  return button;
}
