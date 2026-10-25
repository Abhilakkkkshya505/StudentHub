# PRD — StudentHub

## 1. Overview
StudentHub is an all-in-one, offline student productivity website. Students normally juggle separate apps and notebooks for exams, money, attendance and daily tasks. StudentHub puts them in one place.

- Stack: **HTML + CSS + vanilla JavaScript only**
- Storage: **localStorage only** (no backend, no database, no login, no API keys)
- Target: 1st-year college students in India
- Must be beginner-readable code (simple functions, clear names, comments)

## 2. Pages and Modules
1. **Dashboard (index.html)**: summary cards pulled from all other modules
2. **Exam Planner (planner.html)**
3. **Budget Tracker (budget.html)**
4. **Attendance Tracker (attendance.html)**
5. **To-Do + Pomodoro (todo.html)**

Shared navbar on every page (links to all 5 pages, active page highlighted, dark mode toggle).

## 3. Features per module

### Dashboard
- Greeting + today's date
- Card: next exam name + days left (red if <= 3 days)
- Card: money left this month + safe-to-spend per day
- Card: lowest-attendance subject, warning if below 75%
- Card: today's pending tasks count (+ top 3 tasks)
- Empty states with a "Get started" link if a module has no data yet

### Exam Planner
- Add subject with exam date; add topics under each subject
- Auto-generate a day-wise study plan from today until the exam date (spread unfinished topics evenly across remaining days)
- Tick topics as done; progress bar per subject
- Days-left countdown per subject
- "Reschedule" button: re-spreads unfinished topics over remaining days
- Delete subject/topic

### Budget Tracker
- Set monthly allowance
- Add expense: amount, category (Food, Travel, Recharge, Study, Fun, Other), date, note
- Show total spent, remaining balance, and **safe to spend per day** = remaining / days left in month
- Category-wise bar chart (pure CSS bars or canvas, no chart libraries)
- Warning banner when 80% of budget is spent
- Expense list with delete; month-wise history

### Attendance Tracker
- Add subject (name, optional required % default 75)
- Mark Present / Absent for today per subject
- Attendance % per subject with colored status (green >= 75, yellow 70-75, red < 70)
- Smart hint: "You can skip X more classes" or "Attend next Y classes to reach 75%"
- Reset/delete subject

### To-Do + Pomodoro
- Add task with priority (High / Medium / Low) and optional due date
- Mark done, delete, filter (All / Pending / Done)
- Pomodoro timer: 25 min focus / 5 min break, start, pause, reset, sound or alert at end
- Count of completed pomodoros today

## 4. localStorage keys (shared by all modules)
| Key | Shape |
|---|---|
| `sh_subjects` | `[{id, name, examDate, topics:[{id, title, done}]}]` |
| `sh_budget` | `{month:"YYYY-MM", allowance:number, expenses:[{id, amount, category, date, note}]}` |
| `sh_attendance` | `[{id, name, required, present, total}]` |
| `sh_todos` | `[{id, text, priority, due, done}]` |
| `sh_pomodoros` | `{date:"YYYY-MM-DD", count:number}` |
| `sh_theme` | `"light" or "dark"` |

All reads/writes go through `js/storage.js` helpers: `getData(key, fallback)`, `setData(key, value)`.

## 5. File structure
```
studenthub/
├── index.html
├── planner.html
├── budget.html
├── attendance.html
├── todo.html
├── css/style.css
└── js/
    ├── storage.js
    ├── common.js       (navbar active link, dark mode)
    ├── dashboard.js
    ├── planner.js
    ├── budget.js
    ├── attendance.js
    └── todo.js
```

## 6. Build order (do one step at a time)
1. `style.css`, `storage.js`, `common.js`, and the shared navbar
2. Budget Tracker
3. Attendance Tracker
4. Exam Planner
5. To-Do + Pomodoro
6. Dashboard (reads everything)
7. Dark mode, mobile fixes, empty states, polish
8. Add sample data button ("Load demo data") on the dashboard for easy demos

## 7. Acceptance criteria
- Works by just opening index.html (no server, no install)
- Data survives page refresh
- Every module has add, view, update/tick, delete
- Dashboard updates after changes in other modules
- Responsive down to 360px width
- No console errors
- Inputs validated (no empty or negative amounts, no past exam dates)

## 8. Nice-to-have (only if everything above works)
GPA/CGPA calculator, Lost & Found board, export data as JSON, print-friendly attendance report.
