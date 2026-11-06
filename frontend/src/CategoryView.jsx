import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { api } from "./api";
import { useData } from "./DataContext";
import { COLORS, fmt } from "./utils";

const INFO = {
  Coding: ["Build, debug and ship", ["Practice problems", "Build a feature", "Fix bugs", "Code review"]],
  Learning: ["Courses, reading and revision", ["Watch a course", "Read documentation", "Revision", "Take notes"]],
  Meeting: ["Calls and syncs", ["Team standup", "Client call", "Planning", "1:1 chat"]],
  Personal: ["Life outside work", ["Exercise", "Reading", "Errands", "Family time"]],
  Break: ["Rest and recharge", ["Tea break", "Short walk", "Stretching", "Lunch"]],
};

const dayKey = (d) => d.toLocaleDateString("en-CA"); // YYYY-MM-DD in local time
function dayLabel(key) {
  const today = new Date(), yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (key === dayKey(today)) return "Today";
  if (key === dayKey(yesterday)) return "Yesterday";
  return new Date(key + "T00:00:00").toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "short" });
}

export default function CategoryView({ category }) {
  const d = useData();
  const color = COLORS[category];
  const [tagline, ideas] = INFO[category] || ["Track your time", []];
  const [list, setList] = useState([]);
  const [title, setTitle] = useState("");
  const [taskTitle, setTaskTitle] = useState("");

  useEffect(() => {
    api.categoryActivities(category, 7).then(setList).catch(() => {});
  }, [category, d.acts]);

  const today = d.daily?.by_category.find((c) => c.category === category)?.minutes || 0;
  const week = d.weekly.reduce((s, x) => s + (x[category] || 0), 0);
  const allWeek = d.weekly.reduce((s, x) => s + (x.total || 0), 0);
  const share = allWeek ? Math.round((week / allWeek) * 100) : 0;
  const finished = list.filter((a) => a.end_time);
  const avg = finished.length ? finished.reduce((s, a) => s + a.minutes, 0) / finished.length : 0;
  const goal = d.daily?.goals.find((g) => g.category === category);
  const goalPct = goal ? Math.min(100, (goal.done / goal.goal) * 100) : 0;
  const myTasks = d.tasks.filter((t) => t.category === category);
  const here = d.running && d.running.category === category;
  const todayKey = dayKey(new Date());
  const chart = d.weekly.map((x) => ({ ...x, isToday: x.date === todayKey }));

  const groups = [];
  list.forEach((a) => {
    const k = a.start_time.slice(0, 10);
    let g = groups.find((x) => x.k === k);
    if (!g) { g = { k, items: [], total: 0 }; groups.push(g); }
    g.items.push(a); g.total += a.minutes;
  });

  const addTask = () => { d.addTask({ title: taskTitle, category }); setTaskTitle(""); };

  return (
    <>
      <section className="cat-hero" style={{ "--cat": color }}>
        <h2>{tagline}</h2>
        {here ? (
          <div className="row left">
            <strong>{d.running.title}</strong><span className="live">running</span>
            <button className="stop" onClick={d.stopTimer}>Stop timer</button>
          </div>
        ) : d.running ? (
          <p className="muted">A {d.running.category} timer is running. Stop it to start {category.toLowerCase()} time.</p>
        ) : (
          <>
            <div className="row left">
              <input placeholder={`What are you doing in ${category}?`} value={title}
                onChange={(e) => setTitle(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && title.trim()) { d.startTimer({ title, category }); setTitle(""); } }} />
              <button disabled={!title.trim()} onClick={() => { d.startTimer({ title, category }); setTitle(""); }}>Start timer</button>
            </div>
            <div className="chips">
              <span>Quick start</span>
              {ideas.map((i) => <button key={i} className="chip" onClick={() => d.startTimer({ title: i, category })}>{i}</button>)}
            </div>
          </>
        )}
        <div className="goal-line">
          {goal ? (
            <>
              <div className="bar"><i style={{ width: `${goalPct}%`, background: color }} /></div>
              <small>Daily goal: {fmt(goal.done)} of {fmt(goal.goal)}{goalPct >= 100 ? " · goal reached" : ""}</small>
            </>
          ) : <small><Link to="/goals">Set a daily goal for {category}</Link> to track your progress here.</small>}
        </div>
      </section>

      <div className="stats">
        <div><b>{fmt(today)}</b><span>Today</span></div>
        <div><b>{fmt(week)}</b><span>Last 7 days</span></div>
        <div><b>{share}%</b><span>Of all tracked time</span></div>
        <div><b>{avg ? fmt(avg) : "—"}</b><span>Average session</span></div>
      </div>

      <div className="grid">
        <section className="panel">
          <h2>Last 7 days</h2>
          {week === 0 ? (
            <div className="empty"><b>No {category.toLowerCase()} time this week</b><span>Pick a quick start above to log your first session.</span></div>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={chart}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="day" /><YAxis unit="m" width={50} />
                <Tooltip formatter={(v) => [fmt(v), category]} cursor={{ fill: "transparent" }} />
                <Bar dataKey={category} radius={[6, 6, 0, 0]}>
                  {chart.map((x) => <Cell key={x.date} fill={color} fillOpacity={x.isToday ? 1 : 0.45} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </section>

        <section className="panel">
          <h2>{category} tasks <small className="inline">{myTasks.filter((t) => !t.done).length} open</small></h2>
          <div className="row left">
            <input placeholder={`Add a ${category.toLowerCase()} task`} value={taskTitle}
              onChange={(e) => setTaskTitle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && taskTitle.trim() && addTask()} />
            <button disabled={!taskTitle.trim()} onClick={addTask}>Add</button>
          </div>
          {myTasks.length === 0 && <div className="empty"><b>No tasks yet</b><span>Add one above, then press Start to time it.</span></div>}
          <ul className="list">
            {myTasks.map((t) => (
              <li key={t.id}>
                <input type="checkbox" checked={t.done} onChange={() => d.toggleTask(t.id)} aria-label="Task complete" />
                <div className="grow"><strong className={t.done ? "done" : ""}>{t.title}</strong><small>{fmt(t.spent_minutes)} spent</small></div>
                <button className="ghost" disabled={!!d.running || t.done} onClick={() => d.startTask(t)}>Start</button>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className="panel">
        <h2>Recent {category.toLowerCase()} activity</h2>
        {groups.length === 0 && <div className="empty"><b>Nothing logged yet</b><span>Your sessions will appear here, grouped by day.</span></div>}
        {groups.map((g) => (
          <div key={g.k}>
            <div className="day-head"><span>{dayLabel(g.k)}</span><span>{fmt(g.total)}</span></div>
            <ul className="list">
              {g.items.map((a) => (
                <li key={a.id}>
                  <span className="dot" style={{ background: color }} />
                  <div>
                    <strong>{a.title}</strong>
                    <small>{a.start_time.slice(11, 16)}–{a.end_time ? a.end_time.slice(11, 16) : "running"}</small>
                  </div>
                  <span className="dur">{fmt(a.minutes)}</span>
                  <button className="ghost" onClick={() => d.deleteActivity(a.id)} aria-label="Delete">✕</button>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>
    </>
  );
}