// ============================================================
// FlashcardsTab.jsx — Fixed 3D flip reveal + Anki CSV export
// ============================================================

import React, { useState } from "react";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import { getFlashcards } from "../../utils/api";

export default function FlashcardsTab({ notes }) {
  const [cards, setCards]     = useState([]);
  const [loading, setLoading] = useState(false);
  const [current, setCurrent] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [mode, setMode]       = useState("study");
  const [known, setKnown]     = useState(new Set());

  async function generate() {
    if (!notes) { toast.error("Upload notes first"); return; }
    setLoading(true);
    try {
      const res = await getFlashcards(notes.text);
      setCards(res.data.flashcards || []);
      setCurrent(0); setFlipped(false); setKnown(new Set());
      toast.success(`${res.data.flashcards.length} flashcards created!`);
    } catch (e) {
      toast.error("Failed to generate flashcards");
    } finally { setLoading(false); }
  }

  // Anki-compatible CSV export
  function exportCSV() {
    const header = "Question,Answer,Category,Tags";
    const rows = cards.map(c =>
      `"${(c.question||"").replace(/"/g,'""')}","${(c.answer||"").replace(/"/g,'""')}","${(c.category||"").replace(/"/g,'""')}","AI-Notes-Organizer"`
    );
    const csv = [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "flashcards-anki.csv";
    a.click();
    toast.success("Anki CSV exported! In Anki: File → Import → select this file");
  }

  function next()  { setCurrent(p => (p + 1) % cards.length); setFlipped(false); }
  function prev()  { setCurrent(p => (p - 1 + cards.length) % cards.length); setFlipped(false); }
  function toggleKnown() {
    setKnown(prev => {
      const s = new Set(prev);
      s.has(current) ? s.delete(current) : s.add(current);
      return s;
    });
  }

  if (!notes) return (
    <div style={styles.center}>
      <span style={{ fontSize: 48 }}>🃏</span>
      <p style={{ color: "var(--text-secondary)" }}>Upload notes to generate flashcards</p>
    </div>
  );

  if (loading) return (
    <div style={styles.center}>
      <motion.div animate={{ scale: [1, 1.15, 1] }} transition={{ repeat: Infinity, duration: 0.8 }}
        style={{ fontSize: 48 }}>🃏</motion.div>
      <p style={{ color: "var(--accent-cyan)", fontFamily: "var(--font-mono)" }}>Generating flashcards...</p>
    </div>
  );

  if (!cards.length) return (
    <div style={styles.center}>
      <span style={{ fontSize: 48 }}>🃏</span>
      <p style={{ color: "var(--text-secondary)" }}>Generate flashcards from your notes</p>
      <button className="btn btn-primary" onClick={generate}>⚡ Generate Flashcards</button>
    </div>
  );

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span className="badge badge-cyan">{cards.length} CARDS</span>
          <span className="badge badge-green">{known.size} KNOWN</span>
          <span className="badge badge-amber">{cards.length - known.size} TO REVIEW</span>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <button className="btn btn-ghost" style={{ fontSize: 12 }}
            onClick={() => setMode(m => m === "study" ? "grid" : "study")}>
            {mode === "study" ? "⊞ Grid" : "◻ Study"}
          </button>
          <button className="btn btn-ghost" style={{ fontSize: 12 }} onClick={exportCSV}>↓ Anki CSV</button>
          <button className="btn btn-primary" style={{ fontSize: 12 }} onClick={generate}>↻ Regenerate</button>
        </div>
      </div>

      {mode === "study" ? (
        <StudyMode cards={cards} current={current} flipped={flipped}
          setFlipped={setFlipped} next={next} prev={prev}
          known={known} toggleKnown={toggleKnown} />
      ) : (
        <GridMode cards={cards} known={known}
          onSelect={i => { setCurrent(i); setFlipped(false); setMode("study"); }} />
      )}
    </div>
  );
}

function StudyMode({ cards, current, flipped, setFlipped, next, prev, known, toggleKnown }) {
  const card = cards[current];
  const progress = ((current + 1) / cards.length) * 100;

  return (
    <div style={styles.studyContainer}>
      <div style={styles.progressRow}>
        <span style={{ color: "var(--text-muted)", fontSize: 12 }}>{current + 1} / {cards.length}</span>
        <div style={styles.progressBar}>
          <motion.div animate={{ width: `${progress}%` }} style={styles.progressFill} />
        </div>
        {card.category && <span className="badge badge-purple">{card.category}</span>}
      </div>

      {/* 3D Flip Card — FIXED */}
      <div style={styles.scene} onClick={() => setFlipped(f => !f)}>
        <motion.div
          style={styles.cardInner}
          animate={{ rotateY: flipped ? 180 : 0 }}
          transition={{ duration: 0.55, type: "spring", stiffness: 120, damping: 18 }}
        >
          {/* FRONT */}
          <div style={{ ...styles.face, ...styles.front }}>
            <div style={styles.labelFront}>QUESTION</div>
            <div style={styles.questionText}>{card.question}</div>
            <motion.div
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{ repeat: Infinity, duration: 2 }}
              style={styles.hint}
            >
              👆 tap to reveal answer
            </motion.div>
          </div>

          {/* BACK — rotateY(180deg) so it starts hidden */}
          <div style={{ ...styles.face, ...styles.back }}>
            <div style={styles.labelBack}>ANSWER</div>
            <div style={styles.answerText}>{card.answer}</div>
            {card.category && (
              <span className="badge badge-purple" style={{ marginTop: 14 }}>{card.category}</span>
            )}
          </div>
        </motion.div>
      </div>

      <div style={styles.controls}>
        <button className="btn btn-ghost" onClick={prev}>← Prev</button>
        <button className="btn" onClick={toggleKnown}
          style={{
            background: known.has(current) ? "rgba(0,255,163,0.15)" : "var(--bg-glass)",
            border: `1px solid ${known.has(current) ? "var(--accent-green)" : "var(--border)"}`,
            color: known.has(current) ? "var(--accent-green)" : "var(--text-muted)",
          }}>
          {known.has(current) ? "✓ Known" : "Mark Known"}
        </button>
        <button className="btn btn-ghost" onClick={next}>Next →</button>
      </div>

      <p style={{ color: "var(--text-muted)", fontSize: 11, marginTop: 4, textAlign: "center" }}>
        {known.size}/{cards.length} mastered · Click card to flip · Use arrow buttons to navigate
      </p>
    </div>
  );
}

function GridMode({ cards, known, onSelect }) {
  return (
    <div style={styles.grid}>
      {cards.map((card, i) => (
        <motion.div key={i} className="glass" onClick={() => onSelect(i)}
          initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: i * 0.02 }} whileHover={{ scale: 1.02 }}
          style={{ ...styles.gridCard, ...(known.has(i) ? styles.gridCardKnown : {}) }}>
          <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>Q{i + 1}</div>
          <div style={{ fontSize: 12, color: "var(--text-primary)", lineHeight: 1.4 }}>{card.question}</div>
          {card.category && <span className="badge badge-purple" style={{ marginTop: 6 }}>{card.category}</span>}
          {known.has(i) && <span style={{ position: "absolute", top: 8, right: 8, color: "var(--accent-green)" }}>✓</span>}
        </motion.div>
      ))}
    </div>
  );
}

const styles = {
  center: { flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14, height: "100%" },
  container: { display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 20px", borderBottom: "1px solid var(--border)", flexShrink: 0, flexWrap: "wrap", gap: 8 },
  studyContainer: { flex: 1, display: "flex", flexDirection: "column", alignItems: "center", padding: "24px 20px", gap: 18, overflow: "auto" },
  progressRow: { display: "flex", alignItems: "center", gap: 10, width: "100%", maxWidth: 540 },
  progressBar: { flex: 1, height: 3, background: "var(--border)", borderRadius: 2, overflow: "hidden" },
  progressFill: { height: "100%", background: "linear-gradient(90deg, var(--accent-cyan), var(--accent-purple))", borderRadius: 2 },

  // --- Flip card ---
  scene: { width: "100%", maxWidth: 540, height: 310, perspective: "1200px", cursor: "pointer" },
  cardInner: { width: "100%", height: "100%", position: "relative", transformStyle: "preserve-3d" },
  face: {
    position: "absolute", inset: 0, borderRadius: 18, padding: "28px 32px",
    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
    backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden",
    border: "1px solid var(--border)",
  },
  front: {
    background: "linear-gradient(145deg, #0d1117, rgba(0,229,255,0.04))",
    borderColor: "rgba(0,229,255,0.2)",
    boxShadow: "0 8px 32px rgba(0,229,255,0.08)",
  },
  back: {
    background: "linear-gradient(145deg, #0d1117, rgba(176,110,255,0.06))",
    borderColor: "rgba(176,110,255,0.3)",
    boxShadow: "0 8px 32px rgba(176,110,255,0.1)",
    transform: "rotateY(180deg)", // KEY: back face starts rotated
  },
  labelFront: { fontSize: 10, color: "rgba(0,229,255,0.6)", marginBottom: 18, fontFamily: "var(--font-mono)", letterSpacing: 3, textTransform: "uppercase" },
  labelBack: { fontSize: 10, color: "rgba(176,110,255,0.7)", marginBottom: 18, fontFamily: "var(--font-mono)", letterSpacing: 3, textTransform: "uppercase" },
  questionText: { fontSize: 18, fontWeight: 600, textAlign: "center", color: "var(--text-primary)", lineHeight: 1.55, maxWidth: "90%" },
  answerText: { fontSize: 16, textAlign: "center", color: "var(--text-primary)", lineHeight: 1.65, maxWidth: "90%" },
  hint: { marginTop: "auto", paddingTop: 18, fontSize: 12, color: "var(--text-muted)" },
  controls: { display: "flex", gap: 10 },
  grid: { flex: 1, overflowY: "auto", padding: 16, display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 10, alignContent: "start" },
  gridCard: { padding: "12px 14px", cursor: "pointer", position: "relative", display: "flex", flexDirection: "column" },
  gridCardKnown: { borderColor: "rgba(0,255,163,0.2)", background: "rgba(0,255,163,0.04)" },
};
