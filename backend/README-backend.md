# EditMaster backend

The backend uses Node.js built-in modules, so there are no packages to install. It serves the site from the sibling `frontend/` folder and provides JSON APIs for accounts, courses, lesson progress, bookmarks, quiz scores, and newsletter sign-ups. Account and learning data is stored in `backend/data/db.json` (created automatically on first start); keep that file private and back it up with the rest of your application data.

## Run locally

Install Node.js 18 or newer, open a terminal in the `backend/` folder, run `npm start`, then open [http://localhost:3000](http://localhost:3000). Use the site through this address so the browser can reach the API; opening the HTML file directly will not work for account sign-in.

Set `PORT` to change the port. Set `NODE_ENV=production` behind HTTPS to enable the Secure session cookie. For a public deployment, use HTTPS and a durable private data volume; this lightweight JSON store is intended for a small single-server deployment.

## API

- `GET /api/health` — health status
- `GET /api/courses` — course catalog
- `POST /api/auth/register` — JSON `{ "name": "Ava", "email": "ava@example.com", "password": "at-least-8-chars" }`
- `POST /api/auth/login` — JSON `{ "email": "ava@example.com", "password": "..." }`
- `GET /api/auth/me` — current signed-in account
- `POST /api/auth/logout` — end the current session
- `GET /api/dashboard` — account, course progress, bookmarks, and quiz scores
- `GET /api/progress/:courseId` — current user's completed lesson IDs
- `PUT /api/progress/:courseId` — JSON `{ "completedLessons": ["lesson-1"] }`
- `GET /api/bookmarks` / `POST /api/bookmarks` — list or save a lesson bookmark
- `DELETE /api/bookmarks/:courseId:lesson-N` — remove a bookmark
- `GET /api/quiz-scores` / `POST /api/quiz-scores` — view or save a course quiz score
- `POST /api/newsletter` — save a valid email address to the local updates list (does not send email)

Passwords are hashed with Node's scrypt; session IDs are random, stored as hashes, and sent in HttpOnly, SameSite cookies. Progress is scoped to the signed-in account.
