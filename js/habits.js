// habits.js
// CRUD operations for recurring habits, plus validation.
// A habit's existence is permanent (until edited/deleted); its daily
// completion state is derived elsewhere (completions.js), never stored
// on the habit itself.

import {
  STORE_HABITS,
  putRecord,
  getRecord,
  getAllRecords,
  deleteRecord,
  generateId,
} from './db.js';
import { getLocalToday } from './date-utils.js';

const VALID_SCHEDULE_TYPES = ['daily', 'weekdays'];

/**
 * Validate a habit's input fields. Throws a descriptive Error if invalid.
 * @param {object} input
 */
function validateHabitInput(input) {
  if (!input || typeof input.name !== 'string' || input.name.trim() === '') {
    throw new Error('Habit name is required.');
  }

  if (typeof input.xp !== 'number' || !isFinite(input.xp) || input.xp <= 0) {
    throw new Error('Habit XP must be a positive number.');
  }

  if (!input.schedule || typeof input.schedule !== 'object') {
    throw new Error('Habit schedule is required.');
  }

  if (!VALID_SCHEDULE_TYPES.includes(input.schedule.type)) {
    throw new Error(
      `Habit schedule.type must be one of: ${VALID_SCHEDULE_TYPES.join(', ')}`
    );
  }

  if (input.schedule.type === 'weekdays') {
    if (!Array.isArray(input.schedule.days) || input.schedule.days.length === 0) {
      throw new Error(
        'Habit schedule.days must be a non-empty array when type is "weekdays".'
      );
    }
    for (const day of input.schedule.days) {
      if (!Number.isInteger(day) || day < 0 || day > 6) {
        throw new Error('Habit schedule.days values must be integers 0-6.');
      }
    }
  }
}

/**
 * Create a new habit.
 * @param {object} input - {name, icon, xp, schedule, category, difficulty}
 * @returns {Promise<object>} the created habit
 */
export async function createHabit(input) {
  validateHabitInput(input);

  const habit = {
    id: generateId(),
    name: input.name.trim(),
    icon: input.icon || '⭐',
    xp: input.xp,
    schedule:
      input.schedule.type === 'daily'
        ? { type: 'daily', days: [] }
        : { type: 'weekdays', days: [...input.schedule.days].sort() },
    category: input.category ?? null,
    difficulty: input.difficulty ?? null,
    active: input.active !== undefined ? !!input.active : true,
    createdAt: getLocalToday(),
    order: input.order ?? 0,
  };

  await putRecord(STORE_HABITS, habit);
  return habit;
}

/**
 * Get a single habit by id.
 * @param {string} id
 * @returns {Promise<object|undefined>}
 */
export async function getHabit(id) {
  return getRecord(STORE_HABITS, id);
}

/**
 * Get all habits (active and inactive).
 * @returns {Promise<object[]>}
 */
export async function getAllHabits() {
  return getAllRecords(STORE_HABITS);
}

/**
 * Update an existing habit. Only provided fields are changed.
 * @param {string} id
 * @param {object} updates
 * @returns {Promise<object>} the updated habit
 */
export async function updateHabit(id, updates) {
  const existing = await getRecord(STORE_HABITS, id);
  if (!existing) {
    throw new Error(`Habit not found: ${id}`);
  }

  const merged = {
    ...existing,
    ...updates,
    id: existing.id, // id is immutable
    createdAt: existing.createdAt, // createdAt is immutable
  };

  validateHabitInput(merged);

  await putRecord(STORE_HABITS, merged);
  return merged;
}

/**
 * Permanently delete a habit. Historical completion records for this
 * habit are left untouched so past statistics remain accurate.
 * @param {string} id
 * @returns {Promise<void>}
 */
export async function deleteHabit(id) {
  await deleteRecord(STORE_HABITS, id);
}

/**
 * Deactivate a habit rather than physically deleting it, so historical
 * completion records remain attached to a recognizable habit (name,
 * icon, XP value) instead of an orphaned id. This is the preferred way
 * to "delete" a habit from the UI. Never touches settings.totalXP or
 * any completion record — deactivating a habit awards or removes no XP.
 * @param {string} id
 * @returns {Promise<object>} the updated (now inactive) habit
 */
export async function deactivateHabit(id) {
  return updateHabit(id, { active: false });
}

/**
 * Determine whether a habit is scheduled to appear on a given weekday.
 * @param {object} habit
 * @param {number} weekdayNumber - 0 (Sun) - 6 (Sat)
 * @returns {boolean}
 */
export function isHabitScheduledForWeekday(habit, weekdayNumber) {
  if (habit.schedule.type === 'daily') return true;
  return habit.schedule.days.includes(weekdayNumber);
}
