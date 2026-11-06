import React from "react";
import { DailyReport, Stats, Timer } from "../components";
import { useData } from "../DataContext";
import { Consistency } from "../features";

export default function Dashboard() {
  const { running, categories, startTimer, stopTimer, stats, daily } = useData();

  return (
    <>
      <Timer
        running={running}
        categories={categories}
        onStart={startTimer}
        onStop={stopTimer}
      />

      <Stats stats={stats} />

      <section className="panel">
        <h2>Today's report</h2>
        <DailyReport daily={daily} />
      </section>

      <Consistency />
    </>
  );
}