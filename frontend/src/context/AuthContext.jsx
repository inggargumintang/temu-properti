import { createContext, useContext, useEffect, useState } from "react";
import api from "../lib/api";

const AuthContext = createContext(null);
const AUTH_HINT_KEY = "speedhome_auth_hint";

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null); // null=loading, object=authed, false=not authed
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    // Skip /auth/me probe if we have no hint of prior login
    const hint = localStorage.getItem(AUTH_HINT_KEY);
    if (!hint) {
      setUser(false);
      setLoading(false);
      return;
    }
    try {
      const { data } = await api.get("/auth/me");
      setUser(data);
    } catch (_e) {
      localStorage.removeItem(AUTH_HINT_KEY);
      setUser(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { refresh(); }, []);

  const login = async (email, password) => {
    const { data } = await api.post("/auth/login", { email, password });
    localStorage.setItem(AUTH_HINT_KEY, "1");
    setUser(data);
    return data;
  };

  const register = async (email, password, name) => {
    const { data } = await api.post("/auth/register", { email, password, name });
    localStorage.setItem(AUTH_HINT_KEY, "1");
    setUser(data);
    return data;
  };

  const logout = async () => {
    try { await api.post("/auth/logout"); } catch (_e) { /* noop */ }
    localStorage.removeItem(AUTH_HINT_KEY);
    setUser(false);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
