import { useState, useRef, useEffect } from "react";
import { NavLink, Link, Outlet } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { useTheme } from "../../hooks/useTheme";
import { APP_NAME } from "../../lib/constants";
import { Sun, Moon, User, LogOut, ChevronDown } from "lucide-react";

const NAV_ITEMS = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/insights", label: "Insights" },
];

function formatPersona(persona?: string): string {
  if (!persona) return "";
  switch (persona.toLowerCase()) {
    case "cfo":
      return "Chief Financial Officer";
    case "supply_chain_manager":
      return "Supply Chain Manager";
    case "marketing_manager":
      return "Marketing Manager";
    case "analyst":
      return "Data Analyst";
    default:
      return persona.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  }
}

export function AppLayout() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Escape key to close dropdown
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const initials = user?.displayName
    ? user.displayName.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)
    : "";

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-300">
      <header className="border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/90 dark:backdrop-blur-sm sticky top-0 z-40">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link to="/dashboard" className="flex items-center gap-2.5 hover:opacity-90 transition-opacity focus:outline-none">
            <img src="/logo.png" alt="Smart BI Logo" className="h-8 w-8 object-contain" />
            <span className="font-extrabold text-2xl bg-gradient-to-r from-indigo-500 to-purple-600 bg-clip-text text-transparent tracking-tight select-none">
              {APP_NAME}
            </span>
          </Link>
          
          <nav className="flex gap-12 text-[15px] font-semibold">
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
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800 transition-all border border-transparent dark:border-slate-800"
              aria-label="Toggle Theme"
            >
              {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
            </button>

            {/* Profile Dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-2 p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-all focus:outline-none"
                aria-haspopup="true"
                aria-expanded={dropdownOpen}
              >
                <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 text-white flex items-center justify-center font-bold text-xs shadow-sm select-none">
                  {initials || <User size={14} />}
                </div>
                <ChevronDown size={14} className={`text-slate-400 transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {dropdownOpen && (
                <div className="absolute right-0 mt-2 w-64 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl py-3 z-50 transform origin-top-right transition-all duration-200">
                  <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-800">
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">
                      {user?.displayName}
                    </p>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 truncate">
                      {formatPersona(user?.persona)}
                    </p>
                  </div>
                  <div className="pt-2">
                    <button
                      onClick={() => {
                        setDropdownOpen(false);
                        logout();
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 flex items-center gap-2 transition-colors font-medium"
                    >
                      <LogOut size={14} />
                      Log out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-8">
        <Outlet />
      </main>
    </div>
  );
}
