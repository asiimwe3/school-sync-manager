/**
 * App shell — tiny hash router (static-hosting safe, zero deps, fully
 * compatible with the repo's exactOptionalPropertyTypes guardrail),
 * sidebar nav, SyncProvider mounted localOnly (v1 local-first; cloud TBD).
 */
import { useEffect, useState } from "react";
import { SyncProvider } from "./providers/SyncProvider";
import { SyncStatusBar } from "./components/ui/SyncStatusBar";
import { useDB } from "./store";
import { Dashboard } from "./pages/Dashboard";
import { Students } from "./pages/Students";
import { Attendance } from "./pages/Attendance";
import { Fees } from "./pages/Fees";
import { Reports } from "./pages/Reports";
import { Settings } from "./pages/Settings";

const NAV = [
  { to: "/", label: "Dashboard", icon: "📊" },
  { to: "/students", label: "Students", icon: "🎓" },
  { to: "/attendance", label: "Attendance", icon: "🗓️" },
  { to: "/fees", label: "Fees", icon: "💰" },
  { to: "/reports", label: "Marks & Reports", icon: "📄" },
  { to: "/settings", label: "Settings", icon: "⚙️" },
] as const;

function currentHashPath(): string {
  const h = window.location.hash.replace(/^#/, "");
  return h === "" ? "/" : h;
}

function useHashPath(): string {
  const [path, setPath] = useState<string>(currentHashPath);
  useEffect(() => {
    const onHash = (): void => setPath(currentHashPath());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);
  return path;
}

function pageFor(path: string): React.JSX.Element {
  switch (path) {
    case "/":           return <Dashboard />;
    case "/students":   return <Students />;
    case "/attendance": return <Attendance />;
    case "/fees":       return <Fees />;
    case "/reports":    return <Reports />;
    case "/settings":   return <Settings />;
    default:            return <Dashboard />;
  }
}

function Layout(): React.JSX.Element {
  const db = useDB();
  const path = useHashPath();
  const schoolName = db.settings?.schoolName ?? "School Sync Manager";
  const district = db.settings?.district;

  return (
    <div className="shell">
      <aside className="sidebar no-print">
        <div className="brand">
          <h1>🏫 School Sync</h1>
          <small>{schoolName}</small>
        </div>
        <nav className="nav">
          {NAV.map((n) => (
            <a key={n.to} href={`#${n.to}`} className={path === n.to ? "active" : undefined}>
              <span>{n.icon}</span> {n.label}
            </a>
          ))}
        </nav>
        <div className="sidebar-footer">
          v1.0 — offline-first
          <br />
          Made in Uganda 🇺🇬 by DeryCode
        </div>
      </aside>
      <main className="main">
        <header className="topbar no-print">
          <div>
            <h2>{schoolName}</h2>
            <div className="sub">
              {district ? `${district} District, Uganda` : "Complete school settings to begin"}
            </div>
          </div>
          <SyncStatusBar />
        </header>
        <div className="content">{pageFor(path)}</div>
      </main>
    </div>
  );
}

export function App(): React.JSX.Element {
  return (
    <SyncProvider localOnly>
      <Layout />
    </SyncProvider>
  );
}
