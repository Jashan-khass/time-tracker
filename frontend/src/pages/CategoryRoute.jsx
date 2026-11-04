import React from "react";
import { Navigate, useParams } from "react-router-dom";
import { CategoryPage } from "../components";
import { useData } from "../DataContext";

export default function CategoryRoute() {
  const { slug } = useParams();
  const d = useData();
  const category = d.categories.find((c) => c.toLowerCase() === slug);
  if (!category) return <Navigate to="/" replace />;
  return (
    <CategoryPage key={category} category={category} acts={d.acts} tasks={d.tasks} weekly={d.weekly}
      daily={d.daily} running={d.running} onStart={d.startTimer} onStop={d.stopTimer}
      onDelete={d.deleteActivity} onToggle={d.toggleTask} onStartTask={d.startTask} />
  );
}