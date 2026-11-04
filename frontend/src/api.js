async function call(path, method = "GET", body) {
  const res = await fetch("/api" + path, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.detail || "Something went wrong");
  return data;
}

export const api = {
  meta: () => call("/meta"),
  activities: (date) => call(`/activities?date=${date}`),
  categoryActivities: (category, days = 7) => call(`/activities?category=${category}&days=${days}`),
  addActivity: (b) => call("/activities", "POST", b),
  deleteActivity: (id) => call(`/activities/${id}`, "DELETE"),
  startTimer: (b) => call("/timer/start", "POST", b),
  stopTimer: () => call("/timer/stop", "POST"),
  daily: (date) => call(`/reports/daily?date=${date}`),
  weekly: () => call("/reports/weekly"),
  stats: () => call("/stats"),
  tasks: () => call("/tasks"),
  addTask: (b) => call("/tasks", "POST", b),
  toggleTask: (id) => call(`/tasks/${id}/toggle`, "PATCH"),
  deleteTask: (id) => call(`/tasks/${id}`, "DELETE"),
  setGoal: (cat, m) => call(`/goals/${cat}`, "PUT", { daily_minutes: m }),
};