// ============================================================
// App.js — Main application shell
// Layout: Left sidebar + Main content area with tabs
// ============================================================

import React, { useState, useCallback } from "react";
import { Toaster, toast } from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import "./styles/global.css";

import Sidebar       from "./components/Sidebar/Sidebar";
import ChatTab       from "./components/Chat/ChatTab";
import SummaryTab    from "./components/Summary/SummaryTab";
import FlashcardsTab from "./components/Flashcards/FlashcardsTab";
import MindMapTab    from "./components/MindMap/MindMapTab";
import QuizTab       from "./components/Quiz/QuizTab";
import ToolsPanel    from "./components/Sidebar/ToolsPanel";

const TABS = [
  { id: "chat",       label: "Chat",       icon: "💬" },
  { id: "summary",    label: "Study Guide", icon: "📖" },
  { id: "flashcards", label: "Flashcards",  icon: "🃏" },
  { id: "mindmap",    label: "Mind Map",    icon: "🧠" },
  { id: "quiz",       label: "Quiz",        icon: "📝" },
];

export default function App() {
  const [notes, setNotes]             = useState(null);
  const [activeTab, setActiveTab]     = useState("chat");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [toolsOpen, setToolsOpen]     = useState(false);

  const handleNotesLoaded = useCallback((data) => {
    setNotes(data);
    setActiveTab("chat");
    toast.success(`✅ ${data.filename} loaded — ${data.wordCount?.toLocaleString()} words`);
  }, []);

  return (
    <div style={styles.root}>
      <div style={styles.blob1} />
      <div style={styles.blob2} />

      <Toaster position="top-right"
        toastOptions={{
          style: { background: "#111827", color: "#f0f4ff", border: "1px solid rgba(255,255,255,0.08)" },
          duration: 3000,
        }}
      />

      <div style={styles.app}>
        {/* ── Sidebar ── */}
        <AnimatePresence>
          {sidebarOpen && (
            <motion.aside
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 240, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              style={styles.sidebar}
            >
              <Sidebar
                currentNotes={notes}
                onNotesLoaded={handleNotesLoaded}
                onToolsOpen={() => setToolsOpen(true)}
              />
            </motion.aside>
          )}
        </AnimatePresence>

        {/* ── Tools panel ── */}
        <AnimatePresence>
          {toolsOpen && (
            <motion.aside
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 260, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              style={{ ...styles.sidebar, borderLeft: "1px solid var(--border)" }}
            >
              <ToolsPanel onClose={() => setToolsOpen(false)} />
            </motion.aside>
          )}
        </AnimatePresence>

        {/* ── Main content ── */}
        <main style={styles.main}>
          {/* Top nav */}
          <div style={styles.topbar}>
            <button className="btn btn-ghost" style={{ padding: "6px 10px" }}
              onClick={() => setSidebarOpen(p => !p)}>
              {sidebarOpen ? "◀" : "▶"}
            </button>

            {/* ── Brand name ── */}
            <div style={styles.logo}>
              <span style={styles.logoMark}>⬡</span>
              <span style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 15 }}>
                AI Notes<span className="gradient-text"> Organizer</span>
              </span>
            </div>

            {/* Tab navigation */}
            <nav style={styles.tabs}>
              {TABS.map(tab => (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                  style={{ ...styles.tab, ...(activeTab === tab.id ? styles.tabActive : {}) }}>
                  <span>{tab.icon}</span>
                  <span>{tab.label}</span>
                </button>
              ))}
            </nav>

            {/* Source badge */}
            {notes && (
              <div style={styles.sourceBadge}>
                <span className={`badge badge-${notes.source === "pdf" ? "cyan" : notes.source === "ocr" ? "purple" : "green"}`}>
                  {notes.source?.toUpperCase()}
                </span>
                <span style={{ fontSize: 12, color: "var(--text-muted)", maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {notes.filename}
                </span>
              </div>
            )}

            <button className="btn btn-ghost" style={{ marginLeft: "auto", fontSize: 12 }}
              onClick={() => setToolsOpen(p => !p)}>
              🛠 Tools
            </button>
          </div>

          {/* Tab content */}
          <div style={styles.content}>
            <AnimatePresence mode="wait">
              <motion.div key={activeTab}
                initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.15 }}
                style={{ height: "100%", display: "flex", flexDirection: "column" }}>
                {activeTab === "chat"       && <ChatTab notes={notes} />}
                {activeTab === "summary"    && <SummaryTab notes={notes} />}
                {activeTab === "flashcards" && <FlashcardsTab notes={notes} />}
                {activeTab === "mindmap"    && <MindMapTab notes={notes} />}
                {activeTab === "quiz"       && <QuizTab notes={notes} />}
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
      </div>
    </div>
  );
}

const styles = {
  root: { minHeight: "100vh", background: "var(--bg-base)", color: "var(--text-primary)", position: "relative", overflow: "hidden" },
  blob1: { position: "fixed", top: -200, left: -200, width: 500, height: 500, borderRadius: "50%", background: "radial-gradient(circle, rgba(0,229,255,0.06) 0%, transparent 70%)", pointerEvents: "none" },
  blob2: { position: "fixed", bottom: -200, right: -200, width: 600, height: 600, borderRadius: "50%", background: "radial-gradient(circle, rgba(176,110,255,0.05) 0%, transparent 70%)", pointerEvents: "none" },
  app: { display: "flex", height: "100vh", position: "relative", zIndex: 1 },
  sidebar: { flexShrink: 0, height: "100vh", borderRight: "1px solid var(--border)", background: "var(--bg-surface)", overflow: "hidden" },
  main: { flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 0 },
  topbar: { display: "flex", alignItems: "center", gap: 8, padding: "8px 16px", borderBottom: "1px solid var(--border)", flexShrink: 0, background: "var(--bg-surface)", flexWrap: "wrap" },
  logo: { display: "flex", alignItems: "center", gap: 6 },
  logoMark: { color: "var(--accent-cyan)", fontSize: 18 },
  tabs: { display: "flex", gap: 2, marginLeft: 8 },
  tab: { display: "flex", alignItems: "center", gap: 5, padding: "5px 12px", borderRadius: 8, background: "transparent", border: "1px solid transparent", color: "var(--text-muted)", cursor: "pointer", fontSize: 12, fontFamily: "var(--font-body)", transition: "all 0.15s", whiteSpace: "nowrap" },
  tabActive: { background: "rgba(0,229,255,0.1)", border: "1px solid rgba(0,229,255,0.25)", color: "var(--accent-cyan)" },
  sourceBadge: { display: "flex", alignItems: "center", gap: 6, padding: "4px 10px", borderRadius: 8, background: "var(--bg-glass)", border: "1px solid var(--border)" },
  content: { flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" },
};
