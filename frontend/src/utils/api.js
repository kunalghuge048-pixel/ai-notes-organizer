// src/utils/api.js — Centralized API calls
import axios from "axios";

const BASE = process.env.REACT_APP_API_URL || "";
const api  = axios.create({ baseURL: BASE, timeout: 90000 });

// ── Upload ────────────────────────────────────────────────────
export const uploadPDF   = (file, onProgress) => {
  const fd = new FormData(); fd.append("file", file);
  return api.post("/api/upload/pdf", fd, {
    headers: { "Content-Type": "multipart/form-data" },
    onUploadProgress: e => onProgress && onProgress(Math.round(e.loaded * 100 / e.total)),
  });
};
export const uploadImage = (file) => {
  const fd = new FormData(); fd.append("file", file);
  return api.post("/api/upload/image", fd, { headers: { "Content-Type": "multipart/form-data" } });
};
export const uploadText  = (text) => api.post("/api/upload/text", { text });

// ── AI Features ───────────────────────────────────────────────
export const askQuestion   = (question, notes, history) => api.post("/api/ai/ask",         { question, notes, history });
export const getSummary    = (notes) => api.post("/api/ai/summary",     { notes });
export const getFlashcards = (notes) => api.post("/api/ai/flashcards",  { notes });
export const getMindmap    = (notes) => api.post("/api/ai/mindmap",     { notes });
export const getFormulas   = (notes) => api.post("/api/ai/formulas",    { notes });
export const getGaps       = (notes) => api.post("/api/ai/gaps",        { notes });
export const getDefinitions= (notes) => api.post("/api/ai/definitions", { notes });
export const getQuiz       = (notes) => api.post("/api/ai/quiz",        { notes });   // NEW

// ── Notes Storage ─────────────────────────────────────────────
export const listNotes  = ()         => api.get("/api/notes");
export const getNote    = (id)       => api.get(`/api/notes/${id}`);
export const saveNote   = (data)     => api.post("/api/notes", data);
export const updateNote = (id, data) => api.put(`/api/notes/${id}`, data);
export const deleteNote = (id)       => api.delete(`/api/notes/${id}`);

export default api;
