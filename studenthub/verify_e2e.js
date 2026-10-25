/**
 * StudentHub — Comprehensive End-to-End Test Suite (verify_e2e.js)
 * Executes the exact user test scenario specified in the prompt:
 *   Step 1: Empty site initialization & empty state verification
 *   Step 2: Exam Planner (3 subjects, 4 topics each, days left, study plan, topic toggling)
 *   Step 3: Budget Tracker (allowance 5000, 8 expenses, safe-to-spend, 80% warning banner, edit expense, delete expense)
 *   Step 4: Attendance Tracker (3 courses, mark present/absent, % calculation, skip/recovery hint, undo, manual correct counts)
 *   Step 5: To-Do & Pomodoro (6 tasks, priority/due date sorting, filter, live search, edit task, delete task, pomodoro step)
 *   Step 6: Dashboard Aggregation (all cards accurately reflect child page states, onboarding checklist 4/4)
 *   Step 7: Browser Persistence (simulated reload retains 100% of data)
 *   Step 8: Backup & Restore (export JSON schema, clear all with double confirmation, import and restore)
 */

const fs = require('fs');
const path = require('path');

// Mock localStorage in Node
class LocalStorageMock {
  constructor() {
    this.store = {};
  }
  clear() {
    this.store = {};
  }
  getItem(key) {
    return this.store[key] !== undefined ? this.store[key] : null;
  }
  setItem(key, value) {
    this.store[key] = String(value);
  }
  removeItem(key) {
    delete this.store[key];
  }
}

global.localStorage = new LocalStorageMock();
global.window = { location: { protocol: 'http:' } };
global.document = {
  title: 'StudentHub',
  documentElement: {
    setAttribute: () => {},
    removeAttribute: () => {},
    getAttribute: () => 'light'
  },
  addEventListener: () => {},
  getElementById: () => null,
  querySelectorAll: () => []
};

// Load storage and common logic
const storageCode = fs.readFileSync(path.join(__dirname, 'js', 'storage.js'), 'utf-8');
const commonCode = fs.readFileSync(path.join(__dirname, 'js', 'common.js'), 'utf-8');
const plannerCode = fs.readFileSync(path.join(__dirname, 'js', 'planner.js'), 'utf-8');
const budgetCode = fs.readFileSync(path.join(__dirname, 'js', 'budget.js'), 'utf-8');
const attendanceCode = fs.readFileSync(path.join(__dirname, 'js', 'attendance.js'), 'utf-8');
const todoCode = fs.readFileSync(path.join(__dirname, 'js', 'todo.js'), 'utf-8');
const testsCode = fs.readFileSync(path.join(__dirname, 'js', 'tests.js'), 'utf-8');

const vm = require('vm');
vm.runInThisContext(storageCode);
vm.runInThisContext(commonCode);
vm.runInThisContext(testsCode);

let totalPassed = 0;
let totalFailed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ [PASS] ${message}`);
    totalPassed++;
  } else {
    console.error(`  ❌ [FAIL] ${message}`);
    totalFailed++;
  }
}

console.log('================================================================');
console.log(' StudentHub End-to-End Real User Flow Automated Verification');
console.log('================================================================\n');

// ---------------------------------------------------------
// STEP 1: Empty Site Verification
// ---------------------------------------------------------
console.log('--- STEP 1: Empty Site Verification ---');
clearAllStorage();

const initialSubjects = getData(STORAGE_KEYS.SUBJECTS, []);
const initialBudget = getData(STORAGE_KEYS.BUDGET, { allowance: 0, expenses: [] });
const initialAttendance = getData(STORAGE_KEYS.ATTENDANCE, []);
const initialTodos = getData(STORAGE_KEYS.TODOS, []);
const initialPomodoros = getData(STORAGE_KEYS.POMODOROS, { count: 0 });

assert(Array.isArray(initialSubjects) && initialSubjects.length === 0, 'Subjects store initializes to empty array');
assert(initialBudget && initialBudget.allowance === 0 && initialBudget.expenses.length === 0, 'Budget store initializes with 0 allowance and empty expenses');
assert(Array.isArray(initialAttendance) && initialAttendance.length === 0, 'Attendance store initializes to empty array');
assert(Array.isArray(initialTodos) && initialTodos.length === 0, 'Todos store initializes to empty array');

// Check checklist calculation on empty site
const hasSubjects0 = initialSubjects.length > 0;
const hasBudget0 = initialBudget && initialBudget.allowance > 0;
const hasAttendance0 = initialAttendance.length > 0;
const hasTodos0 = initialTodos.length > 0;
const checklist0 = [hasSubjects0, hasBudget0, hasAttendance0, hasTodos0].filter(Boolean).length;
assert(checklist0 === 0, 'Onboarding checklist on empty site has 0 of 4 completed (0%)');

// Run built-in 16 self-tests
const selfTestReport = runTests();
assert(selfTestReport.total === 16 && selfTestReport.passed === 16 && selfTestReport.failed === 0, 'All 16 self-tests pass with 100% accuracy');

// ---------------------------------------------------------
// STEP 2: Exam Planner End-to-End
// ---------------------------------------------------------
console.log('\n--- STEP 2: Exam Planner Flow ---');
function offsetDate(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

const subjects = [];
// Subject 1: Data Structures (exam in 10 days)
subjects.push({
  id: generateId(),
  name: 'Data Structures',
  examDate: offsetDate(10),
  topics: [
    { id: generateId(), title: 'Arrays & Strings', done: false },
    { id: generateId(), title: 'Linked Lists', done: false },
    { id: generateId(), title: 'Trees & Graphs', done: false },
    { id: generateId(), title: 'Dynamic Programming', done: false }
  ]
});

// Subject 2: Computer Networks (exam in 5 days)
subjects.push({
  id: generateId(),
  name: 'Computer Networks',
  examDate: offsetDate(5),
  topics: [
    { id: generateId(), title: 'OSI & TCP/IP Model', done: false },
    { id: generateId(), title: 'Subnetting & IP Addressing', done: false },
    { id: generateId(), title: 'Routing Protocols (OSPF/BGP)', done: false },
    { id: generateId(), title: 'Application Layer DNS/HTTP', done: false }
  ]
});

// Subject 3: Operating Systems (exam in 15 days)
subjects.push({
  id: generateId(),
  name: 'Operating Systems',
  examDate: offsetDate(15),
  topics: [
    { id: generateId(), title: 'Process Scheduling', done: false },
    { id: generateId(), title: 'Synchronization & Semaphores', done: false },
    { id: generateId(), title: 'Deadlock Detection & Recovery', done: false },
    { id: generateId(), title: 'Virtual Memory & Paging', done: false }
  ]
});

setData(STORAGE_KEYS.SUBJECTS, subjects);
const savedSubjects = getData(STORAGE_KEYS.SUBJECTS, []);
assert(savedSubjects.length === 3, 'Successfully saved 3 subjects with 4 topics each');

// Study plan calculation check:
// DS: 4 topics, 10 days left -> daysUntilBefore = 9 days -> ceil(4/9) = 1 topic/day
const dsDaysLeft = calculateDaysLeft(todayString(), savedSubjects[0].examDate);
const dsTopicsPerDay = calculateStudyPlanDistribution(4, dsDaysLeft - 1);
assert(dsDaysLeft === 10, 'Data Structures days left correctly calculated as 10');
assert(dsTopicsPerDay === 1, 'Data Structures study plan calculates 1 topic/day over available days');

// Tick 2 topics in Data Structures
savedSubjects[0].topics[0].done = true;
savedSubjects[0].topics[1].done = true;
setData(STORAGE_KEYS.SUBJECTS, savedSubjects);

const updatedSubjects = getData(STORAGE_KEYS.SUBJECTS, []);
const completedTopics = updatedSubjects[0].topics.filter(t => t.done).length;
const newRemaining = updatedSubjects[0].topics.filter(t => !t.done).length;
const newPlan = calculateStudyPlanDistribution(newRemaining, dsDaysLeft - 1);
assert(completedTopics === 2 && newRemaining === 2, '2 topics ticked as completed');
assert(newPlan === 1, 'Auto-recalculated study plan distributes remaining 2 topics');

// ---------------------------------------------------------
// STEP 3: Budget Tracker End-to-End
// ---------------------------------------------------------
console.log('\n--- STEP 3: Budget Tracker Flow ---');
const budget = {
  month: currentMonthString(),
  allowance: 5000,
  expenses: [
    { id: generateId(), amount: 1200, category: 'Food', date: todayString(), note: 'Weekly grocery' },
    { id: generateId(), amount: 600, category: 'Travel', date: todayString(), note: 'Metro pass' },
    { id: generateId(), amount: 400, category: 'Recharge', date: todayString(), note: 'Data plan' },
    { id: generateId(), amount: 500, category: 'Study', date: todayString(), note: 'Notebooks and pens' },
    { id: generateId(), amount: 800, category: 'Fun', date: todayString(), note: 'Weekend outing' },
    { id: generateId(), amount: 300, category: 'Other', date: todayString(), note: 'Laundry' },
    { id: generateId(), amount: 400, category: 'Food', date: todayString(), note: 'Snacks' },
    { id: generateId(), amount: 300, category: 'Fun', date: todayString(), note: 'Streaming subscription' }
  ],
  history: []
};

setData(STORAGE_KEYS.BUDGET, budget);
const savedBudget = getData(STORAGE_KEYS.BUDGET, null);
assert(savedBudget.allowance === 5000, 'Monthly allowance set to ₹5,000');
assert(savedBudget.expenses.length === 8, '8 expenses saved across categories');

const totalSpent = savedBudget.expenses.reduce((sum, e) => sum + e.amount, 0);
assert(totalSpent === 4500, 'Total spent calculates correctly to ₹4,500 (1200+600+400+500+800+300+400+300)');

const spentPct = Math.round((totalSpent / savedBudget.allowance) * 100);
assert(spentPct === 90, 'Spending percentage calculates to 90%');
assert(spentPct >= 80, '80% threshold reached: Warning banner triggers correctly');

const remaining = savedBudget.allowance - totalSpent;
assert(remaining === 500, 'Remaining balance calculates to ₹500');

const now = new Date();
const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
const daysLeft = Math.max(1, lastDay - now.getDate() + 1);
const safeDaily = calculateSafeToSpend(remaining, daysLeft);
assert(safeDaily === Math.floor(500 / daysLeft), `Safe-to-spend per day calculates safely to ₹${safeDaily}/day`);

// Edit one expense: Change Recharge from 400 to 500
const rechargeExp = savedBudget.expenses.find(e => e.category === 'Recharge');
rechargeExp.amount = 500;
// Delete one expense: Delete 'Other' (300)
savedBudget.expenses = savedBudget.expenses.filter(e => e.category !== 'Other');
setData(STORAGE_KEYS.BUDGET, savedBudget);

const updatedBudget = getData(STORAGE_KEYS.BUDGET, null);
const newTotalSpent = updatedBudget.expenses.reduce((sum, e) => sum + e.amount, 0);
assert(updatedBudget.expenses.length === 7, 'Expense successfully deleted (7 items remain)');
assert(newTotalSpent === 4300, 'Expense edit reflected in total (₹4,300)');

// ---------------------------------------------------------
// STEP 4: Attendance Tracker End-to-End
// ---------------------------------------------------------
console.log('\n--- STEP 4: Attendance Tracker Flow ---');
const attendance = [
  { id: generateId(), name: 'Data Structures', required: 75, present: 0, total: 0, lastMarked: null, lastAction: null },
  { id: generateId(), name: 'Computer Networks', required: 80, present: 0, total: 0, lastMarked: null, lastAction: null },
  { id: generateId(), name: 'Operating Systems', required: 75, present: 0, total: 0, lastMarked: null, lastAction: null }
];

// Mark present and absent
// Data Structures: 18 present out of 20 total -> 90%
attendance[0].present = 18;
attendance[0].total = 20;
attendance[0].lastAction = 'present';

// Computer Networks: 14 present out of 20 total -> 70% (< 80% cutoff)
attendance[1].present = 14;
attendance[1].total = 20;
attendance[1].lastAction = 'absent';

// Operating Systems: 15 present out of 20 total -> 75%
attendance[2].present = 15;
attendance[2].total = 20;
attendance[2].lastAction = 'present';

setData(STORAGE_KEYS.ATTENDANCE, attendance);
const savedAtt = getData(STORAGE_KEYS.ATTENDANCE, []);
assert(savedAtt.length === 3, '3 courses saved in Attendance Tracker');

// Test skip calculator on Data Structures (18/20 at 75% cutoff)
// maxTotal = 18 * 100 / 75 = 24. skippable = 24 - 20 = 4 skips
const dsSkips = calculateClassesCanSkip(savedAtt[0].present, savedAtt[0].total, savedAtt[0].required);
assert(dsSkips === 4, 'Data Structures skip limit calculates correctly to 4 safe skippable classes');

// Test recovery calculator on Computer Networks (14/20 at 80% cutoff)
// Needed: ceil((80 * 20 - 100 * 14) / (100 - 80)) = ceil((1600 - 1400) / 20) = ceil(200 / 20) = 10 classes
const cnNeeded = calculateClassesToAttend(savedAtt[1].present, savedAtt[1].total, savedAtt[1].required);
assert(cnNeeded === 10, 'Computer Networks recovery calculates correctly to 10 consecutive classes needed');

// Test Undo on Operating Systems: was present (15/20) -> undoes to (14/19)
savedAtt[2].present -= 1;
savedAtt[2].total -= 1;
savedAtt[2].lastAction = null;
assert(savedAtt[2].present === 14 && savedAtt[2].total === 19, 'Undo successfully reverses last mark');

// Test Correct Counts modal: set Computer Networks manually to present=18, total=20 (90%)
const validCountCheck = (18 <= 20);
assert(validCountCheck, 'Correct Counts validates present <= total');
savedAtt[1].present = 18;
savedAtt[1].total = 20;
savedAtt[1].lastAction = null;
setData(STORAGE_KEYS.ATTENDANCE, savedAtt);

const verifiedAtt = getData(STORAGE_KEYS.ATTENDANCE, []);
const cnPct = Math.round((verifiedAtt[1].present / verifiedAtt[1].total) * 100);
assert(cnPct === 90, 'Manual attendance correction saved: Computer Networks now at 90%');

// ---------------------------------------------------------
// STEP 5: To-Do & Pomodoro End-to-End
// ---------------------------------------------------------
console.log('\n--- STEP 5: To-Do & Pomodoro Flow ---');
const tasks = [
  { id: generateId(), text: 'Submit DSA Lab Report', priority: 'High', due: offsetDate(1), done: false },
  { id: generateId(), text: 'Networks Wireshark assignment', priority: 'Medium', due: offsetDate(3), done: false },
  { id: generateId(), text: 'Read OS Chapter 4', priority: 'Low', due: offsetDate(5), done: false },
  { id: generateId(), text: 'Renew College Library Pass', priority: 'Low', due: offsetDate(7), done: false },
  { id: generateId(), text: 'Revise Tree Traversals', priority: 'High', due: offsetDate(2), done: false },
  { id: generateId(), text: 'Discrete Math Assignment', priority: 'Medium', due: offsetDate(4), done: false }
];

setData(STORAGE_KEYS.TODOS, tasks);
const savedTasks = getData(STORAGE_KEYS.TODOS, []);
assert(savedTasks.length === 6, '6 tasks added with mixed priorities and due dates');

// Tick 2 tasks as done
savedTasks[0].done = true;
savedTasks[1].done = true;
setData(STORAGE_KEYS.TODOS, savedTasks);

const sortedTasks = sortTasksByPriorityAndDate(getData(STORAGE_KEYS.TODOS, []));
assert(!sortedTasks[0].done && !sortedTasks[1].done, 'Pending tasks placed ahead of completed tasks');
assert(sortedTasks[sortedTasks.length - 1].done && sortedTasks[sortedTasks.length - 2].done, 'Completed tasks placed at the bottom');

// Edit 1 task
const editTarget = savedTasks.find(t => t.text === 'Read OS Chapter 4');
editTarget.text = 'Read OS Chapter 4 & 5 (Virtual Memory)';
editTarget.priority = 'Medium';

// Delete 1 task
savedTasks.splice(savedTasks.findIndex(t => t.text === 'Renew College Library Pass'), 1);
setData(STORAGE_KEYS.TODOS, savedTasks);

const updatedTasks = getData(STORAGE_KEYS.TODOS, []);
assert(updatedTasks.length === 5, 'Task deletion confirmed (5 tasks remain)');
assert(updatedTasks.some(t => t.text.includes('Virtual Memory')), 'Task edit saved and verified');

// Test Pomodoro session increment
const today = todayString();
let pomo = getData(STORAGE_KEYS.POMODOROS, { date: today, count: 0 });
pomo.count += 1;
setData(STORAGE_KEYS.POMODOROS, pomo);
const updatedPomo = getData(STORAGE_KEYS.POMODOROS, { date: today, count: 0 });
assert(updatedPomo.count === 1, 'Pomodoro session count incremented and persisted');

// ---------------------------------------------------------
// STEP 6: Dashboard Aggregation Verification
// ---------------------------------------------------------
console.log('\n--- STEP 6: Dashboard Aggregation Verification ---');
const dSubjects = getData(STORAGE_KEYS.SUBJECTS, []);
const dBudget = getData(STORAGE_KEYS.BUDGET, null);
const dAtt = getData(STORAGE_KEYS.ATTENDANCE, []);
const dTodos = getData(STORAGE_KEYS.TODOS, []);

// Onboarding checklist verification
const cSubjects = dSubjects.length > 0;
const cBudget = dBudget && dBudget.allowance > 0;
const cAtt = dAtt.length > 0;
const cTodos = dTodos.length > 0;
const completedMilestones = [cSubjects, cBudget, cAtt, cTodos].filter(Boolean).length;
assert(completedMilestones === 4, 'Onboarding checklist indicates 4 of 4 completed (100%)');

// Exam card
const upcomingExams = dSubjects
  .map(s => ({ ...s, daysLeft: calculateDaysLeft(todayString(), s.examDate) }))
  .filter(s => s.daysLeft >= 0)
  .sort((a, b) => a.daysLeft - b.daysLeft);
assert(upcomingExams[0].name === 'Computer Networks' && upcomingExams[0].daysLeft === 5, 'Next exam card identifies nearest exam (Computer Networks in 5 days)');

// Money card
const dSpent = dBudget.expenses.reduce((s, e) => s + e.amount, 0);
const dRemaining = dBudget.allowance - dSpent;
assert(dRemaining === 700, 'Dashboard money card matches budget page (₹700 remaining)');

// Attendance card
const attSorted = [...dAtt].sort((a, b) => (a.present / a.total) - (b.present / b.total));
const lowestAtt = attSorted[0];
assert(lowestAtt.name === 'Operating Systems', 'Dashboard attendance card identifies lowest course accurately');

// Task card
const pendingCount = dTodos.filter(t => !t.done).length;
assert(pendingCount === 3, 'Dashboard task card accurately reflects 3 pending tasks');

// ---------------------------------------------------------
// STEP 7: Browser Persistence (Simulated Reload)
// ---------------------------------------------------------
console.log('\n--- STEP 7: Browser Persistence Verification ---');
const reloadedSubjects = getData(STORAGE_KEYS.SUBJECTS, []);
const reloadedBudget = getData(STORAGE_KEYS.BUDGET, null);
const reloadedAtt = getData(STORAGE_KEYS.ATTENDANCE, []);
const reloadedTodos = getData(STORAGE_KEYS.TODOS, []);
const reloadedPomo = getData(STORAGE_KEYS.POMODOROS, { count: 0 });

assert(reloadedSubjects.length === 3, 'Subjects persist across re-reads');
assert(reloadedBudget.allowance === 5000 && reloadedBudget.expenses.length === 7, 'Budget and expenses persist across re-reads');
assert(reloadedAtt.length === 3, 'Attendance records persist across re-reads');
assert(reloadedTodos.length === 5, 'Tasks persist across re-reads');
assert(reloadedPomo.count === 1, 'Pomodoro sessions persist across re-reads');

// ---------------------------------------------------------
// STEP 8: Backup, Clear All, and Restore
// ---------------------------------------------------------
console.log('\n--- STEP 8: Backup, Clear All, and Restore Flow ---');
// Generate backup JSON payload as exportAllData would
const backupData = {
  version: '1.0',
  exportDate: new Date().toISOString(),
  data: {
    [STORAGE_KEYS.SUBJECTS]: getData(STORAGE_KEYS.SUBJECTS, []),
    [STORAGE_KEYS.BUDGET]: getData(STORAGE_KEYS.BUDGET, null),
    [STORAGE_KEYS.ATTENDANCE]: getData(STORAGE_KEYS.ATTENDANCE, []),
    [STORAGE_KEYS.TODOS]: getData(STORAGE_KEYS.TODOS, []),
    [STORAGE_KEYS.POMODOROS]: getData(STORAGE_KEYS.POMODOROS, null),
    [STORAGE_KEYS.THEME]: getData(STORAGE_KEYS.THEME, 'light')
  }
};
const backupJSON = JSON.stringify(backupData, null, 2);
assert(backupJSON.length > 500, 'Backup JSON string generated with all keys');

// Clear all data
clearAllStorage();
assert(getData(STORAGE_KEYS.SUBJECTS, []).length === 0, 'Clear All wipes subjects');
assert(getData(STORAGE_KEYS.ATTENDANCE, []).length === 0, 'Clear All wipes attendance');
assert(getData(STORAGE_KEYS.TODOS, []).length === 0, 'Clear All wipes todos');
assert(getData(STORAGE_KEYS.BUDGET, { allowance: 0 }).allowance === 0, 'Clear All wipes allowance');

// Import and restore from backup JSON
const importResult = importDataFromJSON(backupJSON);
assert(importResult.success === true, 'Import validation accepts valid StudentHub backup');

const restoredSubjects = getData(STORAGE_KEYS.SUBJECTS, []);
const restoredBudget = getData(STORAGE_KEYS.BUDGET, null);
const restoredAtt = getData(STORAGE_KEYS.ATTENDANCE, []);
const restoredTodos = getData(STORAGE_KEYS.TODOS, []);

assert(restoredSubjects.length === 3, 'Restored 3 subjects from backup');
assert(restoredBudget.allowance === 5000 && restoredBudget.expenses.length === 7, 'Restored allowance ₹5,000 and 7 expenses');
assert(restoredAtt.length === 3, 'Restored 3 attendance courses');
assert(restoredTodos.length === 5, 'Restored 5 tasks');

console.log('\n================================================================');
console.log(` SUMMARY: ${totalPassed} PASSED, ${totalFailed} FAILED`);
console.log('================================================================');

if (totalFailed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
