import React from "react";
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useData } from "../DataContext";
import { COLORS } from "../utils";

export default function AnalyticsPage() {
  const { weekly, categories } = useData();
  return (
    <div className="grid">
      <section className="panel">
        <h2>Last 7 days</h2>
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={weekly}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="day" /><YAxis unit="m" width={50} /><Tooltip /><Legend />
            {categories.map((c) => <Bar key={c} dataKey={c} stackId="a" fill={COLORS[c]} />)}
          </BarChart>
        </ResponsiveContainer>
      </section>
      <section className="panel">
        <h2>Productivity trend</h2>
        <ResponsiveContainer width="100%" height={320}>
          <LineChart data={weekly}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="day" /><YAxis unit="m" width={50} /><Tooltip />
            <Line type="monotone" dataKey="productive" name="Productive" stroke="#0f766e" strokeWidth={3} />
          </LineChart>
        </ResponsiveContainer>
      </section>
    </div>
  );
}