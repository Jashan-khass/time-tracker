# Personal Time Tracker & Productivity Dashboard

A personal productivity app for tracking daily activities, managing
tasks, setting goals, and reviewing productivity trends.

## Tech Stack

-   **Frontend:** React, Vite, Recharts
-   **Backend:** FastAPI
-   **Database:** PostgreSQL
-   **ORM / Database driver:** SQLAlchemy, psycopg 3

## Features

-   **Activity tracking**
    -   Start and stop a live timer.
    -   Add activities manually with start time, end time, and duration.
-   **Task management**
    -   Create tasks for activities such as coding practice and
        learning.
    -   Start a timer directly from a task.
    -   Track time spent against a target duration.
    -   Mark tasks as complete or incomplete.
-   **Reports and charts**
    -   View a daily productivity report.
    -   Review a 7-day activity chart.
    -   See a breakdown of time by category.
-   **Daily goals**
    -   Set daily time goals for each category.
    -   Track progress with progress bars.
-   **Productivity statistics**
    -   Productive hours.
    -   Most-used activity.
    -   Daily average.
    -   Weekly productivity trend.

## Project Structure

``` text
time-tracker/
├── docker-compose.yml          # Optional PostgreSQL service
├── backend/
│   ├── main.py                 # FastAPI app, models, CRUD, timer, reports, stats
│   └── requirements.txt        # Python dependencies
└── frontend/
    ├── src/
    │   ├── pages/              # Dashboard, activities, tasks, goals, analytics pages
    │   ├── App.jsx             # Main application and routes
    │   ├── api.js              # Backend API calls
    │   ├── components.jsx      # Shared UI components
    │   ├── DataContext.jsx     # Shared application data
    │   ├── Layout.jsx          # Application layout
    │   ├── main.jsx            # Frontend entry point
    │   ├── styles.css          # Global styles
    │   └── utils.js            # Utility functions
    ├── index.html
    ├── package.json
    └── vite.config.js
```

## Getting Started

### Prerequisites

Install the following before running the project:

-   Python 3.10 or later
-   Node.js and npm
-   PostgreSQL, or Docker Desktop if you want to run PostgreSQL with
    Docker

### 1. Set Up the Database

You can use either Docker or an existing local PostgreSQL installation.

**Option A: Start PostgreSQL with Docker**

From the project root, run:

``` bash
docker compose up -d
```

Make sure the database name, username, password, and port in
`docker-compose.yml` match the connection URL you will use below.

**Option B: Use local PostgreSQL**

Create a PostgreSQL database for the application, for example:

``` sql
CREATE DATABASE time_tracker;
```

If you want the application's tables in a separate schema, create the
schema in that database:

``` sql
CREATE SCHEMA timetracker;
```

### 2. Set Up and Run the Backend

Open a terminal in the project root, then run:

``` powershell
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

Set the database connection URL in PowerShell:

``` powershell
$env:DATABASE_URL="postgresql+psycopg://USER:PASSWORD@localhost:5432/DBNAME"
```

Replace `USER`, `PASSWORD`, and `DBNAME` with your PostgreSQL
credentials and database name.

If you created the `timetracker` schema, append the schema search-path
option to the URL:

``` powershell
$env:DATABASE_URL="postgresql+psycopg://USER:PASSWORD@localhost:5432/DBNAME?options=-csearch_path%3Dtimetracker"
```

Start the FastAPI development server:

``` powershell
uvicorn main:app --reload --port 8000
```

The backend will be available at:

-   API base URL: `http://localhost:8000`
-   Interactive API documentation: `http://localhost:8000/docs`

### 3. Set Up and Run the Frontend

Open a second terminal in the project root:

``` powershell
cd frontend
npm install
npm run dev
```

Open the local URL printed by Vite, usually:

``` text
http://localhost:5173
```

## API Endpoints

The backend provides the following API routes:

  --------------------------------------------------------------------------
  Method                  Endpoint                   Description
  ----------------------- -------------------------- -----------------------
  `POST` / `GET`          `/api/activities`          Create an activity or
                                                     list activities.
                                                     Supports
                                                     `?date=YYYY-MM-DD`.

  `PUT` / `DELETE`        `/api/activities/{id}`     Update or delete an
                                                     activity.

  `POST`                  `/api/timer/start`         Start the live timer.
                                                     An optional `task_id`
                                                     can associate it with a
                                                     task.

  `POST`                  `/api/timer/stop`          Stop the running timer.

  `GET` / `POST`          `/api/tasks`               List or create tasks.

  `PATCH`                 `/api/tasks/{id}/toggle`   Mark a task complete or
                                                     incomplete.

  `DELETE`                `/api/tasks/{id}`          Delete a task.

  `GET` / `PUT`           `/api/goals` and           Retrieve or update
                          `/api/goals/{category}`    daily goals.

  `GET`                   `/api/reports/daily`       Retrieve the daily
                                                     report.

  `GET`                   `/api/reports/weekly`      Retrieve the 7-day
                                                     report.

  `GET`                   `/api/stats`               Retrieve productivity
                                                     statistics and trends.
  --------------------------------------------------------------------------

For the exact request and response formats, open the interactive API
documentation at `http://localhost:8000/docs` while the backend is
running.

## Application Notes

-   Activity duration is calculated from `start_time` and `end_time`.
-   A running timer has `end_time = NULL`.
-   The productive categories are **Coding**, **Learning**, and
    **Meeting**, as defined by `PRODUCTIVE` in `backend/main.py`.
-   The weekly trend compares this week's productive minutes with the
    previous week's.
-   Times are stored using the server's local timezone. This is suitable
    for a single-user, local setup; a multi-user deployment should use a
    consistent timezone strategy, such as storing timestamps in UTC.
-   If a database password contains special URL characters, URL-encode
    them. For example, `@` becomes `%40`.

## Troubleshooting

-   **Backend cannot connect to PostgreSQL:** Check that PostgreSQL is
    running and that `DATABASE_URL` contains the correct host, port,
    database name, username, and password.
-   **Frontend cannot reach the backend:** Make sure the backend is
    running on port `8000` and check the API base URL configured in
    `frontend/src/api.js`.
-   **Python dependencies are missing:** Activate the virtual
    environment and run `pip install -r requirements.txt` again.
-   **Frontend dependencies are missing:** Run `npm install` from the
    `frontend` directory.

## Future Improvements

Possible next steps include authentication, multi-user support,
exportable reports, and deployment configuration.
