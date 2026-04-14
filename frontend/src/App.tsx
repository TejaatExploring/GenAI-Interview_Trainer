import { useState } from "react";

import { DashboardPage } from "./pages/DashboardPage";
import { InterviewPage } from "./pages/InterviewPage";

export function App() {
  const [view, setView] = useState<"interview" | "dashboard">("interview");

  return (
    <main className="app app-shell">
      <header className="topbar">
        <div className="topbar-title">
          <p className="eyebrow">Career Intelligence Studio</p>
          <h1>GenAI Interview Trainer</h1>
        </div>
        <div className="toolbar">
          <button className={view === "interview" ? "active" : ""} onClick={() => setView("interview")}>
            Interview
          </button>
          <button className={view === "dashboard" ? "active" : ""} onClick={() => setView("dashboard")}>
            Dashboard
          </button>
        </div>
      </header>
      {view === "interview" ? (
        <InterviewPage onSessionComplete={() => setView("dashboard")} />
      ) : (
        <DashboardPage />
      )}
    </main>
  );
}
