/**
 * StudentHub — Exam Planner Logic (planner.js)
 * Manages subjects, syllabus topic checklists, and auto-generates
 * day-wise study plans distributed evenly until exam day.
 * Supports full CRUD (Add, Edit, Delete subjects and topics) with validation.
 */

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

let subjectSortOrder = 'nearest'; // 'nearest' | 'alpha'

document.addEventListener('DOMContentLoaded', () => {
  initExamDateMin();
  wireFormValidations();
  setupAddSubjectForm();
  setupEditModals();
  setupSortControl();
  renderSubjects();
});

/**
 * Sets min date to today on date inputs
 */
function initExamDateMin() {
  const today = todayString();
  const examDateInput = document.getElementById('examDate');
  const editExamDateInput = document.getElementById('editExamDate');
  if (examDateInput) examDateInput.min = today;
  if (editExamDateInput) editExamDateInput.min = today;
}

/**
 * Wires auto-clearing for inline field errors as user types
 */
function wireFormValidations() {
  wireFieldAutoClear('subjectName');
  wireFieldAutoClear('examDate');
  wireFieldAutoClear('editSubjectName');
  wireFieldAutoClear('editExamDate');
  wireFieldAutoClear('editTopicTitle');
}

/**
 * Sets up sort dropdown listener
 */
function setupSortControl() {
  const sortSelect = document.getElementById('subjectSortSelect');
  if (sortSelect) {
    sortSelect.value = subjectSortOrder;
    sortSelect.addEventListener('change', () => {
      subjectSortOrder = sortSelect.value;
      renderSubjects();
    });
  }
}

/**
 * Handles adding a new subject with strict validation
 */
function setupAddSubjectForm() {
  const form = document.getElementById('addSubjectForm');
  if (!form) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    clearFieldError('subjectName');
    clearFieldError('examDate');

    const nameInput = document.getElementById('subjectName');
    const dateInput = document.getElementById('examDate');

    const name = nameInput.value.trim();
    const examDate = dateInput.value;
    const today = todayString();

    // 1. Validation: Name required
    if (!name) {
      showFieldError('subjectName', 'Subject name is required.');
      showToast('Please enter a subject name', 'error');
      return;
    }

    if (name.length > 60) {
      showFieldError('subjectName', 'Subject name must be 60 characters or fewer.');
      showToast('Subject name too long', 'error');
      return;
    }

    // 2. Validation: Duplicate name check (case-insensitive)
    const subjects = getData(STORAGE_KEYS.SUBJECTS, []);
    const isDuplicate = subjects.some(s => s.name.toLowerCase() === name.toLowerCase());
    if (isDuplicate) {
      showFieldError('subjectName', 'A subject with this name already exists.');
      showToast('Duplicate subject name', 'error');
      return;
    }

    // 3. Validation: Exam date required & not in past
    if (!examDate) {
      showFieldError('examDate', 'Please select an exam date.');
      showToast('Exam date is required', 'error');
      return;
    }

    if (calculateDaysLeft(today, examDate) < 0) {
      showFieldError('examDate', 'Exam date cannot be in the past.');
      showToast('Exam date cannot be in the past', 'error');
      return;
    }

    // Create & persist
    const newSubject = {
      id: generateId(),
      name: name,
      examDate: examDate,
      topics: []
    };

    subjects.push(newSubject);
    setData(STORAGE_KEYS.SUBJECTS, subjects);

    form.reset();
    initExamDateMin();
    nameInput.focus();
    showToast(`Subject "${name}" added!`, 'success');
    renderSubjects();
  });
}

/**
 * Renders all subjects with study plans and controls
 */
function renderSubjects() {
  const container = document.getElementById('subjectsContainer');
  if (!container) return;

  const subjects = getData(STORAGE_KEYS.SUBJECTS, []);
  const today = todayString();

  if (subjects.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <span class="empty-icon">📚</span>
        <h3 style="margin-bottom: 6px; font-size: 1.1rem;">No subjects added yet</h3>
        <p class="empty-text">Add your first semester course on the left to generate an automatic daily study schedule!</p>
      </div>
    `;
    return;
  }

  // Sort subjects
  const sorted = [...subjects].sort((a, b) => {
    if (subjectSortOrder === 'alpha') {
      return a.name.localeCompare(b.name);
    }
    // Default 'nearest'
    return calculateDaysLeft(today, a.examDate) - calculateDaysLeft(today, b.examDate);
  });

  container.innerHTML = sorted.map(sub => renderSubjectCard(sub, today)).join('');
  bindSubjectEvents();
}

/**
 * Generates HTML for an individual subject card
 */
function renderSubjectCard(sub, today) {
  const daysLeft = calculateDaysLeft(today, sub.examDate);
  const isPassed = daysLeft < 0;

  // Days left badge styling
  let badgeClass = 'badge-low';
  let badgeText = `${daysLeft} days left`;

  if (isPassed) {
    badgeClass = 'badge-neutral';
    badgeText = 'Exam passed';
  } else if (daysLeft === 0) {
    badgeClass = 'badge-high';
    badgeText = 'Today!';
  } else if (daysLeft <= 3) {
    badgeClass = 'badge-high';
    badgeText = `${daysLeft} days left`;
  } else if (daysLeft <= 7) {
    badgeClass = 'badge-medium';
    badgeText = `${daysLeft} days left`;
  }

  // Topics completion calculation
  const topics = Array.isArray(sub.topics) ? sub.topics : [];
  const totalTopics = topics.length;
  const completedTopics = topics.filter(t => t.done).length;
  const pct = totalTopics === 0 ? 0 : Math.round((completedTopics / totalTopics) * 100);

  // Generate study plan if exam is upcoming
  let studyPlanHtml = '';
  if (!isPassed) {
    studyPlanHtml = generateStudyPlanHTML(sub, today, daysLeft);
  } else {
    studyPlanHtml = `
      <div style="padding: 12px; background-color: var(--bg); border-radius: var(--radius-md); font-size: 0.88rem; color: var(--muted); margin-top: 16px;">
        This exam date has passed. Good job completing the term!
      </div>
    `;
  }

  return `
    <article class="card" data-subject-id="${sub.id}" style="margin-bottom: 20px;">
      <div class="card-title">
        <div>
          <h3 style="font-size: 1.25rem;">${escapeHTML(sub.name)}</h3>
          <span style="font-size: 0.85rem; color: var(--muted);">📅 Exam Date: <strong>${escapeHTML(sub.examDate)}</strong></span>
        </div>
        <div style="display: flex; align-items: center; gap: 8px;">
          <span class="badge ${badgeClass}">${badgeText}</span>
          <button class="btn btn-secondary btn-sm edit-subject-btn" data-sub-id="${sub.id}" title="Edit subject name or exam date">
            ✏️ Edit
          </button>
        </div>
      </div>

      <!-- Topic Progress Bar -->
      <div style="margin: 14px 0 6px 0;">
        <div style="display: flex; justify-content: space-between; font-size: 0.85rem; color: var(--muted); margin-bottom: 4px;">
          <span>Syllabus Completion</span>
          <span>${pct}% (${completedTopics}/${totalTopics} topics)</span>
        </div>
        <div class="progress">
          <div class="progress-fill fill-success" style="width: ${pct}%;"></div>
        </div>
      </div>

      <!-- Topics Checklist -->
      <div style="margin-top: 16px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
          <h4 style="font-size: 0.95rem;">Topics Checklist (${completedTopics}/${totalTopics})</h4>
        </div>

        <ul style="list-style: none; margin-bottom: 12px;" class="item-list">
          ${topics.length === 0 ? '<li style="font-size: 0.85rem; color: var(--muted); padding: 8px; background-color: var(--bg); border-radius: var(--radius-sm);">No topics added yet. Add syllabus topics below!</li>' : ''}
          ${topics.map(tp => `
            <li style="display: flex; align-items: center; justify-content: space-between; padding: 7px 10px; background-color: var(--bg); border-radius: var(--radius-sm); font-size: 0.88rem; gap: 8px;">
              <label style="display: flex; align-items: center; gap: 10px; cursor: pointer; flex: 1; min-width: 0;">
                <input type="checkbox" class="topic-checkbox" data-sub-id="${sub.id}" data-topic-id="${tp.id}" ${tp.done ? 'checked' : ''} style="width: 17px; height: 17px;">
                <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap; ${tp.done ? 'text-decoration: line-through; color: var(--muted);' : ''}">
                  ${escapeHTML(tp.title)}
                </span>
              </label>
              <div style="display: flex; align-items: center; gap: 4px;">
                <button class="btn btn-secondary btn-sm edit-topic-btn" data-sub-id="${sub.id}" data-topic-id="${tp.id}" title="Edit Topic Name" style="padding: 2px 7px; min-height: 26px; font-size: 0.75rem;">✏️</button>
                <button class="btn btn-secondary btn-sm delete-topic-btn" data-sub-id="${sub.id}" data-topic-id="${tp.id}" title="Delete Topic" style="padding: 2px 7px; min-height: 26px; font-size: 0.75rem;">✕</button>
              </div>
            </li>
          `).join('')}
        </ul>

        <!-- Add Topic Form -->
        <form class="add-topic-form" data-sub-id="${sub.id}" style="display: flex; gap: 8px; margin-bottom: 16px;">
          <input type="text" class="input topic-title-input" placeholder="Add topic (e.g. Graph Algorithms)..." maxlength="80" style="font-size: 0.88rem;" required>
          <button type="submit" class="btn btn-secondary btn-sm" style="white-space: nowrap;">Add Topic</button>
        </form>
      </div>

      <!-- Auto Study Plan Section -->
      ${studyPlanHtml}

      <!-- Subject Footer Actions -->
      <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 20px; padding-top: 14px; border-top: 1px solid var(--border);">
        <button class="btn btn-secondary btn-sm reschedule-btn" data-sub-id="${sub.id}" title="Recalculate topic distribution over remaining days">
          <span>🔄</span> Reschedule Plan
        </button>
        <button class="btn btn-danger btn-sm delete-subject-btn" data-sub-id="${sub.id}">
          <span>🗑️</span> Delete Subject
        </button>
      </div>
    </article>
  `;
}

/**
 * Builds the day-wise study schedule by distributing unfinished topics
 */
function generateStudyPlanHTML(sub, today, daysLeft) {
  const topics = Array.isArray(sub.topics) ? sub.topics : [];
  const unfinishedTopics = topics.filter(t => !t.done);

  if (unfinishedTopics.length === 0) {
    return `
      <div class="plan-day" style="border-left-color: var(--success); margin-top: 16px;">
        <div class="plan-day-title" style="color: var(--success);">🎉 All Topics Completed!</div>
        <p style="font-size: 0.85rem; color: var(--muted);">You have finished all topics for this subject. Review notes and relax!</p>
      </div>
    `;
  }

  // Days available until day BEFORE exam (minimum 1 day)
  const daysUntilDayBefore = daysLeft <= 1 ? 1 : daysLeft - 1;
  const daysAvailable = Math.max(1, daysUntilDayBefore);

  const topicsPerDay = calculateStudyPlanDistribution(unfinishedTopics.length, daysAvailable);

  const dayBuckets = [];
  let topicIdx = 0;

  for (let d = 0; d < daysAvailable && topicIdx < unfinishedTopics.length; d++) {
    const bucketDate = new Date();
    bucketDate.setDate(bucketDate.getDate() + d);

    const dateFormatted = bucketDate.toLocaleDateString('en-IN', {
      weekday: 'short',
      day: 'numeric',
      month: 'short'
    });

    const dailyTopics = [];
    for (let count = 0; count < topicsPerDay && topicIdx < unfinishedTopics.length; count++) {
      dailyTopics.push(unfinishedTopics[topicIdx]);
      topicIdx++;
    }

    dayBuckets.push({
      dayNumber: d + 1,
      dateFormatted: dateFormatted,
      topics: dailyTopics
    });
  }

  return `
    <div style="margin-top: 16px;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
        <h4 style="font-size: 0.95rem;">📅 Auto Study Plan (${topicsPerDay} ${topicsPerDay === 1 ? 'topic' : 'topics'}/day over ${dayBuckets.length} ${dayBuckets.length === 1 ? 'day' : 'days'})</h4>
      </div>
      <div class="study-plan-list">
        ${dayBuckets.map(b => `
          <div class="plan-day">
            <div class="plan-day-title">Day ${b.dayNumber} (${b.dateFormatted}):</div>
            <ul class="plan-topics-list">
              ${b.topics.map(t => `<li>• ${escapeHTML(t.title)}</li>`).join('')}
            </ul>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

/**
 * Wires events for cards, checkboxes, topics, and buttons
 */
function bindSubjectEvents() {
  // Topic checkbox toggle
  document.querySelectorAll('.topic-checkbox').forEach(cb => {
    cb.addEventListener('change', (e) => {
      const subId = e.target.getAttribute('data-sub-id');
      const topicId = e.target.getAttribute('data-topic-id');
      toggleTopicDone(subId, topicId, e.target.checked);
    });
  });

  // Edit subject
  document.querySelectorAll('.edit-subject-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const subId = btn.getAttribute('data-sub-id');
      openEditSubjectModal(subId);
    });
  });

  // Delete subject
  document.querySelectorAll('.delete-subject-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const subId = btn.getAttribute('data-sub-id');
      deleteSubject(subId);
    });
  });

  // Add topic form submit
  document.querySelectorAll('.add-topic-form').forEach(form => {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const subId = form.getAttribute('data-sub-id');
      const input = form.querySelector('.topic-title-input');
      const title = input.value.trim();
      if (title) {
        addTopicToSubject(subId, title);
        input.value = '';
      }
    });
  });

  // Edit topic name
  document.querySelectorAll('.edit-topic-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const subId = btn.getAttribute('data-sub-id');
      const topicId = btn.getAttribute('data-topic-id');
      openEditTopicModal(subId, topicId);
    });
  });

  // Delete topic
  document.querySelectorAll('.delete-topic-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const subId = btn.getAttribute('data-sub-id');
      const topicId = btn.getAttribute('data-topic-id');
      deleteTopic(subId, topicId);
    });
  });

  // Reschedule button
  document.querySelectorAll('.reschedule-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      renderSubjects();
      showToast('Study schedule recalculated and re-spread!', 'info');
    });
  });
}

/**
 * Toggles topic completion
 */
function toggleTopicDone(subId, topicId, isDone) {
  const subjects = getData(STORAGE_KEYS.SUBJECTS, []);
  const sub = subjects.find(s => s.id === subId);
  if (!sub) return;

  const topic = sub.topics.find(t => t.id === topicId);
  if (!topic) return;

  topic.done = isDone;
  setData(STORAGE_KEYS.SUBJECTS, subjects);
  renderSubjects();
  showToast(isDone ? 'Topic marked finished! Plan updated.' : 'Topic marked unfinished.', 'info');
}

/**
 * Adds a topic with duplicate checking
 */
function addTopicToSubject(subId, title) {
  const subjects = getData(STORAGE_KEYS.SUBJECTS, []);
  const sub = subjects.find(s => s.id === subId);
  if (!sub) return;

  if (!Array.isArray(sub.topics)) sub.topics = [];

  const exists = sub.topics.some(t => t.title.toLowerCase() === title.toLowerCase());
  if (exists) {
    showToast(`Topic "${title}" already exists in this subject`, 'error');
    return;
  }

  sub.topics.push({
    id: generateId(),
    title: title,
    done: false
  });

  setData(STORAGE_KEYS.SUBJECTS, subjects);
  renderSubjects();
  showToast(`Added topic: "${title}"`, 'success');
}

/**
 * Deletes a topic
 */
function deleteTopic(subId, topicId) {
  const subjects = getData(STORAGE_KEYS.SUBJECTS, []);
  const sub = subjects.find(s => s.id === subId);
  if (!sub) return;

  sub.topics = sub.topics.filter(t => t.id !== topicId);
  setData(STORAGE_KEYS.SUBJECTS, subjects);
  renderSubjects();
  showToast('Topic deleted.', 'info');
}

/**
 * Deletes a subject with confirmation
 */
function deleteSubject(subId) {
  const subjects = getData(STORAGE_KEYS.SUBJECTS, []);
  const sub = subjects.find(s => s.id === subId);
  if (!sub) return;

  const confirmed = confirm(`Are you sure you want to delete "${sub.name}" and all its study plans?`);
  if (confirmed) {
    const updated = subjects.filter(s => s.id !== subId);
    setData(STORAGE_KEYS.SUBJECTS, updated);
    renderSubjects();
    showToast(`Deleted subject "${sub.name}"`, 'info');
  }
}

/**
 * Sets up Edit Subject and Edit Topic modals
 */
function setupEditModals() {
  // Close buttons
  const closeSubModalBtn = document.getElementById('closeEditSubjectModalBtn');
  const cancelSubModalBtn = document.getElementById('cancelEditSubjectBtn');
  if (closeSubModalBtn) closeSubModalBtn.addEventListener('click', () => closeModal('editSubjectModal'));
  if (cancelSubModalBtn) cancelSubModalBtn.addEventListener('click', () => closeModal('editSubjectModal'));

  const closeTopicModalBtn = document.getElementById('closeEditTopicModalBtn');
  const cancelTopicModalBtn = document.getElementById('cancelEditTopicBtn');
  if (closeTopicModalBtn) closeTopicModalBtn.addEventListener('click', () => closeModal('editTopicModal'));
  if (cancelTopicModalBtn) cancelTopicModalBtn.addEventListener('click', () => closeModal('editTopicModal'));

  // Edit Subject Form Submit
  const editSubForm = document.getElementById('editSubjectForm');
  if (editSubForm) {
    editSubForm.addEventListener('submit', (e) => {
      e.preventDefault();
      clearFieldError('editSubjectName');
      clearFieldError('editExamDate');

      const id = document.getElementById('editSubjectId').value;
      const name = document.getElementById('editSubjectName').value.trim();
      const examDate = document.getElementById('editExamDate').value;
      const today = todayString();

      if (!name) {
        showFieldError('editSubjectName', 'Subject name is required.');
        return;
      }

      if (!examDate) {
        showFieldError('editExamDate', 'Exam date is required.');
        return;
      }

      if (calculateDaysLeft(today, examDate) < 0) {
        showFieldError('editExamDate', 'Exam date cannot be in the past.');
        return;
      }

      const subjects = getData(STORAGE_KEYS.SUBJECTS, []);
      // Check duplicate against other subjects
      const isDuplicate = subjects.some(s => s.id !== id && s.name.toLowerCase() === name.toLowerCase());
      if (isDuplicate) {
        showFieldError('editSubjectName', 'Another subject with this name already exists.');
        return;
      }

      const target = subjects.find(s => s.id === id);
      if (!target) return;

      target.name = name;
      target.examDate = examDate;
      setData(STORAGE_KEYS.SUBJECTS, subjects);

      closeModal('editSubjectModal');
      showToast(`Updated subject "${name}"`, 'success');
      renderSubjects();
    });
  }

  // Edit Topic Form Submit
  const editTopicForm = document.getElementById('editTopicForm');
  if (editTopicForm) {
    editTopicForm.addEventListener('submit', (e) => {
      e.preventDefault();
      clearFieldError('editTopicTitle');

      const subId = document.getElementById('editTopicSubId').value;
      const topicId = document.getElementById('editTopicId').value;
      const title = document.getElementById('editTopicTitle').value.trim();

      if (!title) {
        showFieldError('editTopicTitle', 'Topic title is required.');
        return;
      }

      const subjects = getData(STORAGE_KEYS.SUBJECTS, []);
      const sub = subjects.find(s => s.id === subId);
      if (!sub) return;

      const isDup = sub.topics.some(t => t.id !== topicId && t.title.toLowerCase() === title.toLowerCase());
      if (isDup) {
        showFieldError('editTopicTitle', 'Another topic with this title already exists in this subject.');
        return;
      }

      const topic = sub.topics.find(t => t.id === topicId);
      if (!topic) return;

      topic.title = title;
      setData(STORAGE_KEYS.SUBJECTS, subjects);

      closeModal('editTopicModal');
      showToast(`Updated topic to "${title}"`, 'success');
      renderSubjects();
    });
  }
}

function openEditSubjectModal(subId) {
  const subjects = getData(STORAGE_KEYS.SUBJECTS, []);
  const sub = subjects.find(s => s.id === subId);
  if (!sub) return;

  clearFieldError('editSubjectName');
  clearFieldError('editExamDate');

  document.getElementById('editSubjectId').value = sub.id;
  document.getElementById('editSubjectName').value = sub.name;
  document.getElementById('editExamDate').value = sub.examDate;

  openModal('editSubjectModal');
}

function openEditTopicModal(subId, topicId) {
  const subjects = getData(STORAGE_KEYS.SUBJECTS, []);
  const sub = subjects.find(s => s.id === subId);
  if (!sub) return;

  const topic = sub.topics.find(t => t.id === topicId);
  if (!topic) return;

  clearFieldError('editTopicTitle');

  document.getElementById('editTopicSubId').value = subId;
  document.getElementById('editTopicId').value = topicId;
  document.getElementById('editTopicTitle').value = topic.title;

  openModal('editTopicModal');
}
