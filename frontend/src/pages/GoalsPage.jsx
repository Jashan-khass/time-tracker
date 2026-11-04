import React from "react";
import { Goals } from "../components";
import { useData } from "../DataContext";

export default function GoalsPage() {
  const { daily, categories, setGoal } = useData();
  return <section className="panel"><h2>Daily goals</h2><Goals daily={daily} categories={categories} onSet={setGoal} /></section>;
}