/**
 * StudentHub — Budget Tracker Logic (budget.js)
 * Manages monthly student allowances, expense recording, safe daily spending limits,
 * pure CSS category distribution charts, search, sorting, and month history archiving.
 * Supports full CRUD (Add, Edit, Delete expenses and Set/Edit allowance) with validation.
 */

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

const BUDGET_CATEGORIES = ['Food', 'Travel', 'Recharge', 'Study', 'Fun', 'Other'];

const CATEGORY_COLORS = {
  'Food': 'cat-food',
  'Travel': 'cat-travel',
  'Recharge': 'cat-recharge',
  'Study': 'cat-study',
  'Fun': 'cat-fun',
  'Other': 'cat-other'
};

let expenseSearchQuery = '';
let expenseSortOrder = 'date-desc';

document.addEventListener('DOMContentLoaded', () => {
  initExpenseDate();
  wireFieldValidations();
  checkMonthRollover();
  setupAddExpenseForm();
  setupAllowanceModal();
  setupEditExpenseModal();
  setupSearchAndSort();
  renderBudgetModule();
});

/**
 * Initializes default date to today
 */
function initExpenseDate() {
  const expenseDateInput = document.getElementById('expenseDate');
  if (expenseDateInput) {
    expenseDateInput.value = todayString();
  }
}

/**
 * Wires real-time error clearing and note character counters
 */
function wireFieldValidations() {
  wireFieldAutoClear('expenseAmount');
  wireFieldAutoClear('expenseDate');
  wireFieldAutoClear('expenseNote');
  wireFieldAutoClear('allowanceInput');
  wireFieldAutoClear('editExpenseAmount');
  wireFieldAutoClear('editExpenseDate');

  const noteInput = document.getElementById('expenseNote');
  const countEl = document.getElementById('expenseNoteCharCount');
  if (noteInput && countEl) {
    noteInput.addEventListener('input', () => {
      countEl.textContent = noteInput.value.length;
    });
  }
}

/**
 * Sets up live search and sort listeners
 */
function setupSearchAndSort() {
  const searchInput = document.getElementById('expenseSearchInput');
  const sortSelect = document.getElementById('expenseSortSelect');

  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      expenseSearchQuery = e.target.value.trim().toLowerCase();
      renderExpensesList(getCurrentExpenses());
    });
  }

  if (sortSelect) {
    sortSelect.value = expenseSortOrder;
    sortSelect.addEventListener('change', (e) => {
      expenseSortOrder = e.target.value;
      renderExpensesList(getCurrentExpenses());
    });
  }
}

function getCurrentExpenses() {
  const budget = getData(STORAGE_KEYS.BUDGET, null);
  if (!budget || !Array.isArray(budget.expenses)) return [];
  return budget.expenses;
}

/**
 * Checks if month rolled over and archives history
 */
function checkMonthRollover() {
  const currentMonth = currentMonthString();
  let budget = getData(STORAGE_KEYS.BUDGET, null);

  if (!budget) {
    budget = {
      month: currentMonth,
      allowance: 0,
      expenses: [],
      history: []
    };
    setData(STORAGE_KEYS.BUDGET, budget);
    return;
  }

  if (!Array.isArray(budget.history)) {
    budget.history = [];
  }

  if (budget.month && budget.month !== currentMonth) {
    const previousSpent = Array.isArray(budget.expenses)
      ? budget.expenses.reduce((s, e) => s + (Number(e.amount) || 0), 0)
      : 0;

    budget.history.push({
      month: budget.month,
      allowance: budget.allowance || 0,
      spent: previousSpent
    });

    budget.month = currentMonth;
    budget.expenses = [];
    setData(STORAGE_KEYS.BUDGET, budget);
    showToast(`New month started (${currentMonth})! Previous month archived.`, 'info');
  }
}

/**
 * Main render function for budget metrics, charts, and lists
 */
function renderBudgetModule() {
  const budget = getData(STORAGE_KEYS.BUDGET, {
    month: currentMonthString(),
    allowance: 0,
    expenses: [],
    history: []
  });

  const allowance = Number(budget.allowance) || 0;
  const expenses = Array.isArray(budget.expenses) ? budget.expenses : [];

  const totalSpent = expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  const remaining = allowance - totalSpent;

  // Days left in current month including today
  const now = new Date();
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const daysLeft = Math.max(1, lastDay - now.getDate() + 1);

  const safePerDay = calculateSafeToSpend(remaining, daysLeft);
  const spentPct = allowance > 0 ? Math.round((totalSpent / allowance) * 100) : 0;

  // 1. Update Metrics Cards
  const allowanceEl = document.getElementById('metricAllowance');
  const spentEl = document.getElementById('metricSpent');
  const spentPctEl = document.getElementById('metricSpentPct');
  const remainingEl = document.getElementById('metricRemaining');
  const remainingNoteEl = document.getElementById('metricRemainingNote');
  const safePerDayEl = document.getElementById('metricSafePerDay');
  const daysLeftEl = document.getElementById('metricDaysLeft');

  if (allowanceEl) {
    allowanceEl.textContent = formatCurrency(allowance);
  }
  if (spentEl) spentEl.textContent = formatCurrency(totalSpent);
  if (spentPctEl) {
    spentPctEl.textContent = allowance > 0 ? `${spentPct}% of monthly allowance` : 'Set allowance to track budget';
  }

  if (remainingEl) {
    remainingEl.textContent = formatCurrency(remaining);
    remainingEl.style.color = remaining < 0 ? 'var(--danger)' : 'var(--text)';
  }

  if (remainingNoteEl) {
    if (allowance <= 0) {
      remainingNoteEl.textContent = 'No allowance set yet';
      remainingNoteEl.style.color = 'var(--muted)';
    } else if (remaining < 0) {
      remainingNoteEl.textContent = `Overspent by ${formatCurrency(Math.abs(remaining))}`;
      remainingNoteEl.style.color = 'var(--danger)';
    } else {
      remainingNoteEl.textContent = `${formatCurrency(remaining)} left to spend`;
      remainingNoteEl.style.color = 'var(--muted)';
    }
  }

  if (safePerDayEl) {
    safePerDayEl.textContent = formatCurrency(safePerDay);
    safePerDayEl.style.color = (allowance > 0 && remaining <= 0) ? 'var(--danger)' : 'var(--primary)';
  }

  if (daysLeftEl) {
    daysLeftEl.textContent = `${daysLeft} days left in ${now.toLocaleString('default', { month: 'long' })}`;
  }

  // 2. Render Warning Banner
  renderWarningBanner(allowance, totalSpent, spentPct);

  // 3. Render Pure CSS Category Chart
  renderCategoryChart(expenses, totalSpent);

  // 4. Render Expenses List
  renderExpensesList(expenses);

  // 5. Render Month History
  renderMonthHistory(budget.history || []);
}

/**
 * Renders warning banner when budget reaches 80% or 100% threshold
 */
function renderWarningBanner(allowance, totalSpent, spentPct) {
  const banner = document.getElementById('budgetWarningBanner');
  if (!banner) return;

  if (allowance <= 0) {
    banner.style.display = 'none';
    return;
  }

  if (spentPct >= 100) {
    banner.className = 'banner-danger';
    banner.innerHTML = `
      <span>🚨</span>
      <div>
        <strong>Budget Exceeded!</strong> You have spent ${spentPct}% of your allowance (${formatCurrency(totalSpent)} of ${formatCurrency(allowance)}). Daily safe spending is ₹0.
      </div>
    `;
    banner.style.display = 'flex';
  } else if (spentPct >= 80) {
    banner.className = 'banner-warning';
    banner.innerHTML = `
      <span>⚠️</span>
      <div>
        <strong>Warning: 80% of Budget Spent!</strong> You have spent ${spentPct}% of your allowance. Only ${formatCurrency(allowance - totalSpent)} remaining.
      </div>
    `;
    banner.style.display = 'flex';
  } else {
    banner.style.display = 'none';
  }
}

/**
 * Renders the pure CSS category chart bars and legend
 */
function renderCategoryChart(expenses, totalSpent) {
  const barsContainer = document.getElementById('chartBarsContainer');
  const legendContainer = document.getElementById('chartLegendContainer');
  if (!barsContainer || !legendContainer) return;

  if (expenses.length === 0 || totalSpent <= 0) {
    barsContainer.innerHTML = `<div style="width: 100%; height: 100%; background-color: var(--border); display: flex; align-items: center; justify-content: center; font-size: 0.8rem; color: var(--muted);">No expenses recorded yet</div>`;
    legendContainer.innerHTML = '';
    return;
  }

  const breakdown = calculateCategoryPercentages(expenses, BUDGET_CATEGORIES);

  barsContainer.innerHTML = breakdown
    .filter(b => b.percentage > 0)
    .map(b => `
      <div class="chart-bar-segment ${CATEGORY_COLORS[b.category] || 'cat-other'}"
           style="width: ${b.percentage}%;"
           title="${b.category}: ${formatCurrency(b.total)} (${b.percentage}%)">
      </div>
    `).join('');

  legendContainer.innerHTML = breakdown.map(b => `
    <div class="legend-item">
      <span class="legend-dot ${CATEGORY_COLORS[b.category] || 'cat-other'}"></span>
      <span>${b.category}: <strong>${formatCurrency(b.total)}</strong> (${b.percentage}%)</span>
    </div>
  `).join('');
}

/**
 * Renders expenses list with search filter and sort
 */
function renderExpensesList(expenses) {
  const container = document.getElementById('expensesListContainer');
  const countBadge = document.getElementById('expenseCountBadge');
  if (!container) return;

  if (expenses.length === 0) {
    if (countBadge) countBadge.textContent = '0 items';
    container.innerHTML = `
      <div class="empty-state">
        <span class="empty-icon">💸</span>
        <h3 style="margin-bottom: 6px; font-size: 1.1rem;">No expenses recorded</h3>
        <p class="empty-text">Add your daily expenses using the form on the left to track where your money goes!</p>
      </div>
    `;
    return;
  }

  // Filter by search query
  let filtered = expenses;
  if (expenseSearchQuery) {
    filtered = filtered.filter(e => {
      const noteMatch = (e.note || '').toLowerCase().includes(expenseSearchQuery);
      const catMatch = (e.category || '').toLowerCase().includes(expenseSearchQuery);
      return noteMatch || catMatch;
    });
  }

  if (countBadge) {
    countBadge.textContent = `${filtered.length} of ${expenses.length} ${expenses.length === 1 ? 'item' : 'items'}`;
  }

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="empty-state" style="padding: 24px;">
        <span class="empty-icon">🔍</span>
        <p class="empty-text">No expenses match "${escapeHTML(expenseSearchQuery)}".</p>
      </div>
    `;
    return;
  }

  // Sort
  const sorted = [...filtered].sort((a, b) => {
    if (expenseSortOrder === 'date-asc') {
      return a.date.localeCompare(b.date);
    }
    if (expenseSortOrder === 'amount-desc') {
      return (Number(b.amount) || 0) - (Number(a.amount) || 0);
    }
    if (expenseSortOrder === 'amount-asc') {
      return (Number(a.amount) || 0) - (Number(b.amount) || 0);
    }
    if (expenseSortOrder === 'category') {
      return a.category.localeCompare(b.category);
    }
    // Default 'date-desc'
    return b.date.localeCompare(a.date);
  });

  container.innerHTML = sorted.map(exp => `
    <div class="list-item-card" data-expense-id="${exp.id}">
      <div>
        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
          <span class="badge badge-primary">${escapeHTML(exp.category)}</span>
          <span style="font-weight: 600; font-size: 1rem;">${formatCurrency(exp.amount)}</span>
        </div>
        <div style="font-size: 0.85rem; color: var(--muted);">
          <span>📅 ${escapeHTML(exp.date)}</span>
          ${exp.note ? `<span> • ${escapeHTML(exp.note)}</span>` : ''}
        </div>
      </div>
      <div style="display: flex; align-items: center; gap: 6px;">
        <button class="btn btn-secondary btn-sm edit-expense-btn" data-expense-id="${exp.id}" title="Edit Expense">
          ✏️
        </button>
        <button class="btn btn-secondary btn-sm delete-expense-btn" data-expense-id="${exp.id}" title="Delete Expense">
          🗑️
        </button>
      </div>
    </div>
  `).join('');

  // Wire edit and delete handlers
  document.querySelectorAll('.edit-expense-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const expId = btn.getAttribute('data-expense-id');
      openEditExpenseModal(expId);
    });
  });

  document.querySelectorAll('.delete-expense-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const expId = btn.getAttribute('data-expense-id');
      deleteExpense(expId);
    });
  });
}

/**
 * Renders past months history archive
 */
function renderMonthHistory(history) {
  const container = document.getElementById('monthHistoryContainer');
  if (!container) return;

  if (history.length === 0) {
    container.innerHTML = `<p style="font-size: 0.85rem; color: var(--muted); padding: 8px 0;">No previous months archived yet. At month-end, data automatically archives here.</p>`;
    return;
  }

  container.innerHTML = `
    <table style="width: 100%; border-collapse: collapse; font-size: 0.88rem; text-align: left;">
      <thead>
        <tr style="border-bottom: 1px solid var(--border); color: var(--muted);">
          <th style="padding: 8px 4px;">Month</th>
          <th style="padding: 8px 4px;">Allowance</th>
          <th style="padding: 8px 4px;">Spent</th>
          <th style="padding: 8px 4px;">Status</th>
        </tr>
      </thead>
      <tbody>
        ${history.map(h => {
          const diff = h.allowance - h.spent;
          const statusText = diff >= 0 ? `Saved ${formatCurrency(diff)}` : `Over by ${formatCurrency(Math.abs(diff))}`;
          const statusColor = diff >= 0 ? 'var(--success)' : 'var(--danger)';
          return `
            <tr style="border-bottom: 1px solid var(--border);">
              <td style="padding: 10px 4px; font-weight: 500;">${escapeHTML(h.month)}</td>
              <td style="padding: 10px 4px;">${formatCurrency(h.allowance)}</td>
              <td style="padding: 10px 4px;">${formatCurrency(h.spent)}</td>
              <td style="padding: 10px 4px; color: ${statusColor}; font-weight: 500;">${statusText}</td>
            </tr>
          `;
        }).join('')}
      </tbody>
    </table>
  `;
}

/**
 * Handles adding expense with validation
 */
function setupAddExpenseForm() {
  const form = document.getElementById('addExpenseForm');
  if (!form) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    clearFieldError('expenseAmount');
    clearFieldError('expenseDate');
    clearFieldError('expenseNote');

    const amountInput = document.getElementById('expenseAmount');
    const catInput = document.getElementById('expenseCategory');
    const dateInput = document.getElementById('expenseDate');
    const noteInput = document.getElementById('expenseNote');

    const amount = parseFloat(amountInput.value);
    const category = catInput.value;
    const date = dateInput.value;
    const note = noteInput.value.trim();

    if (isNaN(amount) || amount <= 0) {
      showFieldError('expenseAmount', 'Please enter an amount greater than ₹0.');
      showToast('Expense amount must be greater than 0', 'error');
      return;
    }

    if (!date) {
      showFieldError('expenseDate', 'Please select a date.');
      showToast('Date is required', 'error');
      return;
    }

    if (note.length > 120) {
      showFieldError('expenseNote', 'Note must be 120 characters or fewer.');
      return;
    }

    const budget = getData(STORAGE_KEYS.BUDGET, {
      month: currentMonthString(),
      allowance: 0,
      expenses: [],
      history: []
    });

    if (!Array.isArray(budget.expenses)) budget.expenses = [];

    budget.expenses.push({
      id: generateId(),
      amount: amount,
      category: category,
      date: date,
      note: note
    });

    setData(STORAGE_KEYS.BUDGET, budget);

    form.reset();
    initExpenseDate();
    amountInput.focus();
    const countEl = document.getElementById('expenseNoteCharCount');
    if (countEl) countEl.textContent = '0';

    showToast(`Recorded expense of ${formatCurrency(amount)} (${category})`, 'success');
    renderBudgetModule();
  });
}

/**
 * Sets up Set Allowance Modal
 */
function setupAllowanceModal() {
  const openBtn = document.getElementById('editAllowanceBtn');
  const closeBtn = document.getElementById('closeAllowanceModalBtn');
  const cancelBtn = document.getElementById('cancelAllowanceBtn');
  const form = document.getElementById('setAllowanceForm');

  if (openBtn) {
    openBtn.addEventListener('click', () => {
      const budget = getData(STORAGE_KEYS.BUDGET, { allowance: 0 });
      const input = document.getElementById('allowanceInput');
      if (input) {
        input.value = budget.allowance > 0 ? budget.allowance : '';
      }
      clearFieldError('allowanceInput');
      openModal('setAllowanceModal');
    });
  }

  if (closeBtn) closeBtn.addEventListener('click', () => closeModal('setAllowanceModal'));
  if (cancelBtn) cancelBtn.addEventListener('click', () => closeModal('setAllowanceModal'));

  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      clearFieldError('allowanceInput');

      const input = document.getElementById('allowanceInput');
      const val = parseFloat(input.value);

      if (isNaN(val) || val <= 0) {
        showFieldError('allowanceInput', 'Allowance must be a number greater than ₹0.');
        showToast('Please enter a valid allowance', 'error');
        return;
      }

      const budget = getData(STORAGE_KEYS.BUDGET, {
        month: currentMonthString(),
        allowance: 0,
        expenses: [],
        history: []
      });

      budget.allowance = val;
      setData(STORAGE_KEYS.BUDGET, budget);

      closeModal('setAllowanceModal');
      showToast(`Monthly allowance set to ${formatCurrency(val)}`, 'success');
      renderBudgetModule();
    });
  }
}

/**
 * Sets up Edit Expense Modal
 */
function setupEditExpenseModal() {
  const closeBtn = document.getElementById('closeEditExpenseModalBtn');
  const cancelBtn = document.getElementById('cancelEditExpenseBtn');
  const form = document.getElementById('editExpenseForm');

  if (closeBtn) closeBtn.addEventListener('click', () => closeModal('editExpenseModal'));
  if (cancelBtn) cancelBtn.addEventListener('click', () => closeModal('editExpenseModal'));

  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      clearFieldError('editExpenseAmount');
      clearFieldError('editExpenseDate');

      const expId = document.getElementById('editExpenseId').value;
      const amount = parseFloat(document.getElementById('editExpenseAmount').value);
      const category = document.getElementById('editExpenseCategory').value;
      const date = document.getElementById('editExpenseDate').value;
      const note = document.getElementById('editExpenseNote').value.trim();

      if (isNaN(amount) || amount <= 0) {
        showFieldError('editExpenseAmount', 'Amount must be greater than ₹0.');
        return;
      }

      if (!date) {
        showFieldError('editExpenseDate', 'Please select a date.');
        return;
      }

      const budget = getData(STORAGE_KEYS.BUDGET, null);
      if (!budget || !Array.isArray(budget.expenses)) return;

      const target = budget.expenses.find(e => e.id === expId);
      if (!target) return;

      target.amount = amount;
      target.category = category;
      target.date = date;
      target.note = note;

      setData(STORAGE_KEYS.BUDGET, budget);
      closeModal('editExpenseModal');
      showToast(`Expense updated (${formatCurrency(amount)})`, 'success');
      renderBudgetModule();
    });
  }
}

function openEditExpenseModal(expId) {
  const budget = getData(STORAGE_KEYS.BUDGET, null);
  if (!budget || !Array.isArray(budget.expenses)) return;

  const exp = budget.expenses.find(e => e.id === expId);
  if (!exp) return;

  clearFieldError('editExpenseAmount');
  clearFieldError('editExpenseDate');

  document.getElementById('editExpenseId').value = exp.id;
  document.getElementById('editExpenseAmount').value = exp.amount;
  document.getElementById('editExpenseCategory').value = exp.category;
  document.getElementById('editExpenseDate').value = exp.date;
  document.getElementById('editExpenseNote').value = exp.note || '';

  openModal('editExpenseModal');
}

/**
 * Deletes an individual expense record with confirm
 */
function deleteExpense(expId) {
  const budget = getData(STORAGE_KEYS.BUDGET, null);
  if (!budget || !Array.isArray(budget.expenses)) return;

  const target = budget.expenses.find(e => e.id === expId);
  if (!target) return;

  const confirmed = confirm(`Are you sure you want to delete this expense of ${formatCurrency(target.amount)} (${target.category})?`);
  if (!confirmed) return;

  budget.expenses = budget.expenses.filter(e => e.id !== expId);
  setData(STORAGE_KEYS.BUDGET, budget);
  showToast(`Deleted expense of ${formatCurrency(target.amount)}`, 'info');
  renderBudgetModule();
}
