// habit-form.js
// Mobile-first modal for creating and editing custom habits.
// This module owns all DOM construction/teardown for the modal; it
// calls into habits.js for the actual data writes and never touches
// completions or XP (creating/editing/deactivating a habit must never
// award or remove XP).

import { createHabit, updateHabit, getAllHabits } from './habits.js';

const DEFAULT_ICON = '💪';
const DEFAULT_XP = 20;
const MAX_XP = 1000;

// Displayed Monday-first for a natural weekly reading order, but the
// stored value for each button follows the project-wide convention:
// 0 = Sunday, 1 = Monday, ... 6 = Saturday.
const WEEKDAY_BUTTONS = [
  { label: 'Monday', value: 1 },
  { label: 'Tuesday', value: 2 },
  { label: 'Wednesday', value: 3 },
  { label: 'Thursday', value: 4 },
  { label: 'Friday', value: 5 },
  { label: 'Saturday', value: 6 },
  { label: 'Sunday', value: 0 },
];

let currentCleanup = null;

/**
 * Open the habit form modal.
 * @param {object} options
 * @param {'create'|'edit'} options.mode
 * @param {object} [options.habit] - required when mode is 'edit'
 * @param {() => void} options.onSaved - called after a successful save,
 *   before the modal closes (use it to trigger a dashboard re-render)
 */
export function openHabitForm({ mode, habit = null, onSaved }) {
  // Guard against the modal somehow being opened twice (e.g. rapid
  // double-tap on "+ Habit") — close any existing instance first.
  closeHabitForm();

  const root = document.getElementById('modal-root');
  if (!root) {
    throw new Error('#modal-root not found in the document.');
  }

  const selectedDays = new Set(
    mode === 'edit' && habit.schedule.type === 'weekdays' ? habit.schedule.days : []
  );
  let scheduleType = mode === 'edit' ? habit.schedule.type : 'daily';
  let submitting = false;

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');

  overlay.innerHTML = `
    <div class="modal-sheet">
      <h2 class="modal-title">${mode === 'edit' ? 'Edit Habit' : 'New Habit'}</h2>

      <div class="form-field">
        <label class="form-label" for="habit-icon-input">Icon</label>
        <input
          id="habit-icon-input"
          class="form-input form-input--icon"
          type="text"
          maxlength="4"
          value="${escapeAttr(mode === 'edit' ? habit.icon : DEFAULT_ICON)}"
        />
      </div>

      <div class="form-field">
        <label class="form-label" for="habit-name-input">Habit name</label>
        <input
          id="habit-name-input"
          class="form-input"
          type="text"
          placeholder="e.g. Workout"
          value="${escapeAttr(mode === 'edit' ? habit.name : '')}"
        />
        <p id="habit-name-error" class="form-error" hidden>Habit name is required.</p>
      </div>

      <div class="form-field">
        <label class="form-label" for="habit-xp-input">XP reward</label>
        <input
          id="habit-xp-input"
          class="form-input"
          type="number"
          inputmode="numeric"
          min="1"
          max="${MAX_XP}"
          step="1"
          value="${mode === 'edit' ? habit.xp : DEFAULT_XP}"
        />
        <p id="habit-xp-error" class="form-error" hidden>Enter a whole number between 1 and ${MAX_XP}.</p>
      </div>

      <div class="form-field">
        <span class="form-label">Schedule</span>
        <div class="schedule-toggle">
          <button type="button" class="schedule-option" data-schedule="daily">Every day</button>
          <button type="button" class="schedule-option" data-schedule="weekdays">Selected days</button>
        </div>
        <div id="weekday-picker" class="weekday-picker" hidden>
          ${WEEKDAY_BUTTONS.map(
            (d) =>
              `<button type="button" class="weekday-btn" data-day="${d.value}">${d.label.slice(0, 3)}</button>`
          ).join('')}
        </div>
        <p id="habit-schedule-error" class="form-error" hidden>Select at least one day.</p>
      </div>

      <div class="modal-actions">
        <button type="button" class="btn btn-secondary" id="habit-cancel-btn">Cancel</button>
        <button type="button" class="btn btn-primary" id="habit-save-btn">${mode === 'edit' ? 'Save' : 'Create'}</button>
      </div>
    </div>
  `;

  root.appendChild(overlay);
  document.body.classList.add('modal-open');

  const nameInput = overlay.querySelector('#habit-name-input');
  const iconInput = overlay.querySelector('#habit-icon-input');
  const xpInput = overlay.querySelector('#habit-xp-input');
  const nameError = overlay.querySelector('#habit-name-error');
  const xpError = overlay.querySelector('#habit-xp-error');
  const scheduleError = overlay.querySelector('#habit-schedule-error');
  const scheduleButtons = overlay.querySelectorAll('.schedule-option');
  const weekdayPicker = overlay.querySelector('#weekday-picker');
  const weekdayButtons = overlay.querySelectorAll('.weekday-btn');
  const cancelBtn = overlay.querySelector('#habit-cancel-btn');
  const saveBtn = overlay.querySelector('#habit-save-btn');

  function refreshScheduleUI() {
    scheduleButtons.forEach((btn) => {
      btn.classList.toggle('schedule-option--active', btn.dataset.schedule === scheduleType);
    });
    weekdayPicker.hidden = scheduleType !== 'weekdays';
  }

  function refreshWeekdayButtonsUI() {
    weekdayButtons.forEach((btn) => {
      const value = Number(btn.dataset.day);
      btn.classList.toggle('weekday-btn--active', selectedDays.has(value));
    });
  }

  scheduleButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      scheduleType = btn.dataset.schedule;
      refreshScheduleUI();
    });
  });

  weekdayButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const value = Number(btn.dataset.day);
      if (selectedDays.has(value)) {
        selectedDays.delete(value);
      } else {
        selectedDays.add(value);
      }
      refreshWeekdayButtonsUI();
    });
  });

  refreshScheduleUI();
  refreshWeekdayButtonsUI();

  function handleOverlayClick(event) {
    if (event.target === overlay) {
      closeHabitForm();
    }
  }
  overlay.addEventListener('click', handleOverlayClick);

  cancelBtn.addEventListener('click', () => {
    closeHabitForm();
  });

  saveBtn.addEventListener('click', async () => {
    // Prevent duplicate habit creation from a double tap: ignore any
    // click that arrives while a save is already in flight.
    if (submitting) return;

    nameError.hidden = true;
    xpError.hidden = true;
    scheduleError.hidden = true;

    const name = nameInput.value.trim();
    const xpValue = Number(xpInput.value);
    const icon = iconInput.value.trim() || DEFAULT_ICON;

    let valid = true;

    if (name === '') {
      nameError.hidden = false;
      valid = false;
    }

    if (!Number.isInteger(xpValue) || xpValue <= 0 || xpValue > MAX_XP) {
      xpError.hidden = false;
      valid = false;
    }

    const schedule =
      scheduleType === 'daily'
        ? { type: 'daily', days: [] }
        : { type: 'weekdays', days: Array.from(selectedDays) };

    if (scheduleType === 'weekdays' && schedule.days.length === 0) {
      scheduleError.hidden = false;
      valid = false;
    }

    if (!valid) return;

    submitting = true;
    saveBtn.disabled = true;
    cancelBtn.disabled = true;

    try {
      if (mode === 'edit') {
        await updateHabit(habit.id, { name, icon, xp: xpValue, schedule });
      } else {
        const existingHabits = await getAllHabits();
        const nextOrder = existingHabits.reduce(
          (max, h) => Math.max(max, h.order ?? 0),
          -1
        ) + 1;
        await createHabit({
          name,
          icon,
          xp: xpValue,
          schedule,
          active: true,
          category: null,
          difficulty: null,
          order: nextOrder,
        });
      }

      closeHabitForm();
      if (typeof onSaved === 'function') {
        await onSaved();
      }
    } catch (err) {
      console.error('Failed to save habit:', err);
      submitting = false;
      saveBtn.disabled = false;
      cancelBtn.disabled = false;
    }
  });

  currentCleanup = () => {
    overlay.removeEventListener('click', handleOverlayClick);
    overlay.remove();
    document.body.classList.remove('modal-open');
    currentCleanup = null;
  };
}

/**
 * Close the currently open habit form modal, if any. Safe to call
 * even when no modal is open.
 */
export function closeHabitForm() {
  if (currentCleanup) {
    currentCleanup();
  }
}

function escapeAttr(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
