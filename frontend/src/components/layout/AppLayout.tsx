import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { Button } from "../ui/Button";
import { APP_NAME } from "../../lib/constants";

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

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <span className="font-semibold text-slate-900">{APP_NAME}</span>
          <nav className="flex gap-4 text-sm text-slate-600">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => (isActive ? "font-semibold text-slate-900" : "hover:text-slate-900")}
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
          <div className="flex items-center gap-3 text-sm">
            <span className="text-slate-500">{user?.displayName}</span>
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
