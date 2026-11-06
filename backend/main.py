import os
from collections import defaultdict
from datetime import datetime, timedelta
from typing import Optional

from fastapi import Depends, FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy import Boolean, Column, DateTime, Integer, String, Text, create_engine, text
from sqlalchemy.orm import Session, declarative_base, sessionmaker
from dotenv import load_dotenv
load_dotenv()

app = FastAPI(title="Time Tracker API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"]
)

import jwt
from datetime import datetime, timedelta, timezone
from pwdlib import PasswordHash
from sqlalchemy import Column, Integer, String
from pydantic import BaseModel, EmailStr, Field
from fastapi.security import OAuth2PasswordBearer

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
    end_time = Column(DateTime, nullable=True)  
    notes = Column(Text, default="")
    task_id = Column(Integer, nullable=True, index=True)


class Task(Base):
    __tablename__ = "tasks"

    id = Column(Integer, primary_key=True)
    title = Column(String(120), nullable=False)
    category = Column(String(30), nullable=False)
    description = Column(Text, default="")
    priority = Column(String(20), default="Medium", nullable=False)
    due_date = Column(DateTime, nullable=True)
    done = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=datetime.now)


class Goal(Base):
    __tablename__ = "goals"
    category = Column(String(30), primary_key=True)
    daily_minutes = Column(Integer, nullable=False)

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)


class RegisterIn(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)


class LoginIn(BaseModel):
    email: EmailStr
    password: str


password_hash = PasswordHash.recommended()

SECRET_KEY = os.getenv("SECRET_KEY")

if not SECRET_KEY:
    raise RuntimeError("SECRET_KEY is missing from backend/.env")

ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 1440


def make_token(user_id: int):
    expires = datetime.now(timezone.utc) + timedelta(
        minutes=ACCESS_TOKEN_EXPIRE_MINUTES
    )

    return jwt.encode(
        {
            "sub": str(user_id),
            "exp": expires
        },
        SECRET_KEY,
        algorithm=ALGORITHM
    )


# Create database tables
Base.metadata.create_all(engine)

# Add new columns to existing tasks table
with engine.begin() as conn:
    conn.execute(text(
        "ALTER TABLE tasks ADD COLUMN IF NOT EXISTS description TEXT DEFAULT ''"
    ))

    conn.execute(text(
        "ALTER TABLE tasks ADD COLUMN IF NOT EXISTS priority VARCHAR(20) DEFAULT 'Medium'"
    ))

    conn.execute(text(
        "ALTER TABLE tasks ADD COLUMN IF NOT EXISTS due_date TIMESTAMP NULL"
    ))

# Add task_id to existing activities table
with engine.begin() as conn:
    conn.execute(text(
        "ALTER TABLE activities ADD COLUMN IF NOT EXISTS task_id INTEGER"
    ))


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl="/api/auth/login"
)


def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
):
    unauthorized = HTTPException(
        status_code=401,
        detail="Invalid or expired login session"
    )

    try:
        payload = jwt.decode(
            token,
            SECRET_KEY,
            algorithms=[ALGORITHM]
        )

        user_id = int(payload.get("sub"))

    except (jwt.InvalidTokenError, TypeError, ValueError):
        raise unauthorized

    user = db.get(User, user_id)

    if not user:
        raise unauthorized

    return user


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
    title: str = Field(min_length=1, max_length=120)
    category: str
    description: str = ""
    priority: str = "Medium"
    due_date: Optional[datetime] = None


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



@app.post("/api/timer/start")
def start_timer(body: StartIn, db: Session = Depends(get_db)):
    validate(body.category)

    if db.query(Activity).filter(
        Activity.end_time.is_(None)
    ).first():
        raise HTTPException(400, "Stop the running timer first")

    title = body.title.strip()
    category = body.category

    if body.task_id:
        t = db.get(Task, body.task_id)

        if not t:
            raise HTTPException(404, "Work not found")

        if t.done:
            raise HTTPException(
                400,
                "Completed work cannot be started"
            )

        title = t.title
        category = t.category

    a = Activity(
        title=title,
        category=category,
        start_time=datetime.now(),
        task_id=body.task_id
    )

    db.add(a)
    db.commit()
    db.refresh(a)

    return to_dict(a)

@app.post("/api/timer/stop")
def stop_timer(db: Session = Depends(get_db)):
    a = db.query(Activity).filter(Activity.end_time.is_(None)).first()
    if not a:
        raise HTTPException(400, "No timer is running")
    a.end_time = datetime.now()
    db.commit(); db.refresh(a)
    return to_dict(a)



@app.get("/api/tasks")
def list_tasks(db: Session = Depends(get_db)):
    spent = defaultdict(float)

    for a in db.query(Activity).filter(
        Activity.task_id.isnot(None)
    ).all():
        spent[a.task_id] += minutes(a)

    tasks = db.query(Task).order_by(
        Task.done,
        Task.created_at.desc()
    ).all()

    return [
        {
            "id": t.id,
            "title": t.title,
            "category": t.category,
            "description": t.description or "",
            "priority": t.priority or "Medium",
            "due_date": t.due_date.isoformat() if t.due_date else None,
            "done": t.done,
            "spent_minutes": round(spent.get(t.id, 0), 1)
        }
        for t in tasks
    ]


@app.post("/api/tasks")
def create_task(body: TaskIn, db: Session = Depends(get_db)):
    validate(body.category)

    if body.priority not in ["Low", "Medium", "High"]:
        raise HTTPException(400, "Invalid priority")

    task = Task(
        title=body.title.strip(),
        category=body.category,
        description=body.description,
        priority=body.priority,
        due_date=naive(body.due_date)
    )

    db.add(task)
    db.commit()
    db.refresh(task)

    return {"id": task.id, "message": "Work added successfully"}


@app.put("/api/tasks/{tid}")
def update_task(
    tid: int,
    body: TaskIn,
    db: Session = Depends(get_db)
):
    validate(body.category)

    if body.priority not in ["Low", "Medium", "High"]:
        raise HTTPException(400, "Invalid priority")

    task = db.get(Task, tid)

    if not task:
        raise HTTPException(404, "Work not found")

    task.title = body.title.strip()
    task.category = body.category
    task.description = body.description
    task.priority = body.priority
    task.due_date = naive(body.due_date)

    db.commit()
    db.refresh(task)

    return {"id": task.id, "message": "Work updated successfully"}


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

# Consistency: heatmap + streaks
ACTIVE_MINUTES = 15  # a day counts as "active" after this many productive minutes


@app.get("/api/reports/heatmap")
def heatmap(days: int = 112, db: Session = Depends(get_db)):
    days = max(7, min(days, 365))
    today = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
    start = today - timedelta(days=364)
    per_day = {}
    for a in db.query(Activity).filter(Activity.start_time >= start).all():
        d = per_day.setdefault(a.start_time.date().isoformat(), {"productive": 0.0, "total": 0.0})
        m = minutes(a)
        d["total"] += m
        if a.category in PRODUCTIVE:
            d["productive"] += m

    def active(day):
        return per_day.get(day.date().isoformat(), {"productive": 0})["productive"] >= ACTIVE_MINUTES

    best = run = 0
    for i in range(365):
        run = run + 1 if active(start + timedelta(days=i)) else 0
        best = max(best, run)
    cur, day = 0, today
    if not active(day):
        day -= timedelta(days=1)  # today is still in progress, so yesterday keeps the streak alive
    while active(day):
        cur += 1
        day -= timedelta(days=1)

    series = []
    for i in range(days - 1, -1, -1):
        d = (today - timedelta(days=i)).date().isoformat()
        v = per_day.get(d, {"productive": 0.0, "total": 0.0})
        series.append({"date": d, "productive": round(v["productive"], 1), "total": round(v["total"], 1)})
    return {"days": series, "current_streak": cur, "best_streak": best,
            "active_days": sum(1 for s in series if s["productive"] >= ACTIVE_MINUTES)}


@app.post("/api/auth/register")
def register(body: RegisterIn, db: Session = Depends(get_db)):
    email = body.email.lower()

    if db.query(User).filter(User.email == email).first():
        raise HTTPException(409, "Email already registered")

    user = User(
        name=body.name.strip(),
        email=email,
        hashed_password=password_hash.hash(body.password)
    )

    db.add(user)
    db.commit()
    db.refresh(user)

    return {"message": "Account created successfully"}


@app.post("/api/auth/login")
def login(body: LoginIn, db: Session = Depends(get_db)):
    user = db.query(User).filter(
        User.email == body.email.lower()
    ).first()

    if not user or not password_hash.verify(
        body.password, user.hashed_password
    ):
        raise HTTPException(401, "Incorrect email or password")

    return {
        "access_token": make_token(user.id),
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "name": user.name,
            "email": user.email
        }
    }


@app.get("/api/auth/me")
def current_profile(request: Request, db: Session = Depends(get_db)):
    user = db.get(User, request.state.user_id)

    return {
        "id": user.id,
        "name": user.name,
        "email": user.email
    }


class ProfileUpdateIn(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    email: EmailStr


def profile_dict(user):
    return {
        "id": user.id,
        "name": user.name,
        "email": user.email
    }


class ProfileUpdateIn(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    email: EmailStr


@app.get("/api/auth/me")
def current_profile(
    user: User = Depends(get_current_user)
):
    return {
        "id": user.id,
        "name": user.name,
        "email": user.email
    }


@app.put("/api/auth/me")
def update_profile(
    body: ProfileUpdateIn,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    name = body.name.strip()
    email = body.email.lower().strip()

    existing = db.query(User).filter(
        User.email == email,
        User.id != user.id
    ).first()

    if existing:
        raise HTTPException(
            status_code=409,
            detail="Email already in use"
        )

    user.name = name
    user.email = email

    db.commit()
    db.refresh(user)

    return {
        "id": user.id,
        "name": user.name,
        "email": user.email
    }
