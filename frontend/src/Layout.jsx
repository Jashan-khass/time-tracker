
import React, { useState } from "react";
import {
  NavLink,
  Outlet,
  useLocation,
  useNavigate
} from "react-router-dom";

import { useData } from "./DataContext";
import { COLORS } from "./utils";
import { ThemeToggle } from "./features";
import { useAuth } from "./AuthContext";

const MAIN = [
  ["/", "Dashboard", "Overview of today"],
  ["/tasks", "Tasks", "Plan and track your tasks"],
  ["/work", "Work Management", "Manage and track all your work"],
  ["/focus", "Focus timer", "Pomodoro sessions that log themselves"],
  ["/activities", "All activities", "Log and review activities"],
  ["/analytics", "Analytics", "Weekly charts and trends"],
  ["/goals", "Goals", "Daily goals"],
];

function ProfileIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M20 21a8 8 0 0 0-16 0" />
      <circle cx="12" cy="8" r="4" />
    </svg>
  );
}

export default function Layout() {
  const { categories, running, error } = useData();
  const { pathname } = useLocation();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [profileMenuOpen, setProfileMenuOpen] = useState(false);

  const slug = pathname.startsWith("/activity/")
    ? pathname.split("/")[2]
    : null;

  const catName =
    slug && categories.find(
      (c) => c.toLowerCase() === slug
    );

  const current = MAIN.find(([p]) => p === pathname);

  const title =
    pathname === "/profile"
      ? "My Profile"
      : catName || (current && current[1]) || "Time Tracker";

  const subtitle =
    pathname === "/profile"
      ? "View and update your account details"
      : catName
      ? `Everything you did in ${catName}`
      : current && current[2];

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  return (
    <div className="shell">
      <aside className="side">
        <div className="brand">Time Tracker</div>

        <p className="group">Workspace</p>

        {MAIN.map(([to, label]) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
          >
            {label}
          </NavLink>
        ))}

        <p className="group">Activity types</p>

        {(categories || []).map((c) => (
          <NavLink
            key={c}
            to={`/activity/${c.toLowerCase()}`}
          >
            <span
              className="dot"
              style={{ background: COLORS[c] }}
            />
            {c}
          </NavLink>
        ))}

        {running && (
          <NavLink to="/" className="running">
            Timer running: {running.title}
          </NavLink>
        )}
      </aside>

      <main className="main">
        <div className="topbar">
          <div>
            <h1>{title}</h1>
            {subtitle && (
              <p className="muted">{subtitle}</p>
            )}
          </div>

          <div className="top-actions">
            <span>
              {new Date().toLocaleDateString("en-IN", {
                weekday: "long",
                day: "numeric",
                month: "long"
              })}
            </span>

            <div className="profile-menu-wrap">
              <button
                type="button"
                className="profile-icon-button"
                aria-label="Open profile menu"
                aria-expanded={profileMenuOpen}
                title="Profile"
                onClick={() =>
                  setProfileMenuOpen((open) => !open)
                }
              >
                <ProfileIcon />
              </button>

              {profileMenuOpen && (
                <div className="profile-dropdown">
                  <div className="profile-dropdown-user">
                    <strong>{user?.name || "User"}</strong>
                    <small>{user?.email || ""}</small>
                  </div>

                  <NavLink
                    to="/profile"
                    onClick={() => setProfileMenuOpen(false)}
                  >
                    My Profile
                  </NavLink>

                  <button
                    type="button"
                    className="profile-logout"
                    onClick={handleLogout}
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>

            <ThemeToggle />
          </div>
        </div>

        {error && <div className="error">{error}</div>}

        <Outlet />
      </main>
    </div>
  );
}
