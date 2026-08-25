import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { useTheme } from "../../hooks/useTheme";
import { Button } from "../ui/Button";
import { APP_NAME } from "../../lib/constants";
import { Sun, Moon } from "lucide-react";

const NAV_ITEMS = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/insights", label: "Insights" },
  { to: "/chat", label: "Chat" },
  { to: "/personas", label: "Personas" },
  { to: "/actions", label: "Actions" },
  { to: "/feedback", label: "Feedback" },
  { to: "/telemetry", label: "Telemetry" },
  { to: "/admin/security", label: "Security" },
];

export function AppLayout() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-300">
      <header className="border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/90 dark:backdrop-blur-sm sticky top-0 z-40">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <span className="font-bold text-slate-900 dark:text-white text-base tracking-tight">{APP_NAME}</span>
          <nav className="flex gap-4 text-sm font-medium">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  isActive
                    ? "text-slate-900 dark:text-white border-b-2 border-indigo-500 py-1"
                    : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white py-1 transition-colors"
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
          <div className="flex items-center gap-4 text-sm">
            <span className="text-slate-500 dark:text-slate-400 font-semibold hidden md:inline">{user?.displayName}</span>
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800 transition-all border border-transparent dark:border-slate-800 shadow-sm"
              aria-label="Toggle Theme"
            >
              {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            <Button variant="secondary" onClick={logout}>
              Log out
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-8">
        <Outlet />
      </main>
    </div>
  );
}
