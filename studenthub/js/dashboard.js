/**
 * StudentHub — Dashboard Logic (dashboard.js)
 * Aggregates live data across all modules, populates summary cards,
 * manages demo data loading, data reset, and dynamic greetings.
 */

document.addEventListener('DOMContentLoaded', () => {
  renderGreeting();
  renderDashboard();
  setupActionButtons();
});

/**
 * Renders time-of-day greeting and today's formatted date
 */
function renderGreeting() {
  const greetingEl = document.getElementById('dashboardGreeting');
  const dateEl = document.getElementById('dashboardDate');

  const now = new Date();
  const hour = now.getHours();
  let timeOfDay = 'morning';

  if (hour >= 12 && hour < 17) {
    timeOfDay = 'afternoon';
  } else if (hour >= 17) {
    timeOfDay = 'evening';
  }

  if (greetingEl) {
    greetingEl.textContent = `Good ${timeOfDay}, Student 👋`;
  }

  if (dateEl) {
    const options = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
    dateEl.textContent = now.toLocaleDateString('en-IN', options);
  }
}

/**
 * Main dashboard rendering orchestrator
 */
function renderDashboard() {
  renderChecklist();
  renderExamCard();
  renderMoneyCard();
  renderAttendanceCard();
  renderTasksCard();
  renderQuickStats();
}

/**
 * Onboarding Checklist: dynamically checks off setup milestones
 */
function renderChecklist() {
  const subjects = getData(STORAGE_KEYS.SUBJECTS, []);
  const budget = getData(STORAGE_KEYS.BUDGET, null);
  const attendance = getData(STORAGE_KEYS.ATTENDANCE, []);
  const todos = getData(STORAGE_KEYS.TODOS, []);

  const hasSubjects = Array.isArray(subjects) && subjects.length > 0;
  const hasBudget = budget && Number(budget.allowance) > 0;
  const hasAttendance = Array.isArray(attendance) && attendance.length > 0;
  const hasTodos = Array.isArray(todos) && todos.length > 0;

  updateChecklistItem('checkItemSubjects', 'checkIconSubjects', hasSubjects);
  updateChecklistItem('checkItemBudget', 'checkIconBudget', hasBudget);
  updateChecklistItem('checkItemAttendance', 'checkIconAttendance', hasAttendance);
  updateChecklistItem('checkItemTodo', 'checkIconTodo', hasTodos);

  const completedCount = [hasSubjects, hasBudget, hasAttendance, hasTodos].filter(Boolean).length;
  const pct = Math.round((completedCount / 4) * 100);

  const fillEl = document.getElementById('checklistProgressFill');
  const textEl = document.getElementById('checklistProgressText');

  if (fillEl) fillEl.style.width = `${pct}%`;
  if (textEl) {
    if (completedCount === 4) {
      textEl.textContent = '🎉 All 4 setup milestones completed! You are ready to excel.';
      textEl.style.color = 'var(--success)';
    } else {
      textEl.textContent = `${completedCount} of 4 tasks completed (${pct}%)`;
      textEl.style.color = 'var(--muted)';
    }
  }
}

function updateChecklistItem(itemId, iconId, isDone) {
  const item = document.getElementById(itemId);
  const icon = document.getElementById(iconId);
  if (!item || !icon) return;

  if (isDone) {
    item.classList.add('completed');
    icon.textContent = '✅';
  } else {
    item.classList.remove('completed');
    icon.textContent = '⚪';
  }
}

/**
 * Card 1: Next upcoming exam summary
 */
function renderExamCard() {
  const container = document.getElementById('dashExamCard');
  if (!container) return;

  const subjects = getData(STORAGE_KEYS.SUBJECTS, []);
  const today = todayString();

  // Filter for exams today or in the future
  const upcoming = subjects
    .map(sub => {
      const days = calculateDaysLeft(today, sub.examDate);
      return { ...sub, daysLeft: days };
    })
    .filter(sub => sub.daysLeft >= 0)
    .sort((a, b) => a.daysLeft - b.daysLeft);

  if (upcoming.length === 0) {
    container.innerHTML = `
      <div class="card-title"><span>📚 Next Exam</span></div>
      <div class="empty-state">
        <span class="empty-icon">📅</span>
        <p class="empty-text">No upcoming exams added yet.</p>
        <a href="planner.html" class="btn btn-secondary btn-sm">Get started</a>
      </div>
    `;
    return;
  }

  const nextExam = upcoming[0];
  let badgeClass = 'badge-low';
  let badgeText = `${nextExam.daysLeft} days left`;

  if (nextExam.daysLeft === 0) {
    badgeClass = 'badge-high';
    badgeText = 'Today!';
  } else if (nextExam.daysLeft <= 3) {
    badgeClass = 'badge-high';
  } else if (nextExam.daysLeft <= 7) {
    badgeClass = 'badge-medium';
  }

  container.innerHTML = `
    <div class="card-title">
      <span>📚 Next Exam</span>
      <span class="badge ${badgeClass}">${badgeText}</span>
    </div>
    <div class="card-number">${escapeHTML(nextExam.name)}</div>
    <p class="card-label">Exam date: ${escapeHTML(nextExam.examDate)}</p>
    <div style="margin-top: 14px;">
      <a href="planner.html" class="btn btn-secondary btn-sm">View Study Plan &rarr;</a>
    </div>
  `;
}

/**
 * Card 2: Monthly allowance, remaining, and safe-to-spend per day
 */
function renderMoneyCard() {
  const container = document.getElementById('dashMoneyCard');
  if (!container) return;

  const budget = getData(STORAGE_KEYS.BUDGET, null);
  const currentMonth = currentMonthString();

  if (!budget || !budget.allowance || budget.allowance <= 0) {
    container.innerHTML = `
      <div class="card-title"><span>💰 Money & Budget</span></div>
      <div class="empty-state">
        <span class="empty-icon">💳</span>
        <p class="empty-text">No budget set for this month.</p>
        <a href="budget.html" class="btn btn-secondary btn-sm">Get started</a>
      </div>
    `;
    return;
  }

  // Calculate total spent in current month
  let totalSpent = 0;
  if (budget.month === currentMonth && Array.isArray(budget.expenses)) {
    totalSpent = budget.expenses.reduce((sum, exp) => sum + (Number(exp.amount) || 0), 0);
  }

  const remaining = budget.allowance - totalSpent;

  // Days left in current month (including today)
  const now = new Date();
  const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const daysLeftInMonth = Math.max(1, lastDayOfMonth - now.getDate() + 1);

  const safePerDay = calculateSafeToSpend(remaining, daysLeftInMonth);
  const spentPct = Math.min(100, Math.round((totalSpent / budget.allowance) * 100));

  let progressClass = 'fill-success';
  if (spentPct >= 100) {
    progressClass = 'fill-danger';
  } else if (spentPct >= 80) {
    progressClass = 'fill-warning';
  }

  container.innerHTML = `
    <div class="card-title">
      <span>💰 Money & Budget</span>
      <span class="badge ${remaining < 0 ? 'badge-high' : 'badge-primary'}">${remaining < 0 ? 'Overspent' : 'Safe/Day: ' + formatCurrency(safePerDay)}</span>
    </div>
    <div class="card-number" style="color: ${remaining < 0 ? 'var(--danger)' : 'var(--text)'};">
      ${formatCurrency(remaining)}
    </div>
    <p class="card-label">Remaining of ${formatCurrency(budget.allowance)} allowance (${spentPct}% spent)</p>
    <div class="progress" style="margin-top: 10px;">
      <div class="progress-fill ${progressClass}" style="width: ${spentPct}%;"></div>
    </div>
    <div style="margin-top: 12px;">
      <a href="budget.html" class="btn btn-secondary btn-sm">Manage Expenses &rarr;</a>
    </div>
  `;
}

/**
 * Card 3: Lowest attendance subject and warning if below required %
 */
function renderAttendanceCard() {
  const container = document.getElementById('dashAttendanceCard');
  if (!container) return;

  const attendanceList = getData(STORAGE_KEYS.ATTENDANCE, []);

  if (attendanceList.length === 0) {
    container.innerHTML = `
      <div class="card-title"><span>✅ Attendance</span></div>
      <div class="empty-state">
        <span class="empty-icon">📊</span>
        <p class="empty-text">No attendance records tracked.</p>
        <a href="attendance.html" class="btn btn-secondary btn-sm">Get started</a>
      </div>
    `;
    return;
  }

  // Calculate percentage per subject and find lowest
  const analyzed = attendanceList.map(sub => {
    const present = Number(sub.present) || 0;
    const total = Number(sub.total) || 0;
    const required = Number(sub.required) || 75;
    const pct = total === 0 ? 0 : Math.round((present / total) * 100);
    return { ...sub, pct, present, total, required };
  });

  // Sort lowest percentage first
  analyzed.sort((a, b) => a.pct - b.pct);
  const lowest = analyzed[0];

  const isLow = lowest.pct < lowest.required;
  const isNear = lowest.pct >= lowest.required - 5 && lowest.pct < lowest.required;

  let badgeClass = 'badge-low';
  let badgeText = 'On Track';

  if (isLow) {
    badgeClass = 'badge-high';
    badgeText = 'Low Attendance';
  } else if (isNear) {
    badgeClass = 'badge-medium';
    badgeText = 'Borderline';
  }

  container.innerHTML = `
    <div class="card-title">
      <span>✅ Attendance</span>
      <span class="badge ${badgeClass}">${badgeText}</span>
    </div>
    <div class="card-number" style="color: ${isLow ? 'var(--danger)' : 'var(--text)'};">
      ${lowest.total === 0 ? '0%' : lowest.pct + '%'}
    </div>
    <p class="card-label">Lowest: <strong>${escapeHTML(lowest.name)}</strong> (${lowest.present}/${lowest.total} classes, min ${lowest.required}%)</p>
    <div style="margin-top: 14px;">
      <a href="attendance.html" class="btn btn-secondary btn-sm">Mark Attendance &rarr;</a>
    </div>
  `;
}

/**
 * Card 4: Pending tasks count and top 3 priority tasks
 */
function renderTasksCard() {
  const container = document.getElementById('dashTasksCard');
  if (!container) return;

  const todos = getData(STORAGE_KEYS.TODOS, []);
  const pending = todos.filter(t => !t.done);

  if (pending.length === 0) {
    container.innerHTML = `
      <div class="card-title"><span>📝 Tasks & To-Do</span></div>
      <div class="empty-state">
        <span class="empty-icon">🎉</span>
        <p class="empty-text">All tasks completed! Nothing pending.</p>
        <a href="todo.html" class="btn btn-secondary btn-sm">Add tasks</a>
      </div>
    `;
    return;
  }

  // Use Algorithm 5 to sort tasks
  const sortedPending = sortTasksByPriorityAndDate(pending);
  const topThree = sortedPending.slice(0, 3);
  const today = todayString();

  const taskItemsHtml = topThree.map(t => {
    let priorityBadgeClass = 'badge-low';
    if (t.priority === 'High') priorityBadgeClass = 'badge-high';
    else if (t.priority === 'Medium') priorityBadgeClass = 'badge-medium';

    const isOverdue = t.due && calculateDaysLeft(today, t.due) < 0;

    return `
      <li style="display: flex; align-items: center; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid var(--border); font-size: 0.88rem;">
        <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 65%;">
          ${escapeHTML(t.text)}
        </span>
        <span style="display: flex; align-items: center; gap: 6px;">
          ${isOverdue ? '<span class="badge badge-high" style="font-size: 0.7rem;">Overdue</span>' : ''}
          <span class="badge ${priorityBadgeClass}" style="font-size: 0.7rem;">${t.priority}</span>
        </span>
      </li>
    `;
  }).join('');

  container.innerHTML = `
    <div class="card-title">
      <span>📝 Tasks & To-Do</span>
      <span class="badge badge-primary">${pending.length} pending</span>
    </div>
    <ul style="list-style: none; margin: 8px 0 14px 0;">
      ${taskItemsHtml}
    </ul>
    <div>
      <a href="todo.html" class="btn btn-secondary btn-sm">Open Task Manager &rarr;</a>
    </div>
  `;
}

/**
 * Quick stats row: Today's Pomodoros & Overall Exam Topic Progress
 */
function renderQuickStats() {
  const pomodoroCountEl = document.getElementById('dashPomodoroCount');
  const prepProgressEl = document.getElementById('dashPrepProgress');
  const prepFillEl = document.getElementById('dashPrepFill');

  // Pomodoro stats
  const pomodoroData = getData(STORAGE_KEYS.POMODOROS, { date: todayString(), count: 0 });
  const todayCount = (pomodoroData && pomodoroData.date === todayString()) ? pomodoroData.count : 0;
  if (pomodoroCountEl) {
    pomodoroCountEl.textContent = todayCount;
  }

  // Overall Exam Preparation percentage
  const subjects = getData(STORAGE_KEYS.SUBJECTS, []);
  let totalTopics = 0;
  let doneTopics = 0;

  subjects.forEach(sub => {
    if (Array.isArray(sub.topics)) {
      totalTopics += sub.topics.length;
      doneTopics += sub.topics.filter(tp => tp.done).length;
    }
  });

  const prepPct = totalTopics === 0 ? 0 : Math.round((doneTopics / totalTopics) * 100);

  if (prepProgressEl) {
    prepProgressEl.textContent = `${prepPct}% (${doneTopics}/${totalTopics} topics completed)`;
  }
  if (prepFillEl) {
    prepFillEl.style.width = `${prepPct}%`;
  }
}

/**
 * Sets up action buttons: Export, Import, Load demo, and Clear all data
 */
function setupActionButtons() {
  const loadDemoBtn = document.getElementById('loadDemoBtn');
  const clearDataBtn = document.getElementById('clearDataBtn');
  const exportDataBtn = document.getElementById('exportDataBtn');
  const importDataBtn = document.getElementById('importDataBtn');
  const importFileInput = document.getElementById('importFileInput');

  if (loadDemoBtn) {
    loadDemoBtn.addEventListener('click', loadDemoData);
  }

  if (clearDataBtn) {
    clearDataBtn.addEventListener('click', clearAllDataWithDoubleConfirm);
  }

  if (exportDataBtn) {
    exportDataBtn.addEventListener('click', () => {
      exportAllData();
      showToast('Exporting studenthub-backup.json...', 'info');
    });
  }

  if (importDataBtn && importFileInput) {
    importDataBtn.addEventListener('click', () => {
      importFileInput.value = '';
      importFileInput.click();
    });

    importFileInput.addEventListener('change', (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target.result;
        const confirmed = confirm(`Are you sure you want to import data from "${file.name}"? Current data will be replaced.`);
        if (!confirmed) return;

        const res = importDataFromJSON(text);
        if (res.success) {
          showToast(res.message, 'success');
          renderGreeting();
          renderDashboard();
        } else {
          showToast(res.message, 'error');
        }
      };
      reader.readAsText(file);
    });
  }

  // Midnight rollover hook
  window.refreshOnDateChange = () => {
    renderGreeting();
    renderDashboard();
    showToast('Date updated for new day.', 'info');
  };
}

/**
 * Fills localStorage with rich Indian student sample demo data
 * Satisfies all demo mode polish requirements:
 * 1. All 5 modules filled
 * 2. One exam within 3 days (highlighted red)
 * 3. One subject below 75% attendance (highlighted red warning)
 * 4. Budget above 80% spent (warning banner triggered)
 * 5. Overdue and high-priority tasks
 */
async function loadDemoData() {
  const today = todayString();
  const currentMonth = currentMonthString();

  // Helper to compute future/past dates relative to today
  function offsetDate(days) {
    const d = new Date();
    d.setDate(d.getDate() + days);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  // 1. Subjects & Exams (One exam within 3 days => 2 days left!)
  const demoSubjects = [
    {
      id: generateId(),
      name: 'Data Structures & Algorithms',
      examDate: offsetDate(2), // 2 days left (RED warning)
      topics: [
        { id: generateId(), title: 'Binary Search Trees & AVL Trees', done: true },
        { id: generateId(), title: 'Graph Traversal (BFS & DFS)', done: true },
        { id: generateId(), title: 'Dijkstra and Prim Algorithms', done: false },
        { id: generateId(), title: 'Dynamic Programming: 0/1 Knapsack', done: false },
        { id: generateId(), title: 'NP-Completeness and Heuristics', done: false }
      ]
    },
    {
      id: generateId(),
      name: 'Engineering Physics',
      examDate: offsetDate(8), // 8 days left (Normal)
      topics: [
        { id: generateId(), title: 'Quantum Mechanics & Wave Functions', done: true },
        { id: generateId(), title: 'Interference and Diffraction', done: false },
        { id: generateId(), title: 'Lasers and Fiber Optics', done: false },
        { id: generateId(), title: 'Superconductivity & Nanotechnology', done: false }
      ]
    },
    {
      id: generateId(),
      name: 'Discrete Mathematics',
      examDate: offsetDate(15), // 15 days left
      topics: [
        { id: generateId(), title: 'Propositional & Predicate Logic', done: true },
        { id: generateId(), title: 'Relations and Equivalence Sets', done: true },
        { id: generateId(), title: 'Recurrence Relations & Generating Functions', done: false }
      ]
    }
  ];

  // 2. Budget (Allowance 6000, Expenses 5100 = 85% spent => warning banner active)
  const demoExpenses = [
    { id: generateId(), amount: 1650, category: 'Food', date: offsetDate(-10), note: 'Hostel mess extras & canteen snacks' },
    { id: generateId(), amount: 850, category: 'Travel', date: offsetDate(-7), note: 'Metro card top-up & auto fare' },
    { id: generateId(), amount: 699, category: 'Recharge', date: offsetDate(-5), note: 'Monthly 5G mobile data recharge' },
    { id: generateId(), amount: 550, category: 'Study', date: offsetDate(-3), note: 'DSA notebook & scientific calculator batteries' },
    { id: generateId(), amount: 1050, category: 'Fun', date: offsetDate(-2), note: 'Weekend movie & dinner with wingmates' },
    { id: generateId(), amount: 300, category: 'Other', date: offsetDate(-1), note: 'Dorm laundry detergent & stationery' }
  ];

  const demoBudget = {
    month: currentMonth,
    allowance: 6000,
    expenses: demoExpenses,
    history: [
      { month: '2026-09', allowance: 6000, spent: 5400 }
    ]
  };

  // 3. Attendance (One subject below 75% => Physics at 61.9% RED warning)
  const demoAttendance = [
    {
      id: generateId(),
      name: 'Data Structures & Algorithms',
      required: 75,
      present: 22,
      total: 25,
      lastMarked: today,
      lastAction: 'present'
    },
    {
      id: generateId(),
      name: 'Engineering Physics',
      required: 75,
      present: 13,
      total: 21, // 13/21 = 61.9% (< 75% RED ALERT)
      lastMarked: today,
      lastAction: 'absent'
    },
    {
      id: generateId(),
      name: 'Discrete Mathematics',
      required: 75,
      present: 18,
      total: 24, // 18/24 = 75%
      lastMarked: today,
      lastAction: 'present'
    },
    {
      id: generateId(),
      name: 'Technical Communication',
      required: 75,
      present: 16,
      total: 18, // 88.9%
      lastMarked: today,
      lastAction: 'present'
    }
  ];

  // 4. Tasks (Overdue task and mixed priorities)
  const demoTodos = [
    {
      id: generateId(),
      text: 'Submit DSA Lab Assignment 3 (Graph Traversal)',
      priority: 'High',
      due: offsetDate(-1), // OVERDUE (RED)
      done: false
    },
    {
      id: generateId(),
      text: 'Revise Dynamic Programming Notes before Thursday',
      priority: 'High',
      due: offsetDate(1),
      done: false
    },
    {
      id: generateId(),
      text: 'Physics practical journal completion & signature',
      priority: 'Medium',
      due: offsetDate(3),
      done: false
    },
    {
      id: generateId(),
      text: 'Return library book: Cormen Algorithms',
      priority: 'Low',
      due: offsetDate(5),
      done: false
    },
    {
      id: generateId(),
      text: 'Complete College Identity Card renewal form',
      priority: 'Medium',
      due: offsetDate(-2),
      done: true
    },
    {
      id: generateId(),
      text: 'Setup Visual Studio Code on personal laptop',
      priority: 'Low',
      due: offsetDate(-4),
      done: true
    }
  ];

  // 5. Pomodoro sessions
  const demoPomodoros = {
    date: today,
    count: 3
  };

  // Save everything to localStorage
  setData(STORAGE_KEYS.SUBJECTS, demoSubjects);
  setData(STORAGE_KEYS.BUDGET, demoBudget);
  setData(STORAGE_KEYS.ATTENDANCE, demoAttendance);
  setData(STORAGE_KEYS.TODOS, demoTodos);
  setData(STORAGE_KEYS.POMODOROS, demoPomodoros);

  // If connected to backend, sync demo dataset to server database
  if (typeof IS_SERVER_MODE !== 'undefined' && IS_SERVER_MODE) {
    try {
      await fetch('/api/demo', { method: 'POST' });
    } catch (e) {}
  }

  showToast('Demo data loaded successfully! 5 modules populated.', 'success');
  renderDashboard();
}

/**
 * Wipes all application data with double confirmation
 */
async function clearAllDataWithDoubleConfirm() {
  const confirm1 = confirm('Are you sure you want to clear all StudentHub data?');
  if (!confirm1) return;

  const confirm2 = confirm('FINAL WARNING: This will permanently delete all your subjects, expenses, attendance records, and tasks. Proceed?');
  if (!confirm2) return;

  clearAllStorage();
  showToast('All StudentHub data cleared.', 'info');
  renderDashboard();
}

