/**
 * StudentHub — Shared Application Logic (common.js)
 * Navbar management, Dark/Light mode, Toast notifications, HTML escaping,
 * and core shared algorithm functions.
 */

// Initialize shared features upon DOM loading
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  highlightActiveNavLink();
  initHamburgerMenu();
});

/**
 * Initializes and manages theme toggling (Light / Dark mode)
 */
function initTheme() {
  const savedTheme = getData(STORAGE_KEYS.THEME, 'light');
  applyTheme(savedTheme);

  const themeToggleBtn = document.getElementById('themeToggleBtn');
  if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', () => {
      const currentTheme = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
      const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
      applyTheme(newTheme);
      setData(STORAGE_KEYS.THEME, newTheme);
      showToast(`Switched to ${newTheme} mode`, 'info');
    });
  }
}

/**
 * Applies theme attribute to <html> element and updates toggle icon
 * @param {string} theme - 'light' or 'dark'
 */
function applyTheme(theme) {
  if (theme === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark');
  } else {
    document.documentElement.removeAttribute('data-theme');
  }

  const themeToggleBtn = document.getElementById('themeToggleBtn');
  if (themeToggleBtn) {
    themeToggleBtn.textContent = theme === 'dark' ? '☀️' : '🌙';
    themeToggleBtn.setAttribute('title', theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode');
    themeToggleBtn.setAttribute('aria-label', theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode');
  }
}

/**
 * Highlights active navbar link based on current page URL filename
 */
function highlightActiveNavLink() {
  const path = window.location.pathname;
  let filename = path.substring(path.lastIndexOf('/') + 1);
  if (!filename || filename === '') {
    filename = 'index.html';
  }

  const navLinks = document.querySelectorAll('.nav-link');
  navLinks.forEach(link => {
    const href = link.getAttribute('href');
    if (href === filename || (filename === 'index.html' && (href === './' || href === 'index.html'))) {
      link.classList.add('active');
    } else {
      link.classList.remove('active');
    }
  });
}

/**
 * Sets up mobile hamburger menu toggle
 */
function initHamburgerMenu() {
  const hamburgerBtn = document.getElementById('hamburgerBtn');
  const navMenu = document.getElementById('navMenu');

  if (hamburgerBtn && navMenu) {
    hamburgerBtn.addEventListener('click', () => {
      navMenu.classList.toggle('open');
      const isOpen = navMenu.classList.contains('open');
      hamburgerBtn.setAttribute('aria-expanded', isOpen);
    });

    // Close menu when clicking outside
    document.addEventListener('click', (e) => {
      if (!navMenu.contains(e.target) && !hamburgerBtn.contains(e.target)) {
        navMenu.classList.remove('open');
      }
    });
  }
}

/**
 * Displays a non-blocking toast alert at the bottom-right corner
 * @param {string} message - Text to display
 * @param {'success'|'error'|'info'} type - Toast styling category
 */
function showToast(message, type = 'info') {
  let toastContainer = document.getElementById('toastContainer');
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.id = 'toastContainer';
    toastContainer.className = 'toast-container';
    document.body.appendChild(toastContainer);
  }

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;

  const icon = type === 'success' ? '✓' : type === 'error' ? '⚠' : 'ℹ';
  toast.innerHTML = `<span>${icon}</span> <span>${escapeHTML(message)}</span>`;

  toastContainer.appendChild(toast);

  // Trigger CSS animation
  requestAnimationFrame(() => {
    toast.classList.add('show');
  });

  // Auto remove after 2.5 seconds
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 250);
  }, 2500);
}

/**
 * Escapes unsafe characters for safe innerHTML injection
 * Prevents HTML layout breakage and script injection
 * @param {string} text - Raw string
 * @returns {string} Sanitized string
 */
function escapeHTML(text) {
  if (text === null || text === undefined) return '';
  const str = String(text);
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Highlights an input with .input-error and displays an inline red error message
 * Supports both signatures: showFieldError(inputId, message) and showFieldError(inputId, errorId, message)
 * @param {string} inputId - ID of input element
 * @param {string} errorIdOrMsg - ID of error element or error message
 * @param {string} [optionalMsg] - Optional message if 2nd arg was errorId
 */
function showFieldError(inputId, errorIdOrMsg, optionalMsg) {
  let message = errorIdOrMsg;
  let customErrorId = null;
  if (optionalMsg !== undefined) {
    customErrorId = errorIdOrMsg;
    message = optionalMsg;
  }
  const el = document.getElementById(inputId);
  if (el) {
    el.classList.add('input-error');
    el.focus();
  }
  const errorEl = document.getElementById(customErrorId || (inputId + 'Error'));
  if (errorEl) {
    errorEl.textContent = message;
    errorEl.style.display = 'block';
  }
}

/**
 * Clears field error text and removes .input-error class
 * @param {string} inputId - ID of input element
 * @param {string} [optionalErrorId] - Optional specific error element ID
 */
function clearFieldError(inputId, optionalErrorId) {
  const el = document.getElementById(inputId);
  if (el) {
    el.classList.remove('input-error');
  }
  const errorEl = document.getElementById(optionalErrorId || (inputId + 'Error'));
  if (errorEl) {
    errorEl.textContent = '';
  }
}

/**
 * Automatically clears field error when user types or changes value
 * @param {string|HTMLElement} inputIdOrEl - ID or Element of input
 * @param {string} [optionalErrorId] - Optional specific error element ID
 */
function wireFieldAutoClear(inputIdOrEl, optionalErrorId) {
  const el = typeof inputIdOrEl === 'string' ? document.getElementById(inputIdOrEl) : inputIdOrEl;
  if (el) {
    const inputId = el.id;
    const handler = () => clearFieldError(inputId, optionalErrorId);
    el.addEventListener('input', handler);
    el.addEventListener('change', handler);
  }
}

/**
 * Opens a modal dialog by ID
 * @param {string} modalId - ID of modal container element
 */
function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';

    // Focus first input inside modal if any
    const firstInput = modal.querySelector('input:not([type="hidden"]), select, textarea');
    if (firstInput) {
      setTimeout(() => firstInput.focus(), 50);
    }
  }
}

/**
 * Closes a modal dialog by ID
 * @param {string} modalId - ID of modal container element
 */
function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove('active');
    document.body.style.overflow = '';
  }
}

// Global modal handling: close on Escape or backdrop click
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    const activeModals = document.querySelectorAll('.modal-backdrop.active');
    activeModals.forEach(modal => {
      closeModal(modal.id);
    });
  }
});

document.addEventListener('click', (e) => {
  if (e.target.classList.contains('modal-backdrop')) {
    closeModal(e.target.id);
  }
});


/* ==========================================================================
   SHARED CORE ALGORITHMS (Accessible globally across all pages & self-tests)
   ========================================================================== */

/* ==========================================================================
   ALGORITHM 1: Study plan distribution
   ==========================================================================
   Algorithm name: Study Plan Topic Distribution Algorithm
   Purpose: Spreads remaining unfinished study topics evenly across days before the exam.
   Input:
     - unfinishedCount (number: count of unfinished topics >= 0)
     - daysAvailable (number: available calendar days >= 1)
   Output:
     - topicsPerDay (number: integer >= 0)
   Logic in 2-4 steps:
     1. Verify daysAvailable >= 1 (defaults to minimum 1 day if exam is today/tomorrow).
     2. Check if unfinishedCount <= 0; if so, return 0 topics per day.
     3. Divide unfinishedCount by daysAvailable: (unfinished / daysAvailable).
     4. Apply Math.ceil() to ensure complete coverage on or before the final study day.
   Why it is used:
     Prevents fractional study targets and avoids last-minute cramming by scheduling
     a manageable, integer number of topics daily.
   ========================================================================== */
function calculateStudyPlanDistribution(unfinishedCount, daysAvailable) {
  const count = Math.max(0, Number(unfinishedCount) || 0);
  const days = Math.max(1, Number(daysAvailable) || 1);
  if (count === 0) return 0;
  return Math.ceil(count / days);
}

/* ==========================================================================
   ALGORITHM 2: Safe-to-spend per day
   ==========================================================================
   Algorithm name: Daily Safe-to-Spend Budget Calculator
   Purpose: Determines safe daily expenditure limit for the remainder of the month.
   Input:
     - remainingAmount (number: total allowance minus expenses)
     - daysLeftInMonth (number: calendar days left in month including today >= 1)
   Output:
     - safeDaily (number: rounded safe amount per day >= 0)
   Logic in 2-4 steps:
     1. Validate daysLeftInMonth >= 1 to prevent division by zero.
     2. If remainingAmount <= 0, return 0 (no safe allowance remaining).
     3. Divide remainingAmount by daysLeftInMonth.
     4. Round down with Math.floor() (conservative financial safety) and return.
   Why it is used:
     Protects student budgets by warning immediately when overspent and providing
     a clear daily spending target to make the monthly allowance last.
   ========================================================================== */
function calculateSafeToSpend(remainingAmount, daysLeftInMonth) {
  const rem = Number(remainingAmount) || 0;
  const days = Math.max(1, Number(daysLeftInMonth) || 1);
  if (rem <= 0) return 0;
  return Math.floor(rem / days);
}

/* ==========================================================================
   ALGORITHM 3: Attendance skip calculator
   ==========================================================================
   Algorithm name: Attendance Skip / Bunk Limit Calculator
   Purpose: Calculates maximum consecutive classes a student can skip without dropping below required %.
   Input:
     - present (number: classes attended >= 0)
     - total (number: total classes conducted >= 0)
     - required (number: minimum required percentage, default 75)
   Output:
     - skippableClasses (number: integer >= 0)
   Logic in 2-4 steps:
     1. If total is 0 or current attendance percentage is below required, return 0.
     2. Calculate maximum total classes allowed for current present count: (present * 100) / required.
     3. Subtract current total classes conducted: ((present * 100) / required) - total.
     4. Apply Math.floor() and Math.max(0, result) so the student stays strictly at or above required %.
   Why it is used:
     Provides safe visibility for students planning unavoidable leaves without risking academic penalties.
   ========================================================================== */
function calculateClassesCanSkip(present, total, required = 75) {
  const p = Math.max(0, Number(present) || 0);
  const t = Math.max(0, Number(total) || 0);
  const r = Math.max(1, Math.min(99, Number(required) || 75));

  if (t === 0) return 0;
  const currentPct = (p / t) * 100;
  if (currentPct < r) return 0;

  const maxTotal = (p * 100) / r;
  const skippable = Math.floor(maxTotal - t);
  return Math.max(0, skippable);
}

/* ==========================================================================
   ALGORITHM 4: Attendance recovery calculator
   ==========================================================================
   Algorithm name: Attendance Recovery / Catch-up Calculator
   Purpose: Calculates minimum consecutive classes a student must attend to reach required %.
   Input:
     - present (number: classes attended >= 0)
     - total (number: total classes conducted >= 0)
     - required (number: minimum required percentage, default 75)
   Output:
     - classesNeeded (number: integer >= 0)
   Logic in 2-4 steps:
     1. If total is 0 or current percentage is already >= required, return 0.
     2. Formulate inequality: (present + x) / (total + x) >= required / 100.
     3. Solve for recovery count x: (required * total - 100 * present) / (100 - required).
     4. Apply Math.ceil() to round up to the nearest whole class session and return.
   Why it is used:
     Gives students who are debarred or low in attendance a concrete, motivating recovery goal.
   ========================================================================== */
function calculateClassesToAttend(present, total, required = 75) {
  const p = Math.max(0, Number(present) || 0);
  const t = Math.max(0, Number(total) || 0);
  const r = Math.max(1, Math.min(99, Number(required) || 75));

  if (t === 0) return 0;
  const currentPct = (p / t) * 100;
  if (currentPct >= r) return 0;

  const numerator = (r * t) - (100 * p);
  const denominator = 100 - r;
  return Math.max(0, Math.ceil(numerator / denominator));
}

/* ==========================================================================
   ALGORITHM 5: Task sorting by priority then due date
   ==========================================================================
   Algorithm name: Two-Tier Task Priority & Due Date Sorting
   Purpose: Sorts pending tasks so urgent, high-importance items are completed first.
   Input:
     - tasks (Array of task objects: [{id, text, priority, due, done}])
   Output:
     - sortedTasks (Array of task objects sorted in place or returned)
   Logic in 2-4 steps:
     1. Map priority strings to numeric weights (High: 3, Medium: 2, Low: 1).
     2. Push completed tasks to the bottom; keep pending tasks at the top.
     3. For pending tasks, compare priority weights descending (higher weight first).
     4. If priority weights are equal, sort ascending by due date (earliest due first; tasks with dates precede tasks without dates).
   Why it is used:
     Reduces executive overwhelm by organizing student to-dos into a natural action sequence.
   ========================================================================== */
function sortTasksByPriorityAndDate(tasks) {
  if (!Array.isArray(tasks)) return [];

  const priorityWeights = {
    'High': 3,
    'Medium': 2,
    'Low': 1
  };

  return [...tasks].sort((a, b) => {
    // 1. Done tasks go to the bottom
    if (a.done && !b.done) return 1;
    if (!a.done && b.done) return -1;

    // 2. Compare priority weights (High > Medium > Low)
    const weightA = priorityWeights[a.priority] || 1;
    const weightB = priorityWeights[b.priority] || 1;
    if (weightA !== weightB) {
      return weightB - weightA;
    }

    // 3. Compare due dates (earliest date first)
    if (a.due && b.due) {
      return a.due.localeCompare(b.due);
    }
    if (a.due && !b.due) return -1;
    if (!a.due && b.due) return 1;

    return 0;
  });
}

/* ==========================================================================
   ALGORITHM 7: Pomodoro countdown timer logic
   ==========================================================================
   Algorithm name: Pomodoro Countdown & Timer Step Calculator
   Purpose: Converts remaining seconds to mm:ss display and evaluates session completion.
   Input:
     - remainingSeconds (number: non-negative integer of seconds left)
   Output:
     - timerState (object: { minutes: string, seconds: string, formatted: string, isFinished: boolean })
   Logic in 2-4 steps:
     1. Ensure remainingSeconds is bounded at 0 with Math.max(0, seconds).
     2. Calculate minutes = Math.floor(seconds / 60) and seconds = seconds % 60.
     3. Pad minutes and seconds with leading zeroes using String.padStart(2, '0').
     4. Construct formatted string "MM:SS" and flag isFinished if remainingSeconds <= 0.
   Why it is used:
     Standardizes Pomodoro timing across UI updates, title badges, and session audio alerts.
   ========================================================================== */
function calculatePomodoroTimerStep(remainingSeconds) {
  const totalSec = Math.max(0, Math.floor(Number(remainingSeconds) || 0));
  const mins = Math.floor(totalSec / 60);
  const secs = totalSec % 60;

  const mm = String(mins).padStart(2, '0');
  const ss = String(secs).padStart(2, '0');

  return {
    minutes: mm,
    seconds: ss,
    formatted: `${mm}:${ss}`,
    isFinished: totalSec === 0
  };
}

/* ==========================================================================
   ALGORITHM 8: Category-wise percentage calculation for the budget chart
   ==========================================================================
   Algorithm name: Category Spending Percentage Calculator
   Purpose: Computes percentage share of each expense category for CSS bar rendering.
   Input:
     - expenses (Array of objects: [{id, amount, category, date, note}])
     - categories (Array of strings, e.g. ['Food', 'Travel', 'Recharge', 'Study', 'Fun', 'Other'])
   Output:
     - breakdown (Array of objects: [{ category, total, percentage }])
   Logic in 2-4 steps:
     1. Calculate overall totalSpent by summing all expense amounts.
     2. Aggregate amounts spent in each category using a dictionary map.
     3. If totalSpent is 0, assign 0% to all categories.
     4. Otherwise, compute percentage = Math.round((categoryTotal / totalSpent) * 100) and return.
   Why it is used:
     Generates pure CSS proportional bar segments without needing external chart libraries.
   ========================================================================== */
function calculateCategoryPercentages(expenses, categories = ['Food', 'Travel', 'Recharge', 'Study', 'Fun', 'Other']) {
  if (!Array.isArray(expenses) || expenses.length === 0) {
    return categories.map(cat => ({ category: cat, total: 0, percentage: 0 }));
  }

  const totals = {};
  categories.forEach(cat => { totals[cat] = 0; });

  let overallTotal = 0;
  expenses.forEach(exp => {
    const amt = Number(exp.amount) || 0;
    const cat = categories.includes(exp.category) ? exp.category : 'Other';
    totals[cat] = (totals[cat] || 0) + amt;
    overallTotal += amt;
  });

  return categories.map(cat => {
    const catTotal = totals[cat] || 0;
    const pct = overallTotal > 0 ? Math.round((catTotal / overallTotal) * 100) : 0;
    return {
      category: cat,
      total: catTotal,
      percentage: pct
    };
  });
}
