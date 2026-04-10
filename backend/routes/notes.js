const express = require("express");
const fs      = require("fs");
const path    = require("path");
const { v4: uuidv4 } = require("uuid");
const router  = express.Router();

const STORE = path.join(__dirname, "../data/notes.json");

function ensureStore() {
  const dir = path.dirname(STORE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(STORE)) fs.writeFileSync(STORE, "[]");
}
function readNotes()       { ensureStore(); return JSON.parse(fs.readFileSync(STORE, "utf8")); }
function writeNotes(notes) { fs.writeFileSync(STORE, JSON.stringify(notes, null, 2)); }

router.get("/", (req, res) => {
  try {
    const list = readNotes().map(({ id, title, source, createdAt, wordCount, pageCount }) =>
      ({ id, title, source, createdAt, wordCount, pageCount }));
    res.json(list);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get("/:id", (req, res) => {
  const note = readNotes().find(n => n.id === req.params.id);
  if (!note) return res.status(404).json({ error: "Not found" });
  res.json(note);
});

router.post("/", (req, res) => {
  const { title, source, text, wordCount, pageCount } = req.body;
  if (!text) return res.status(400).json({ error: "Text required" });
  const notes = readNotes();
  if (notes.length >= 20) notes.splice(0, 1);
  const newNote = {
    id: uuidv4(),
    title: title || `Notes — ${new Date().toLocaleDateString()}`,
    source: source || "unknown",
    text: text.substring(0, 50000),
    wordCount: wordCount || text.split(/\s+/).length,
    pageCount: pageCount || null,
    createdAt: new Date().toISOString(),
  };
  notes.push(newNote);
  writeNotes(notes);
  res.json({ success: true, id: newNote.id, note: newNote });
});

router.put("/:id", (req, res) => {
  const notes = readNotes();
  const idx = notes.findIndex(n => n.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: "Not found" });
  notes[idx] = { ...notes[idx], ...req.body, id: notes[idx].id };
  writeNotes(notes);
  res.json({ success: true });
});

router.delete("/:id", (req, res) => {
  writeNotes(readNotes().filter(n => n.id !== req.params.id));
  res.json({ success: true });
});

module.exports = router;