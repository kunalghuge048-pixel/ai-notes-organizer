// ============================================================
// ChatTab.jsx — ChatGPT-style Q&A grounded in notes
// ============================================================

import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import toast from "react-hot-toast";
import { askQuestion } from "../../utils/api";

const SUGGESTIONS = [
  "Summarize the main topics",
  "What are the key definitions?",
  "Explain the most important formula",
  "What should I study first?",
  "List the core concepts",
];

export default function ChatTab({ notes }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput]       = useState("");
  const [loading, setLoading]   = useState(false);
  const bottomRef = useRef(null);
  const inputRef  = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Welcome message on first load
  useEffect(() => {
    if (notes && messages.length === 0) {
      setMessages([{
        role: "assistant",
        content: `📚 **Notes loaded!** I've processed **${notes.wordCount?.toLocaleString()} words** from *${notes.filename}*.\n\nAsk me anything about your notes — I'll tell you exactly what's in them, and flag if I need to use general knowledge.`,
        ts: Date.now(),
      }]);
    }
  }, [notes]);

  async function sendMessage(text) {
    const q = (text || input).trim();
    if (!q || loading) return;
    setInput("");

    const userMsg = { role: "user", content: q, ts: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    try {
      const history = messages.slice(-8); // send last 8 for context
      const res = await askQuestion(q, notes?.text, history);
      setMessages(prev => [...prev, {
        role: "assistant",
        content: res.data.answer,
        ts: Date.now(),
      }]);
    } catch (e) {
      toast.error("Failed to get answer — check your API key");
      setMessages(prev => [...prev, {
        role: "assistant",
        content: "⚠️ Sorry, I couldn't get an answer right now. Please check your API configuration.",
        ts: Date.now(),
        error: true,
      }]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }

  function handleKey(e) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  }

  return (
    <div style={styles.container}>
      {/* Empty state */}
      {messages.length === 0 && !notes && (
        <div style={styles.emptyState}>
          <motion.div
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ repeat: Infinity, duration: 3 }}
            style={{ fontSize: 64 }}
          >🧠</motion.div>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: 24, fontWeight: 700 }}>
            Ready to Learn
          </h2>
          <p style={{ color: "var(--text-secondary)", maxWidth: 320, textAlign: "center" }}>
            Upload lecture notes from the sidebar — PDF, image, or paste text — then ask me anything.
          </p>
        </div>
      )}

      {/* Messages */}
      <div style={styles.messages}>
        <AnimatePresence initial={false}>
          {messages.map((msg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              style={{ ...styles.msgRow, justifyContent: msg.role === "user" ? "flex-end" : "flex-start" }}
            >
              {msg.role === "assistant" && (
                <div style={styles.avatar}>⬡</div>
              )}
              <div style={{
                ...styles.bubble,
                ...(msg.role === "user" ? styles.userBubble : styles.aiBubble),
                ...(msg.error ? { borderColor: "rgba(255,50,50,0.3)" } : {}),
              }}>
                {msg.role === "assistant" ? (
                  <div className="prose" style={{ fontSize: 13.5 }}>
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                  </div>
                ) : (
                  <span style={{ fontSize: 13.5 }}>{msg.content}</span>
                )}
                <div style={styles.timestamp}>
                  {new Date(msg.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Typing indicator */}
        {loading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={styles.msgRow}>
            <div style={styles.avatar}>⬡</div>
            <div style={{ ...styles.bubble, ...styles.aiBubble }}>
              <TypingDots />
            </div>
          </motion.div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Suggestions */}
      {notes && messages.length < 2 && (
        <div style={styles.suggestions}>
          {SUGGESTIONS.map(s => (
            <button key={s} className="btn btn-ghost" style={{ fontSize: 12 }}
              onClick={() => sendMessage(s)}>
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Input box */}
      <div style={styles.inputRow}>
        <textarea
          ref={inputRef}
          className="input"
          placeholder={notes ? "Ask anything about your notes..." : "Upload notes first to get started..."}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKey}
          rows={1}
          style={{ resize: "none", flex: 1, lineHeight: "1.5" }}
          disabled={!notes && messages.length === 0}
        />
        <button
          className="btn btn-primary"
          onClick={() => sendMessage()}
          disabled={loading || !input.trim()}
          style={{ padding: "10px 18px", alignSelf: "flex-end" }}
        >
          {loading ? <span className="spin">⟳</span> : "↑"}
        </button>
      </div>
    </div>
  );
}

function TypingDots() {
  return (
    <div style={{ display: "flex", gap: 4, padding: "2px 0" }}>
      {[0, 1, 2].map(i => (
        <motion.div
          key={i}
          animate={{ y: [0, -4, 0] }}
          transition={{ repeat: Infinity, duration: 0.8, delay: i * 0.15 }}
          style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--accent-cyan)" }}
        />
      ))}
    </div>
  );
}

const styles = {
  container: { display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" },
  emptyState: { flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16 },
  messages: { flex: 1, overflowY: "auto", padding: "16px 20px", display: "flex", flexDirection: "column", gap: 12 },
  msgRow: { display: "flex", gap: 10, alignItems: "flex-start" },
  avatar: { width: 28, height: 28, borderRadius: 8, background: "linear-gradient(135deg, rgba(0,229,255,0.2), rgba(176,110,255,0.2))", border: "1px solid var(--border-bright)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0, marginTop: 2 },
  bubble: { maxWidth: "72%", padding: "10px 14px", borderRadius: 12, position: "relative" },
  userBubble: { background: "rgba(0,229,255,0.08)", border: "1px solid rgba(0,229,255,0.2)", color: "var(--text-primary)", borderBottomRightRadius: 4 },
  aiBubble: { background: "var(--bg-elevated)", border: "1px solid var(--border)", borderBottomLeftRadius: 4 },
  timestamp: { fontSize: 10, color: "var(--text-muted)", marginTop: 4, textAlign: "right" },
  suggestions: { display: "flex", flexWrap: "wrap", gap: 6, padding: "8px 20px 0" },
  inputRow: { display: "flex", gap: 8, padding: "12px 20px 16px", borderTop: "1px solid var(--border)", alignItems: "flex-end" },
};
