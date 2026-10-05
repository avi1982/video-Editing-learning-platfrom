# EditMaster

The project is organized into two folders:

- `frontend/` contains the responsive site, course lessons, account dashboard, course search, quizzes, practice projects, shared footer, and images.
- `backend/` contains the Node.js API server, npm start script, backend guide, and private runtime data directory.

Sign in to sync course progress, save lesson bookmarks, and keep quiz scores on the dashboard. Newsletter sign-ups are recorded locally; email campaigns are not configured.

## Start the website

Install Node.js 18 or newer. Open a terminal in `backend/`, run `npm start`, and visit [http://localhost:3000](http://localhost:3000). The backend serves the frontend and stores account and progress data in `backend/data/db.json` when first run.

See `backend/README-backend.md` for API endpoints and deployment notes.

## Deploy on Render

This repository includes a Render Blueprint at [`render.yaml`](render.yaml). Create a Blueprint in Render from [this repository](https://render.com/deploy?repo=https://github.com/avi1982/video-Editing-learning-platfrom), select the `main` branch, and apply the `editmaster` web service. The service root is the repository root; its build command installs the backend dependencies and its start command runs the backend, which serves the sibling `frontend/` directory. Render checks `/api/health`.

The Blueprint uses Render's free web-service plan. Its filesystem is ephemeral, so accounts, passwords, newsletter sign-ups, and learning progress stored in `backend/data/db.json` can be lost when the service restarts or is redeployed. This setup does not provide durable user data. Use a persistent storage solution before relying on it for user accounts or progress.
