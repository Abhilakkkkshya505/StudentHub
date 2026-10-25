# StudentHub 🎓
> An all-in-one, offline student productivity web platform built with Vanilla HTML5, CSS3, and JavaScript.

---

## 📌 Problem Statement
First-year college students struggle with cognitive overload from juggling multiple disconnected tools:
- One notebook or app for syllabus and exam preparation.
- Another app or spreadsheet for tracking monthly hostel/canteen expenses.
- Scattered notes for tracking mandatory attendance percentages and bunk limits.
- Separate generic to-do apps and Pomodoro timers with distracting ads and cloud sign-ups.

**StudentHub** solves this by unifying all core student workflows into a single, offline-first dashboard. It operates completely in the browser with **zero backend, zero databases, zero external tracking, and zero API keys**.

---

## 🚀 Features Per Module

### 1. 📊 Executive Dashboard (`index.html`)
- **Smart Greeting**: Dynamically adapts to local time of day (morning, afternoon, evening).
- **Exam Countdown Card**: Displays the nearest upcoming exam with countdown badges (turns red when &le; 3 days).
- **Monthly Budget Card**: Displays remaining allowance, % spent, and daily safe-to-spend limit.
- **Attendance Monitor**: Identifies the course with the lowest attendance and triggers red warnings if below required cutoff (e.g. 75%).
- **Task Overview**: Aggregates pending items, sorting the top 3 by priority and due date.
- **Quick Statistics**: Shows today's completed Pomodoro sessions and aggregate syllabus progress across all subjects.
- **Demo Mode**: One-click "Load demo data" pre-populates realistic Indian student scenarios (DSA, Physics, Maths, Canteen expenses, attendance warnings).
- **"How StudentHub Works" Panel**: Collapsible architecture and formula reference.

### 2. 📚 Exam Planner (`planner.html`)
- **Subject Management**: Add subjects with exam dates (past dates automatically blocked).
- **Syllabus Topic Tracking**: Add and tick off individual topics with live progress indicators.
- **Auto Study Plan Algorithm**: Evenly spreads unfinished topics across calendar days remaining before the exam (`topicsPerDay = ceil(unfinished / daysAvailable)`).
- **Dynamic Rescheduling**: Re-distributes remaining topics whenever an item is marked done or when the "Reschedule" button is clicked.
- **Exam Status Lifecycle**: Highlights upcoming exams (&le; 3 days red, &le; 7 days orange) and handles passed exams cleanly.

### 3. 💰 Budget Tracker (`budget.html`)
- **Allowance Setting**: User-defined monthly budget in Indian Rupees (₹).
- **Safe-to-Spend Per Day**: Computes daily spending allowance (`floor(remaining / daysLeftInMonth)`).
- **Warning Banners**: Triggers orange alert when 80% spent, and red warning when budget is exceeded.
- **Pure CSS Category Breakdown**: Visual proportion bar chart (Food, Travel, Recharge, Study, Fun, Other) without chart libraries.
- **Expense Logging**: Add expenses with date, category, amount, and optional notes.
- **Automatic Month Rollover & Archive**: Automatically archives past month records when the calendar month rolls over.

### 4. ✅ Attendance Tracker (`attendance.html`)
- **Course Setup**: Custom course names with customizable cutoff percentages (default 75%).
- **One-Click Logging**: Quick "Present" and "Absent" action buttons.
- **Undo Functionality**: Instant "Undo last" button to safely reverse mistaken taps.
- **Skip Calculator**: `floor(present * 100 / required - total)` informs exactly how many consecutive classes can be safely skipped.
- **Recovery Calculator**: `ceil((required * total - 100 * present) / (100 - required))` calculates the exact consecutive classes needed to return to good standing.
- **Multi-Level Badging**: Green (&ge; cutoff), Yellow (within 5% of cutoff), and Red (&lt; 5% below cutoff).

### 5. 📝 To-Do & Pomodoro Study Timer (`todo.html`)
- **Two-Tier Priority Sorting**: Prioritizes tasks by importance (High > Medium > Low) and earliest due dates.
- **Status Filters**: Quick toggles between All, Pending, and Done tasks.
- **Overdue Detection**: Red overdue badges for incomplete tasks past their deadline.
- **Integrated Pomodoro Engine**: 25-minute Focus and 5-minute Break cycles.
- **Web Audio API Synthesizer**: Synthesizes a gentle dual-frequency chime when sessions conclude—zero external audio files needed.
- **Document Title Countdown**: Live countdown in browser tab title.
- **Daily Pomodoro Counters**: Tracks completed focus sessions for the day.

---

## 🛠️ Tech Stack
- **Structure**: Semantic HTML5 (accessible landmarks, dialogs, details/summary, form inputs).
- **Styling**: Vanilla CSS3 (Custom Properties / CSS Variables for light & dark themes, flexbox, CSS grid, micro-animations, media queries down to 360px).
- **Typography**: Google Fonts (Poppins for headings, Inter for body) with system-ui fallbacks.
- **Logic & Storage**: Vanilla JavaScript (ES6+), localStorage abstraction with fallback error recovery.
- **Audio**: HTML5 Web Audio API synthesizer.
- **Zero Dependencies**: No React, Vue, Vite, Tailwind, Bootstrap, jQuery, npm, bundlers, or servers.

---

## 📂 Folder Structure
```
studenthub/
├── index.html            # Dashboard & system overview
├── planner.html          # Exam planner & study scheduler
├── budget.html           # Budget tracker & CSS spending chart
├── attendance.html       # Course attendance & skip/recovery calculators
├── todo.html             # Prioritized to-do list & Pomodoro timer
├── css/
│   └── style.css         # Complete design system & responsive styling
└── js/
    ├── storage.js        # Safe localStorage, date math, Algorithm 6
    ├── common.js         # Navbar, theme toggle, toast, escapeHTML, shared algorithms
    ├── dashboard.js      # Dashboard aggregation, demo data, reset
    ├── planner.js        # Exam planner logic, Algorithm 1
    ├── budget.js         # Budgeting logic, Algorithms 2 & 8
    ├── attendance.js     # Attendance tracking, Algorithms 3 & 4
    ├── todo.js           # Tasks & Pomodoro engine, Algorithms 5 & 7
    └── tests.js          # Built-in unit test suite (runs on index.html)
```

---

## 💻 How to Run

You can run StudentHub in either of two modes:

### Mode 1: With the Full Working Node.js Backend Server (Recommended)
1. Open a terminal inside the `studenthub/` directory:
   ```bash
   cd studenthub
   npm start
   # or: node server.js
   ```
2. Open your browser and navigate to:
   **[http://localhost:3000](http://localhost:3000)**
3. The server serves all pages and provides a full persistent REST API:
   - `GET /api/health` — Server health check
   - `GET /api/state` & `POST /api/state` — Full database sync
   - `GET /api/subjects`, `POST /api/subjects`, `DELETE /api/subjects/:id`
   - `GET /api/budget`, `POST /api/budget/allowance`, `POST /api/budget/expense`
   - `GET /api/attendance`, `POST /api/attendance/:id/mark`, `POST /api/attendance/:id/undo`
   - `GET /api/todos`, `POST /api/todos`, `PUT /api/todos/:id`, `DELETE /api/todos/:id`
   - `POST /api/demo` — Load demo database on the server
   - `POST /api/reset` — Clean database reset
   - Data is persisted to `data/database.json`.

### Mode 2: 100% Offline Static File Mode
Double-click `index.html` directly in your file explorer. The app uses `localStorage` with identical functionality without needing a server.

---

## 📸 Screenshots Section (Placeholders)
| View | Desktop Light Mode | Desktop Dark Mode | Mobile (360px) |
|---|---|---|---|
| **Dashboard** | `[Screenshot: index_light.png]` | `[Screenshot: index_dark.png]` | `[Screenshot: index_mobile.png]` |
| **Exam Planner** | `[Screenshot: planner_light.png]` | `[Screenshot: planner_dark.png]` | `[Screenshot: planner_mobile.png]` |
| **Budget Tracker** | `[Screenshot: budget_light.png]` | `[Screenshot: budget_dark.png]` | `[Screenshot: budget_mobile.png]` |
| **Attendance** | `[Screenshot: attendance_light.png]` | `[Screenshot: attendance_dark.png]` | `[Screenshot: attendance_mobile.png]` |
| **To-Do & Pomodoro** | `[Screenshot: todo_light.png]` | `[Screenshot: todo_dark.png]` | `[Screenshot: todo_mobile.png]` |

---

## ⚠️ Limitations
1. **Single-Device Storage**: Data is saved to the current browser's `localStorage` and does not automatically sync across devices.
2. **Tab Inactivity**: Browser background throttling may pause the Pomodoro timer tick if the tab is left inactive on certain mobile browsers.
3. **No Push Notifications**: Without a server or service worker, notifications are delivered via toasts and page titles rather than system push notifications.
4. **Cache/Storage Clearance**: Clearing browser history/site cookies will erase `localStorage` records unless backed up or reloaded with demo data.

---

## 🔮 Future Scope
- **Export & Import**: One-click JSON backup and restore to easily transfer data between laptops and mobile phones.
- **Print / PDF Attendance Slip**: Formatted printable attendance report for academic advisor meetings.
- **CGPA / GPA Predictor**: Grade calculation module estimating semester GPA based on subject credits.
- **PWA Support**: Web App Manifest and Service Worker for full standalone mobile app installation.
- **Calendar (.ics) Export**: Export generated study plans and exam dates directly to Google Calendar or Apple Calendar.
