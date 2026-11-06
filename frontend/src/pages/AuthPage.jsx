
import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../AuthContext";

export default function AuthPage({ mode = "login" }) {
  const isRegister = mode === "register";

  const { login, register } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (isRegister && password !== confirm) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);

    try {
      if (isRegister) {
        await register(name, email, password);
        await login(email, password);
      } else {
        await login(email, password);
      }

      navigate("/", { replace: true });
    } catch (err) {
      setError(err.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <form className="auth-card" onSubmit={handleSubmit}>
        <div className="auth-brand">Time Tracker</div>

        <h1>{isRegister ? "Create account" : "Welcome back"}</h1>
        <p>
          {isRegister
            ? "Create your account to start tracking time."
            : "Login to continue to your workspace."}
        </p>

        {isRegister && (
          <label>
            Full name
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Your name"
              required
              minLength={2}
              maxLength={100}
            />
          </label>
        )}

        <label>
          Email address
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
          />
        </label>

        <label>
          Password
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Minimum 8 characters"
            minLength={8}
            maxLength={128}
            required
          />
        </label>

        {isRegister && (
          <label>
            Confirm password
            <input
              type="password"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              placeholder="Confirm password"
              required
            />
          </label>
        )}

        {error && <div className="auth-error">{error}</div>}

        <button type="submit" disabled={loading}>
          {loading
            ? "Please wait..."
            : isRegister ? "Create account" : "Login"}
        </button>

        <div className="auth-switch">
          {isRegister
            ? "Already have an account? "
            : "Don't have an account? "}

          <Link to={isRegister ? "/login" : "/register"}>
            {isRegister ? "Login" : "Register"}
          </Link>
        </div>
      </form>
    </div>
  );
}
