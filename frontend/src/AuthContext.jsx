
import React, {
  createContext,
  useContext,
  useEffect,
  useState
} from "react";

import { api, saveToken, getToken, clearToken } from "./api";

const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const handleExpired = () => {
      clearToken();
      setUser(null);
    };

    window.addEventListener("auth:expired", handleExpired);

    async function checkAuth() {
      if (!getToken()) {
        setLoading(false);
        return;
      }

      try {
        const profile = await api.me();
        setUser(profile);
      } catch {
        clearToken();
        setUser(null);
      } finally {
        setLoading(false);
      }
    }

    checkAuth();

    return () => {
      window.removeEventListener("auth:expired", handleExpired);
    };
  }, []);

  async function login(email, password) {
    const result = await api.login({ email, password });
    saveToken(result.access_token);
    setUser(result.user);
  }

  async function register(name, email, password) {
    await api.register({ name, email, password });
  }

  function logout() {
    clearToken();
    setUser(null);
  }

  return (
    <AuthContext.Provider
      value={{ user, loading, login, register, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}
