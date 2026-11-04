import React from "react";
import { useEffect, useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { api } from "./api";
import { COLORS, clock, fmt, localISO } from "./utils";

export function Tasks({ tasks, categories, running, onAdd, onToggle, onDelete, onStart }) {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("Coding");
  const open = tasks.filter((t) => !t.done).length;
  return (
    <section className="panel tasks">
      <h2>Tasks <small className="inline">{open} left</small></h2>
      <div className="row left">
        <input placeholder="New task (e.g. Coding practice)" value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && title.trim()) { onAdd({ title, category }); setTitle(""); } }} />
        <select value={category} onChange={(e) => setCategory(e.target.value)}>
          {categories.map((c) => <option key={c}>{c}</option>)}
        </select>
        <button disabled={!title.trim()} onClick={() => { onAdd({ title, category }); setTitle(""); }}>Add task</button>
      </div>
      {tasks.length === 0 && <p className="muted">No tasks yet. Add your first task above.</p>}
      <ul className="list">
        {tasks.map((t) => (
          <li key={t.id}>
            <input type="checkbox" checked={t.done} onChange={() => onToggle(t.id)} aria-label="Task complete" />
            <span className="dot" style={{ background: COLORS[t.category] }} />
            <div className="grow">
              <strong className={t.done ? "done" : ""}>{t.title}</strong>
              <small>{t.category} · {fmt(t.spent_minutes)} spent</small>
            </div>
            {!t.done && (running && running.task_id === t.id
              ? <span className="live">Timer running</span>
              : <button className="ghost" disabled={!!running} onClick={() => onStart(t)}
                  title={running ? "Stop the running timer first" : ""}>Start</button>)}
            <button className="ghost" onClick={() => onDelete(t.id)} aria-label="Delete task">✕</button>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function Timer({ running, categories, onStart, onStop }) {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("Coding");
  const [secs, setSecs] = useState(0);

  useEffect(() => {
    if (!running) { setSecs(0); return; }
    const tick = () => setSecs(Math.max(0, Math.floor((Date.now() - new Date(running.start_time)) / 1000)));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [running]);

  return (
    <section className="timer">
      <div className="clock">{clock(secs)}</div>
      {running ? (
        <>
          <div className="now">{running.title} <small>({running.category})</small></div>
          <button className="stop" onClick={onStop}>Stop timer</button>
        </>
      ) : (
        <div className="row">
          <input placeholder="What are you working on? (e.g. FastAPI APIs)" value={title}
            onChange={(e) => setTitle(e.target.value)} />
          <select value={category} onChange={(e) => setCategory(e.target.value)}>
            {categories.map((c) => <option key={c}>{c}</option>)}
          </select>
          <button disabled={!title.trim()} onClick={() => { onStart({ title, category }); setTitle(""); }}>
            Start timer
          </button>
        </div>
      )}
    </section>
  );
}


export function Stats({ stats }) {
  if (!stats) return null;

  const productiveHours = Number(stats.productive_hours);
  const dailyAverage = Number(stats.daily_avg_minutes);
  const trend = stats.trend_percent;

  const validHours = Number.isFinite(productiveHours);
  const validAverage = Number.isFinite(dailyAverage);

  return (
    <div className="stats">
      <div>
        <b>{validHours ? `${productiveHours}h` : "—"}</b>
        <span>Productive hours (7 days)</span>
      </div>

      <div>
        <b>
          {stats.most_used_activity?.title || "—"}
        </b>
        <span>Most-used activity</span>
      </div>

      <div>
        <b>{validAverage ? fmt(dailyAverage) : "—"}</b>
        <span>Daily average</span>
      </div>

      <div className={
        Number(trend) > 0 ? "up" : Number(trend) < 0 ? "down" : ""
      }>
        <b>
          {trend == null || !Number.isFinite(Number(trend))
            ? "—"
            : `${Number(trend) > 0 ? "+" : ""}${trend}%`}
        </b>
        <span>Trend vs last week</span>
      </div>
    </div>
  );
}


export function DailyReport({ daily }) {
  const categories = Array.isArray(daily?.by_category)
    ? daily.by_category
    : [];

  if (categories.length === 0) {
    return <p className="muted">No data for today yet.</p>;
  }

  return (
    <>
      <p className="muted">
        Total: <strong>{fmt(daily?.total_minutes ?? 0)}</strong>
      </p>

      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie
            data={categories}
            dataKey="minutes"
            nameKey="category"
            innerRadius={55}
            outerRadius={85}
          >
            {categories.map((c) => (
              <Cell
                key={c.category}
                fill={COLORS[c.category] || "#8884d8"}
              />
            ))}
          </Pie>

          <Tooltip formatter={(v) => fmt(v)} />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </>
  );
}

export function Goals({ daily, categories, onSet }) {
  const [vals, setVals] = useState({});
  const goalMap = Object.fromEntries((daily?.goals || []).map((g) => [g.category, g]));
  return (
    <ul className="list">
      {categories.filter((c) => c !== "Break").map((c) => {
        const g = goalMap[c];
        const pct = g ? Math.min(100, (g.done / g.goal) * 100) : 0;
        return (
          <li key={c} className="goal">
            <span className="dot" style={{ background: COLORS[c] }} />
            <div className="grow">
              <strong>{c}</strong>
              {g ? (
                <>
                  <div className="bar"><i style={{ width: `${pct}%`, background: COLORS[c] }} /></div>
                  <small>{fmt(g.done)} / {fmt(g.goal)}{pct >= 100 ? " · goal complete" : ""}</small>
                </>
              ) : <small>No goal set</small>}
            </div>
            <input type="number" min="0" placeholder="min" value={vals[c] ?? ""}
              onChange={(e) => setVals({ ...vals, [c]: e.target.value })} />
            <button className="ghost" onClick={() => { onSet(c, Number(vals[c] || 0)); setVals({ ...vals, [c]: "" }); }}>
              Set
            </button>
          </li>
        );
      })}
    </ul>
  );
}

export function ManualForm({ categories, onAdd }) {
  const now = new Date();
  const hourAgo = new Date(now.getTime() - 3600 * 1000);
  const [f, setF] = useState({
    title: "", category: "Coding",
    start: localISO(hourAgo).slice(0, 16), end: localISO(now).slice(0, 16),
  });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  return (
    <div className="form">
      <input placeholder="Activity name" value={f.title} onChange={set("title")} />
      <select value={f.category} onChange={set("category")}>
        {categories.map((c) => <option key={c}>{c}</option>)}
      </select>
      <label>Start<input type="datetime-local" value={f.start} onChange={set("start")} /></label>
      <label>End<input type="datetime-local" value={f.end} onChange={set("end")} /></label>
      <button disabled={!f.title.trim()}
        onClick={() => onAdd({ title: f.title, category: f.category, start_time: f.start + ":00", end_time: f.end + ":00" })}>
        Save activity
      </button>
    </div>
  );
}

export function CategoryPage({ category, acts, tasks, weekly, daily, running, onStart, onStop, onDelete, onToggle, onStartTask }) {
  const [list, setList] = useState([]);
  const [title, setTitle] = useState("");
  const color = COLORS[category];

  useEffect(() => {
  api.categoryActivities(category, 7)
    .then((res) => {
      const activities = Array.isArray(res)
        ? res
        : Array.isArray(res?.items)
        ? res.items
        : Array.isArray(res?.activities)
        ? res.activities
        : [];

      setList(activities);
    })
    .catch((err) => {
      console.error("Failed to load category activities:", err);
      setList([]);
    });
}, [category, acts]);

  const today = (Array.isArray(daily?.by_category)
  ? daily.by_category
  : []
).find((c) => c.category === category)?.minutes || 0;
  const safeWeekly = Array.isArray(weekly) ? weekly : [];

const week = safeWeekly.reduce(
  (sum, d) => sum + (d?.[category] || 0),
  0
);
  const myTasks = tasks.filter((t) => t.category === category);
  const here = running && running.category === category;

  return (
    <>
      <div className="stats">
        <div><b>{fmt(today)}</b><span>Today</span></div>
        <div><b>{fmt(week)}</b><span>Last 7 days</span></div>
        <div><b>{list.length}</b><span>Sessions (7 days)</span></div>
        <div><b>{myTasks.filter((t) => !t.done).length}</b><span>Open tasks</span></div>
      </div>

      <section className="panel" style={{ marginBottom: 16 }}>
        <h2>Track {category.toLowerCase()} time</h2>
        {here ? (
          <div className="row left">
            <strong>{running.title}</strong><span className="live">running</span>
            <button className="stop" onClick={onStop}>Stop timer</button>
          </div>
        ) : running ? (
          <p className="muted">A {running.category} timer is already running. Stop it first.</p>
        ) : (
          <div className="row left">
            <input placeholder={`What are you doing in ${category}?`} value={title} onChange={(e) => setTitle(e.target.value)} />
            <button disabled={!title.trim()} onClick={() => { onStart({ title, category }); setTitle(""); }}>Start timer</button>
          </div>
        )}
      </section>

      <div className="grid">
        <section className="panel">
          <h2>Last 7 days</h2>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={weekly}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="day" /><YAxis unit="m" width={50} /><Tooltip />
              <Bar dataKey={category} fill={color} />
            </BarChart>
          </ResponsiveContainer>
        </section>
        <section className="panel">
          <h2>{category} tasks</h2>
          {myTasks.length === 0 && <p className="muted">No {category.toLowerCase()} tasks. Add one on the Tasks page.</p>}
          <ul className="list">
            {myTasks.map((t) => (
              <li key={t.id} className={t.done ? "done" : ""}>
                <input type="checkbox" checked={t.done} onChange={() => onToggle(t.id)} aria-label="Task complete" />
                <div className="grow"><strong>{t.title}</strong><small>{fmt(t.spent_minutes)} spent</small></div>
                <button disabled={!!running || t.done} onClick={() => onStartTask(t)}>Start</button>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className="panel">
        <h2>{category} activities (last 7 days)</h2>
        {list.length === 0 && <p className="muted">No {category.toLowerCase()} activities yet.</p>}
        <ul className="list">
          {list.map((a) => (
            <li key={a.id}>
              <span className="dot" style={{ background: color }} />
              <div>
                <strong>{a.title}</strong>
                <small>{a.start_time.slice(5, 10)} · {a.start_time.slice(11, 16)}–{a.end_time ? a.end_time.slice(11, 16) : "running"}</small>
              </div>
              <span className="dur">{fmt(a.minutes)}</span>
              <button className="ghost" onClick={() => onDelete(a.id)} aria-label="Delete">✕</button>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}