/**
 * StudentHub — Full Working Backend Server
 * Built with standard Node.js HTTP & File System modules.
 * Features:
 *   - RESTful API endpoints for all 5 modules (Exams, Budget, Attendance, Tasks, Pomodoros)
 *   - Persistent file database storage (data/database.json)
 *   - Static asset server with MIME type resolution and caching headers
 *   - CORS support for local development
 *   - Zero npm dependencies required: runs immediately with `node server.js`!
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'database.json');
const PUBLIC_DIR = __dirname;

// MIME type dictionary
const MIME_TYPES = {
  '.html': 'text/html; charset=UTF-8',
  '.css': 'text/css; charset=UTF-8',
  '.js': 'application/javascript; charset=UTF-8',
  '.json': 'application/json; charset=UTF-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

// Initial database schema
const DEFAULT_DB = {
  subjects: [],
  budget: {
    month: new Date().toISOString().slice(0, 7),
    allowance: 0,
    expenses: [],
    history: []
  },
  attendance: [],
  todos: [],
  pomodoros: {
    date: new Date().toISOString().slice(0, 10),
    count: 0
  },
  theme: 'light'
};

/**
 * Ensures data directory and JSON database exist
 */
function initDatabase() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify(DEFAULT_DB, null, 2), 'utf-8');
    console.log(`[Database] Created fresh database at ${DB_FILE}`);
  }
}

/**
 * Reads database from disk with corruption recovery
 */
function readDB() {
  try {
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('[Database Error] Failed to parse JSON, restoring defaults:', err.message);
    return { ...DEFAULT_DB };
  }
}

/**
 * Writes database atomically to disk
 */
function writeDB(data) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error('[Database Error] Write failed:', err.message);
    return false;
  }
}

/**
 * Helper to generate random ID
 */
function generateId() {
  return 'id_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 7);
}

/**
 * Helper to get today's local date string
 */
function todayString() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Helper to parse JSON request body
 */
function parseRequestBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
      if (body.length > 1e6) { // 1MB limit
        req.destroy();
        reject(new Error('Payload too large'));
      }
    });
    req.on('end', () => {
      try {
        const parsed = body ? JSON.parse(body) : {};
        resolve(parsed);
      } catch (e) {
        resolve({});
      }
    });
    req.on('error', reject);
  });
}

/**
 * Helper to send JSON responses
 */
function sendJSON(res, statusCode, payload) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  });
  res.end(JSON.stringify(payload));
}

/**
 * Handles all REST API requests
 */
async function handleApiRequest(req, res, pathname) {
  const method = req.method.toUpperCase();

  // CORS Preflight
  if (method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
    return res.end();
  }

  // Health check
  if (pathname === '/api/health' && method === 'GET') {
    return sendJSON(res, 200, {
      status: 'online',
      message: 'StudentHub Backend Server is operational',
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    });
  }

  const db = readDB();

  // GET complete state (for initial hydration)
  if (pathname === '/api/state' && method === 'GET') {
    return sendJSON(res, 200, db);
  }

  // POST complete state
  if (pathname === '/api/state' && method === 'POST') {
    const body = await parseRequestBody(req);
    const updated = { ...db, ...body };
    writeDB(updated);
    return sendJSON(res, 200, { success: true, state: updated });
  }

  // ---------------- MODULE 1: EXAM PLANNER ----------------
  // GET /api/subjects
  if (pathname === '/api/subjects' && method === 'GET') {
    return sendJSON(res, 200, db.subjects || []);
  }

  // POST /api/subjects
  if (pathname === '/api/subjects' && method === 'POST') {
    const body = await parseRequestBody(req);
    if (!body.name || !body.examDate) {
      return sendJSON(res, 400, { error: 'Subject name and exam date are required' });
    }
    const newSubject = {
      id: generateId(),
      name: body.name.trim(),
      examDate: body.examDate,
      topics: []
    };
    db.subjects.push(newSubject);
    writeDB(db);
    return sendJSON(res, 201, newSubject);
  }

  // DELETE /api/subjects/:id
  if (pathname.startsWith('/api/subjects/') && method === 'DELETE') {
    const parts = pathname.split('/');
    const subjectId = parts[3];
    if (!subjectId) return sendJSON(res, 400, { error: 'Subject ID required' });

    db.subjects = db.subjects.filter(s => s.id !== subjectId);
    writeDB(db);
    return sendJSON(res, 200, { success: true });
  }

  // POST /api/subjects/:id/topics
  if (pathname.match(/^\/api\/subjects\/[^/]+\/topics$/) && method === 'POST') {
    const parts = pathname.split('/');
    const subjectId = parts[3];
    const body = await parseRequestBody(req);
    const subject = db.subjects.find(s => s.id === subjectId);
    if (!subject) return sendJSON(res, 404, { error: 'Subject not found' });

    const newTopic = {
      id: generateId(),
      title: (body.title || 'Untitled Topic').trim(),
      done: false
    };
    subject.topics.push(newTopic);
    writeDB(db);
    return sendJSON(res, 201, newTopic);
  }

  // PUT /api/subjects/:id/topics/:topicId
  if (pathname.match(/^\/api\/subjects\/[^/]+\/topics\/[^/]+$/) && method === 'PUT') {
    const parts = pathname.split('/');
    const subjectId = parts[3];
    const topicId = parts[5];
    const body = await parseRequestBody(req);
    const subject = db.subjects.find(s => s.id === subjectId);
    if (!subject) return sendJSON(res, 404, { error: 'Subject not found' });

    const topic = subject.topics.find(t => t.id === topicId);
    if (!topic) return sendJSON(res, 404, { error: 'Topic not found' });

    if (typeof body.done === 'boolean') topic.done = body.done;
    if (body.title) topic.title = body.title.trim();
    writeDB(db);
    return sendJSON(res, 200, topic);
  }

  // DELETE /api/subjects/:id/topics/:topicId
  if (pathname.match(/^\/api\/subjects\/[^/]+\/topics\/[^/]+$/) && method === 'DELETE') {
    const parts = pathname.split('/');
    const subjectId = parts[3];
    const topicId = parts[5];
    const subject = db.subjects.find(s => s.id === subjectId);
    if (!subject) return sendJSON(res, 404, { error: 'Subject not found' });

    subject.topics = subject.topics.filter(t => t.id !== topicId);
    writeDB(db);
    return sendJSON(res, 200, { success: true });
  }

  // ---------------- MODULE 2: BUDGET TRACKER ----------------
  // GET /api/budget
  if (pathname === '/api/budget' && method === 'GET') {
    return sendJSON(res, 200, db.budget);
  }

  // POST /api/budget/allowance
  if (pathname === '/api/budget/allowance' && method === 'POST') {
    const body = await parseRequestBody(req);
    const allowance = Number(body.allowance);
    if (isNaN(allowance) || allowance <= 0) {
      return sendJSON(res, 400, { error: 'Valid positive allowance is required' });
    }
    db.budget.allowance = allowance;
    writeDB(db);
    return sendJSON(res, 200, db.budget);
  }

  // POST /api/budget/expense
  if (pathname === '/api/budget/expense' && method === 'POST') {
    const body = await parseRequestBody(req);
    const amount = Number(body.amount);
    if (isNaN(amount) || amount <= 0) {
      return sendJSON(res, 400, { error: 'Expense amount must be greater than 0' });
    }
    const newExpense = {
      id: generateId(),
      amount: amount,
      category: body.category || 'Other',
      date: body.date || todayString(),
      note: (body.note || '').trim()
    };
    if (!Array.isArray(db.budget.expenses)) db.budget.expenses = [];
    db.budget.expenses.push(newExpense);
    writeDB(db);
    return sendJSON(res, 201, newExpense);
  }

  // DELETE /api/budget/expense/:id
  if (pathname.startsWith('/api/budget/expense/') && method === 'DELETE') {
    const expenseId = pathname.split('/')[4];
    if (Array.isArray(db.budget.expenses)) {
      db.budget.expenses = db.budget.expenses.filter(e => e.id !== expenseId);
      writeDB(db);
    }
    return sendJSON(res, 200, { success: true });
  }

  // ---------------- MODULE 3: ATTENDANCE TRACKER ----------------
  // GET /api/attendance
  if (pathname === '/api/attendance' && method === 'GET') {
    return sendJSON(res, 200, db.attendance || []);
  }

  // POST /api/attendance
  if (pathname === '/api/attendance' && method === 'POST') {
    const body = await parseRequestBody(req);
    if (!body.name) return sendJSON(res, 400, { error: 'Course name required' });
    const newCourse = {
      id: generateId(),
      name: body.name.trim(),
      required: Number(body.required) || 75,
      present: 0,
      total: 0,
      lastMarked: null,
      lastAction: null
    };
    db.attendance.push(newCourse);
    writeDB(db);
    return sendJSON(res, 201, newCourse);
  }

  // POST /api/attendance/:id/mark
  if (pathname.match(/^\/api\/attendance\/[^/]+\/mark$/) && method === 'POST') {
    const courseId = pathname.split('/')[3];
    const body = await parseRequestBody(req);
    const course = db.attendance.find(c => c.id === courseId);
    if (!course) return sendJSON(res, 404, { error: 'Course not found' });

    course.total = (Number(course.total) || 0) + 1;
    if (body.action === 'present') {
      course.present = (Number(course.present) || 0) + 1;
    }
    course.lastMarked = todayString();
    course.lastAction = body.action;
    writeDB(db);
    return sendJSON(res, 200, course);
  }

  // POST /api/attendance/:id/undo
  if (pathname.match(/^\/api\/attendance\/[^/]+\/undo$/) && method === 'POST') {
    const courseId = pathname.split('/')[3];
    const course = db.attendance.find(c => c.id === courseId);
    if (!course || !course.lastAction) {
      return sendJSON(res, 400, { error: 'No mark available to undo' });
    }

    if (course.lastAction === 'present') {
      course.present = Math.max(0, (course.present || 1) - 1);
      course.total = Math.max(0, (course.total || 1) - 1);
    } else if (course.lastAction === 'absent') {
      course.total = Math.max(0, (course.total || 1) - 1);
    }
    course.lastAction = null;
    writeDB(db);
    return sendJSON(res, 200, course);
  }

  // DELETE /api/attendance/:id
  if (pathname.startsWith('/api/attendance/') && method === 'DELETE') {
    const courseId = pathname.split('/')[3];
    db.attendance = db.attendance.filter(c => c.id !== courseId);
    writeDB(db);
    return sendJSON(res, 200, { success: true });
  }

  // ---------------- MODULE 4: TO-DO & POMODORO ----------------
  // GET /api/todos
  if (pathname === '/api/todos' && method === 'GET') {
    return sendJSON(res, 200, db.todos || []);
  }

  // POST /api/todos
  if (pathname === '/api/todos' && method === 'POST') {
    const body = await parseRequestBody(req);
    if (!body.text) return sendJSON(res, 400, { error: 'Task text required' });
    const newTask = {
      id: generateId(),
      text: body.text.trim(),
      priority: body.priority || 'Medium',
      due: body.due || null,
      done: false
    };
    db.todos.push(newTask);
    writeDB(db);
    return sendJSON(res, 201, newTask);
  }

  // PUT /api/todos/:id
  if (pathname.match(/^\/api\/todos\/[^/]+$/) && method === 'PUT') {
    const taskId = pathname.split('/')[3];
    const body = await parseRequestBody(req);
    const task = db.todos.find(t => t.id === taskId);
    if (!task) return sendJSON(res, 404, { error: 'Task not found' });

    if (typeof body.done === 'boolean') task.done = body.done;
    if (body.text) task.text = body.text.trim();
    if (body.priority) task.priority = body.priority;
    if (body.due !== undefined) task.due = body.due;
    writeDB(db);
    return sendJSON(res, 200, task);
  }

  // DELETE /api/todos/:id
  if (pathname.match(/^\/api\/todos\/[^/]+$/) && method === 'DELETE') {
    const taskId = pathname.split('/')[3];
    db.todos = db.todos.filter(t => t.id !== taskId);
    writeDB(db);
    return sendJSON(res, 200, { success: true });
  }

  // POST /api/todos/clear-completed
  if (pathname === '/api/todos/clear-completed' && method === 'POST') {
    const beforeCount = db.todos.length;
    db.todos = db.todos.filter(t => !t.done);
    writeDB(db);
    return sendJSON(res, 200, { cleared: beforeCount - db.todos.length });
  }

  // GET /api/pomodoros
  if (pathname === '/api/pomodoros' && method === 'GET') {
    const today = todayString();
    if (!db.pomodoros || db.pomodoros.date !== today) {
      db.pomodoros = { date: today, count: 0 };
      writeDB(db);
    }
    return sendJSON(res, 200, db.pomodoros);
  }

  // POST /api/pomodoros/increment
  if (pathname === '/api/pomodoros/increment' && method === 'POST') {
    const today = todayString();
    if (!db.pomodoros || db.pomodoros.date !== today) {
      db.pomodoros = { date: today, count: 1 };
    } else {
      db.pomodoros.count = (Number(db.pomodoros.count) || 0) + 1;
    }
    writeDB(db);
    return sendJSON(res, 200, db.pomodoros);
  }

  // ---------------- DEMO DATA & RESET ----------------
  // POST /api/demo
  if (pathname === '/api/demo' && method === 'POST') {
    const today = todayString();
    const currentMonth = today.slice(0, 7);

    function offsetDate(days) {
      const d = new Date();
      d.setDate(d.getDate() + days);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    }

    const demoData = {
      subjects: [
        {
          id: generateId(),
          name: 'Data Structures & Algorithms',
          examDate: offsetDate(2),
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
          examDate: offsetDate(8),
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
          examDate: offsetDate(15),
          topics: [
            { id: generateId(), title: 'Propositional & Predicate Logic', done: true },
            { id: generateId(), title: 'Relations and Equivalence Sets', done: true },
            { id: generateId(), title: 'Recurrence Relations & Generating Functions', done: false }
          ]
        }
      ],
      budget: {
        month: currentMonth,
        allowance: 6000,
        expenses: [
          { id: generateId(), amount: 1650, category: 'Food', date: offsetDate(-10), note: 'Hostel mess extras & canteen snacks' },
          { id: generateId(), amount: 850, category: 'Travel', date: offsetDate(-7), note: 'Metro card top-up & auto fare' },
          { id: generateId(), amount: 699, category: 'Recharge', date: offsetDate(-5), note: 'Monthly 5G mobile data recharge' },
          { id: generateId(), amount: 550, category: 'Study', date: offsetDate(-3), note: 'DSA notebook & scientific calculator batteries' },
          { id: generateId(), amount: 1050, category: 'Fun', date: offsetDate(-2), note: 'Weekend movie & dinner with wingmates' },
          { id: generateId(), amount: 300, category: 'Other', date: offsetDate(-1), note: 'Dorm laundry detergent & stationery' }
        ],
        history: [{ month: '2026-09', allowance: 6000, spent: 5400 }]
      },
      attendance: [
        { id: generateId(), name: 'Data Structures & Algorithms', required: 75, present: 22, total: 25, lastMarked: today, lastAction: 'present' },
        { id: generateId(), name: 'Engineering Physics', required: 75, present: 13, total: 21, lastMarked: today, lastAction: 'absent' },
        { id: generateId(), name: 'Discrete Mathematics', required: 75, present: 18, total: 24, lastMarked: today, lastAction: 'present' },
        { id: generateId(), name: 'Technical Communication', required: 75, present: 16, total: 18, lastMarked: today, lastAction: 'present' }
      ],
      todos: [
        { id: generateId(), text: 'Submit DSA Lab Assignment 3 (Graph Traversal)', priority: 'High', due: offsetDate(-1), done: false },
        { id: generateId(), text: 'Revise Dynamic Programming Notes before Thursday', priority: 'High', due: offsetDate(1), done: false },
        { id: generateId(), text: 'Physics practical journal completion & signature', priority: 'Medium', due: offsetDate(3), done: false },
        { id: generateId(), text: 'Return library book: Cormen Algorithms', priority: 'Low', due: offsetDate(5), done: false },
        { id: generateId(), text: 'Complete College Identity Card renewal form', priority: 'Medium', due: offsetDate(-2), done: true },
        { id: generateId(), text: 'Setup Visual Studio Code on personal laptop', priority: 'Low', due: offsetDate(-4), done: true }
      ],
      pomodoros: { date: today, count: 3 },
      theme: 'light'
    };

    writeDB(demoData);
    return sendJSON(res, 200, { success: true, message: 'Server demo dataset loaded', data: demoData });
  }

  // POST /api/reset
  if (pathname === '/api/reset' && method === 'POST') {
    writeDB(DEFAULT_DB);
    return sendJSON(res, 200, { success: true, message: 'Server database reset to clean state' });
  }

  // Not found
  return sendJSON(res, 404, { error: 'API route not found', endpoint: pathname });
}

/**
 * Serves static HTML, CSS, JS frontend files
 */
function handleStaticFile(req, res, pathname) {
  let relativePath = pathname === '/' ? '/index.html' : pathname;
  // Security: prevent directory traversal
  const safePath = path.normalize(relativePath).replace(/^(\.\.[/\\])+/, '');
  const filePath = path.join(PUBLIC_DIR, safePath);

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=UTF-8' });
      return res.end('404 Not Found');
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': 'no-cache',
      'Access-Control-Allow-Origin': '*'
    });

    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  });
}

// Create HTTP Server
const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;

  if (pathname.startsWith('/api/')) {
    handleApiRequest(req, res, pathname).catch(err => {
      console.error('[API Server Error]', err);
      sendJSON(res, 500, { error: 'Internal server error', details: err.message });
    });
  } else {
    handleStaticFile(req, res, pathname);
  }
});

// Start Server
initDatabase();
server.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(` StudentHub Full Working Backend Server`);
  console.log(`=======================================================`);
  console.log(` URL: http://localhost:${PORT}`);
  console.log(` API Health Check: http://localhost:${PORT}/api/health`);
  console.log(` Data Storage: ${DB_FILE}`);
  console.log(` Press Ctrl+C to stop`);
  console.log(`=======================================================`);
});
