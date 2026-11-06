
const TOKEN_KEY = "access_token";

export function saveToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

async function call(path, method = "GET", body) {
  let res;

  try {
    res = await fetch("/api" + path, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(getToken()
          ? { Authorization: `Bearer ${getToken()}` }
          : {})
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error("Unable to connect to backend.");
  }

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    if (res.status === 401) {
      clearToken();
      window.dispatchEvent(new Event("auth:expired"));
    }
    throw new Error(data.detail || `API request failed (${res.status})`);
  }

  return data;
}

export const api = {
  register: (body) => call("/auth/register", "POST", body),
  login: (body) => call("/auth/login", "POST", body),
  me: () => call("/auth/me"),

  // Update user profile
  updateProfile: (body) => call("/auth/me", "PUT", body),

  meta: () => call("/meta"),
  allActivities: () => call("/activities"),
  heatmap: () => call("/reports/heatmap"),
  activities: (date) => call(`/activities?date=${date}`),
  categoryActivities: (category, days = 7) =>
    call(`/activities?category=${category}&days=${days}`),
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
  setGoal: (cat, m) =>
    call(`/goals/${cat}`, "PUT", { daily_minutes: m }),
};