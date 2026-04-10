// ============================================================
// Sidebar.jsx — Upload panel + saved notes history
// ============================================================

import React, { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import { uploadPDF, uploadImage, uploadText, listNotes, getNote, saveNote, deleteNote } from "../../utils/api";

export default function Sidebar({ currentNotes, onNotesLoaded, onToolsOpen }) {
  const [tab, setTab]             = useState("upload");
  const [mode, setMode]           = useState("text");
  const [textInput, setTextInput] = useState("");
  const [loading, setLoading]     = useState(false);
  const [progress, setProgress]   = useState(0);
  const [savedNotes, setSavedNotes] = useState([]);
  const fileRef = useRef(null);

  useEffect(() => {
    if (tab === "history") {
      listNotes().then(r => setSavedNotes(r.data || [])).catch(() => setSavedNotes([]));
    }
  }, [tab]);

  async function handleUpload(file) {
    if (!file) return;
    setLoading(true); setProgress(0);
    try {
      let res;
      if (file.type === "application/pdf") {
        res = await uploadPDF(file, p => setProgress(p));
      } else if (file.type.startsWith("image/")) {
        toast.loading("Running OCR...", { id: "ocr" });
        res = await uploadImage(file);
        toast.dismiss("ocr");
      } else {
        toast.error("Unsupported file type"); return;
      }
      onNotesLoaded(res.data);
      await saveNote({ title: file.name, ...res.data });
    } catch (e) {
      toast.error(e.response?.data?.error || "Upload failed");
    } finally { setLoading(false); setProgress(0); }
  }

  async function handleTextSubmit() {
    if (!textInput.trim()) { toast.error("Enter some text first"); return; }
    setLoading(true);
    try {
      const res = await uploadText(textInput);
      onNotesLoaded(res.data);
      await saveNote({ title: "Manual Input — " + new Date().toLocaleDateString(), ...res.data });
      setTextInput("");
    } catch (e) {
      toast.error(e.response?.data?.error || "Failed");
    } finally { setLoading(false); }
  }

  async function loadSavedNote(id) {
    try {
      const res = await getNote(id);
      onNotesLoaded(res.data);
      toast.success("Note loaded from history");
    } catch { toast.error("Failed to load note"); }
  }

  async function handleDelete(e, id) {
    e.stopPropagation();
    await deleteNote(id);
    setSavedNotes(prev => prev.filter(n => n.id !== id));
    toast.success("Deleted");
  }

  return (
    <div style={styles.container}>
      {/* ── Brand header ── */}
      <div style={styles.header}>
        <span style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 16, letterSpacing: -0.5 }}>
          ⬡ AI Notes<span className="gradient-text"> Organizer</span>
        </span>
        <span className="badge badge-purple" style={{ fontSize: 9 }}>BETA</span>
      </div>

      {/* ── Tab row ── */}
      <div style={styles.tabRow}>
        {[["upload", "⬆ Upload"], ["history", "📂 History"]].map(([t, label]) => (
          <button key={t} onClick={() => setTab(t)}
            style={{ ...styles.miniTab, ...(tab === t ? styles.miniTabActive : {}) }}>
            {label}
          </button>
        ))}
      </div>

      <div style={styles.body}>
        {tab === "upload" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={styles.modeRow}>
              {[["text", "✏️ Text"], ["pdf", "📄 PDF"], ["image", "🖼️ Image"]].map(([m, label]) => (
                <button key={m} onClick={() => setMode(m)}
                  style={{ ...styles.modeBtn, ...(mode === m ? styles.modeBtnActive : {}) }}>
                  {label}
                </button>
              ))}
            </div>

            {mode === "text" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <textarea className="input"
                  placeholder="Paste your lecture notes here..."
                  rows={10} value={textInput}
                  onChange={e => setTextInput(e.target.value)}
                  style={{ resize: "vertical", minHeight: 160 }}
                />
                <button className="btn btn-primary" onClick={handleTextSubmit} disabled={loading}
                  style={{ width: "100%", justifyContent: "center" }}>
                  {loading ? <span className="spin">⟳</span> : "⚡"} Process Notes
                </button>
              </div>
            )}

            {(mode === "pdf" || mode === "image") && (
              <DropZone mode={mode} loading={loading} progress={progress}
                onFile={handleUpload} fileRef={fileRef} />
            )}
          </div>
        )}

        {tab === "history" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {savedNotes.length === 0 ? (
              <div style={styles.empty}>
                <span style={{ fontSize: 32 }}>📭</span>
                <span style={{ color: "var(--text-muted)", fontSize: 12 }}>No saved notes yet</span>
                <span style={{ color: "var(--text-muted)", fontSize: 11, textAlign: "center" }}>
                  Upload notes and they will appear here
                </span>
              </div>
            ) : savedNotes.map((note, i) => (
              <motion.div key={note.id}
                initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04 }}
                onClick={() => loadSavedNote(note.id)}
                style={styles.noteCard} className="glass">
                <div style={styles.noteTitle}>{note.title}</div>
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <span className={`badge badge-${note.source === "pdf" ? "cyan" : note.source === "ocr" ? "purple" : "green"}`}>
                    {(note.source || "TEXT").toUpperCase()}
                  </span>
                  <span style={{ color: "var(--text-muted)", fontSize: 11 }}>
                    {note.createdAt ? new Date(note.createdAt).toLocaleDateString() : ""}
                  </span>
                  <button
                    style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", fontSize: 14 }}
                    onClick={e => handleDelete(e, note.id)}>🗑</button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {currentNotes && (
        <div style={styles.footer}>
          <div style={{ fontSize: 11, color: "var(--text-muted)" }}>LOADED</div>
          <div style={{ fontSize: 12, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {currentNotes.filename}
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <span className="badge badge-green">{currentNotes.wordCount?.toLocaleString()} words</span>
            {currentNotes.pageCount && <span className="badge badge-cyan">{currentNotes.pageCount} pages</span>}
          </div>
        </div>
      )}
    </div>
  );
}

function DropZone({ mode, loading, progress, onFile, fileRef }) {
  const [dragging, setDragging] = useState(false);
  const accept = mode === "pdf" ? ".pdf" : "image/*";
  return (
    <div
      style={{ ...styles.dropzone, ...(dragging ? styles.dropzoneActive : {}) }}
      onDragOver={e => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={e => { e.preventDefault(); setDragging(false); onFile(e.dataTransfer.files[0]); }}
      onClick={() => fileRef.current?.click()}
    >
      <input ref={fileRef} type="file" accept={accept} style={{ display: "none" }}
        onChange={e => onFile(e.target.files[0])} />
      {loading ? (
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 24 }} className="spin">⟳</div>
          <div style={{ color: "var(--accent-cyan)", marginTop: 8, fontSize: 12 }}>
            {mode === "image" ? "Running OCR..." : `Parsing PDF... ${progress}%`}
          </div>
          {progress > 0 && (
            <div style={{ width: "100%", height: 3, background: "var(--border)", borderRadius: 2, marginTop: 8 }}>
              <div style={{ width: `${progress}%`, height: "100%", background: "var(--accent-cyan)", borderRadius: 2, transition: "width 0.2s" }} />
            </div>
          )}
        </div>
      ) : (
        <>
          <span style={{ fontSize: 36 }}>{mode === "pdf" ? "📄" : "🖼️"}</span>
          <span style={{ color: "var(--text-secondary)", fontSize: 13 }}>Drop {mode === "pdf" ? "PDF" : "image"} here</span>
          <span style={{ color: "var(--text-muted)", fontSize: 11 }}>or click to browse</span>
          {mode === "image" && <span className="badge badge-purple" style={{ marginTop: 4 }}>OCR enabled</span>}
        </>
      )}
    </div>
  );
}

const styles = {
  container: { display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" },
  header: { display: "flex", alignItems: "center", gap: 8, padding: "14px 16px", borderBottom: "1px solid var(--border)", flexShrink: 0 },
  tabRow: { display: "flex", gap: 4, padding: "8px 12px", borderBottom: "1px solid var(--border)", flexShrink: 0 },
  miniTab: { flex: 1, padding: "5px", borderRadius: 6, background: "transparent", border: "1px solid var(--border)", color: "var(--text-muted)", cursor: "pointer", fontSize: 12, fontFamily: "var(--font-body)" },
  miniTabActive: { background: "rgba(0,229,255,0.08)", border: "1px solid rgba(0,229,255,0.25)", color: "var(--accent-cyan)" },
  body: { flex: 1, overflowY: "auto", padding: 12 },
  modeRow: { display: "flex", gap: 4 },
  modeBtn: { flex: 1, padding: "5px 4px", borderRadius: 6, background: "var(--bg-glass)", border: "1px solid var(--border)", color: "var(--text-muted)", cursor: "pointer", fontSize: 11, fontFamily: "var(--font-body)" },
  modeBtnActive: { background: "rgba(176,110,255,0.12)", border: "1px solid rgba(176,110,255,0.3)", color: "var(--accent-purple)" },
  dropzone: { border: "1px dashed var(--border)", borderRadius: 10, padding: 24, display: "flex", flexDirection: "column", alignItems: "center", gap: 8, cursor: "pointer", transition: "all 0.2s", minHeight: 160, justifyContent: "center" },
  dropzoneActive: { borderColor: "var(--accent-cyan)", background: "rgba(0,229,255,0.05)" },
  noteCard: { padding: "10px 12px", cursor: "pointer", display: "flex", flexDirection: "column", gap: 6, transition: "all 0.15s" },
  noteTitle: { fontSize: 13, fontWeight: 500, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  empty: { display: "flex", flexDirection: "column", alignItems: "center", gap: 8, padding: 24, color: "var(--text-muted)" },
  footer: { borderTop: "1px solid var(--border)", padding: "10px 14px", display: "flex", flexDirection: "column", gap: 4, flexShrink: 0, background: "rgba(0,229,255,0.02)" },
};
