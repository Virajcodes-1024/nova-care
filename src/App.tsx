import { useState } from "react";
import { NavLink, Route, Routes, Link, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  ArrowUpRight,
  CalendarDays,
  House,
  LayoutDashboard,
  ListChecks,
  Menu,
  MessageSquare,
  Settings,
  ShieldCheck,
  X,
} from "lucide-react";
import { api } from "./api";
import { Badge, Logo } from "./components";
import type { Dashboard, Health } from "./types";
import {
  Overview,
  Assistant,
  Routines,
  Events,
  Actions,
  History,
  SettingsPage,
} from "./pages";
const navigation = [
  { to: "/", label: "Overview", icon: LayoutDashboard },
  { to: "/assistant", label: "AI Assistant", icon: MessageSquare },
  { to: "/routines", label: "Daily Routines", icon: CalendarDays },
  { to: "/events", label: "Home Events", icon: House },
  { to: "/actions", label: "Action Center", icon: ListChecks },
  { to: "/history", label: "Activity History", icon: Activity },
  { to: "/settings", label: "Settings", icon: Settings },
];
export default function App() {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const health = useQuery({
    queryKey: ["health"],
    queryFn: () => api<Health>("/health"),
    refetchInterval: 15000,
  });
  const dashboard = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => api<Dashboard>("/dashboard"),
  });
  const pending = dashboard.data?.approvals || 0;
  const current =
    navigation.find((n) => n.to === location.pathname)?.label || "NOVA Care";
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <button
        className="mobile-toggle icon-button"
        aria-label="Open navigation"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        <Menu />
      </button>
      {open && (
        <button
          className="nav-scrim"
          aria-label="Close navigation"
          onClick={() => setOpen(false)}
        />
      )}
      <aside className={`sidebar ${open ? "open" : ""}`}>
        <Link className="brand" to="/" onClick={() => setOpen(false)}>
          <Logo />
          <span>
            NOVA <b>Care</b>
            <small>Notice. Organize. Verify. Act.</small>
          </span>
        </Link>
        <button
          className="mobile-close icon-button"
          aria-label="Close navigation"
          onClick={() => setOpen(false)}
        >
          <X />
        </button>
        <div className="workspace-label">FAMILY WORKSPACE</div>
        <nav aria-label="Main navigation">
          {navigation.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              end={to === "/"}
              to={to}
              onClick={() => setOpen(false)}
            >
              <Icon size={18} />
              <span>{label}</span>
              {to === "/actions" && pending > 0 && (
                <span className="nav-count">{pending}</span>
              )}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="trust-note">
            <ShieldCheck size={22} />
            <strong>People stay in control.</strong>
            <p>Every consequential action starts with your approval.</p>
            <Link to="/actions">
              Review actions <ArrowUpRight size={13} />
            </Link>
          </div>
          <div className="backend-status">
            <span
              className={`connection-dot ${health.isSuccess ? "online" : ""}`}
            />
            {health.isSuccess
              ? "Local backend connected"
              : "Local backend disconnected"}
          </div>
          <div className="profile">
            <span className="avatar">M</span>
            <div>
              <strong>Mehta family</strong>
              <small>Fictional demo household</small>
            </div>
            <Settings size={15} />
          </div>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div>
            <span className="breadcrumb">Workspace</span>
            <span className="breadcrumb-slash">/</span>
            <strong>{current}</strong>
          </div>
          <div className="topbar-right">
            <Badge tone="simulation">SIMULATED HOME DATA</Badge>
            <span className="local-label">Local & private</span>
            <span className="avatar small">M</span>
          </div>
        </header>
        <main id="main">
          <Routes>
            <Route path="/" element={<Overview />} />
            <Route path="/assistant" element={<Assistant />} />
            <Route path="/routines" element={<Routines />} />
            <Route path="/events" element={<Events />} />
            <Route path="/actions" element={<Actions />} />
            <Route path="/history" element={<History />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route
              path="*"
              element={
                <div className="empty">
                  <h1>Page not found</h1>
                  <Link to="/">Return to overview</Link>
                </div>
              }
            />
          </Routes>
        </main>
        <footer>
          NOVA Care <span>•</span> Alexa+ simulated experience <span>•</span>{" "}
          Deterministic local workflows
        </footer>
      </div>
    </div>
  );
}
