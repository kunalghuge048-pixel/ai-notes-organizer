// ============================================================
// ToolsPanel.jsx — Side drawer for extra AI tools
// ============================================================

import React from "react";
import { motion } from "framer-motion";

const TOOLS = [
  { icon: "📖", label: "Study Guide",    desc: "AI-organized structured notes",       tab: "summary"    },
  { icon: "🃏", label: "Flashcards",     desc: "Q&A cards + Anki CSV export",         tab: "flashcards" },
  { icon: "🧠", label: "Mind Map",       desc: "Visual knowledge tree",               tab: "mindmap"    },
  { icon: "📘", label: "Definitions",    desc: "Auto glossary of technical terms",     tab: "summary"    },
  { icon: "🔢", label: "Formula Sheet",  desc: "Extract equations & formulas",         tab: "summary"    },
  { icon: "🔍", label: "Knowledge Gaps", desc: "Find missing & unclear topics",        tab: "summary"    },
];

export default function ToolsPanel({ notes, onClose }) {
  return (
    <>
      {/* Overlay */}
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 20 }}
        onClick={onClose}
      />

      {/* Panel */}
      <motion.div
        initial={{ x: 400, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 400, opacity: 0 }}
        transition={{ type: "spring", stiffness: 280, damping: 28 }}
        style={styles.panel}
      >
        <div style={styles.header}>
          <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 16 }}>🔧 AI Tools</span>
          <button className="btn btn-ghost" style={{ padding: "4px 8px" }} onClick={onClose}>✕</button>
        </div>

        <div style={{ padding: 16, overflowY: "auto", flex: 1 }}>
          <p style={{ color: "var(--text-muted)", fontSize: 12, marginBottom: 16 }}>
            All tools work on your loaded notes. Use the tabs above to access results.
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {TOOLS.map((t, i) => (
              <motion.div
                key={t.label}
                className="glass"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                style={styles.toolCard}
              >
                <span style={{ fontSize: 24 }}>{t.icon}</span>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{t.label}</div>
                  <div style={{ color: "var(--text-muted)", fontSize: 12 }}>{t.desc}</div>
                </div>
                <span className={`badge badge-${notes ? "cyan" : "amber"}`} style={{ marginLeft: "auto" }}>
                  {notes ? "Ready" : "No notes"}
                </span>
              </motion.div>
            ))}
          </div>

          <div style={styles.tips}>
            <div style={{ fontWeight: 600, marginBottom: 8, color: "var(--accent-cyan)", fontSize: 13 }}>
              💡 Pro Tips
            </div>
            {[
              "Upload PDF notes → AI processes up to 50 pages",
              "Image notes use OCR — works best with clear photos",
              "Export flashcards as CSV to import into Anki",
              "Mind map JSON can be imported into tools like Obsidian",
              "Use Knowledge Gaps to know what to study next",
            ].map(tip => (
              <div key={tip} style={{ display: "flex", gap: 6, fontSize: 12, color: "var(--text-secondary)", marginBottom: 6 }}>
                <span style={{ color: "var(--accent-purple)", flexShrink: 0 }}>›</span> {tip}
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    </>
  );
}

const styles = {
  panel: {
    position: "fixed", right: 0, top: 0, bottom: 0,
    width: 340, zIndex: 30,
    background: "var(--bg-surface)",
    borderLeft: "1px solid var(--border)",
    display: "flex", flexDirection: "column",
  },
  header: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    padding: "14px 16px", borderBottom: "1px solid var(--border)",
  },
  toolCard: {
    padding: "12px 14px",
    display: "flex", alignItems: "center", gap: 12,
    cursor: "default",
  },
  tips: {
    marginTop: 20,
    padding: 14,
    background: "rgba(0,229,255,0.03)",
    border: "1px solid rgba(0,229,255,0.1)",
    borderRadius: 10,
  },
};
