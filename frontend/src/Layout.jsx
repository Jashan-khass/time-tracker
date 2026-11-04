import React from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { useData } from "./DataContext";
import { COLORS } from "./utils";

const MAIN = [
  ["/", "Dashboard", "Overview of today"],
  ["/tasks", "Tasks", "Plan and track your tasks"],
  ["/activities", "All activities", "Log and review activities"],
  ["/analytics", "Analytics", "Weekly charts and trends"],
  ["/goals", "Goals", "Daily goals"],
];

export default function Layout() {
  const { categories, running, error } = useData();
  const { pathname } = useLocation();
  const slug = pathname.startsWith("/activity/") ? pathname.split("/")[2] : null;
  const catName = slug && categories.find((c) => c.toLowerCase() === slug);
  const current = MAIN.find(([p]) => p === pathname);
  const title = catName || (current && current[1]) || "Time Tracker";
  const subtitle = catName ? `Everything you did in ${catName}` : current && current[2];

  return (
    <div className="shell">
      <aside className="side">
        <div className="brand">Time Tracker</div>
        <p className="group">Workspace</p>
        {MAIN.map(([to, label]) => (
          <NavLink key={to} to={to} end={to === "/"}>{label}</NavLink>
        ))}
        <p className="group">Activity types</p>
        {(categories || []).map((c) => (
          <NavLink key={c} to={`/activity/${c.toLowerCase()}`}>
            <span className="dot" style={{ background: COLORS[c] }} /> {c}
          </NavLink>
        ))}
        {running && <NavLink to="/" className="running">Timer running: {running.title}</NavLink>}
      </aside>
      <main className="main">
        <div className="topbar">
          <div><h1>{title}</h1>{subtitle && <p className="muted">{subtitle}</p>}</div>
          <span className="muted">{new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}</span>
        </div>
        {error && <div className="error">{error}</div>}
        <Outlet />
      </main>
    </div>
  );
}