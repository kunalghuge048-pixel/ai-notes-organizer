const express  = require("express");
const multer   = require("multer");
const pdfParse = require("pdf-parse");
const Tesseract = require("tesseract.js");
const router   = express.Router();

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ["application/pdf","image/png","image/jpeg","image/jpg","image/webp"];
    allowed.includes(file.mimetype) ? cb(null, true) : cb(new Error("Only PDF and images allowed"));
  },
});

router.post("/pdf", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });
    const data = await pdfParse(req.file.buffer, { max: 50 });
    const text = data.text.trim();
    if (!text) return res.status(422).json({ error: "Could not extract text from PDF" });
    res.json({
      success: true, source: "pdf",
      filename: req.file.originalname,
      pageCount: data.numpages,
      text: text.substring(0, 50000),
      wordCount: text.split(/\s+/).length,
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to parse PDF: " + err.message });
  }
});

router.post("/image", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No image uploaded" });
    const { data: { text } } = await Tesseract.recognize(req.file.buffer, "eng", {
      logger: () => {},
    });
    const cleaned = text.trim();
    if (!cleaned) return res.status(422).json({ error: "No text detected in image" });
    res.json({
      success: true, source: "ocr",
      filename: req.file.originalname,
      text: cleaned.substring(0, 20000),
      wordCount: cleaned.split(/\s+/).length,
    });
  } catch (err) {
    res.status(500).json({ error: "OCR failed: " + err.message });
  }
});

router.post("/text", express.json(), (req, res) => {
  const { text } = req.body;
  if (!text || text.trim().length < 10)
    return res.status(400).json({ error: "Text too short" });
  res.json({
    success: true, source: "text",
    filename: "Manual Input",
    text: text.trim().substring(0, 50000),
    wordCount: text.split(/\s+/).length,
  });
});

module.exports = router;