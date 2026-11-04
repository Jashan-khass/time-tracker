export const COLORS = {
  Coding: "#0f766e", Learning: "#2563eb", Meeting: "#9333ea",
  Personal: "#d97706", Break: "#94a3b8",
};
export const pad = (n) => String(n).padStart(2, "0");
export const localISO = (d) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
export const todayStr = () => localISO(new Date()).slice(0, 10);
export const fmt = (m) => (m >= 60 ? `${Math.floor(m / 60)}h ${Math.round(m % 60)}m` : `${Math.round(m)}m`);
export const clock = (s) => `${pad(Math.floor(s / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`;