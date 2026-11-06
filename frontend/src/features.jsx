import React, { useEffect, useRef, useState } from "react";
import { api } from "./api";
import { useData } from "./DataContext";
import { fmt, localISO, pad } from "./utils";

/*Dark / light theme*/
export function ThemeToggle() {
  const [theme, setTheme] = useState(() => document.documentElement.dataset.theme || "light");
  const dark = theme === "dark";
  const label = dark ? "Switch to light mode" : "Switch to dark mode";

  const toggle = () => {
    const next = dark ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem("theme", next); } catch { /* storage unavailable */ }
    setTheme(next);
  };

  return (
    <button className="ghost icon-btn" onClick={toggle} aria-label={label} title={label}>
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor"
        strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        {dark ? (
          <>
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
          </>
        ) : (
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        )}
      </svg>
    </button>
  );
}

/*Streaks + activity heatmap*/
const level = (m) => (m <= 0 ? 0 : m < 30 ? 1 : m < 60 ? 2 : m < 120 ? 3 : 4);

export function Consistency() {
  const { acts } = useData();
  const [data, setData] = useState(null);
  useEffect(() => { api.heatmap().then(setData).catch(() => {}); }, [acts]);
  if (!data) return null;

  const first = new Date(data.days[0].date + "T00:00:00");
  const offset = (first.getDay() + 6) % 7; // weeks start on Monday
  const cells = [...Array(offset).fill(null), ...data.days];
  return (
    <section className="panel" style={{ marginTop: 16 }}>
      <h2>Consistency</h2>
      <div className="stats streaks">
        <div><b>{data.current_streak} {data.current_streak === 1 ? "day" : "days"}</b><span>Current streak</span></div>
        <div><b>{data.best_streak} {data.best_streak === 1 ? "day" : "days"}</b><span>Best streak this year</span></div>
        <div><b>{data.active_days}</b><span>Active days (last 16 weeks)</span></div>
      </div>
      <div className="heat" role="img" aria-label="Productive time per day for the last 16 weeks">
        {cells.map((d, i) => d
          ? <i key={d.date} className={`lv${level(d.productive)}`} title={`${d.date}: ${fmt(d.productive)} productive`} />
          : <i key={`pad${i}`} className="pad" />)}
      </div>
      <div className="legend">Less <i className="lv0" /><i className="lv1" /><i className="lv2" /><i className="lv3" /><i className="lv4" /> More</div>
      <p className="muted">A day counts as active after 15 productive minutes (Coding, Learning or Meeting).</p>
    </section>
  );
}

/*Focus (Pomodoro) timer*/
const MODES = { focus: ["Focus", 25], short: ["Short break", 5], long: ["Long break", 15] };
const R = 96;
const C = 2 * Math.PI * R;

function beep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator(), gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1);
    osc.start(); osc.stop(ctx.currentTime + 1);
  } catch { /* audio not available */ }
}

export function FocusTimer() {
  const { categories, addActivity } = useData();
  const [mode, setMode] = useState("focus");
  const [left, setLeft] = useState(MODES.focus[1] * 60);
  const [running, setRunning] = useState(false);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("Coding");
  const [sessions, setSessions] = useState(0);
  const endAt = useRef(0);
  const latest = useRef({});
  latest.current = { mode, title, category, sessions };

  const reset = (m) => { setMode(m); setLeft(MODES[m][1] * 60); setRunning(false); };

  const finish = () => {
    const { mode, title, category, sessions } = latest.current;
    beep();
    if (mode === "focus") {
      const end = new Date();
      addActivity({
        title: title.trim() || "Focus session", category, notes: "Pomodoro",
        start_time: localISO(new Date(end.getTime() - MODES.focus[1] * 60000)), end_time: localISO(end),
      });
      const n = sessions + 1;
      setSessions(n);
      reset(n % 4 === 0 ? "long" : "short");
    } else {
      reset("focus");
    }
  };

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      const s = Math.max(0, Math.round((endAt.current - Date.now()) / 1000));
      setLeft(s);
      if (s === 0) { clearInterval(id); finish(); }
    }, 250);
    return () => clearInterval(id);
  }, [running]);

  const mmss = `${pad(Math.floor(left / 60))}:${pad(left % 60)}`;
  useEffect(() => {
    if (running) document.title = `${mmss} · ${MODES[mode][0]}`;
    return () => { document.title = "Time Tracker"; };
  }, [mmss, running, mode]);

  const total = MODES[mode][1] * 60;
  const toggle = () => {
    if (!running) endAt.current = Date.now() + left * 1000;
    setRunning(!running);
  };

  return (
    <section className="panel focus">
      <div className="modes">
        {Object.entries(MODES).map(([k, [label]]) => (
          <button key={k} className={k === mode ? "on" : ""} onClick={() => reset(k)}>{label}</button>
        ))}
      </div>
      <div className="ring-wrap">
        <svg viewBox="0 0 220 220" className="ring" aria-hidden="true">
          <circle className="ring-bg" cx="110" cy="110" r={R} />
          <circle className="ring-fg" cx="110" cy="110" r={R} strokeDasharray={C} strokeDashoffset={C * (1 - left / total)} />
        </svg>
        <div className="ring-time" role="timer">{mmss}<small>{MODES[mode][0]}</small></div>
      </div>
      <div className="focus-controls">
        <button onClick={toggle}>{running ? "Pause" : left < total ? "Resume" : "Start"}</button>
        <button className="ghost" onClick={() => reset(mode)} disabled={!running && left === total}>Reset</button>
      </div>
      {mode === "focus" && (
        <div className="row">
          <input placeholder="What will you focus on?" value={title} onChange={(e) => setTitle(e.target.value)} />
          <select value={category} onChange={(e) => setCategory(e.target.value)}>
            {categories.map((c) => <option key={c}>{c}</option>)}
          </select>
        </div>
      )}
      <p className="muted">Focus sessions finished: {sessions}. Each one is saved to your activities automatically, and every fourth break is a long one.</p>
    </section>
  );
}

/*CSV export*/
export function ExportButton() {
  const [busy, setBusy] = useState(false);
  const run = async () => {
    setBusy(true);
    try {
      const rows = await api.allActivities();
      const esc = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
      const head = ["Title", "Category", "Start", "End", "Minutes", "Notes"];
      const body = rows.map((a) => [a.title, a.category, a.start_time, a.end_time || "", a.minutes, a.notes]);
      const csv = [head, ...body].map((r) => r.map(esc).join(",")).join("\n");
      const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = `time-tracker-${new Date().toISOString().slice(0, 10)}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } finally { setBusy(false); }
  };
  return <button className="ghost" disabled={busy} onClick={run}>Export all as CSV</button>;
}