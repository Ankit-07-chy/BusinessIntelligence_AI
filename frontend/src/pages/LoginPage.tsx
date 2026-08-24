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
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <form onSubmit={handleSubmit} className="w-full max-w-sm rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-lg font-semibold text-slate-900">{APP_NAME}</h1>
        <p className="mt-1 text-sm text-slate-500">Select a demo persona to sign in.</p>

        <label className="mt-4 block text-sm font-medium text-slate-700">
          Persona
          <select
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
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

        <label className="mt-4 block text-sm font-medium text-slate-700">
          Password
          <input
            type="password"
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>

        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

        <Button type="submit" disabled={submitting} className="mt-5 w-full">
          {submitting ? "Signing in…" : "Sign in"}
        </Button>
      </form>
    </div>
  );
}
