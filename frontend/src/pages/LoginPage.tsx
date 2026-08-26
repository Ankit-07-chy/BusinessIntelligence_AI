import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { Button } from "../components/ui/Button";
import { APP_NAME } from "../lib/constants";

const DEMO_USERS = [
  { username: "cfo", label: "CFO" },
  { username: "supply_chain_manager", label: "Supply Chain Manager" },
  { username: "marketing_manager", label: "Marketing Manager" },
  { username: "analyst", label: "Analyst" },
  { username: "digital_product_manager", label: "Digital Product Manager" },
];

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("cfo");
  const [password, setPassword] = useState("demo1234");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await login(username, password);
      navigate("/dashboard");
    } catch {
      setError("Invalid username or password.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
      <form onSubmit={handleSubmit} className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 transition-all">
        <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">{APP_NAME}</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Select a demo persona to sign in.</p>

        <label className="mt-4 block text-sm font-semibold text-slate-700 dark:text-slate-300">
          Persona
          <select
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm bg-white dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100 focus:border-indigo-500 outline-none transition"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          >
            {DEMO_USERS.map((demoUser) => (
              <option key={demoUser.username} value={demoUser.username}>
                {demoUser.label}
              </option>
            ))}
          </select>
        </label>

        <label className="mt-4 block text-sm font-semibold text-slate-700 dark:text-slate-300">
          Password
          <input
            type="password"
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm bg-white dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100 focus:border-indigo-500 outline-none transition"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>

        {error && <p className="mt-3 text-sm text-rose-600 dark:text-rose-400 font-semibold">{error}</p>}

        <Button type="submit" disabled={submitting} className="mt-6 w-full">
          {submitting ? "Signing in…" : "Sign in"}
        </Button>
      </form>
    </div>
  );
}
