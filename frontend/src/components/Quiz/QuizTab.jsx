// ============================================================
// QuizTab.jsx — MCQ Quiz with Results Dashboard
// Features: AI-generated MCQs, score tracking, explanations
// ============================================================

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import { getQuiz } from "../../utils/api";

export default function QuizTab({ notes }) {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading]     = useState(false);
  const [current, setCurrent]     = useState(0);
  const [answers, setAnswers]     = useState({});   // { qIndex: selectedOption }
  const [phase, setPhase]         = useState("idle"); // idle | quiz | results

  async function generate() {
    if (!notes) { toast.error("Upload notes first"); return; }
    setLoading(true);
    try {
      const res = await getQuiz(notes.text);
      setQuestions(res.data.questions || []);
      setAnswers({});
      setCurrent(0);
      setPhase("quiz");
      toast.success(`${res.data.questions.length} questions ready!`);
    } catch (e) {
      toast.error("Failed to generate quiz: " + (e.response?.data?.error || e.message));
    } finally { setLoading(false); }
  }

  function selectAnswer(optionIdx) {
    if (answers[current] !== undefined) return; // already answered
    setAnswers(prev => ({ ...prev, [current]: optionIdx }));
  }

  function next() {
    if (current < questions.length - 1) {
      setCurrent(c => c + 1);
    } else {
      setPhase("results");
    }
  }

  function restart() {
    setAnswers({});
    setCurrent(0);
    setPhase("quiz");
  }

  // ── Idle state ───────────────────────────────────────────
  if (!notes) return (
    <div style={S.center}>
      <span style={{ fontSize: 48 }}>📝</span>
      <p style={{ color: "var(--text-secondary)" }}>Upload notes to take a quiz</p>
    </div>
  );

  if (loading) return (
    <div style={S.center}>
      <motion.div animate={{ rotate: [0, 10, -10, 0] }} transition={{ repeat: Infinity, duration: 0.8 }}
        style={{ fontSize: 48 }}>📝</motion.div>
      <p style={{ color: "var(--accent-cyan)", fontFamily: "var(--font-mono)" }}>Generating quiz questions...</p>
    </div>
  );

  if (phase === "idle") return (
    <div style={S.center}>
      <span style={{ fontSize: 48 }}>📝</span>
      <h3 style={{ fontFamily: "var(--font-display)", fontSize: 20, color: "var(--text-primary)" }}>
        Test Your Knowledge
      </h3>
      <p style={{ color: "var(--text-secondary)", textAlign: "center", maxWidth: 360 }}>
        AI will generate 10 multiple choice questions from your notes with detailed explanations
      </p>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
        {["10 Questions", "4 Options each", "Instant Feedback", "Score Analysis"].map(f => (
          <span key={f} className="badge badge-cyan">{f}</span>
        ))}
      </div>
      <button className="btn btn-primary" style={{ marginTop: 8, padding: "10px 28px", fontSize: 14 }} onClick={generate}>
        ⚡ Start Quiz
      </button>
    </div>
  );

  if (phase === "results") return (
    <ResultsDashboard
      questions={questions}
      answers={answers}
      onRestart={restart}
      onNewQuiz={generate}
    />
  );

  // ── Quiz phase ───────────────────────────────────────────
  const q = questions[current];
  const answered = answers[current] !== undefined;
  const selectedIdx = answers[current];
  const isCorrect = answered && selectedIdx === q.correctIndex;

  return (
    <div style={S.quizContainer}>
      {/* Progress */}
      <div style={S.progressRow}>
        <span style={{ color: "var(--text-muted)", fontSize: 12 }}>
          Question {current + 1} of {questions.length}
        </span>
        <div style={S.progressBar}>
          <motion.div
            animate={{ width: `${((current + 1) / questions.length) * 100}%` }}
            style={S.progressFill}
          />
        </div>
        <span style={{ color: "var(--accent-green)", fontSize: 12 }}>
          {Object.values(answers).filter((a, i) => questions[i] && a === questions[i].correctIndex).length} ✓
        </span>
      </div>

      {/* Question card */}
      <motion.div
        key={current}
        initial={{ opacity: 0, x: 30 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3 }}
        style={S.questionCard}
        className="glass"
      >
        {q.topic && (
          <span className="badge badge-purple" style={{ marginBottom: 12 }}>{q.topic}</span>
        )}
        <p style={S.questionText}>{q.question}</p>

        {/* Options */}
        <div style={S.optionsGrid}>
          {q.options.map((opt, i) => {
            let bg = "rgba(255,255,255,0.03)";
            let border = "1px solid var(--border)";
            let color = "var(--text-secondary)";

            if (answered) {
              if (i === q.correctIndex) {
                bg = "rgba(0,255,163,0.1)";
                border = "1px solid var(--accent-green)";
                color = "var(--accent-green)";
              } else if (i === selectedIdx && i !== q.correctIndex) {
                bg = "rgba(255,107,107,0.1)";
                border = "1px solid #ff6b6b";
                color = "#ff6b6b";
              }
            }

            return (
              <motion.button
                key={i}
                whileHover={!answered ? { scale: 1.01, borderColor: "var(--border-bright)" } : {}}
                whileTap={!answered ? { scale: 0.99 } : {}}
                onClick={() => selectAnswer(i)}
                style={{
                  ...S.optionBtn,
                  background: bg, border, color,
                  cursor: answered ? "default" : "pointer",
                }}
              >
                <span style={S.optionLetter}>
                  {["A", "B", "C", "D"][i]}
                </span>
                <span style={{ flex: 1, textAlign: "left" }}>{opt}</span>
                {answered && i === q.correctIndex && <span>✓</span>}
                {answered && i === selectedIdx && i !== q.correctIndex && <span>✗</span>}
              </motion.button>
            );
          })}
        </div>

        {/* Explanation (shown after answering) */}
        <AnimatePresence>
          {answered && q.explanation && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              style={S.explanation}
            >
              <span style={{ color: "var(--accent-cyan)", fontWeight: 600, fontSize: 12 }}>
                💡 Explanation
              </span>
              <p style={{ color: "var(--text-secondary)", fontSize: 13, marginTop: 6, lineHeight: 1.6 }}>
                {q.explanation}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Next button */}
      {answered && (
        <motion.button
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="btn btn-primary"
          onClick={next}
          style={{ padding: "10px 32px", fontSize: 14 }}
        >
          {current < questions.length - 1 ? "Next Question →" : "View Results 🎯"}
        </motion.button>
      )}
    </div>
  );
}

// ── Results Dashboard ────────────────────────────────────────
function ResultsDashboard({ questions, answers, onRestart, onNewQuiz }) {
  const [showDetail, setShowDetail] = useState(false);

  const total   = questions.length;
  const correct = questions.filter((q, i) => answers[i] === q.correctIndex).length;
  const wrong   = total - correct;
  const pct     = Math.round((correct / total) * 100);

  const grade = pct >= 90 ? { label: "Excellent!", color: "var(--accent-green)",  emoji: "🏆" }
              : pct >= 75 ? { label: "Good Job!",   color: "var(--accent-cyan)",   emoji: "🎯" }
              : pct >= 50 ? { label: "Keep Going!", color: "var(--accent-amber)",  emoji: "📚" }
              :              { label: "Need Review", color: "#ff6b6b",              emoji: "💪" };

  // Group by topic
  const topicStats = {};
  questions.forEach((q, i) => {
    const topic = q.topic || "General";
    if (!topicStats[topic]) topicStats[topic] = { correct: 0, total: 0 };
    topicStats[topic].total++;
    if (answers[i] === q.correctIndex) topicStats[topic].correct++;
  });

  return (
    <div style={S.resultsContainer}>
      <div style={{ overflowY: "auto", flex: 1, padding: "24px" }}>

        {/* Score Hero */}
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          style={S.scoreHero} className="glass">
          <div style={{ fontSize: 48 }}>{grade.emoji}</div>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 52, fontWeight: 800, color: grade.color }}>
            {pct}%
          </div>
          <div style={{ fontSize: 18, fontWeight: 600, color: grade.color }}>{grade.label}</div>
          <div style={{ color: "var(--text-muted)", fontSize: 13, marginTop: 4 }}>
            {correct} correct out of {total} questions
          </div>
        </motion.div>

        {/* Stats row */}
        <div style={S.statsRow}>
          {[
            { label: "Correct", value: correct, color: "var(--accent-green)", icon: "✓" },
            { label: "Wrong",   value: wrong,   color: "#ff6b6b",             icon: "✗" },
            { label: "Score",   value: `${pct}%`, color: grade.color,          icon: "%" },
          ].map(stat => (
            <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              className="glass" style={S.statCard}>
              <div style={{ fontSize: 28, fontWeight: 800, color: stat.color, fontFamily: "var(--font-display)" }}>
                {stat.value}
              </div>
              <div style={{ color: "var(--text-muted)", fontSize: 12 }}>{stat.label}</div>
            </motion.div>
          ))}
        </div>

        {/* Topic breakdown */}
        {Object.keys(topicStats).length > 1 && (
          <div className="glass" style={S.topicBreakdown}>
            <h4 style={{ fontFamily: "var(--font-display)", fontSize: 14, marginBottom: 14, color: "var(--text-primary)" }}>
              📊 Topic Breakdown
            </h4>
            {Object.entries(topicStats).map(([topic, stat]) => {
              const tPct = Math.round((stat.correct / stat.total) * 100);
              return (
                <div key={topic} style={{ marginBottom: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>{topic}</span>
                    <span style={{ fontSize: 12, color: tPct >= 70 ? "var(--accent-green)" : "var(--accent-amber)" }}>
                      {stat.correct}/{stat.total}
                    </span>
                  </div>
                  <div style={{ height: 6, background: "var(--border)", borderRadius: 3 }}>
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${tPct}%` }}
                      transition={{ duration: 0.8, delay: 0.2 }}
                      style={{
                        height: "100%", borderRadius: 3,
                        background: tPct >= 70
                          ? "linear-gradient(90deg,var(--accent-green),var(--accent-cyan))"
                          : "linear-gradient(90deg,var(--accent-amber),#ff6b6b)",
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Detailed review */}
        <button className="btn btn-ghost" style={{ width: "100%", marginTop: 4, justifyContent: "center" }}
          onClick={() => setShowDetail(d => !d)}>
          {showDetail ? "▲ Hide" : "▼ Review all answers"}
        </button>

        <AnimatePresence>
          {showDetail && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}>
              {questions.map((q, i) => {
                const isRight = answers[i] === q.correctIndex;
                return (
                  <div key={i} className="glass" style={{ ...S.reviewCard, borderColor: isRight ? "rgba(0,255,163,0.2)" : "rgba(255,107,107,0.2)" }}>
                    <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                      <span style={{ fontSize: 16, flexShrink: 0 }}>{isRight ? "✅" : "❌"}</span>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: 13, color: "var(--text-primary)", marginBottom: 6, fontWeight: 500 }}>
                          Q{i + 1}: {q.question}
                        </p>
                        {!isRight && (
                          <p style={{ fontSize: 12, color: "#ff6b6b", marginBottom: 4 }}>
                            Your answer: {q.options[answers[i]] || "Not answered"}
                          </p>
                        )}
                        <p style={{ fontSize: 12, color: "var(--accent-green)", marginBottom: 6 }}>
                          Correct: {q.options[q.correctIndex]}
                        </p>
                        {q.explanation && (
                          <p style={{ fontSize: 11, color: "var(--text-muted)", lineHeight: 1.5 }}>
                            💡 {q.explanation}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Actions */}
      <div style={S.resultsActions}>
        <button className="btn btn-ghost" onClick={onRestart}>↺ Retry Same Quiz</button>
        <button className="btn btn-primary" onClick={onNewQuiz}>⚡ New Quiz</button>
      </div>
    </div>
  );
}

const S = {
  center: { flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, height: "100%", padding: 24 },
  quizContainer: { flex: 1, display: "flex", flexDirection: "column", alignItems: "center", padding: "20px 24px", gap: 16, overflowY: "auto" },
  progressRow: { display: "flex", alignItems: "center", gap: 10, width: "100%", maxWidth: 620 },
  progressBar: { flex: 1, height: 4, background: "var(--border)", borderRadius: 2, overflow: "hidden" },
  progressFill: { height: "100%", background: "linear-gradient(90deg, var(--accent-cyan), var(--accent-purple))", borderRadius: 2 },
  questionCard: { width: "100%", maxWidth: 620, padding: "24px 28px", borderRadius: 16, display: "flex", flexDirection: "column", gap: 0 },
  questionText: { fontSize: 17, fontWeight: 600, color: "var(--text-primary)", lineHeight: 1.55, marginBottom: 20 },
  optionsGrid: { display: "flex", flexDirection: "column", gap: 10 },
  optionBtn: { display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", borderRadius: 10, fontSize: 13, fontFamily: "var(--font-body)", transition: "all 0.15s", width: "100%" },
  optionLetter: { width: 26, height: 26, borderRadius: "50%", background: "rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, flexShrink: 0, fontSize: 12 },
  explanation: { marginTop: 16, padding: "14px 16px", borderRadius: 10, background: "rgba(0,229,255,0.04)", border: "1px solid rgba(0,229,255,0.15)" },

  // Results
  resultsContainer: { flex: 1, display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" },
  scoreHero: { display: "flex", flexDirection: "column", alignItems: "center", gap: 6, padding: "28px 24px", borderRadius: 16, marginBottom: 16, textAlign: "center" },
  statsRow: { display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginBottom: 16 },
  statCard: { padding: "16px", textAlign: "center", borderRadius: 12, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 },
  topicBreakdown: { padding: "16px 18px", borderRadius: 12, marginBottom: 12 },
  reviewCard: { padding: "14px 16px", borderRadius: 10, marginBottom: 8, border: "1px solid var(--border)" },
  resultsActions: { display: "flex", gap: 10, padding: "14px 24px", borderTop: "1px solid var(--border)", justifyContent: "center", flexShrink: 0 },
};
