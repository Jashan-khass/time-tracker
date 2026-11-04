import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { api } from "./api";
import { COLORS, todayStr } from "./utils";

const Ctx = createContext(null);
export const useData = () => useContext(Ctx);

export function DataProvider({ children }) {
  const [categories, setCategories] = useState(Object.keys(COLORS));
  const [acts, setActs] = useState([]);
  const [daily, setDaily] = useState(null);
  const [weekly, setWeekly] = useState([]);
  const [stats, setStats] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    try {
      const d = todayStr();
      console.log("STATS RESPONSE:", s);
console.log("DAILY RESPONSE:", dr);
console.log("WEEKLY RESPONSE:", w);
      const [a, dr, w, s, t] = await Promise.all([api.activities(d), api.daily(d), api.weekly(), api.stats(), api.tasks()]);
      setActs(
  Array.isArray(a) ? a :
  Array.isArray(a?.items) ? a.items :
  Array.isArray(a?.activities) ? a.activities : []
);

setDaily(
  dr && typeof dr === "object"
    ? dr
    : null
);

setWeekly(
  Array.isArray(w) ? w :
  Array.isArray(w?.items) ? w.items : []
);

setStats(s);

setTasks(
  Array.isArray(t) ? t :
  Array.isArray(t?.items) ? t.items :
  Array.isArray(t?.tasks) ? t.tasks : []
);

setError("");
    } catch (e) {
      setError("Could not reach the backend. Check that FastAPI is running on port 8000.");
    }
  }, []);

  useEffect(() => {
    api.meta()
  .then((m) => {
    setCategories(
      Array.isArray(m?.categories) ? m.categories : Object.keys(COLORS)
    );
  })
  .catch((err) => {
    console.error("Failed to load categories:", err);
    setCategories(Object.keys(COLORS));
  });
    refresh();
  }, [refresh]);

  const run = (fn) => async (...args) => {
    try { await fn(...args); setError(""); await refresh(); } catch (e) { setError(e.message); }
  };

  const value = {
    categories, acts, daily, weekly, stats, tasks, error,
    running: acts.find((a) => !a.end_time),
    startTimer: run(api.startTimer), stopTimer: run(api.stopTimer),
    addActivity: run(api.addActivity), deleteActivity: run(api.deleteActivity),
    addTask: run(api.addTask), toggleTask: run(api.toggleTask), deleteTask: run(api.deleteTask),
    setGoal: run(api.setGoal),
    startTask: (t) => run(api.startTimer)({ title: t.title, category: t.category, task_id: t.id }),
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}