/**
 * StudentHub — Self-Test Suite (tests.js)
 * Evaluates core mathematical and algorithmic functions against fixed test vectors,
 * including critical boundary and edge cases.
 * Loaded only on index.html.
 */

/**
 * Runs test cases, prints formatted console.table, and returns summary
 * @returns {{ total: number, passed: number, failed: number, results: Array }}
 */
function runTests() {
  const results = [];

  function test(id, algorithm, description, expected, actual) {
    const passed = JSON.stringify(expected) === JSON.stringify(actual);
    results.push({
      'Test ID': id,
      'Algorithm': algorithm,
      'Case Description': description,
      'Expected': JSON.stringify(expected),
      'Actual': JSON.stringify(actual),
      'Status': passed ? '✅ PASS' : '❌ FAIL'
    });
    return passed;
  }

  // --- 1. Attendance Skip Calculator (Algorithm 3) ---
  // Edge Case: 0 classes marked
  test(
    'TC-01',
    'Attendance Skip',
    '0 classes marked (0/0) -> cannot skip',
    0,
    calculateClassesCanSkip(0, 0, 75)
  );

  // Edge Case: 100% Attendance (10/10 present at 75% cutoff)
  // Floor((10 * 100 / 75) - 10) = Floor(13.333 - 10) = 3
  test(
    'TC-02',
    'Attendance Skip',
    '100% attendance (10/10) with 75% required -> 3 skips',
    3,
    calculateClassesCanSkip(10, 10, 75)
  );

  // Boundary Case: Exactly at required percentage (15/20 = 75%)
  // Floor((15 * 100 / 75) - 20) = Floor(20 - 20) = 0
  test(
    'TC-03',
    'Attendance Skip',
    'Exactly at cutoff (15/20 at 75%) -> 0 skips',
    0,
    calculateClassesCanSkip(15, 20, 75)
  );

  // --- 2. Attendance Recovery Calculator (Algorithm 4) ---
  // Edge Case: Below 75% cutoff (5/10 = 50%)
  // Ceil((75 * 10 - 100 * 5) / (100 - 75)) = Ceil(250 / 25) = 10 classes needed
  test(
    'TC-04',
    'Attendance Recovery',
    'Below cutoff (5/10 at 75%) -> attend next 10 in a row',
    10,
    calculateClassesToAttend(5, 10, 75)
  );

  // Boundary Case: Already above cutoff (8/10 = 80%)
  test(
    'TC-05',
    'Attendance Recovery',
    'Already above cutoff (8/10 at 75%) -> 0 classes needed',
    0,
    calculateClassesToAttend(8, 10, 75)
  );

  // --- 3. Days-left Countdown (Algorithm 6) ---
  // Edge Case: Exam tomorrow
  test(
    'TC-06',
    'Days-Left Countdown',
    'Exam tomorrow -> exactly 1 day left',
    1,
    calculateDaysLeft('2026-10-25', '2026-10-26')
  );

  // Edge Case: Exam today
  test(
    'TC-07',
    'Days-Left Countdown',
    'Exam date today -> 0 days left',
    0,
    calculateDaysLeft('2026-10-25', '2026-10-25')
  );

  // Edge Case: Exam in past
  test(
    'TC-08',
    'Days-Left Countdown',
    'Exam 3 days ago -> -3 days',
    -3,
    calculateDaysLeft('2026-10-25', '2026-10-22')
  );

  // --- 4. Safe-to-Spend Per Day (Algorithm 2) ---
  // Standard Positive Balance: 3000 remaining, 10 days left
  test(
    'TC-09',
    'Safe-to-Spend',
    'Positive balance (₹3000 / 10 days) -> ₹300/day',
    300,
    calculateSafeToSpend(3000, 10)
  );

  // Edge Case: Negative remaining balance (overspent)
  test(
    'TC-10',
    'Safe-to-Spend',
    'Negative remaining balance (-₹450 / 5 days) -> ₹0/day',
    0,
    calculateSafeToSpend(-450, 5)
  );

  // --- 5. Study Plan Distribution (Algorithm 1) ---
  // Ceil distribution: 7 topics in 3 days -> Ceil(7/3) = 3 topics/day
  test(
    'TC-11',
    'Study Plan Distribution',
    '7 unfinished topics over 3 days -> 3 topics/day',
    3,
    calculateStudyPlanDistribution(7, 3)
  );

  // Edge Case: 0 unfinished topics
  test(
    'TC-12',
    'Study Plan Distribution',
    '0 unfinished topics -> 0 topics/day',
    0,
    calculateStudyPlanDistribution(0, 4)
  );

  // --- 6. Task Sorting by Priority then Due Date (Algorithm 5) ---
  const sampleTasks = [
    { id: '1', text: 'Low task', priority: 'Low', due: '2026-10-28', done: false },
    { id: '2', text: 'High task later', priority: 'High', due: '2026-10-30', done: false },
    { id: '3', text: 'High task sooner', priority: 'High', due: '2026-10-26', done: false },
    { id: '4', text: 'Done task', priority: 'High', due: '2026-10-20', done: true }
  ];
  const sorted = sortTasksByPriorityAndDate(sampleTasks);
  const sortedIds = sorted.map(t => t.id);
  test(
    'TC-13',
    'Task Priority Sort',
    'High priority earlier due dates first, completed last',
    ['3', '2', '1', '4'],
    sortedIds
  );

  // --- 7. Pomodoro Timer Logic (Algorithm 7) ---
  const pomoStep = calculatePomodoroTimerStep(1500); // 25 minutes
  test(
    'TC-14',
    'Pomodoro Timer',
    '1500 seconds converts to 25:00 formatted display',
    '25:00',
    pomoStep.formatted
  );

  const pomoZero = calculatePomodoroTimerStep(0);
  test(
    'TC-15',
    'Pomodoro Timer',
    '0 seconds flags session as finished',
    true,
    pomoZero.isFinished
  );

  // --- 8. Category-wise Budget Chart Percentage (Algorithm 8) ---
  const sampleExpenses = [
    { id: 'e1', amount: 500, category: 'Food' },
    { id: 'e2', amount: 500, category: 'Food' },
    { id: 'e3', amount: 1000, category: 'Travel' }
  ];
  const categories = ['Food', 'Travel', 'Recharge', 'Study', 'Fun', 'Other'];
  const breakdown = calculateCategoryPercentages(sampleExpenses, categories);
  const foodPct = breakdown.find(b => b.category === 'Food').percentage;
  const travelPct = breakdown.find(b => b.category === 'Travel').percentage;
  test(
    'TC-16',
    'Category Budget Chart',
    'Food (₹1000/₹2000) = 50%, Travel (₹1000/₹2000) = 50%',
    { food: 50, travel: 50 },
    { food: foodPct, travel: travelPct }
  );

  // Print results table in developer console
  console.log('%cStudentHub Self-Test Verification Results', 'font-size: 14px; font-weight: bold; color: #5b5bf0;');
  console.table(results);

  const passedCount = results.filter(r => r.Status.includes('PASS')).length;
  const failedCount = results.length - passedCount;

  return {
    total: results.length,
    passed: passedCount,
    failed: failedCount,
    results: results
  };
}

// Wire the "Run self-tests" link on the dashboard footer
document.addEventListener('DOMContentLoaded', () => {
  const runTestsBtn = document.getElementById('runTestsBtn');
  if (runTestsBtn) {
    runTestsBtn.addEventListener('click', (e) => {
      e.preventDefault();
      const report = runTests();
      if (report.failed === 0) {
        showToast(`Self-tests: All ${report.passed}/${report.total} tests PASSED! Check F12 console.`, 'success');
      } else {
        showToast(`Self-tests: ${report.passed}/${report.total} passed (${report.failed} failed). Check F12 console.`, 'error');
      }
    });
  }
});
