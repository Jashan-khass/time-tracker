import os
from collections import defaultdict
from datetime import datetime, timedelta
from typing import Optional

from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy import Boolean, Column, DateTime, Integer, String, Text, create_engine, text
from sqlalchemy.orm import Session, declarative_base, sessionmaker
from dotenv import load_dotenv
load_dotenv()

DATABASE_URL = os.getenv(
    "DATABASE_URL", "postgresql+psycopg://postgres:postgres@localhost:5432/timetracker"
)
CATEGORIES = ["Coding", "Learning", "Meeting", "Personal", "Break"]
PRODUCTIVE = {"Coding", "Learning", "Meeting"}

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(bind=engine, autoflush=False)
Base = declarative_base()


class Activity(Base):
    __tablename__ = "activities"
    id = Column(Integer, primary_key=True)
    title = Column(String(120), nullable=False)
    category = Column(String(30), nullable=False, index=True)
    start_time = Column(DateTime, nullable=False, index=True)
    end_time = Column(DateTime, nullable=True)  # None = timer is still running
    notes = Column(Text, default="")
    task_id = Column(Integer, nullable=True, index=True)


class Task(Base):
    __tablename__ = "tasks"
    id = Column(Integer, primary_key=True)
    title = Column(String(120), nullable=False)
    category = Column(String(30), nullable=False)
    done = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=datetime.now)


class Goal(Base):
    __tablename__ = "goals"
    category = Column(String(30), primary_key=True)
    daily_minutes = Column(Integer, nullable=False)


Base.metadata.create_all(engine)
# Add task_id to an existing activities table (no-op if it already exists)
with engine.begin() as _c:
    _c.execute(text("ALTER TABLE activities ADD COLUMN IF NOT EXISTS task_id INTEGER"))

app = FastAPI(title="Time Tracker API")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


class ActivityIn(BaseModel):
    title: str
    category: str
    start_time: datetime
    end_time: Optional[datetime] = None
    notes: str = ""


class StartIn(BaseModel):
    title: str
    category: str
    task_id: Optional[int] = None


class TaskIn(BaseModel):
    title: str
    category: str


class GoalIn(BaseModel):
    daily_minutes: int


def naive(dt):
    return dt.replace(tzinfo=None) if dt else None


def minutes(a: Activity) -> float:
    end = a.end_time or datetime.now()
    return max((end - a.start_time).total_seconds() / 60, 0)


def to_dict(a: Activity):
    return {
        "id": a.id, "task_id": a.task_id, "title": a.title, "category": a.category, "notes": a.notes,
        "start_time": a.start_time.isoformat(),
        "end_time": a.end_time.isoformat() if a.end_time else None,
        "minutes": round(minutes(a), 1),
    }


def validate(category: str):
    if category not in CATEGORIES:
        raise HTTPException(400, f"Category must be one of {CATEGORIES}")


def day_range(d: datetime):
    s = d.replace(hour=0, minute=0, second=0, microsecond=0)
    return s, s + timedelta(days=1)


# ---------- Activity CRUD ----------
@app.get("/api/meta")
def meta():
    return {"categories": CATEGORIES, "productive": sorted(PRODUCTIVE)}


@app.post("/api/activities")
def create_activity(body: ActivityIn, db: Session = Depends(get_db)):
    validate(body.category)
    start, end = naive(body.start_time), naive(body.end_time)
    if end and end <= start:
        raise HTTPException(400, "End time must be after start time")
    a = Activity(title=body.title.strip(), category=body.category,
                 start_time=start, end_time=end, notes=body.notes)
    db.add(a); db.commit(); db.refresh(a)
    return to_dict(a)


@app.get("/api/activities")
def list_activities(date: Optional[str] = None, category: Optional[str] = None,
                    days: Optional[int] = None, db: Session = Depends(get_db)):
    q = db.query(Activity)
    if category:
        q = q.filter(Activity.category == category)
    if days:
        since = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0) - timedelta(days=days - 1)
        q = q.filter(Activity.start_time >= since)
    if date:
        s, e = day_range(datetime.fromisoformat(date))
        q = q.filter(Activity.start_time >= s, Activity.start_time < e)
    return [to_dict(a) for a in q.order_by(Activity.start_time.desc()).all()]


@app.put("/api/activities/{aid}")
def update_activity(aid: int, body: ActivityIn, db: Session = Depends(get_db)):
    validate(body.category)
    a = db.get(Activity, aid)
    if not a:
        raise HTTPException(404, "Activity not found")
    a.title, a.category, a.notes = body.title.strip(), body.category, body.notes
    a.start_time, a.end_time = naive(body.start_time), naive(body.end_time)
    db.commit(); db.refresh(a)
    return to_dict(a)


@app.delete("/api/activities/{aid}")
def delete_activity(aid: int, db: Session = Depends(get_db)):
    a = db.get(Activity, aid)
    if not a:
        raise HTTPException(404, "Activity not found")
    db.delete(a); db.commit()
    return {"deleted": aid}


# ---------- Live timer ----------
@app.post("/api/timer/start")
def start_timer(body: StartIn, db: Session = Depends(get_db)):
    validate(body.category)
    if db.query(Activity).filter(Activity.end_time.is_(None)).first():
        raise HTTPException(400, "Stop the running timer first")
    title, category = body.title.strip(), body.category
    if body.task_id:
        t = db.get(Task, body.task_id)
        if not t:
            raise HTTPException(404, "Task not found")
        title, category = t.title, t.category
    a = Activity(title=title, category=category, start_time=datetime.now(), task_id=body.task_id)
    db.add(a); db.commit(); db.refresh(a)
    return to_dict(a)


@app.post("/api/timer/stop")
def stop_timer(db: Session = Depends(get_db)):
    a = db.query(Activity).filter(Activity.end_time.is_(None)).first()
    if not a:
        raise HTTPException(400, "No timer is running")
    a.end_time = datetime.now()
    db.commit(); db.refresh(a)
    return to_dict(a)


# ---------- Tasks ----------
@app.get("/api/tasks")
def list_tasks(db: Session = Depends(get_db)):
    spent = defaultdict(float)
    for a in db.query(Activity).filter(Activity.task_id.isnot(None)).all():
        spent[a.task_id] += minutes(a)
    tasks = db.query(Task).order_by(Task.done, Task.created_at.desc()).all()
    return [{"id": t.id, "title": t.title, "category": t.category, "done": t.done,
             "spent_minutes": round(spent.get(t.id, 0), 1)} for t in tasks]


@app.post("/api/tasks")
def create_task(body: TaskIn, db: Session = Depends(get_db)):
    validate(body.category)
    t = Task(title=body.title.strip(), category=body.category)
    db.add(t); db.commit(); db.refresh(t)
    return {"id": t.id}


@app.patch("/api/tasks/{tid}/toggle")
def toggle_task(tid: int, db: Session = Depends(get_db)):
    t = db.get(Task, tid)
    if not t:
        raise HTTPException(404, "Task not found")
    t.done = not t.done
    db.commit()
    return {"id": t.id, "done": t.done}


@app.delete("/api/tasks/{tid}")
def delete_task(tid: int, db: Session = Depends(get_db)):
    t = db.get(Task, tid)
    if not t:
        raise HTTPException(404, "Task not found")
    db.query(Activity).filter(Activity.task_id == tid).update({Activity.task_id: None})
    db.delete(t); db.commit()
    return {"deleted": tid}


# ---------- Goals ----------
@app.get("/api/goals")
def get_goals(db: Session = Depends(get_db)):
    return {g.category: g.daily_minutes for g in db.query(Goal).all()}


@app.put("/api/goals/{category}")
def set_goal(category: str, body: GoalIn, db: Session = Depends(get_db)):
    validate(category)
    g = db.get(Goal, category)
    if body.daily_minutes <= 0:
        if g:
            db.delete(g); db.commit()
        return {"category": category, "daily_minutes": 0}
    if g:
        g.daily_minutes = body.daily_minutes
    else:
        db.add(Goal(category=category, daily_minutes=body.daily_minutes))
    db.commit()
    return {"category": category, "daily_minutes": body.daily_minutes}


# ---------- Reports ----------
@app.get("/api/reports/daily")
def daily_report(date: Optional[str] = None, db: Session = Depends(get_db)):
    d = datetime.fromisoformat(date) if date else datetime.now()
    s, e = day_range(d)
    acts = db.query(Activity).filter(Activity.start_time >= s, Activity.start_time < e).all()
    by_cat = defaultdict(float)
    for a in acts:
        by_cat[a.category] += minutes(a)
    goals = {g.category: g.daily_minutes for g in db.query(Goal).all()}
    return {
        "date": s.date().isoformat(),
        "total_minutes": round(sum(by_cat.values()), 1),
        "by_category": [{"category": c, "minutes": round(m, 1)} for c, m in by_cat.items()],
        "goals": [{"category": c, "goal": g, "done": round(by_cat.get(c, 0), 1)} for c, g in goals.items()],
    }


def week_data(db, end_day: datetime, days=7):
    start = end_day.replace(hour=0, minute=0, second=0, microsecond=0) - timedelta(days=days - 1)
    acts = db.query(Activity).filter(
        Activity.start_time >= start, Activity.start_time < start + timedelta(days=days)
    ).all()
    out = {(start + timedelta(days=i)).date().isoformat(): defaultdict(float) for i in range(days)}
    for a in acts:
        out[a.start_time.date().isoformat()][a.category] += minutes(a)
    return out, acts


@app.get("/api/reports/weekly")
def weekly_report(db: Session = Depends(get_db)):
    data, _ = week_data(db, datetime.now())
    rows = []
    for day, cats in data.items():
        row = {"date": day, "day": datetime.fromisoformat(day).strftime("%a")}
        row.update({c: round(cats.get(c, 0), 1) for c in CATEGORIES})
        row["productive"] = round(sum(v for c, v in cats.items() if c in PRODUCTIVE), 1)
        row["total"] = round(sum(cats.values()), 1)
        rows.append(row)
    return rows

@app.get("/")
def home():
    return {"message": "Time Tracker Backend is running"}


@app.get("/api/stats")
def stats(db: Session = Depends(get_db)):
    now = datetime.now()

    this_week, acts = week_data(db, now)
    prev_week, _ = week_data(db, now - timedelta(days=7))

    def productive_minutes(week):
        return sum(
            value
            for categories in week.values()
            for category, value in categories.items()
            if category in PRODUCTIVE
        )

    this_p = productive_minutes(this_week)
    prev_p = productive_minutes(prev_week)

    by_title = defaultdict(float)

    for activity in acts:
        if activity.category in PRODUCTIVE:
            by_title[activity.title.strip()] += minutes(activity)

    top = max(
        by_title.items(),
        key=lambda item: item[1],
        default=None
    )

    trend = (
        round(((this_p - prev_p) / prev_p) * 100, 1)
        if prev_p > 0
        else None
    )

    return {
        "productive_hours": round(this_p / 60, 2),
        "most_used_activity": {
            "title": top[0],
            "minutes": round(top[1], 1)
        } if top else None,
        "daily_avg_minutes": round(this_p / 7, 1),
        "trend_percent": trend
    }
