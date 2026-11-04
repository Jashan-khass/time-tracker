import React from "react";
import { Tasks } from "../components";
import { useData } from "../DataContext";

export default function TasksPage() {
  const d = useData();
  return (
    <Tasks tasks={d.tasks} categories={d.categories} running={d.running} onAdd={d.addTask}
      onToggle={d.toggleTask} onDelete={d.deleteTask} onStart={d.startTask} />
  );
}