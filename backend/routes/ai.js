// ============================================================
// routes/ai.js — All AI features
// Added: /quiz endpoint for MCQ generation
// ============================================================

const express = require("express");
const OpenAI  = require("openai");
const router  = express.Router();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_BASE_URL || "https://api.openai.com/v1",
});

const MODEL = process.env.AI_MODEL || "gpt-3.5-turbo";

async function callAI(systemPrompt, userPrompt, maxTokens = 1200) {
  const response = await openai.chat.completions.create({
    model: MODEL,
    max_tokens: maxTokens,
    temperature: 0.3,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user",   content: userPrompt   },
    ],
  });
  return response.choices[0].message.content.trim();
}

function truncate(text, maxChars = 8000) {
  if (text.length <= maxChars) return text;
  return text.substring(0, maxChars) + "\n\n[...truncated...]";
}

// ── POST /api/ai/ask ─────────────────────────────────────────
router.post("/ask", async (req, res) => {
  const { question, notes, history = [] } = req.body;
  if (!question) return res.status(400).json({ error: "Question required" });
  try {
    const context = notes ? truncate(notes) : "";
    const systemPrompt = context
      ? `You are a precise academic assistant. Answer using ONLY the provided lecture notes.\nIf partly in notes, use notes + general knowledge but say so.\nIf NOT in notes, say "This topic isn't in your notes, but generally: ..." then answer.\nFormat with markdown.\nNOTES:\n---\n${context}\n---`
      : `You are a knowledgeable academic assistant. Answer clearly and concisely.`;

    const messages = [
      { role: "system", content: systemPrompt },
      ...history.slice(-6).map(m => ({ role: m.role, content: m.content })),
      { role: "user", content: question },
    ];

    const response = await openai.chat.completions.create({
      model: MODEL, max_tokens: 800, temperature: 0.3, messages,
    });
    res.json({ answer: response.choices[0].message.content.trim(), model: MODEL });
  } catch (err) {
    console.error("Ask error:", err.message);
    res.status(500).json({ error: "AI request failed: " + err.message });
  }
});

// ── POST /api/ai/summary ─────────────────────────────────────
router.post("/summary", async (req, res) => {
  const { notes } = req.body;
  if (!notes) return res.status(400).json({ error: "Notes required" });
  try {
    const result = await callAI(
      `You are an expert academic note organizer. Create a clean, structured study guide from lecture notes.\nUse markdown: ## for main topics, ### for subtopics, bullet points for key facts.\nInclude: Overview paragraph, key concepts, important terms, takeaways.\nBe comprehensive but concise.`,
      `Organize these lecture notes into a structured study guide:\n\n${truncate(notes)}`,
      1500
    );
    res.json({ summary: result });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── POST /api/ai/flashcards ──────────────────────────────────
router.post("/flashcards", async (req, res) => {
  const { notes } = req.body;
  if (!notes) return res.status(400).json({ error: "Notes required" });
  try {
    const raw = await callAI(
      `You are a study card generator. Extract the most important concepts and create flashcards.\nRespond ONLY with valid JSON array. No markdown. Format:\n[{"question":"...","answer":"...","category":"..."}]\nGenerate 10-15 high-quality flashcards covering key facts, definitions, and concepts.`,
      `Create flashcards from these notes:\n\n${truncate(notes)}`,
      1200
    );
    const cards = JSON.parse(raw.replace(/```json|```/g, "").trim());
    res.json({ flashcards: cards });
  } catch (err) {
    console.error("Flashcard error:", err.message);
    res.status(500).json({ error: "Failed to generate flashcards: " + err.message });
  }
});

// ── POST /api/ai/mindmap ─────────────────────────────────────
router.post("/mindmap", async (req, res) => {
  const { notes } = req.body;
  if (!notes) return res.status(400).json({ error: "Notes required" });
  try {
    const raw = await callAI(
      `You are a knowledge mapper. Build a hierarchical mind map from lecture notes.\nRespond ONLY with valid JSON. No markdown. Format:\n{"name":"Main Topic","children":[{"name":"Subtopic","children":[{"name":"Detail"}]}]}\nMax 3 levels deep. 4-7 main branches. Keep node names SHORT (1-4 words max).`,
      `Build a mind map from these notes:\n\n${truncate(notes, 6000)}`,
      1000
    );
    const tree = JSON.parse(raw.replace(/```json|```/g, "").trim());
    res.json({ mindmap: tree });
  } catch (err) { res.status(500).json({ error: "Mind map generation failed: " + err.message }); }
});

// ── POST /api/ai/formulas ────────────────────────────────────
router.post("/formulas", async (req, res) => {
  const { notes } = req.body;
  if (!notes) return res.status(400).json({ error: "Notes required" });
  try {
    const raw = await callAI(
      `Extract all mathematical formulas, equations, and scientific notation from the notes.\nRespond ONLY with valid JSON array:\n[{"name":"Formula name","formula":"LaTeX formula string","description":"what it calculates","variables":"meaning of each variable"}]\nWrite formulas in standard LaTeX notation (e.g. d = \\sqrt{(x_2-x_1)^2 + (y_2-y_1)^2}).\nIf no formulas found, return [].`,
      `Extract formulas from:\n\n${truncate(notes)}`,
      1000
    );
    const formulas = JSON.parse(raw.replace(/```json|```/g, "").trim());
    res.json({ formulas });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── POST /api/ai/gaps ────────────────────────────────────────
router.post("/gaps", async (req, res) => {
  const { notes } = req.body;
  if (!notes) return res.status(400).json({ error: "Notes required" });
  try {
    const raw = await callAI(
      `Analyze lecture notes for knowledge gaps, missing context, unclear explanations.\nRespond ONLY with valid JSON:\n{"gaps":[{"topic":"...","issue":"...","suggestion":"..."}],"score":85,"verdict":"..."}\nscore = completeness 0-100. verdict = 1 sentence overall assessment.`,
      `Analyze for knowledge gaps:\n\n${truncate(notes)}`,
      800
    );
    const result = JSON.parse(raw.replace(/```json|```/g, "").trim());
    res.json(result);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── POST /api/ai/definitions ─────────────────────────────────
router.post("/definitions", async (req, res) => {
  const { notes } = req.body;
  if (!notes) return res.status(400).json({ error: "Notes required" });
  try {
    const raw = await callAI(
      `Extract all technical terms, jargon, and domain-specific vocabulary from these notes.\nRespond ONLY with valid JSON array:\n[{"term":"...","definition":"...","context":"brief context"}]\nFocus on terms a student would need to look up.`,
      `Extract and define technical terms from:\n\n${truncate(notes)}`,
      1000
    );
    const definitions = JSON.parse(raw.replace(/```json|```/g, "").trim());
    res.json({ definitions });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── POST /api/ai/quiz ─────────────────────────────────────────
// NEW: Generate MCQ quiz questions with explanations
router.post("/quiz", async (req, res) => {
  const { notes } = req.body;
  if (!notes) return res.status(400).json({ error: "Notes required" });
  try {
    const raw = await callAI(
      `You are a quiz generator. Create 10 multiple choice questions from the lecture notes to test student understanding.
Respond ONLY with valid JSON array. No markdown, no preamble. Format:
[
  {
    "question": "Clear question text",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctIndex": 0,
    "explanation": "Why this answer is correct and others are wrong",
    "topic": "Topic/subtopic name"
  }
]
Rules:
- correctIndex is 0-3 (index of correct option in options array)
- Mix difficulty: some easy, some medium, some challenging
- Options should be plausible (no obviously wrong answers)
- Explanation should be educational and reference the notes
- Cover different topics from the notes
- Questions should test real understanding, not just memorization`,
      `Generate quiz questions from these notes:\n\n${truncate(notes, 7000)}`,
      2000
    );
    const questions = JSON.parse(raw.replace(/```json|```/g, "").trim());
    res.json({ questions });
  } catch (err) {
    console.error("Quiz error:", err.message);
    res.status(500).json({ error: "Failed to generate quiz: " + err.message });
  }
});

module.exports = router;
