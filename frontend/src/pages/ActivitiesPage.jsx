import React from "react";
import { ManualForm } from "../components";
import { useData } from "../DataContext";
import { COLORS, fmt } from "../utils";

export default function ActivitiesPage() {
  const { acts, categories, addActivity, deleteActivity } = useData();
  return (
    <div className="grid">
      <section className="panel"><h2>Add activity</h2><ManualForm categories={categories} onAdd={addActivity} /></section>
      <section className="panel">
        <h2>Today's activities</h2>
        {acts.length === 0 && <p className="muted">No activities yet. Start the timer or add one manually.</p>}
        <ul className="list">
          {acts.map((a) => (
            <li key={a.id}>
              <span className="dot" style={{ background: COLORS[a.category] }} />
              <div>
                <strong>{a.title}</strong>
                <small>{a.category} · {a.start_time.slice(11, 16)}–{a.end_time ? a.end_time.slice(11, 16) : "running"}</small>
              </div>
              <span className="dur">{fmt(a.minutes)}</span>
              <button className="ghost" onClick={() => deleteActivity(a.id)} aria-label="Delete">✕</button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}