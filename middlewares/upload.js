const path = require("path");
const fs = require("fs");

// Buat folder upload jika belum ada
const uploadDir = path.join(__dirname, "../public/uploads/requests");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

/**
 * Middleware upload sederhana tanpa library eksternal.
 * Menggunakan busboy (sudah built-in di Node.js 18+) via express built-in multipart,
 * TAPI karena project ini pakai express 4.x yang tidak handle multipart sendiri,
 * kita pakai multer yang sudah tersedia via npm.
 *
 * Catatan: multer perlu di-install: npm install multer
 */
const multer = require("multer");

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e6)}${ext}`;
    cb(null, uniqueName);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = [".pdf", ".jpg", ".jpeg", ".png"];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowedTypes.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error("Format file tidak didukung. Hanya PDF, JPG, dan PNG."));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // Maks 5MB per file
});

module.exports = upload;
