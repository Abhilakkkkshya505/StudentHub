/**
 * StudentHub — Attendance Tracker Logic (attendance.js)
 * Tracks course-wise attendance, calculates skip tolerances,
 * recovery targets, provides one-click Present/Absent logging with Undo,
 * and allows manual count correction for prior attendance.
 * Supports full CRUD (Add, Edit, Correct Counts, Delete courses) with validation.
 */

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

document.addEventListener('DOMContentLoaded', () => {
  wireFieldValidations();
  setupAddAttendanceForm();
  setupModals();
  renderAttendanceList();
});

function wireFieldValidations() {
  wireFieldAutoClear('attSubjectName');
  wireFieldAutoClear('attRequiredPct');
  wireFieldAutoClear('editAttName');
  wireFieldAutoClear('editAttRequiredPct');
  wireFieldAutoClear('correctPresentInput');
  wireFieldAutoClear('correctTotalInput');
}

/**
 * Handles adding a new course with validation
 */
function setupAddAttendanceForm() {
  const form = document.getElementById('addAttendanceSubjectForm');
  if (!form) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    clearFieldError('attSubjectName');
    clearFieldError('attRequiredPct');

    const nameInput = document.getElementById('attSubjectName');
    const reqInput = document.getElementById('attRequiredPct');

    const name = nameInput.value.trim();
    const required = parseInt(reqInput.value, 10);

    // Validate Name
    if (!name) {
      showFieldError('attSubjectName', 'Course name is required.');
      showToast('Please enter a course name', 'error');
      return;
    }

    if (name.length > 60) {
      showFieldError('attSubjectName', 'Course name must be 60 characters or fewer.');
      return;
    }

    // Validate Duplicate
    const list = getData(STORAGE_KEYS.ATTENDANCE, []);
    const isDuplicate = list.some(c => c.name.toLowerCase() === name.toLowerCase());
    if (isDuplicate) {
      showFieldError('attSubjectName', 'A course with this name is already being tracked.');
      showToast('Duplicate course name', 'error');
      return;
    }

    // Validate Cutoff %
    if (isNaN(required) || required < 1 || required > 99) {
      showFieldError('attRequiredPct', 'Required cutoff must be between 1% and 99%.');
      showToast('Required attendance must be between 1% and 99%', 'error');
      return;
    }

    const newCourse = {
      id: generateId(),
      name: name,
      required: required,
      present: 0,
      total: 0,
      lastMarked: null,
      lastAction: null
    };

    list.push(newCourse);
    setData(STORAGE_KEYS.ATTENDANCE, list);

    form.reset();
    document.getElementById('attRequiredPct').value = '75';
    nameInput.focus();
    showToast(`Added course "${name}" with ${required}% cutoff`, 'success');
    renderAttendanceList();
  });
}

/**
 * Main renderer for course attendance cards and aggregate metric
 */
function renderAttendanceList() {
  const list = getData(STORAGE_KEYS.ATTENDANCE, []);
  renderOverallStats(list);

  const container = document.getElementById('attendanceCardsContainer');
  if (!container) return;

  if (list.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <span class="empty-icon">📊</span>
        <h3 style="margin-bottom: 6px; font-size: 1.1rem;">No courses tracked yet</h3>
        <p class="empty-text">Add your college subjects on the left to track your lecture attendance and safe bunk limits!</p>
      </div>
    `;
    return;
  }

  container.innerHTML = list.map(course => renderCourseCard(course)).join('');
  bindAttendanceCardEvents();
}

/**
 * Renders top overall aggregate attendance percentage
 */
function renderOverallStats(list) {
  const pctEl = document.getElementById('overallAttendancePct');
  const statsEl = document.getElementById('overallAttendanceStats');
  const fillEl = document.getElementById('overallAttendanceFill');
  const badgeContainer = document.getElementById('overallStatusBadgeContainer');

  if (list.length === 0) {
    if (pctEl) pctEl.textContent = '0%';
    if (statsEl) statsEl.textContent = '0 of 0 total classes attended';
    if (fillEl) fillEl.style.width = '0%';
    if (badgeContainer) badgeContainer.innerHTML = `<span class="badge badge-primary">No courses yet</span>`;
    return;
  }

  let totalPresent = 0;
  let totalClasses = 0;

  list.forEach(c => {
    totalPresent += Number(c.present) || 0;
    totalClasses += Number(c.total) || 0;
  });

  const aggregatePct = totalClasses === 0 ? 0 : Math.round((totalPresent / totalClasses) * 100);

  if (pctEl) pctEl.textContent = `${aggregatePct}%`;
  if (statsEl) statsEl.textContent = `${totalPresent} of ${totalClasses} total classes attended`;
  if (fillEl) fillEl.style.width = `${aggregatePct}%`;

  if (badgeContainer) {
    if (totalClasses === 0) {
      badgeContainer.innerHTML = `<span class="badge badge-neutral">No classes marked</span>`;
    } else if (aggregatePct >= 75) {
      badgeContainer.innerHTML = `<span class="badge badge-low">Safe (&ge; 75%)</span>`;
    } else if (aggregatePct >= 70) {
      badgeContainer.innerHTML = `<span class="badge badge-medium">Borderline Warning</span>`;
    } else {
      badgeContainer.innerHTML = `<span class="badge badge-high">Low Overall Attendance</span>`;
    }
  }
}

/**
 * Generates HTML for an individual course attendance card
 */
function renderCourseCard(course) {
  const present = Number(course.present) || 0;
  const total = Number(course.total) || 0;
  const required = Number(course.required) || 75;

  const pct = total === 0 ? 0 : Math.round((present / total) * 100);

  let badgeClass = 'badge-low';
  let badgeText = 'On Track';
  let numberColor = 'var(--text)';

  if (total === 0) {
    badgeClass = 'badge-neutral';
    badgeText = 'No Classes Yet';
  } else if (pct < required - 5) {
    badgeClass = 'badge-high';
    badgeText = 'Low Attendance';
    numberColor = 'var(--danger)';
  } else if (pct < required) {
    badgeClass = 'badge-medium';
    badgeText = 'Borderline';
    numberColor = 'var(--warning)';
  }

  let smartHintHtml = '';
  if (total === 0) {
    smartHintHtml = `<div style="font-size: 0.85rem; color: var(--muted);">No classes marked yet. Click "Present" or "Absent" to begin logging.</div>`;
  } else if (pct >= required) {
    const skippable = calculateClassesCanSkip(present, total, required);
    smartHintHtml = `
      <div style="font-size: 0.88rem; color: var(--success); font-weight: 500;">
        💡 You can safely skip <strong>${skippable}</strong> more ${skippable === 1 ? 'class' : 'classes'} and stay at &ge; ${required}%.
      </div>
    `;
  } else {
    const needed = calculateClassesToAttend(present, total, required);
    smartHintHtml = `
      <div style="font-size: 0.88rem; color: var(--danger); font-weight: 500;">
        ⚠️ Attend the next <strong>${needed}</strong> ${needed === 1 ? 'class' : 'classes'} in a row to reach ${required}%.
      </div>
    `;
  }

  return `
    <article class="card" data-course-id="${course.id}" style="margin-bottom: 20px;">
      <div class="card-title">
        <div>
          <h3 style="font-size: 1.25rem;">${escapeHTML(course.name)}</h3>
          <span style="font-size: 0.85rem; color: var(--muted);">Required cutoff: <strong>${required}%</strong></span>
        </div>
        <div style="display: flex; align-items: center; gap: 8px;">
          <span class="badge ${badgeClass}">${badgeText}</span>
          <button class="btn btn-secondary btn-sm edit-course-btn" data-course-id="${course.id}" title="Edit Course details">
            ✏️ Edit
          </button>
        </div>
      </div>

      <!-- Large Percentage & Classes Marked -->
      <div style="display: flex; justify-content: space-between; align-items: baseline; margin: 12px 0 6px 0;">
        <div class="card-number" style="color: ${numberColor};">
          ${total === 0 ? '0%' : pct + '%'}
        </div>
        <div style="font-size: 0.95rem; font-weight: 600; color: var(--muted);">
          ${present} / ${total} attended
        </div>
      </div>

      <!-- Visual Progress Bar -->
      <div class="progress">
        <div class="progress-fill ${total === 0 ? 'fill-success' : (pct >= required ? 'fill-success' : (pct >= required - 5 ? 'fill-warning' : 'fill-danger'))}"
             style="width: ${total === 0 ? 0 : pct}%;">
        </div>
      </div>

      <!-- Smart Advice Hint -->
      <div style="padding: 10px 14px; background-color: var(--bg); border-radius: var(--radius-md); margin: 12px 0;">
        ${smartHintHtml}
      </div>

      <!-- Action Buttons Row -->
      <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px; margin-top: 16px;">
        <div class="btn-group">
          <button class="btn btn-primary btn-sm mark-btn" data-action="present" data-course-id="${course.id}">
            <span>✅</span> Present
          </button>
          <button class="btn btn-secondary btn-sm mark-btn" data-action="absent" data-course-id="${course.id}">
            <span>❌</span> Absent
          </button>
          ${course.lastAction ? `
            <button class="btn btn-secondary btn-sm undo-btn" data-course-id="${course.id}" title="Reverse last mark">
              <span>↩️</span> Undo (${course.lastAction})
            </button>
          ` : ''}
          <button class="btn btn-secondary btn-sm correct-counts-btn" data-course-id="${course.id}" title="Manually adjust existing attendance">
            <span>⚙️</span> Correct counts
          </button>
        </div>

        <button class="btn btn-danger btn-sm delete-course-btn" data-course-id="${course.id}">
          <span>🗑️</span> Delete
        </button>
      </div>

      ${course.lastMarked ? `
        <div style="font-size: 0.78rem; color: var(--muted); margin-top: 10px; text-align: right;">
          Last recorded: ${escapeHTML(course.lastMarked)}
        </div>
      ` : ''}
    </article>
  `;
}

/**
 * Attaches event listeners to course cards
 */
function bindAttendanceCardEvents() {
  document.querySelectorAll('.mark-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const courseId = btn.getAttribute('data-course-id');
      const action = btn.getAttribute('data-action');
      markAttendance(courseId, action);
    });
  });

  document.querySelectorAll('.undo-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const courseId = btn.getAttribute('data-course-id');
      undoLastMark(courseId);
    });
  });

  document.querySelectorAll('.edit-course-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const courseId = btn.getAttribute('data-course-id');
      openEditCourseModal(courseId);
    });
  });

  document.querySelectorAll('.correct-counts-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const courseId = btn.getAttribute('data-course-id');
      openCorrectCountsModal(courseId);
    });
  });

  document.querySelectorAll('.delete-course-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const courseId = btn.getAttribute('data-course-id');
      deleteCourse(courseId);
    });
  });
}

function markAttendance(courseId, action) {
  const list = getData(STORAGE_KEYS.ATTENDANCE, []);
  const course = list.find(c => c.id === courseId);
  if (!course) return;

  course.total = (Number(course.total) || 0) + 1;
  if (action === 'present') {
    course.present = (Number(course.present) || 0) + 1;
  }
  course.lastMarked = todayString();
  course.lastAction = action;

  setData(STORAGE_KEYS.ATTENDANCE, list);
  renderAttendanceList();
  showToast(`Marked ${action} for "${course.name}"`, action === 'present' ? 'success' : 'info');
}

function undoLastMark(courseId) {
  const list = getData(STORAGE_KEYS.ATTENDANCE, []);
  const course = list.find(c => c.id === courseId);
  if (!course || !course.lastAction) return;

  if (course.lastAction === 'present') {
    course.present = Math.max(0, (course.present || 1) - 1);
    course.total = Math.max(0, (course.total || 1) - 1);
  } else if (course.lastAction === 'absent') {
    course.total = Math.max(0, (course.total || 1) - 1);
  }

  const undoneAction = course.lastAction;
  course.lastAction = null;

  setData(STORAGE_KEYS.ATTENDANCE, list);
  renderAttendanceList();
  showToast(`Reversed last ${undoneAction} entry for "${course.name}"`, 'info');
}

function deleteCourse(courseId) {
  const list = getData(STORAGE_KEYS.ATTENDANCE, []);
  const course = list.find(c => c.id === courseId);
  if (!course) return;

  const confirmed = confirm(`Are you sure you want to delete course "${course.name}"?`);
  if (!confirmed) return;

  const updated = list.filter(c => c.id !== courseId);
  setData(STORAGE_KEYS.ATTENDANCE, updated);
  renderAttendanceList();
  showToast(`Deleted course "${course.name}"`, 'info');
}

/**
 * Modals setup for Edit Course and Correct Counts
 */
function setupModals() {
  // Edit Course Modal
  const closeEditModalBtn = document.getElementById('closeEditAttModalBtn');
  const cancelEditModalBtn = document.getElementById('cancelEditAttBtn');
  const editForm = document.getElementById('editAttendanceForm');

  if (closeEditModalBtn) closeEditModalBtn.addEventListener('click', () => closeModal('editAttendanceModal'));
  if (cancelEditModalBtn) cancelEditModalBtn.addEventListener('click', () => closeModal('editAttendanceModal'));

  if (editForm) {
    editForm.addEventListener('submit', (e) => {
      e.preventDefault();
      clearFieldError('editAttName');
      clearFieldError('editAttRequiredPct');

      const id = document.getElementById('editAttId').value;
      const name = document.getElementById('editAttName').value.trim();
      const req = parseInt(document.getElementById('editAttRequiredPct').value, 10);

      if (!name) {
        showFieldError('editAttName', 'Course name is required.');
        return;
      }

      if (isNaN(req) || req < 1 || req > 99) {
        showFieldError('editAttRequiredPct', 'Cutoff must be between 1% and 99%.');
        return;
      }

      const list = getData(STORAGE_KEYS.ATTENDANCE, []);
      const isDup = list.some(c => c.id !== id && c.name.toLowerCase() === name.toLowerCase());
      if (isDup) {
        showFieldError('editAttName', 'Another course with this name already exists.');
        return;
      }

      const target = list.find(c => c.id === id);
      if (!target) return;

      target.name = name;
      target.required = req;

      setData(STORAGE_KEYS.ATTENDANCE, list);
      closeModal('editAttendanceModal');
      showToast(`Updated course "${name}"`, 'success');
      renderAttendanceList();
    });
  }

  // Correct Counts Modal
  const closeCorrectModalBtn = document.getElementById('closeCorrectCountsModalBtn');
  const cancelCorrectModalBtn = document.getElementById('cancelCorrectCountsBtn');
  const correctForm = document.getElementById('correctCountsForm');

  if (closeCorrectModalBtn) closeCorrectModalBtn.addEventListener('click', () => closeModal('correctCountsModal'));
  if (cancelCorrectModalBtn) cancelCorrectModalBtn.addEventListener('click', () => closeModal('correctCountsModal'));

  if (correctForm) {
    correctForm.addEventListener('submit', (e) => {
      e.preventDefault();
      clearFieldError('correctPresentInput');
      clearFieldError('correctTotalInput');

      const id = document.getElementById('correctCourseId').value;
      const present = parseInt(document.getElementById('correctPresentInput').value, 10);
      const total = parseInt(document.getElementById('correctTotalInput').value, 10);

      if (isNaN(present) || present < 0) {
        showFieldError('correctPresentInput', 'Present count must be 0 or greater.');
        return;
      }

      if (isNaN(total) || total < 0) {
        showFieldError('correctTotalInput', 'Total count must be 0 or greater.');
        return;
      }

      if (present > total) {
        showFieldError('correctPresentInput', 'Classes attended (Present) cannot exceed total classes conducted.');
        showToast('Attended count cannot exceed total classes', 'error');
        return;
      }

      const list = getData(STORAGE_KEYS.ATTENDANCE, []);
      const target = list.find(c => c.id === id);
      if (!target) return;

      target.present = present;
      target.total = total;
      target.lastAction = null; // Reset undo state after manual adjustment

      setData(STORAGE_KEYS.ATTENDANCE, list);
      closeModal('correctCountsModal');
      showToast(`Corrected attendance for "${target.name}": ${present}/${total}`, 'success');
      renderAttendanceList();
    });
  }
}

function openEditCourseModal(courseId) {
  const list = getData(STORAGE_KEYS.ATTENDANCE, []);
  const course = list.find(c => c.id === courseId);
  if (!course) return;

  clearFieldError('editAttName');
  clearFieldError('editAttRequiredPct');

  document.getElementById('editAttId').value = course.id;
  document.getElementById('editAttName').value = course.name;
  document.getElementById('editAttRequiredPct').value = course.required;

  openModal('editAttendanceModal');
}

function openCorrectCountsModal(courseId) {
  const list = getData(STORAGE_KEYS.ATTENDANCE, []);
  const course = list.find(c => c.id === courseId);
  if (!course) return;

  clearFieldError('correctPresentInput');
  clearFieldError('correctTotalInput');

  document.getElementById('correctCourseId').value = course.id;
  document.getElementById('correctPresentInput').value = course.present;
  document.getElementById('correctTotalInput').value = course.total;

  openModal('correctCountsModal');
}
