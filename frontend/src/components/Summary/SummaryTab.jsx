// ============================================================
// SummaryTab.jsx — Study guide + KaTeX math formula rendering
// ============================================================

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import toast from "react-hot-toast";
import { getSummary, getGaps, getDefinitions, getFormulas } from "../../utils/api";

const SECTIONS = [
  { id: "summary",     label: "Study Guide",    icon: "📖", color: "cyan"   },
  { id: "definitions", label: "Definitions",    icon: "📘", color: "purple" },
  { id: "formulas",    label: "Formulas",       icon: "🔢", color: "amber"  },
  { id: "gaps",        label: "Knowledge Gaps", icon: "🔍", color: "green"  },
];

// Render math using KaTeX if available, else monospace fallback
function MathFormula({ formula }) {
  const [rendered, setRendered] = useState(null);
  useEffect(() => {
    if (window.katex) {
      try {
        const html = window.katex.renderToString(formula, {
          throwOnError: false,
          displayMode: true,
        });
        setRendered(html);
      } catch { setRendered(null); }
    }
  }, [formula]);

  if (rendered) return (
    <div
      dangerouslySetInnerHTML={{ __html: rendered }}
      style={{ padding: "10px 14px", overflowX: "auto" }}
    />
  );

  // Fallback: parse common patterns into HTML superscript/subscript
  const pretty = formula
    .replace(/\^(\{[^}]+\}|[^\s])/g, (_, e) => `<sup>${e.replace(/[{}]/g,"")}</sup>`)
    .replace(/_(\{[^}]+\}|[^\s])/g, (_, e) => `<sub>${e.replace(/[{}]/g,"")}</sub>`)
    .replace(/\\sqrt\{([^}]+)\}/g, "√($1)")
    .replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, "($1)/($2)")
    .replace(/\\[a-zA-Z]+/g, m => m.slice(1)); // strip remaining \commands

  return (
    <div
      dangerouslySetInnerHTML={{ __html: pretty }}
      style={{ fontFamily: "var(--font-mono)", fontSize: 16, padding: "10px 14px", color: "var(--text-primary)", overflowX: "auto" }}
    />
  );
}

export default function SummaryTab({ notes }) {
  const [activeSection, setActiveSection] = useState("summary");
  const [data, setData]     = useState({});
  const [loading, setLoading] = useState({});

  async function generate(section) {
    if (!notes) { toast.error("Upload notes first"); return; }
    if (data[section]) return;
    setLoading(p => ({ ...p, [section]: true }));
    try {
      let res;
      if (section === "summary")     res = await getSummary(notes.text);
      if (section === "definitions") res = await getDefinitions(notes.text);
      if (section === "formulas")    res = await getFormulas(notes.text);
      if (section === "gaps")        res = await getGaps(notes.text);
      setData(p => ({ ...p, [section]: res.data }));
    } catch (e) {
      toast.error("Generation failed: " + (e.response?.data?.error || e.message));
    } finally {
      setLoading(p => ({ ...p, [section]: false }));
    }
  }

  function handleSection(id) {
    setActiveSection(id);
    generate(id);
  }

  const sec = SECTIONS.find(s => s.id === activeSection);

  return (
    <div style={styles.container}>
      <div style={styles.nav}>
        {SECTIONS.map(s => (
          <button key={s.id} onClick={() => handleSection(s.id)}
            style={{ ...styles.navBtn, ...(activeSection === s.id ? styles.navBtnActive(s.color) : {}) }}>
            {s.icon} {s.label}
            {data[s.id] && <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--accent-green)", marginLeft: 4, flexShrink: 0 }} />}
          </button>
        ))}
      </div>

      <div style={styles.content}>
        {!notes ? <EmptyState />
          : loading[activeSection] ? <LoadingState label={sec.label} />
          : !data[activeSection] ? (
            <div style={styles.generatePrompt}>
              <span style={{ fontSize: 40 }}>{sec.icon}</span>
              <p style={{ color: "var(--text-secondary)" }}>Generate your {sec.label} from the loaded notes</p>
              <button className="btn btn-primary" onClick={() => generate(activeSection)}>
                ⚡ Generate {sec.label}
              </button>
            </div>
          ) : (
            <SectionContent section={activeSection} data={data[activeSection]} notes={notes} />
          )}
      </div>
    </div>
  );
}

function SectionContent({ section, data, notes }) {
  if (section === "summary") {
    return (
      <div style={styles.scrollable}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h3 style={{ fontFamily: "var(--font-display)", fontSize: 18 }}>Study Guide</h3>
          <button className="btn btn-ghost" style={{ fontSize: 12 }}
            onClick={() => {
              const blob = new Blob([data.summary], { type: "text/markdown" });
              const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
              a.download = "study-guide.md"; a.click();
            }}>
            ↓ Export .md
          </button>
        </div>
        <div className="prose">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{data.summary}</ReactMarkdown>
        </div>
      </div>
    );
  }

  if (section === "definitions") {
    return (
      <div style={styles.scrollable}>
        <h3 style={{ fontFamily: "var(--font-display)", fontSize: 18, marginBottom: 16 }}>
          Technical Definitions <span className="badge badge-purple">{data.definitions?.length} terms</span>
        </h3>
        <div style={{ display: "grid", gap: 10 }}>
          {data.definitions?.map((d, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }} className="glass" style={styles.defCard}>
              <div style={{ fontWeight: 600, color: "var(--accent-purple)", fontFamily: "var(--font-mono)", fontSize: 13 }}>
                {d.term}
              </div>
              <div style={{ color: "var(--text-secondary)", fontSize: 13, marginTop: 4 }}>{d.definition}</div>
              {d.context && (
                <div style={{ color: "var(--text-muted)", fontSize: 11, marginTop: 6, borderLeft: "2px solid var(--border)", paddingLeft: 8 }}>
                  Context: {d.context}
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    );
  }

  if (section === "formulas") {
    if (!data.formulas?.length) return (
      <div style={styles.generatePrompt}>
        <span style={{ fontSize: 40 }}>🔢</span>
        <p style={{ color: "var(--text-muted)" }}>No formulas detected in these notes</p>
      </div>
    );
    return (
      <div style={styles.scrollable}>
        <h3 style={{ fontFamily: "var(--font-display)", fontSize: 18, marginBottom: 16 }}>
          Formulas & Equations <span className="badge badge-amber">{data.formulas.length}</span>
        </h3>
        <div style={{ display: "grid", gap: 12 }}>
          {data.formulas.map((f, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }} className="glass" style={styles.formulaCard}>
              <div style={{ fontWeight: 700, color: "var(--accent-amber)", fontSize: 14, marginBottom: 8 }}>
                {f.name}
              </div>
              {/* Formula box with math rendering */}
              <div style={styles.formulaBox}>
                <MathFormula formula={f.formula} />
              </div>
              {f.description && (
                <div style={{ color: "var(--text-secondary)", fontSize: 12, marginTop: 8 }}>
                  {f.description}
                </div>
              )}
              {f.variables && (
                <div style={{ color: "var(--text-muted)", fontSize: 11, marginTop: 6, borderLeft: "2px solid rgba(255,179,0,0.3)", paddingLeft: 8 }}>
                  <strong>Variables:</strong> {f.variables}
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    );
  }

  if (section === "gaps") {
    return (
      <div style={styles.scrollable}>
        <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
          <div className="glass" style={styles.scoreCard}>
            <div style={{ fontSize: 36, fontFamily: "var(--font-display)", fontWeight: 800, color: data.score > 70 ? "var(--accent-green)" : "var(--accent-amber)" }}>
              {data.score}
            </div>
            <div style={{ color: "var(--text-muted)", fontSize: 12 }}>Completeness Score</div>
          </div>
          <div className="glass" style={{ ...styles.scoreCard, flex: 2 }}>
            <div style={{ color: "var(--text-secondary)", fontSize: 13 }}>{data.verdict}</div>
          </div>
        </div>
        <h3 style={{ fontFamily: "var(--font-display)", fontSize: 16, marginBottom: 10 }}>
          Identified Gaps <span className="badge badge-green">{data.gaps?.length}</span>
        </h3>
        {data.gaps?.map((g, i) => (
          <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }} className="glass" style={styles.gapCard}>
            <div style={{ fontWeight: 600, color: "var(--accent-green)", fontSize: 13 }}>⚠ {g.topic}</div>
            <div style={{ color: "var(--text-secondary)", fontSize: 12, marginTop: 4 }}>{g.issue}</div>
            <div style={{ color: "var(--accent-cyan)", fontSize: 11, marginTop: 6 }}>💡 {g.suggestion}</div>
          </motion.div>
        ))}
      </div>
    );
  }
}

function EmptyState() {
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12 }}>
      <span style={{ fontSize: 48 }}>📤</span>
      <p style={{ color: "var(--text-secondary)" }}>Upload notes to generate study materials</p>
    </div>
  );
}

function LoadingState({ label }) {
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16 }}>
      <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
        style={{ fontSize: 36 }}>⬡</motion.div>
      <p style={{ color: "var(--accent-cyan)", fontFamily: "var(--font-mono)", fontSize: 13 }}>
        Generating {label}...
      </p>
      <div style={{ display: "flex", gap: 4 }}>
        {["Analyzing", "Structuring", "Finalizing"].map((t, i) => (
          <span key={t} className="badge badge-cyan">{t}</span>
        ))}
      </div>
    </div>
  );
}

const styles = {
  container: { display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" },
  nav: { display: "flex", gap: 4, padding: "10px 16px", borderBottom: "1px solid var(--border)", flexShrink: 0, flexWrap: "wrap" },
  navBtn: { display: "flex", alignItems: "center", gap: 5, padding: "6px 12px", borderRadius: 8, background: "transparent", border: "1px solid var(--border)", color: "var(--text-muted)", cursor: "pointer", fontSize: 12, fontFamily: "var(--font-body)", transition: "all 0.15s" },
  navBtnActive: (c) => ({ background: `rgba(0,229,255,0.08)`, border: `1px solid rgba(0,229,255,0.25)`, color: `var(--accent-${c})` }),
  content: { flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" },
  scrollable: { flex: 1, overflowY: "auto", padding: "16px 20px" },
  generatePrompt: { flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12 },
  defCard: { padding: "12px 14px" },
  formulaCard: { padding: "16px 18px" },
  formulaBox: {
    background: "rgba(255,179,0,0.05)",
    border: "1px solid rgba(255,179,0,0.2)",
    borderRadius: 10,
    minHeight: 52,
    display: "flex",
    alignItems: "center",
    overflow: "hidden",
  },
  gapCard: { padding: "12px 14px", marginBottom: 8 },
  scoreCard: { padding: "14px 18px", textAlign: "center", minWidth: 100 },
};
