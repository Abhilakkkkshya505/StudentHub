/**
 * StudentHub — To-Do & Pomodoro Logic (todo.js)
 * Manages prioritized tasks, due date alerts, task filters,
 * live search, sorting, modal editing, and an offline Pomodoro timer with Web Audio synthesizer beeps.
 */

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

// Module State
let currentFilter = 'all'; // 'all' | 'pending' | 'done'
let taskSearchQuery = '';
let taskSortBy = 'priority-date'; // 'priority-date' | 'due-date' | 'alpha'

const FOCUS_DURATION = 25 * 60; // 25 minutes
const BREAK_DURATION = 5 * 60;  // 5 minutes

let pomoMode = 'focus'; // 'focus' | 'break'
let pomoRemaining = FOCUS_DURATION;
let pomoTimerId = null;
let pomoIsRunning = false;
const originalDocTitle = document.title;

document.addEventListener('DOMContentLoaded', () => {
  renderTasksModule();
  setupTaskEventListeners();
  initPomodoroTimer();
});

/**
 * Initializes task forms, filters, search, modal editing, and clear buttons
 */
function setupTaskEventListeners() {
  const form = document.getElementById('addTaskForm');
  const textInput = document.getElementById('taskText');
  const charCounter = document.getElementById('taskTextCharCount');

  // Live character counter & auto-clear
  if (textInput) {
    textInput.addEventListener('input', () => {
      if (charCounter) charCounter.textContent = textInput.value.length;
    });
    wireFieldAutoClear(textInput, 'taskTextError');
  }

  // Edit task modal inputs
  const editTextInput = document.getElementById('editTaskText');
  if (editTextInput) {
    wireFieldAutoClear(editTextInput, 'editTaskTextError');
  }

  // Add Task form submission
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const priorityInput = document.getElementById('taskPriority');
      const dueInput = document.getElementById('taskDue');

      const text = textInput ? textInput.value.trim() : '';
      const priority = priorityInput ? priorityInput.value : 'Medium';
      const due = dueInput && dueInput.value ? dueInput.value : null;

      if (!text) {
        showFieldError('taskText', 'taskTextError', 'Please enter a task description');
        showToast('Please enter a task description', 'error');
        if (textInput) textInput.focus();
        return;
      }

      if (text.length > 100) {
        showFieldError('taskText', 'taskTextError', 'Task description must be 100 characters or less');
        showToast('Task description is too long (max 100 chars)', 'error');
        if (textInput) textInput.focus();
        return;
      }

      const tasks = getData(STORAGE_KEYS.TODOS, []);
      const isDuplicate = tasks.some(t => t.text.toLowerCase() === text.toLowerCase() && !t.done);
      if (isDuplicate) {
        showFieldError('taskText', 'taskTextError', 'A pending task with this exact description already exists');
        showToast('A task with this description is already pending', 'warning');
        if (textInput) textInput.focus();
        return;
      }

      tasks.push({
        id: generateId(),
        text: text,
        priority: priority,
        due: due,
        done: false
      });

      setData(STORAGE_KEYS.TODOS, tasks);
      form.reset();
      if (priorityInput) priorityInput.value = 'Medium';
      if (charCounter) charCounter.textContent = '0';
      if (textInput) textInput.focus();

      showToast(`Added ${priority} priority task!`, 'success');
      renderTasksModule();
    });
  }

  // Live Search
  const searchInput = document.getElementById('taskSearchInput');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      taskSearchQuery = e.target.value.trim().toLowerCase();
      renderTasksList();
    });
  }

  // Sort dropdown
  const sortSelect = document.getElementById('taskSortSelect');
  if (sortSelect) {
    sortSelect.addEventListener('change', (e) => {
      taskSortBy = e.target.value;
      renderTasksList();
    });
  }

  // Filter Buttons
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-btn').forEach(b => {
        b.style.backgroundColor = 'transparent';
        b.style.color = 'var(--text)';
      });
      btn.style.backgroundColor = 'var(--primary-soft)';
      btn.style.color = 'var(--primary)';

      currentFilter = btn.getAttribute('data-filter') || 'all';
      renderTasksList();
    });
  });

  // Clear Completed
  const clearCompletedBtn = document.getElementById('clearCompletedBtn');
  if (clearCompletedBtn) {
    clearCompletedBtn.addEventListener('click', () => {
      const tasks = getData(STORAGE_KEYS.TODOS, []);
      const pendingOnly = tasks.filter(t => !t.done);
      const removedCount = tasks.length - pendingOnly.length;

      if (removedCount === 0) {
        showToast('No completed tasks to clear', 'info');
        return;
      }

      if (!confirm(`Are you sure you want to remove all ${removedCount} completed task(s)?`)) {
        return;
      }

      setData(STORAGE_KEYS.TODOS, pendingOnly);
      showToast(`Cleared ${removedCount} completed task(s)!`, 'info');
      renderTasksModule();
    });
  }

  // Edit Task Modal Events
  const editTaskForm = document.getElementById('editTaskForm');
  if (editTaskForm) {
    editTaskForm.addEventListener('submit', handleSaveEditedTask);
  }
  const closeEditBtn = document.getElementById('closeEditTaskModalBtn');
  if (closeEditBtn) {
    closeEditBtn.addEventListener('click', () => closeModal('editTaskModal'));
  }
  const cancelEditBtn = document.getElementById('cancelEditTaskBtn');
  if (cancelEditBtn) {
    cancelEditBtn.addEventListener('click', () => closeModal('editTaskModal'));
  }
}

/**
 * Main render function for the Task Manager section
 */
function renderTasksModule() {
  renderTasksList();
}

/**
 * Custom sort router supporting Algorithm 5, due-date priority, and alphabetical
 */
function sortTaskListItems(items, sortBy) {
  if (!Array.isArray(items)) return [];

  if (sortBy === 'priority-date') {
    return sortTasksByPriorityAndDate(items);
  }

  if (sortBy === 'due-date') {
    return [...items].sort((a, b) => {
      if (a.done && !b.done) return 1;
      if (!a.done && b.done) return -1;
      if (a.due && b.due) return a.due.localeCompare(b.due);
      if (a.due && !b.due) return -1;
      if (!a.due && b.due) return 1;
      return 0;
    });
  }

  if (sortBy === 'alpha') {
    return [...items].sort((a, b) => {
      if (a.done && !b.done) return 1;
      if (!a.done && b.done) return -1;
      return a.text.localeCompare(b.text, undefined, { sensitivity: 'base' });
    });
  }

  return sortTasksByPriorityAndDate(items);
}

/**
 * Renders the filtered and sorted task items
 */
function renderTasksList() {
  const container = document.getElementById('tasksListContainer');
  const summaryEl = document.getElementById('tasksSummaryText');
  if (!container) return;

  const tasks = getData(STORAGE_KEYS.TODOS, []);
  const pendingCount = tasks.filter(t => !t.done).length;
  const doneCount = tasks.filter(t => t.done).length;

  if (summaryEl) {
    summaryEl.textContent = `${pendingCount} pending, ${doneCount} completed`;
  }

  if (tasks.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <span class="empty-icon">📝</span>
        <p class="empty-text">No tasks yet! Add your first task on the left to organize your study schedule.</p>
      </div>
    `;
    return;
  }

  // Filter tasks based on selected tab
  let filtered = tasks;
  if (currentFilter === 'pending') {
    filtered = tasks.filter(t => !t.done);
  } else if (currentFilter === 'done') {
    filtered = tasks.filter(t => t.done);
  }

  // Live search query filter
  if (taskSearchQuery) {
    filtered = filtered.filter(t => 
      t.text.toLowerCase().includes(taskSearchQuery) ||
      (t.priority && t.priority.toLowerCase().includes(taskSearchQuery)) ||
      (t.due && t.due.toLowerCase().includes(taskSearchQuery))
    );
  }

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <span class="empty-icon">🔍</span>
        <p class="empty-text">No tasks match your current filter or search criteria.</p>
      </div>
    `;
    return;
  }

  // Sort tasks using selected sorter
  const sorted = sortTaskListItems(filtered, taskSortBy);
  const today = todayString();

  container.innerHTML = sorted.map(t => {
    let priorityBadgeClass = 'badge-low';
    if (t.priority === 'High') priorityBadgeClass = 'badge-high';
    else if (t.priority === 'Medium') priorityBadgeClass = 'badge-medium';

    const isOverdue = !t.done && t.due && calculateDaysLeft(today, t.due) < 0;

    return `
      <div class="list-item-card" data-task-id="${t.id}" style="${t.done ? 'opacity: 0.65;' : ''}">
        <div style="display: flex; align-items: center; gap: 12px; flex: 1; min-width: 0;">
          <input type="checkbox" class="task-checkbox" data-task-id="${t.id}" ${t.done ? 'checked' : ''} style="width: 18px; height: 18px; cursor: pointer; flex-shrink: 0;" aria-label="Mark task done">
          <div style="min-width: 0; flex: 1;">
            <div style="font-size: 0.95rem; font-weight: 500; word-break: break-word; ${t.done ? 'text-decoration: line-through; color: var(--muted);' : ''}">
              ${escapeHTML(t.text)}
            </div>
            <div style="display: flex; align-items: center; gap: 8px; margin-top: 4px; font-size: 0.8rem; color: var(--muted); flex-wrap: wrap;">
              <span class="badge ${priorityBadgeClass}">${t.priority}</span>
              ${t.due ? `
                <span>📅 Due: ${escapeHTML(t.due)}</span>
                ${isOverdue ? '<span class="badge badge-high" style="font-size: 0.68rem;">Overdue</span>' : ''}
              ` : ''}
            </div>
          </div>
        </div>

        <div style="display: flex; gap: 6px; flex-shrink: 0;">
          <button class="btn btn-secondary btn-sm edit-task-btn" data-task-id="${t.id}" title="Edit Task" aria-label="Edit Task">
            ✏️
          </button>
          <button class="btn btn-secondary btn-sm delete-task-btn" data-task-id="${t.id}" title="Delete Task" aria-label="Delete Task">
            🗑️
          </button>
        </div>
      </div>
    `;
  }).join('');

  bindTaskEvents();
}

/**
 * Binds toggle checkbox, edit, and delete events
 */
function bindTaskEvents() {
  document.querySelectorAll('.task-checkbox').forEach(cb => {
    cb.addEventListener('change', (e) => {
      const taskId = e.target.getAttribute('data-task-id');
      toggleTaskDone(taskId, e.target.checked);
    });
  });

  document.querySelectorAll('.edit-task-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const taskId = btn.getAttribute('data-task-id');
      openEditTaskModal(taskId);
    });
  });

  document.querySelectorAll('.delete-task-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const taskId = btn.getAttribute('data-task-id');
      deleteTask(taskId);
    });
  });
}

function toggleTaskDone(taskId, isDone) {
  const tasks = getData(STORAGE_KEYS.TODOS, []);
  const task = tasks.find(t => t.id === taskId);
  if (!task) return;

  task.done = isDone;
  setData(STORAGE_KEYS.TODOS, tasks);
  renderTasksModule();
  showToast(isDone ? 'Task marked as completed! 🎯' : 'Task marked as pending.', 'info');
}

function openEditTaskModal(taskId) {
  const tasks = getData(STORAGE_KEYS.TODOS, []);
  const task = tasks.find(t => t.id === taskId);
  if (!task) return;

  const idInput = document.getElementById('editTaskId');
  const textInput = document.getElementById('editTaskText');
  const prioritySelect = document.getElementById('editTaskPriority');
  const dueInput = document.getElementById('editTaskDue');

  if (idInput) idInput.value = task.id;
  if (textInput) textInput.value = task.text;
  if (prioritySelect) prioritySelect.value = task.priority || 'Medium';
  if (dueInput) dueInput.value = task.due || '';

  clearFieldError('editTaskText', 'editTaskTextError');
  openModal('editTaskModal');
  if (textInput) setTimeout(() => textInput.focus(), 50);
}

function handleSaveEditedTask(e) {
  e.preventDefault();
  const idInput = document.getElementById('editTaskId');
  const textInput = document.getElementById('editTaskText');
  const prioritySelect = document.getElementById('editTaskPriority');
  const dueInput = document.getElementById('editTaskDue');

  const taskId = idInput ? idInput.value : '';
  const text = textInput ? textInput.value.trim() : '';
  const priority = prioritySelect ? prioritySelect.value : 'Medium';
  const due = dueInput && dueInput.value ? dueInput.value : null;

  if (!text) {
    showFieldError('editTaskText', 'editTaskTextError', 'Task description cannot be empty');
    showToast('Task description cannot be empty', 'error');
    if (textInput) textInput.focus();
    return;
  }

  if (text.length > 100) {
    showFieldError('editTaskText', 'editTaskTextError', 'Task description must be 100 characters or less');
    showToast('Task description is too long (max 100 chars)', 'error');
    if (textInput) textInput.focus();
    return;
  }

  const tasks = getData(STORAGE_KEYS.TODOS, []);
  const taskIndex = tasks.findIndex(t => t.id === taskId);
  if (taskIndex === -1) {
    showToast('Task not found', 'error');
    closeModal('editTaskModal');
    return;
  }

  const isDuplicate = tasks.some(t => t.id !== taskId && t.text.toLowerCase() === text.toLowerCase() && !t.done);
  if (isDuplicate) {
    showFieldError('editTaskText', 'editTaskTextError', 'Another pending task already has this exact description');
    showToast('Another task already has this description', 'warning');
    if (textInput) textInput.focus();
    return;
  }

  tasks[taskIndex].text = text;
  tasks[taskIndex].priority = priority;
  tasks[taskIndex].due = due;

  setData(STORAGE_KEYS.TODOS, tasks);
  closeModal('editTaskModal');
  showToast('Task updated successfully!', 'success');
  renderTasksModule();
}

function deleteTask(taskId) {
  const tasks = getData(STORAGE_KEYS.TODOS, []);
  const task = tasks.find(t => t.id === taskId);
  if (!task) return;

  if (!confirm(`Are you sure you want to delete task "${task.text}"?`)) {
    return;
  }

  const updated = tasks.filter(t => t.id !== taskId);
  setData(STORAGE_KEYS.TODOS, updated);
  renderTasksModule();
  showToast('Task deleted.', 'info');
}

/* ==========================================================================
   POMODORO TIMER ENGINE & WEB AUDIO SYNTHESIZER
   ========================================================================== */

function initPomodoroTimer() {
  renderPomodoroTodayCount();
  updateTimerUI();

  // Mode buttons
  const focusBtn = document.getElementById('modeFocusBtn');
  const breakBtn = document.getElementById('modeBreakBtn');
  const startBtn = document.getElementById('pomoStartBtn');
  const pauseBtn = document.getElementById('pomoPauseBtn');
  const resetBtn = document.getElementById('pomoResetBtn');

  if (focusBtn && breakBtn) {
    focusBtn.addEventListener('click', () => switchPomodoroMode('focus'));
    breakBtn.addEventListener('click', () => switchPomodoroMode('break'));
  }

  if (startBtn) startBtn.addEventListener('click', startPomodoro);
  if (pauseBtn) pauseBtn.addEventListener('click', pausePomodoro);
  if (resetBtn) resetBtn.addEventListener('click', resetPomodoro);
}

function switchPomodoroMode(mode) {
  pausePomodoro();
  pomoMode = mode;
  pomoRemaining = mode === 'focus' ? FOCUS_DURATION : BREAK_DURATION;

  const focusBtn = document.getElementById('modeFocusBtn');
  const breakBtn = document.getElementById('modeBreakBtn');
  const badge = document.getElementById('pomoSessionBadge');

  if (focusBtn && breakBtn) {
    if (mode === 'focus') {
      focusBtn.style.backgroundColor = 'var(--primary-soft)';
      focusBtn.style.color = 'var(--primary)';
      breakBtn.style.backgroundColor = 'transparent';
      breakBtn.style.color = 'var(--text)';
      if (badge) {
        badge.textContent = 'Focus Session';
        badge.className = 'badge badge-primary';
      }
    } else {
      breakBtn.style.backgroundColor = 'var(--primary-soft)';
      breakBtn.style.color = 'var(--primary)';
      focusBtn.style.backgroundColor = 'transparent';
      focusBtn.style.color = 'var(--text)';
      if (badge) {
        badge.textContent = 'Rest Break';
        badge.className = 'badge badge-low';
      }
    }
  }

  updateTimerUI();
}

function startPomodoro() {
  if (pomoIsRunning) return;

  pomoIsRunning = true;
  document.getElementById('pomoStartBtn').disabled = true;
  document.getElementById('pomoPauseBtn').disabled = false;

  pomoTimerId = setInterval(() => {
    pomoRemaining--;

    const step = calculatePomodoroTimerStep(pomoRemaining);
    updateTimerUI();
    document.title = `(${step.formatted}) StudentHub Pomodoro`;

    if (step.isFinished) {
      clearInterval(pomoTimerId);
      pomoTimerId = null;
      pomoIsRunning = false;
      document.title = originalDocTitle;
      document.getElementById('pomoStartBtn').disabled = false;
      document.getElementById('pomoPauseBtn').disabled = true;

      handlePomodoroSessionComplete();
    }
  }, 1000);
}

function pausePomodoro() {
  if (!pomoIsRunning) return;
  clearInterval(pomoTimerId);
  pomoTimerId = null;
  pomoIsRunning = false;
  document.title = originalDocTitle;

  const startBtn = document.getElementById('pomoStartBtn');
  const pauseBtn = document.getElementById('pomoPauseBtn');
  if (startBtn) startBtn.disabled = false;
  if (pauseBtn) pauseBtn.disabled = true;
}

function resetPomodoro() {
  pausePomodoro();
  pomoRemaining = pomoMode === 'focus' ? FOCUS_DURATION : BREAK_DURATION;
  updateTimerUI();
  document.title = originalDocTitle;
}

function updateTimerUI() {
  const display = document.getElementById('pomodoroDisplay');
  const fill = document.getElementById('pomoProgressFill');

  const step = calculatePomodoroTimerStep(pomoRemaining);
  if (display) display.textContent = step.formatted;

  if (fill) {
    const total = pomoMode === 'focus' ? FOCUS_DURATION : BREAK_DURATION;
    const pct = Math.max(0, Math.min(100, Math.round((pomoRemaining / total) * 100)));
    fill.style.width = `${pct}%`;
  }
}

/**
 * Handles end of session: Web Audio chime, count increment, and mode transition
 */
function handlePomodoroSessionComplete() {
  playPomodoroChime();

  if (pomoMode === 'focus') {
    // Increment today's pomodoro count
    const today = todayString();
    let pomoData = getData(STORAGE_KEYS.POMODOROS, { date: today, count: 0 });

    if (!pomoData || pomoData.date !== today) {
      pomoData = { date: today, count: 1 };
    } else {
      pomoData.count = (Number(pomoData.count) || 0) + 1;
    }

    setData(STORAGE_KEYS.POMODOROS, pomoData);
    renderPomodoroTodayCount();

    showToast('Focus session complete! 🎉 Take a 5-minute break.', 'success');
    switchPomodoroMode('break');
  } else {
    showToast('Break finished! 🚀 Ready for another focus session?', 'info');
    switchPomodoroMode('focus');
  }
}

function renderPomodoroTodayCount() {
  const countEl = document.getElementById('pomoTodayCount');
  if (!countEl) return;

  const today = todayString();
  const pomoData = getData(STORAGE_KEYS.POMODOROS, { date: today, count: 0 });
  const count = (pomoData && pomoData.date === today) ? pomoData.count : 0;
  countEl.textContent = count;
}

/**
 * Synthesizes a pleasant audio chime using the HTML5 Web Audio API.
 * Requires zero audio files or network requests!
 */
function playPomodoroChime() {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;

    const ctx = new AudioContext();
    const now = ctx.currentTime;

    // Two-tone bell chime (A5: 880Hz, C#6: 1108Hz)
    const playTone = (freq, startTime, duration) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(0.3, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + duration);
    };

    playTone(880, now, 0.4);
    playTone(1108, now + 0.2, 0.6);
  } catch (e) {
    // Graceful fallback if Web Audio is restricted by browser autoplay policy
  }
}
