const db = require("../lib/db");
const path = require("path");
const fs = require("fs");

// Tambahan library baru untuk fitur PDF dan Barcode
const { PDFDocument, StandardFonts } = require('pdf-lib');
const QRCode = require('qrcode');

/**
 * Konvensi Status (INT):
 * 0 = Menunggu (Pending)
 * 1 = Diverifikasi (sudah dicek admin, sedang diproses)
 * 2 = Ditolak
 * 3 = Selesai (surat sudah jadi)
 * 4 = Dibatalkan (oleh mahasiswa)
 */
const STATUS = { MENUNGGU: 0, DIVERIFIKASI: 1, DITOLAK: 2, SELESAI: 3, DIBATALKAN: 4 };

const getStatusBadge = (status) => {
  switch (status) {
    case STATUS.MENUNGGU:     return { label: "Menunggu",    class: "badge-outline text-yellow-600 border-yellow-600" };
    case STATUS.DIVERIFIKASI: return { label: "Diverifikasi", class: "badge bg-blue-500 text-white" };
    case STATUS.DITOLAK:      return { label: "Ditolak",      class: "badge badge-destructive" };
    case STATUS.SELESAI:      return { label: "Selesai",      class: "badge bg-green-500 text-white" };
    case STATUS.DIBATALKAN:   return { label: "Dibatalkan",   class: "badge badge-secondary" };
    default:                  return { label: "Unknown",      class: "badge badge-outline" };
  }
};

// ─── Fitur 2: Riwayat Permohonan (List + Pagination + Search) ─────────────────
const index = async (req, res, next) => {
  try {
    const page    = parseInt(req.query.page) || 1;
    const limit   = 10;
    const offset  = (page - 1) * limit;
    const search  = req.query.search || "";

    const searchPattern = `%${search}%`;

    const [[{ total }]] = await db.query(
      `SELECT COUNT(*) as total
       FROM student_requests sr
       WHERE sr.requested_by = ?
         AND (sr.request_nunmber LIKE ? OR sr.title LIKE ? OR sr.request_type LIKE ?)`,
      [req.session.userId, searchPattern, searchPattern, searchPattern]
    );

    const [requests] = await db.query(
      `SELECT sr.*, s.name as student_name, s.regno as nim
       FROM student_requests sr
       JOIN students s ON sr.requested_by = s.id
       WHERE sr.requested_by = ?
         AND (sr.request_nunmber LIKE ? OR sr.title LIKE ? OR sr.request_type LIKE ?)
       ORDER BY sr.requested_at DESC
       LIMIT ? OFFSET ?`,
      [req.session.userId, searchPattern, searchPattern, searchPattern, limit, offset]
    );

    const mappedRequests = requests.map(r => ({ ...r, badge: getStatusBadge(r.status) }));
    const totalPages = Math.ceil(total / limit);

    res.render("requests/index", {
      title: "Riwayat Permohonan",
      requests: mappedRequests,
      user: req.session.username,
      pagination: { page, totalPages, total },
      search
    });
  } catch (err) {
    next(err);
  }
};

// ─── Fitur 1: Form Pengajuan (Create) ─────────────────────────────────────────
const createPage = (req, res) => {
  res.render("requests/create", {
    title: "Buat Permohonan Baru",
    user: req.session.username,
    errors: [],
    old: {}
  });
};

const store = async (req, res, next) => {
  const { request_type, title, description } = req.body;
  const errors = [];

  // ✅ Validasi server-side
  if (!request_type || !["aktif", "lulus"].includes(request_type)) {
    errors.push("Jenis permohonan tidak valid.");
  }
  if (!title || title.trim().length < 5) {
    errors.push("Keperluan / judul surat wajib diisi (minimal 5 karakter).");
  }
  if (title && title.trim().length > 255) {
    errors.push("Keperluan / judul surat terlalu panjang (maks 255 karakter).");
  }

  // Validasi file KRS wajib ada
  const krsFile = req.files?.krs_file?.[0] ?? null;
  if (!krsFile) {
    errors.push("File KRS wajib diunggah.");
  }

  if (errors.length > 0) {
    // Hapus file yang sudah terupload jika validasi gagal
    if (req.files) {
      Object.values(req.files).flat().forEach(f => {
        fs.unlink(f.path, () => {});
      });
    }
    return res.status(422).render("requests/create", {
      title: "Buat Permohonan Baru",
      user: req.session.username,
      errors,
      old: { request_type, title, description }
    });
  }

  try {
    const requestNumber = `REQ-${Date.now()}`;
    const additionalFile = req.files?.additional_file?.[0] ?? null;

    // Insert ke student_requests
    const [result] = await db.query(
      `INSERT INTO student_requests
       (request_nunmber, request_type, title, description, status, requested_by, requested_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW(), NOW())`,
      [requestNumber, request_type, title.trim(), description?.trim() || null, STATUS.MENUNGGU, req.session.userId]
    );

    const newRequestId = result.insertId;

    // Insert ke tabel referensi sesuai jenis surat
    // Kolom checked_by & signed_by pakai placeholder employee ID = 1 (akan diisi admin nanti)
    // student_study_plan_file = KRS, parent_decree_file = dokumen tambahan
    if (request_type === "aktif") {
      await db.query(
        `INSERT INTO student_request_active_references
         (student_requests_id, student_study_plan_file, parent_decree_file, checked_by, signed_by, status, created_at, updated_at)
         VALUES (?, ?, ?, 1, 1, 'pending', NOW(), NOW())`,
        [newRequestId, krsFile.filename, additionalFile?.filename || null]
      );
    } else if (request_type === "lulus") {
      await db.query(
        `INSERT INTO student_request_grad_references
         (student_requests_id, cover_letter_department_file, proof_o_grad_registration_file, checked_by, signed_by, status, created_at, updated_at)
         VALUES (?, ?, ?, 1, 1, 'pending', NOW(), NOW())`,
        [newRequestId, krsFile.filename, additionalFile?.filename || null]
      );
    }

    res.redirect("/requests");
  } catch (err) {
    // Hapus file jika DB error
    if (req.files) {
      Object.values(req.files).flat().forEach(f => {
        fs.unlink(f.path, () => {});
      });
    }
    next(err);
  }
};

// ─── Fitur 3: Detail Permohonan ───────────────────────────────────────────────
const show = async (req, res, next) => {
  try {
    const { id } = req.params;

    const [rows] = await db.query(
      `SELECT sr.*, s.name as student_name, s.regno as nim
       FROM student_requests sr
       JOIN students s ON sr.requested_by = s.id
       WHERE sr.id = ? AND sr.requested_by = ?`,
      [id, req.session.userId]
    );

    if (rows.length === 0) {
      return res.status(404).render("error", {
        message: "Permohonan tidak ditemukan.",
        error: { status: 404, stack: "" }
      });
    }

    const requestData = { ...rows[0], badge: getStatusBadge(rows[0].status) };

    // Ambil file berkas sesuai jenis
    let documents = null;
    if (requestData.request_type === "aktif") {
      const [docs] = await db.query(
        `SELECT * FROM student_request_active_references WHERE student_requests_id = ?`, [id]
      );
      documents = docs[0] || null;
    } else if (requestData.request_type === "lulus") {
      const [docs] = await db.query(
        `SELECT * FROM student_request_grad_references WHERE student_requests_id = ?`, [id]
      );
      documents = docs[0] || null;
    }

    res.render("requests/show", {
      title: "Detail Permohonan",
      request: requestData,
      documents,
      user: req.session.username,
      STATUS
    });
  } catch (err) {
    next(err);
  }
};

// ─── Fitur 3: Batalkan Permohonan ─────────────────────────────────────────────
const cancel = async (req, res, next) => {
  try {
    const { id } = req.params;

    // ✅ PERBAIKAN: Cek affectedRows untuk tahu apakah batal berhasil
    const [result] = await db.query(
      `UPDATE student_requests
       SET status = ?, updated_at = NOW()
       WHERE id = ? AND requested_by = ? AND status = ?`,
      [STATUS.DIBATALKAN, id, req.session.userId, STATUS.MENUNGGU]
    );

    if (result.affectedRows === 0) {
      // Permohonan tidak ditemukan atau statusnya sudah bukan "Menunggu"
      res.set("HX-Reswap", "none");
      return res.status(422).json({
        status: "error",
        message: "Permohonan tidak dapat dibatalkan. Mungkin sudah diproses atau tidak ditemukan."
      });
    }

    // Instruksikan HTMX redirect ke halaman list
    res.set("HX-Redirect", "/requests");
    res.status(200).end();
  } catch (err) {
    next(err);
  }
};





// ─── FITUR 4: Mahasiswa dapat mengunduh surat keterangan yang sudah ditandatangani ───
// Penjelasan: Fungsi ini mencetak PDF dan menempelkan QR Code secara real-time
const downloadPdf = async (req, res, next) => {
  try {
    const { id } = req.params;

    // 1. Ambil data permohonan dan data mahasiswa dari database
    const [rows] = await db.query(
      `SELECT sr.*, s.name as student_name, s.regno as nim, s.department_id
       FROM student_requests sr
       JOIN students s ON sr.requested_by = s.id
       WHERE sr.id = ? AND sr.status = ?`,
      [id, STATUS.SELESAI]
    );

    if (rows.length === 0) {
      return res.status(404).send("Surat belum selesai atau tidak ditemukan.");
    }

    const requestData = rows[0];

    // 2. Generate Tanda Tangan Digital berupa QR Code (berisi link verifikasi keaslian surat)
    const verificationUrl = `https://sistem-informasi.unand.ac.id/verify/${requestData.request_nunmber}`;
    const qrCodeImage = await QRCode.toBuffer(verificationUrl);

    // 3. Load Template PDF Kosong 
    const templatePath = path.join(__dirname, '../public/template_surat_aktif.pdf');
    const existingPdfBytes = fs.readFileSync(templatePath);
    
    // 4. Proses Injeksi Data ke dalam PDF
    const pdfDoc = await PDFDocument.load(existingPdfBytes);
    const pages = pdfDoc.getPages();
    const firstPage = pages[0];

    // Load font formal (mirip Times New Roman)
    const timesRomanFont = await pdfDoc.embedFont(StandardFonts.TimesRoman);

    // A. Menyisipkan Data Mahasiswa (Titik koordinat sudah diturunkan)
    // Ingat: x = kiri/kanan, y = atas/bawah (semakin kecil y, semakin ke bawah)
    const textOptions = { size: 12, font: timesRomanFont };
// Membuat tanggal hari ini dengan format Indonesia
    const dateOptions = { day: 'numeric', month: 'long', year: 'numeric' };
    const tanggalSekarang = new Date().toLocaleDateString('id-ID', dateOptions);

 
    // Asumsi: x: 220 adalah posisi setelah tanda titik dua ( : )
    firstPage.drawText(requestData.student_name, { x: 224, y: 528, ...textOptions });
    firstPage.drawText(requestData.nim, { x: 224, y: 515, ...textOptions }); 
       // Menyisipkan tanggal ke PDF (Sesuaikan nilai x dan y letak tanggalnya)
    // Asumsi posisi tanggal ada di atas tanda tangan Dekan
    firstPage.drawText(tanggalSekarang, { x: 400, y: 368, ...textOptions });
    
    // (Opsional) Jika jurusan/semester ingin ditampilkan nanti:
    // firstPage.drawText("Sistem Informasi", { x: 220, y: 400, ...textOptions });

    // B. Menyisipkan gambar QR Code Dekan
    const qrImage = await pdfDoc.embedPng(qrCodeImage);
    firstPage.drawImage(qrImage, {
      x: 393,     // Geser sedikit ke kanan agar pas di area TTD
      y: 270,     // Posisi vertikal di area tanda tangan bawah
      width: 90,  // Ukuran diperbesar dari 80 ke 90
      height: 90,
    });
    // 5. Simpan hasil akhir dan kirimkan sebagai file download ke browser
    const pdfBytes = await pdfDoc.save();
    
   // ... (Kodingan di dalam downloadPdf sebelumnya)
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="Surat_Aktif_${requestData.nim}.pdf"`);
    res.send(Buffer.from(pdfBytes));

  } catch (err) {
    next(err);
  }
}; // <--- INI ADALAH PENUTUP FUNGSI downloadPdf. 


// ─── FITUR 8: Notifikasi Mahasiswa (PASTIKAN BLOK INI ADA) ───
const notifications = async (req, res, next) => {
  try {
    // 1. Ambil permohonan yang ditolak (2) atau selesai (3)
    const [notifs] = await db.query(
      `SELECT id, request_nunmber, request_type, title, status, updated_at
       FROM student_requests
       WHERE requested_by = ? AND status IN (2, 3)
       ORDER BY updated_at DESC LIMIT 20`,
      [req.session.userId]
    );

    // 2. Ubah angka badge menjadi 0 (Tandai sudah dibaca semua)
    await db.query(
      `UPDATE student_requests SET is_read = 1 
       WHERE requested_by = ? AND status IN (2, 3) AND is_read = 0`,
      [req.session.userId]
    );

    // 3. Render ke halaman baru
    res.render("requests/notifications", {
      title: "Notifikasi",
      user: req.session.username,
      notifs: notifs.map(r => ({ ...r, badge: getStatusBadge(r.status) }))
    });
  } catch (err) {
    next(err);
  }
};

// --- BARIS INI HARUS BERADA DI PALING BAWAH ---
module.exports = { index, createPage, store, show, cancel, downloadPdf, STATUS, getStatusBadge, notifications };