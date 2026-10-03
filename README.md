# EditMaster

The project is organized into two folders:

- `frontend/` contains the responsive site, course lessons, account dashboard, course search, quizzes, practice projects, shared footer, and images.
- `backend/` contains the Node.js API server, npm start script, backend guide, and private runtime data directory.

Sign in to sync course progress, save lesson bookmarks, and keep quiz scores on the dashboard. Newsletter sign-ups are recorded locally; email campaigns are not configured.

## Start the website

Install Node.js 18 or newer. Open a terminal in `backend/`, run `npm start`, and visit [http://localhost:3000](http://localhost:3000). The backend serves the frontend and stores account and progress data in `backend/data/db.json` when first run.

See `backend/README-backend.md` for API endpoints and deployment notes.
