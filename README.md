# Personal Time Tracker & Productivity Dashboard

Stack: React (Vite) + Recharts, FastAPI, PostgreSQL (SQLAlchemy + psycopg 3).

## Features
- Live timer, or add activities manually (start/end time, duration)
- Tasks (coding practice, learning, ...): start the timer on a task, see time spent vs. target, mark complete
- Daily report, 7-day weekly chart, category breakdown
- Daily goals per category with progress bars
- Stats: productive hours, most-used activity, daily average, weekly trend

## Project structure
```
time-tracker/
├── docker-compose.yml      # optional PostgreSQL via Docker
├── backend/
│   ├── main.py             # models, CRUD, timer, tasks, goals, reports, stats
│   └── requirements.txt
└── frontend/
    ├── src/App.jsx         # dashboard UI + Recharts charts
    ├── src/api.js          # API calls
    └── src/styles.css
```

## Running it

### 1. Database
Either use Docker:
```
docker compose up -d
```
or use a local PostgreSQL and create a database (or a schema) for the app.

### 2. Backend
```
cd backend
python -m venv venv
venv\Scripts\activate            # Windows  (Mac/Linux: source venv/bin/activate)
pip install -r requirements.txt
```
Set the database URL, then start the server:
```
$env:DATABASE_URL="postgresql+psycopg://USER:PASSWORD@localhost:5432/DBNAME"    # PowerShell
uvicorn main:app --reload --port 8000
```
To keep the tables in a separate schema of an existing database, create it first
(`CREATE SCHEMA timetracker;`) and append `?options=-csearch_path%3Dtimetracker` to the URL.
Special characters in the password must be URL-encoded (`@` becomes `%40`).
Tables are created automatically on startup. API docs: http://localhost:8000/docs

### 3. Frontend
```
cd frontend
npm install
npm run dev
```
Open http://localhost:5173

## API endpoints
| Method | Endpoint | Purpose |
|---|---|---|
| POST / GET | /api/activities | Add / list activities (`?date=YYYY-MM-DD`) |
| PUT / DELETE | /api/activities/{id} | Edit / delete an activity |
| POST | /api/timer/start, /api/timer/stop | Live timer (start accepts an optional `task_id`) |
| GET / POST | /api/tasks | List / create tasks |
| PATCH | /api/tasks/{id}/toggle | Mark a task done / not done |
| DELETE | /api/tasks/{id} | Delete a task |
| GET / PUT | /api/goals, /api/goals/{category} | Daily goals |
| GET | /api/reports/daily, /api/reports/weekly | Reports |
| GET | /api/stats | Productive hours, most-used activity, daily average, trend |

## Notes
- Duration is calculated from `start_time` / `end_time`; a running timer has `end_time = NULL`.
- Productive categories are Coding, Learning and Meeting (`PRODUCTIVE` in `main.py`).
- Trend compares this week's productive minutes with the previous week's.
- Times are stored in the server's local timezone (fine for a single-user app).
