import { createContext, useContext, useEffect, useState } from "react";
import {
  getMe,
  login as apiLogin,
  register as apiRegister,
  logout as apiLogout,
} from "../lib/api";

interface AuthState {
  token: string | null;
  email: string | null;
  isLoading: boolean;
}

interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    token: localStorage.getItem("ranker_token"),
    email: null,
    isLoading: true,
  });

  useEffect(() => {
    const token = localStorage.getItem("ranker_token");
    if (!token) {
      setState({ token: null, email: null, isLoading: false });
      return;
    }

    getMe()
      .then(({ email }) => {
        setState({ token, email, isLoading: false });
      })
      .catch(() => {
        localStorage.removeItem("ranker_token");
        setState({ token: null, email: null, isLoading: false });
      });
  }, []);

  async function login(email: string, password: string) {
    const { token, email: userEmail } = await apiLogin(email, password);
    localStorage.setItem("ranker_token", token);
    setState({ token, email: userEmail, isLoading: false });
  }

  async function register(email: string, password: string) {
    const { token, email: userEmail } = await apiRegister(email, password);
    localStorage.setItem("ranker_token", token);
    setState({ token, email: userEmail, isLoading: false });
  }

  async function logout() {
    try {
      await apiLogout();
    } catch {
      // ignore errors on logout
    }
    localStorage.removeItem("ranker_token");
    setState({ token: null, email: null, isLoading: false });
  }

  return (
    <AuthContext.Provider value={{ ...state, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
