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

    const [a, dr, w, s, t] = await Promise.all([
      api.activities(d),
      api.daily(d),
      api.weekly(),
      api.stats(),
      api.tasks(),
    ]);

    console.log("ACTIVITIES RESPONSE:", a);
    console.log("STATS RESPONSE:", s);
    console.log("DAILY RESPONSE:", dr);
    console.log("WEEKLY RESPONSE:", w);
    console.log("TASKS RESPONSE:", t);

    setActs(
      Array.isArray(a) ? a :
      Array.isArray(a?.items) ? a.items :
      Array.isArray(a?.activities) ? a.activities : []
    );

    setDaily(dr && typeof dr === "object" ? dr : null);

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
    console.error("Dashboard refresh failed:", e);
    setError(e.message || "Could not reach the backend.");
  }
}, []);

useEffect(() => {
  refresh();
}, [refresh]);

  const run = (fn) => async (...args) => {
  try {
    await fn(...args);
    setError("");
    await refresh();
    return true;
  } catch (e) {
    setError(e.message);
    return false;
  }
};

const value = {
  categories,
  acts,
  daily,
  weekly,
  stats,
  tasks,
  error,

  running: acts.find((a) => !a.end_time),

  // Timer
  startTimer: run(api.startTimer),
  stopTimer: run(api.stopTimer),

  // Activities
  addActivity: run(api.addActivity),
  deleteActivity: run(api.deleteActivity),

  // Tasks
  addTask: run(api.addTask),
  updateTask: run(api.updateTask),
  toggleTask: run(api.toggleTask),
  deleteTask: run(api.deleteTask),

  // Goals
  setGoal: run(api.setGoal),

  // Start task timer
  startTask: (t) =>
    run(api.startTimer)({
      title: t.title,
      category: t.category,
      task_id: t.id,
    }),
};

return <Ctx.Provider value={value}>{children}</Ctx.Provider>;

}