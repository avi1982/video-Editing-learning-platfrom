const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const BACKEND_DIR = __dirname;
const FRONTEND_DIR = path.resolve(BACKEND_DIR, '..', 'frontend');
const DATA_DIR = path.join(BACKEND_DIR, 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');
const PORT = Number(process.env.PORT || 3000);
const SESSION_MS = 7 * 24 * 60 * 60 * 1000;
const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.jfif': 'image/jpeg', '.svg': 'image/svg+xml', '.ico': 'image/x-icon' };
const courses = [
  { id: 'capcut-mobile', title: 'CapCut Mobile', level: 'Beginner', lessons: 15, url: '/capcut-mobile.html' },
  { id: 'capcut-pc', title: 'CapCut PC', level: 'Beginner', lessons: 12, url: '/capcut-pc.html' },
  { id: 'premiere-pro', title: 'Adobe Premiere Pro', level: 'Intermediate', lessons: 18, url: '/premiere-pro.html' },
  { id: 'after-effects', title: 'Adobe After Effects', level: 'Advanced', lessons: 18, url: '/after-effects.html' },
];

fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(DB_FILE)) fs.writeFileSync(DB_FILE, JSON.stringify({ users: [], sessions: [], progress: {} }, null, 2));
function loadDb() {
  const db = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
  db.users ||= []; db.sessions ||= []; db.progress ||= {}; db.bookmarks ||= {}; db.quizScores ||= {}; db.newsletter ||= [];
  return db;
}
function saveDb(db) { fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2)); }
function send(res, status, data, headers = {}) { res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...headers }); res.end(JSON.stringify(data)); }
function readBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', chunk => { raw += chunk; if (raw.length > 16384) { reject(Object.assign(new Error('Request body too large'), { status: 413 })); req.destroy(); } });
    req.on('end', () => { try { resolve(raw ? JSON.parse(raw) : {}); } catch { reject(Object.assign(new Error('Invalid JSON'), { status: 400 })); } });
    req.on('error', reject);
  });
}
function tokenFor(req) { const match = (req.headers.cookie || '').match(/(?:^|;\s*)editmaster_session=([^;]+)/); return match ? decodeURIComponent(match[1]) : ''; }
function currentUser(req, db) {
  const token = tokenFor(req); if (!token) return null;
  const hash = crypto.createHash('sha256').update(token).digest('hex');
  const session = db.sessions.find(item => item.tokenHash === hash && item.expiresAt > Date.now());
  return session ? db.users.find(user => user.id === session.userId) || null : null;
}
function publicUser(user) { return { id: user.id, email: user.email, name: user.name }; }
function setSession(res, user, db) {
  const token = crypto.randomBytes(32).toString('hex');
  db.sessions = db.sessions.filter(item => item.expiresAt > Date.now());
  db.sessions.push({ tokenHash: crypto.createHash('sha256').update(token).digest('hex'), userId: user.id, expiresAt: Date.now() + SESSION_MS });
  saveDb(db);
  res.setHeader('Set-Cookie', `editmaster_session=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${SESSION_MS / 1000}${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`);
}
function fail(res, error) { send(res, error.status || 500, { error: error.status ? error.message : 'Internal server error' }); }

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  try {
    const origin = req.headers.origin || '';
    if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader('Vary', 'Origin');
    }
    if (req.method === 'OPTIONS' && url.pathname.startsWith('/api/')) {
      res.writeHead(204, { 'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Max-Age': '600' });
      return res.end();
    }
    if (req.method === 'GET' && url.pathname === '/api/health') return send(res, 200, { status: 'ok' });
    if (req.method === 'GET' && url.pathname === '/api/courses') return send(res, 200, { courses });
    if (req.method === 'POST' && ['/api/auth/register', '/api/auth/login'].includes(url.pathname)) {
      const body = await readBody(req); const email = String(body.email || '').trim().toLowerCase(); const password = String(body.password || '');
      if (!/^\S+@\S+\.\S+$/.test(email)) return send(res, 400, { error: 'Enter a valid email address.' });
      if (password.length < 8 || password.length > 200) return send(res, 400, { error: 'Password must be at least 8 characters.' });
      const db = loadDb(); let user = db.users.find(item => item.email === email);
      if (url.pathname.endsWith('/register')) {
        if (user) return send(res, 409, { error: 'An account with this email already exists.' });
        const salt = crypto.randomBytes(16).toString('hex');
        const passwordHash = crypto.scryptSync(password, salt, 64).toString('hex');
        user = { id: crypto.randomUUID(), email, name: String(body.name || '').trim().slice(0, 80), salt, passwordHash, createdAt: new Date().toISOString() };
        db.users.push(user);
      } else {
        if (!user || !crypto.timingSafeEqual(Buffer.from(user.passwordHash, 'hex'), Buffer.from(crypto.scryptSync(password, user.salt, 64).toString('hex'), 'hex'))) return send(res, 401, { error: 'Email or password is incorrect.' });
      }
      setSession(res, user, db); return send(res, url.pathname.endsWith('/register') ? 201 : 200, { user: publicUser(user) });
    }
    if (req.method === 'GET' && url.pathname === '/api/auth/me') {
      const user = currentUser(req, loadDb()); return user ? send(res, 200, { user: publicUser(user) }) : send(res, 401, { error: 'Please sign in.' });
    }
    if (req.method === 'GET' && url.pathname === '/api/dashboard') {
      const db = loadDb(); const user = currentUser(req, db); if (!user) return send(res, 401, { error: 'Please sign in to view your dashboard.' });
      const courseProgress = courses.map(course => {
        const completedLessons = db.progress[`${user.id}:${course.id}`] || [];
        return { ...course, completedLessons, completedCount: completedLessons.length, percent: Math.round(completedLessons.length / course.lessons * 100) };
      });
      return send(res, 200, { user: publicUser(user), courses: courseProgress, bookmarks: db.bookmarks[user.id] || [], quizScores: db.quizScores[user.id] || {} });
    }
    if (req.method === 'POST' && url.pathname === '/api/auth/logout') {
      const db = loadDb(); const token = tokenFor(req); const hash = crypto.createHash('sha256').update(token).digest('hex');
      db.sessions = db.sessions.filter(item => item.tokenHash !== hash); saveDb(db);
      return send(res, 200, { ok: true }, { 'Set-Cookie': 'editmaster_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0' });
    }
    if (url.pathname === '/api/bookmarks' && ['GET', 'POST'].includes(req.method)) {
      const db = loadDb(); const user = currentUser(req, db); if (!user) return send(res, 401, { error: 'Please sign in to save bookmarks.' });
      db.bookmarks[user.id] ||= [];
      if (req.method === 'GET') return send(res, 200, { bookmarks: db.bookmarks[user.id] });
      const body = await readBody(req); const course = courses.find(item => item.id === body.courseId);
      const lessonId = String(body.lessonId || '').slice(0, 120); const title = String(body.title || '').slice(0, 160);
      if (!course || !/^lesson-\d+$/.test(lessonId) || !title) return send(res, 400, { error: 'A valid course, lesson ID, and title are required.' });
      const id = `${course.id}:${lessonId}`;
      if (!db.bookmarks[user.id].some(item => item.id === id)) db.bookmarks[user.id].push({ id, courseId: course.id, courseTitle: course.title, lessonId, title, url: `${course.url}#${lessonId}`, createdAt: new Date().toISOString() });
      saveDb(db); return send(res, 201, { bookmarks: db.bookmarks[user.id] });
    }
    const bookmarkMatch = url.pathname.match(/^\/api\/bookmarks\/([a-z0-9-]+:lesson-\d+)$/);
    if (req.method === 'DELETE' && bookmarkMatch) {
      const db = loadDb(); const user = currentUser(req, db); if (!user) return send(res, 401, { error: 'Please sign in to manage bookmarks.' });
      db.bookmarks[user.id] = (db.bookmarks[user.id] || []).filter(item => item.id !== bookmarkMatch[1]);
      saveDb(db); return send(res, 200, { bookmarks: db.bookmarks[user.id] });
    }
    if (url.pathname === '/api/quiz-scores' && ['GET', 'POST'].includes(req.method)) {
      const db = loadDb(); const user = currentUser(req, db); if (!user) return send(res, 401, { error: 'Please sign in to save quiz scores.' });
      db.quizScores[user.id] ||= {};
      if (req.method === 'GET') return send(res, 200, { quizScores: db.quizScores[user.id] });
      const body = await readBody(req); const course = courses.find(item => item.id === body.courseId);
      const score = Number(body.score); const total = Number(body.total);
      if (!course || !Number.isInteger(score) || !Number.isInteger(total) || total < 1 || total > 20 || score < 0 || score > total) return send(res, 400, { error: 'Provide a valid course and quiz score.' });
      db.quizScores[user.id][course.id] = { score, total, percent: Math.round(score / total * 100), updatedAt: new Date().toISOString() };
      saveDb(db); return send(res, 200, { quizScores: db.quizScores[user.id] });
    }
    if (req.method === 'POST' && url.pathname === '/api/newsletter') {
      const body = await readBody(req); const email = String(body.email || '').trim().toLowerCase();
      if (!/^\S+@\S+\.\S+$/.test(email)) return send(res, 400, { error: 'Enter a valid email address.' });
      const db = loadDb(); db.newsletter ||= [];
      if (!db.newsletter.some(item => item.email === email)) db.newsletter.push({ email, subscribedAt: new Date().toISOString() });
      saveDb(db); return send(res, 201, { ok: true, message: 'Thanks — your email has been added to the EditMaster updates list.' });
    }
    const progressMatch = url.pathname.match(/^\/api\/progress\/([a-z0-9-]+)$/);
    if (progressMatch && ['GET', 'PUT'].includes(req.method)) {
      const db = loadDb(); const user = currentUser(req, db); if (!user) return send(res, 401, { error: 'Please sign in to save your progress.' });
      const courseId = progressMatch[1]; if (!courses.some(course => course.id === courseId)) return send(res, 404, { error: 'Course not found.' });
      const key = `${user.id}:${courseId}`;
      if (req.method === 'GET') return send(res, 200, { courseId, completedLessons: db.progress[key] || [] });
      const body = await readBody(req); if (!Array.isArray(body.completedLessons) || body.completedLessons.length > 500) return send(res, 400, { error: 'completedLessons must be an array of up to 500 lesson IDs.' });
      db.progress[key] = [...new Set(body.completedLessons.map(value => String(value).slice(0, 120)))]; saveDb(db);
      return send(res, 200, { courseId, completedLessons: db.progress[key] });
    }
    if (url.pathname.startsWith('/api/')) return send(res, 404, { error: 'API route not found.' });
    if (req.method !== 'GET' && req.method !== 'HEAD') return send(res, 405, { error: 'Method not allowed.' });
    const pathname = decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname);
    const file = path.resolve(FRONTEND_DIR, `.${pathname}`);
    const relative = path.relative(FRONTEND_DIR, file);
    if (relative.startsWith('..') || path.isAbsolute(relative) || !fs.existsSync(file) || !fs.statSync(file).isFile()) return send(res, 404, { error: 'Not found.' });
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream' });
    if (req.method === 'HEAD') return res.end();
    fs.createReadStream(file).pipe(res);
  } catch (error) { if (!res.headersSent) fail(res, error); else res.destroy(); }
});
server.listen(PORT, () => console.log(`EditMaster is running at http://localhost:${PORT}`));
