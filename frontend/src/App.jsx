
import React from "react";
import {
  Routes,
  Route,
  Navigate,
  Outlet
} from "react-router-dom";

import { DataProvider } from "./DataContext";
import { AuthProvider, useAuth } from "./AuthContext";
import Layout from "./Layout";

import AuthPage from "./pages/AuthPage";
import ActivitiesPage from "./pages/ActivitiesPage";
import AnalyticsPage from "./pages/AnalyticsPage";
import CategoryRoute from "./pages/CategoryRoute";
import Dashboard from "./pages/Dashboard";
import GoalsPage from "./pages/GoalsPage";
import TasksPage from "./pages/TasksPage";
import FocusPage from "./pages/FocusPage";
import ProfilePage from "./pages/ProfilePage";

function ProtectedRoute() {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="auth-loading">Checking session...</div>;
  }

  return user ? <Outlet /> : <Navigate to="/login" replace />;
}

function PublicOnly({ children }) {
  const { user, loading } = useAuth();

  if (loading) return null;

  return user ? <Navigate to="/" replace /> : children;
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route
          path="/login"
          element={
            <PublicOnly>
              <AuthPage mode="login" />
            </PublicOnly>
          }
        />

        <Route
          path="/register"
          element={
            <PublicOnly>
              <AuthPage mode="register" />
            </PublicOnly>
          }
        />

        <Route element={<ProtectedRoute />}>
          <Route
            element={
              <DataProvider>
                <Layout />
              </DataProvider>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="tasks" element={<TasksPage />} />
            <Route path="focus" element={<FocusPage />} />
            <Route path="activities" element={<ActivitiesPage />} />
            <Route path="analytics" element={<AnalyticsPage />} />
            <Route path="goals" element={<GoalsPage />} />
            <Route path="profile" element={<ProfilePage />} />
            <Route path="activity/:slug" element={<CategoryRoute />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}
