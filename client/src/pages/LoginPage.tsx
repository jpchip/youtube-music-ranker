import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../contexts/AuthContext";
import { setPassword } from "../lib/api";

type Tab = "login" | "register";

export default function LoginPage() {
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("login");
  const [email, setEmail] = useState("");
  const [password2, setPassword2] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Set-password flow (for legacy account with no password)
  const [needsPassword, setNeedsPassword] = useState(false);
  const [setPasswordToken, setSetPasswordToken] = useState("");
  const [newPassword, setNewPassword] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (tab === "login") {
        await login(email, password2);
      } else {
        await register(email, password2);
      }
      navigate("/");
    } catch (err) {
      if (
        axios.isAxiosError(err) &&
        err.response?.data?.error === "PASSWORD_NOT_SET"
      ) {
        setSetPasswordToken(err.response.data.setPasswordToken);
        setNeedsPassword(true);
      } else if (axios.isAxiosError(err)) {
        setError(err.response?.data?.error || "An error occurred");
      } else {
        setError("An error occurred");
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleSetPassword(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await setPassword(setPasswordToken, newPassword);
      await login(email, newPassword);
      navigate("/");
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.error || "Failed to set password");
      } else {
        setError("Failed to set password");
      }
    } finally {
      setLoading(false);
    }
  }

  if (needsPassword) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-sm bg-gray-900 rounded-xl border border-gray-800 p-6 space-y-4">
          <h2 className="text-xl font-bold text-white">Set Your Password</h2>
          <p className="text-sm text-gray-400">
            Your account ({email}) doesn't have a password yet. Set one to
            continue.
          </p>
          <form onSubmit={handleSetPassword} className="space-y-4">
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="New password (min 6 chars)"
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
              required
              minLength={6}
            />
            {error && <p className="text-sm text-red-400">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-medium rounded-lg transition-colors"
            >
              {loading ? "Setting..." : "Set Password & Login"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-gray-900 rounded-xl border border-gray-800 p-6 space-y-4">
        <h1 className="text-2xl font-bold text-purple-400 text-center">
          YT Music Ranker
        </h1>

        <div className="flex gap-2">
          {(["login", "register"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => {
                setTab(t);
                setError(null);
              }}
              className={`flex-1 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                tab === t
                  ? "bg-purple-500/20 text-purple-300"
                  : "text-gray-400 hover:text-gray-200 hover:bg-gray-800"
              }`}
            >
              {t === "login" ? "Login" : "Register"}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
            required
          />
          <input
            type="password"
            value={password2}
            onChange={(e) => setPassword2(e.target.value)}
            placeholder="Password"
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
            required
            minLength={tab === "register" ? 6 : undefined}
          />
          {error && <p className="text-sm text-red-400">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-medium rounded-lg transition-colors"
          >
            {loading ? "..." : tab === "login" ? "Login" : "Register"}
          </button>
        </form>
      </div>
    </div>
  );
}
