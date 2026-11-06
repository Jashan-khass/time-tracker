import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";

import { DataProvider } from "./DataContext";
import Layout from "./Layout";
import ActivitiesPage from "./pages/ActivitiesPage";
import AnalyticsPage from "./pages/AnalyticsPage";
import CategoryRoute from "./pages/CategoryRoute";
import Dashboard from "./pages/Dashboard";
import GoalsPage from "./pages/GoalsPage";
import TasksPage from "./pages/TasksPage";
import FocusPage from "./pages/FocusPage";

export default function App() {
  return (
    <DataProvider>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="tasks" element={<TasksPage />} />
          <Route path="focus" element={<FocusPage />} />
          <Route path="activities" element={<ActivitiesPage />} />
          <Route path="analytics" element={<AnalyticsPage />} />
          <Route path="goals" element={<GoalsPage />} />
          <Route path="activity/:slug" element={<CategoryRoute />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </DataProvider>
  );
}