/**
 * StudentHub — Shared LocalStorage & Data Abstraction Library
 * Safe JSON parsing, localStorage persistence, quota handling,
 * backup/export/import, and robust calendar date utilities.
 */

// Storage keys constants as specified in prd.md
const STORAGE_KEYS = {
  SUBJECTS: 'sh_subjects',
  BUDGET: 'sh_budget',
  ATTENDANCE: 'sh_attendance',
  TODOS: 'sh_todos',
  POMODOROS: 'sh_pomodoros',
  THEME: 'sh_theme'
};

// Check if running on a live HTTP web server or static file protocol
const IS_SERVER_MODE = typeof window !== 'undefined' && window.location.protocol.startsWith('http');

/**
 * Safely read and parse data from localStorage with fallback on error or null
 * @param {string} key - localStorage key name
 * @param {*} fallback - Default fallback value if key does not exist or JSON is invalid
 * @returns {*} Parsed value or fallback
 */
function getData(key, fallback) {
  try {
    const item = localStorage.getItem(key);
    if (item === null || item === undefined) {
      return fallback;
    }
    return JSON.parse(item);
  } catch (err) {
    return fallback;
  }
}

/**
 * Safely serialize and save data into localStorage
 * Handles QuotaExceededError and background backend sync
 * @param {string} key - localStorage key name
 * @param {*} value - JavaScript data to stringify and store
 * @returns {boolean} True if write succeeded, false otherwise
 */
function setData(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));

    // If running with a backend server, asynchronously synchronize
    if (IS_SERVER_MODE) {
      syncKeyToBackend(key, value);
    }

    return true;
  } catch (err) {
    if (err && (err.name === 'QuotaExceededError' || err.code === 22 || err.code === 1014)) {
      if (typeof showToast === 'function') {
        showToast('Browser storage limit exceeded. Please delete old records or export a backup.', 'error');
      }
    }
    return false;
  }
}

/**
 * Background synchronization to backend server API if running in server mode
 */
async function syncKeyToBackend(key, value) {
  try {
    const keyMap = {
      [STORAGE_KEYS.SUBJECTS]: 'subjects',
      [STORAGE_KEYS.BUDGET]: 'budget',
      [STORAGE_KEYS.ATTENDANCE]: 'attendance',
      [STORAGE_KEYS.TODOS]: 'todos',
      [STORAGE_KEYS.POMODOROS]: 'pomodoros',
      [STORAGE_KEYS.THEME]: 'theme'
    };

    const serverField = keyMap[key];
    if (!serverField) return;

    await fetch('/api/state', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [serverField]: value })
    });
  } catch (e) {
    // Offline / silent fallback
  }
}

/**
 * Hydrates local storage from backend server upon initial page load if local cache is empty
 */
async function hydrateFromBackend() {
  if (!IS_SERVER_MODE) return;
  try {
    const res = await fetch('/api/state');
    if (!res.ok) return;
    const db = await res.json();

    // Only hydrate if localStorage is completely uninitialized
    if (localStorage.getItem(STORAGE_KEYS.SUBJECTS) === null && db && Array.isArray(db.subjects)) {
      localStorage.setItem(STORAGE_KEYS.SUBJECTS, JSON.stringify(db.subjects));
    }
    if (localStorage.getItem(STORAGE_KEYS.BUDGET) === null && db && db.budget) {
      localStorage.setItem(STORAGE_KEYS.BUDGET, JSON.stringify(db.budget));
    }
    if (localStorage.getItem(STORAGE_KEYS.ATTENDANCE) === null && db && Array.isArray(db.attendance)) {
      localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify(db.attendance));
    }
    if (localStorage.getItem(STORAGE_KEYS.TODOS) === null && db && Array.isArray(db.todos)) {
      localStorage.setItem(STORAGE_KEYS.TODOS, JSON.stringify(db.todos));
    }
    if (localStorage.getItem(STORAGE_KEYS.POMODOROS) === null && db && db.pomodoros) {
      localStorage.setItem(STORAGE_KEYS.POMODOROS, JSON.stringify(db.pomodoros));
    }
    if (localStorage.getItem(STORAGE_KEYS.THEME) === null && db && db.theme) {
      localStorage.setItem(STORAGE_KEYS.THEME, JSON.stringify(db.theme));
    }
  } catch (e) {
    // Offline or static file mode
  }
}

if (IS_SERVER_MODE) {
  hydrateFromBackend();
}

/**
 * Resets all studenthub storage to clean initial states
 */
function clearAllStorage() {
  const emptyBudget = {
    month: currentMonthString(),
    allowance: 0,
    expenses: [],
    history: []
  };

  const emptyPomodoros = {
    date: todayString(),
    count: 0
  };

  setData(STORAGE_KEYS.SUBJECTS, []);
  setData(STORAGE_KEYS.BUDGET, emptyBudget);
  setData(STORAGE_KEYS.ATTENDANCE, []);
  setData(STORAGE_KEYS.TODOS, []);
  setData(STORAGE_KEYS.POMODOROS, emptyPomodoros);

  localStorage.removeItem(STORAGE_KEYS.SUBJECTS);
  localStorage.removeItem(STORAGE_KEYS.BUDGET);
  localStorage.removeItem(STORAGE_KEYS.ATTENDANCE);
  localStorage.removeItem(STORAGE_KEYS.TODOS);
  localStorage.removeItem(STORAGE_KEYS.POMODOROS);

  if (IS_SERVER_MODE) {
    fetch('/api/reset', { method: 'POST' }).catch(() => {});
  }
}

/**
 * Exports all StudentHub data as a formatted JSON backup file
 */
function exportAllData() {
  const backup = {
    version: '1.0',
    exportDate: new Date().toISOString(),
    data: {
      [STORAGE_KEYS.SUBJECTS]: getData(STORAGE_KEYS.SUBJECTS, []),
      [STORAGE_KEYS.BUDGET]: getData(STORAGE_KEYS.BUDGET, { month: currentMonthString(), allowance: 0, expenses: [], history: [] }),
      [STORAGE_KEYS.ATTENDANCE]: getData(STORAGE_KEYS.ATTENDANCE, []),
      [STORAGE_KEYS.TODOS]: getData(STORAGE_KEYS.TODOS, []),
      [STORAGE_KEYS.POMODOROS]: getData(STORAGE_KEYS.POMODOROS, { date: todayString(), count: 0 }),
      [STORAGE_KEYS.THEME]: getData(STORAGE_KEYS.THEME, 'light')
    }
  };

  const jsonStr = JSON.stringify(backup, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = `studenthub-backup-${todayString()}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Validates and restores data from a JSON backup file
 * @param {string} jsonText - Raw string from backup file
 * @returns {{ success: boolean, message: string }}
 */
function importDataFromJSON(jsonText) {
  try {
    const parsed = JSON.parse(jsonText);
    if (!parsed || typeof parsed !== 'object') {
      return { success: false, message: 'Invalid JSON format. Backup file is corrupt.' };
    }

    const payload = parsed.data || parsed;

    if (!Array.isArray(payload[STORAGE_KEYS.SUBJECTS]) &&
        !payload[STORAGE_KEYS.BUDGET] &&
        !Array.isArray(payload[STORAGE_KEYS.ATTENDANCE]) &&
        !Array.isArray(payload[STORAGE_KEYS.TODOS])) {
      return { success: false, message: 'Unrecognized backup structure. No valid StudentHub keys found.' };
    }

    if (Array.isArray(payload[STORAGE_KEYS.SUBJECTS])) {
      setData(STORAGE_KEYS.SUBJECTS, payload[STORAGE_KEYS.SUBJECTS]);
    }
    if (payload[STORAGE_KEYS.BUDGET] && typeof payload[STORAGE_KEYS.BUDGET] === 'object') {
      setData(STORAGE_KEYS.BUDGET, payload[STORAGE_KEYS.BUDGET]);
    }
    if (Array.isArray(payload[STORAGE_KEYS.ATTENDANCE])) {
      setData(STORAGE_KEYS.ATTENDANCE, payload[STORAGE_KEYS.ATTENDANCE]);
    }
    if (Array.isArray(payload[STORAGE_KEYS.TODOS])) {
      setData(STORAGE_KEYS.TODOS, payload[STORAGE_KEYS.TODOS]);
    }
    if (payload[STORAGE_KEYS.POMODOROS]) {
      setData(STORAGE_KEYS.POMODOROS, payload[STORAGE_KEYS.POMODOROS]);
    }
    if (payload[STORAGE_KEYS.THEME]) {
      setData(STORAGE_KEYS.THEME, payload[STORAGE_KEYS.THEME]);
    }

    return { success: true, message: 'Data imported and restored successfully!' };
  } catch (err) {
    return { success: false, message: 'Failed to read backup file: ' + err.message };
  }
}

/**
 * Generates a collision-resistant unique identifier string
 * Combines current Unix timestamp with a pseudo-random alphanumeric suffix
 * @returns {string} Unique ID
 */
function generateId() {
  return 'id_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 7);
}

/**
 * Returns today's date formatted as "YYYY-MM-DD" in local timezone (not UTC)
 * Avoids UTC offset bugs when users use the app late in the evening.
 * @returns {string} "YYYY-MM-DD"
 */
function todayString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Returns current month string in "YYYY-MM" format in local time
 * @returns {string} "YYYY-MM"
 */
function currentMonthString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

/* ==========================================================================
   ALGORITHM 6: Days-left countdown between two dates
   ==========================================================================
   Algorithm name: Calendar Day Difference Countdown
   Purpose: Computes whole calendar days between two dates, independent of time of day.
   Input:
     - fromDateStr (string in "YYYY-MM-DD" format)
     - targetDateStr (string in "YYYY-MM-DD" format)
   Output:
     - wholeDays (integer: > 0 for future, 0 for today, < 0 for past dates)
   Logic in 2-4 steps:
     1. Parse both date strings by splitting into [year, month, day] integers.
     2. Instantiate local Date objects anchored precisely at midnight (00:00:00).
     3. Calculate the time difference in milliseconds: (targetTime - fromTime).
     4. Divide by 86,400,000 (ms in a day) and apply Math.round() to avoid daylight saving drift.
   Why it is used:
     Prevents false "days remaining" calculations when exams are scheduled across
     different times of day or near midnight, giving students exact calendar day counts.
   ========================================================================== */
function calculateDaysLeft(fromDateStr, targetDateStr) {
  if (!fromDateStr || !targetDateStr) return 0;

  const [y1, m1, d1] = fromDateStr.split('-').map(Number);
  const [y2, m2, d2] = targetDateStr.split('-').map(Number);

  const dFrom = new Date(y1, m1 - 1, d1, 0, 0, 0);
  const dTarget = new Date(y2, m2 - 1, d2, 0, 0, 0);

  const MS_PER_DAY = 1000 * 60 * 60 * 24;
  const diffMs = dTarget.getTime() - dFrom.getTime();

  return Math.round(diffMs / MS_PER_DAY);
}

/**
 * Standard daysBetween wrapper as required by prd.md
 * @param {string} dateA - "YYYY-MM-DD"
 * @param {string} dateB - "YYYY-MM-DD"
 * @returns {number} Days between dateA and dateB
 */
function daysBetween(dateA, dateB) {
  return calculateDaysLeft(dateA, dateB);
}

/**
 * Returns true if dateStr is strictly in the past (before today)
 * @param {string} dateStr - "YYYY-MM-DD"
 * @returns {boolean}
 */
function isPastDate(dateStr) {
  if (!dateStr) return false;
  return calculateDaysLeft(todayString(), dateStr) < 0;
}

/**
 * Formats a currency number into Indian Rupees (INR) format (e.g. ₹6,000)
 * @param {number} amount
 * @returns {string} Formatted currency string
 */
function formatCurrency(amount) {
  const num = Number(amount) || 0;
  return '₹' + num.toLocaleString('en-IN');
}

/**
 * Midnight rollover & visibility listener
 * Automatically prompts re-render if user leaves tab open overnight
 */
let lastKnownDate = todayString();
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) {
    const currentDate = todayString();
    if (currentDate !== lastKnownDate) {
      lastKnownDate = currentDate;
      if (typeof window.refreshOnDateChange === 'function') {
        window.refreshOnDateChange();
      }
    }
  }
});
