const db = require("../lib/db");
const path = require("path");
const fs = require("fs");
const { PDFDocument, StandardFonts } = require('pdf-lib');
const QRCode = require('qrcode');

const STATUS = { MENUNGGU: 0, DIVERIFIKASI: 1, DITOLAK: 2, SELESAI: 3, DIBATALKAN: 4 };

const getStatusBadge = (status) => {
  switch (status) {
    case STATUS.MENUNGGU:     return { label: "Menunggu",    class: "badge-outline text-yellow-600 border-yellow-600" };
    case STATUS.DIVERIFIKASI: return { label: "Diverifikasi", class: "badge bg-blue-500 text-white" };
    case STATUS.DITOLAK:      return { label: "Ditolak",     class: "badge badge-destructive" };
    case STATUS.SELESAI:      return { label: "Selesai",     class: "badge bg-green-500 text-white" };
    case STATUS.DIBATALKAN:   return { label: "Dibatalkan",  class: "badge badge-secondary" };
    default:                  return { label: "Unknown",     class: "badge badge-outline" };
  }
};

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

const createPage = (req, res) => {
  res.render("requests/create", {
    title: "Buat Permohonan Baru",
    user: req.session.username,
    errors: [],
    old: {}
  });
};

const store = async (req, res, next) => {
  const { request_type, title, description, semester, tahun_akademik } = req.body;
  const errors = [];
  
  if (!request_type || !["aktif", "lulus"].includes(request_type)) {
    errors.push("Jenis permohonan tidak valid.");
  }
  if (!title || title.trim().length < 5) {
    errors.push("Keperluan / judul surat wajib diisi (minimal 5 karakter).");
  }
  if (title && title.trim().length > 255) {
    errors.push("Keperluan / judul surat terlalu panjang (maks 255 karakter).");
  }

  const krsFile = req.files?.krs_file?.[0] ?? null;
  if (!krsFile) {
    errors.push("File KRS wajib diunggah.");
  }

  if (errors.length > 0) {
    if (req.files) {
      Object.values(req.files).flat().forEach(f => {
        fs.unlink(f.path, () => {});
      });
    }
    return res.status(422).render("requests/create", {
      title: "Buat Permohonan Baru",
      user: req.session.username,
      errors,
      old: { request_type, title, description, semester, tahun_akademik}
    });
  }

  try {
    const requestNumber = `REQ-${Date.now()}`;
    const additionalFile = req.files?.additional_file?.[0] ?? null;

    const [result] = await db.query(
      `INSERT INTO student_requests
       (request_nunmber, request_type, title, description, semester, tahun_akademik, status, requested_by, requested_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW(), NOW())`,
      [
        requestNumber, 
        request_type, 
        title.trim(), 
        description?.trim() || null, 
        semester || null,
        tahun_akademik || null,
        STATUS.MENUNGGU, 
        req.session.userId
      ]
    );

    const newRequestId = result.insertId;

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
    if (req.files) {
      Object.values(req.files).flat().forEach(f => {
        fs.unlink(f.path, () => {});
      });
    }
    next(err);
  }
};

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

const cancel = async (req, res, next) => {
  try {
    const { id } = req.params;

    const [result] = await db.query(
      `UPDATE student_requests
       SET status = ?, updated_at = NOW()
       WHERE id = ? AND requested_by = ? AND status = ?`,
      [STATUS.DIBATALKAN, id, req.session.userId, STATUS.MENUNGGU]
    );

    if (result.affectedRows === 0) {
      res.set("HX-Reswap", "none");
      return res.status(422).json({
        status: "error",
        message: "Permohonan tidak dapat dibatalkan. Mungkin sudah diproses atau tidak ditemukan."
      });
    }

    res.set("HX-Redirect", "/requests");
    res.status(200).end();
  } catch (err) {
    next(err);
  }
};

const downloadPdf = async (req, res, next) => {
  try {
    const { id } = req.params;

    const [rows] = await db.query(
      `SELECT sr.*, s.name as student_name, s.regno as nim, 
              d.name as jurusan, f.name as fakultas
       FROM student_requests sr
       JOIN students s ON sr.requested_by = s.id
       LEFT JOIN departments d ON s.department_id = d.id
       LEFT JOIN faculties f ON d.faculty_id = f.id
       WHERE sr.id = ? AND sr.status = ?`,
      [id, STATUS.SELESAI]
    );

    if (rows.length === 0) {
      return res.status(404).send("Surat belum selesai atau tidak ditemukan.");
    }

    const requestData = rows[0];

    const waktuDekanSetuju = requestData.updated_at;
    const dateOptions = { day: 'numeric', month: 'long', year: 'numeric' };
    const tanggalTtd = new Date(waktuDekanSetuju).toLocaleDateString('id-ID', dateOptions);

    const protocol = req.secure ? 'https' : 'http';
    const qrPayload = `${protocol}://${req.headers.host}/verify/${requestData.request_nunmber}`;

    const qrCodeImage = await QRCode.toBuffer(qrPayload, {
      errorCorrectionLevel: 'H',
      margin: 1,
      width: 150
    });

    const templatePath = path.join(__dirname, '../public/template_surat_aktif.pdf');
    const existingPdfBytes = fs.readFileSync(templatePath);
    
    const pdfDoc = await PDFDocument.load(existingPdfBytes);
    const pages = pdfDoc.getPages();
    const firstPage = pages[0];

    const timesRomanFont = await pdfDoc.embedFont(StandardFonts.TimesRoman);
    const textOptions = { size: 12, font: timesRomanFont };

    firstPage.drawText(requestData.student_name, { x: 224, y: 529, ...textOptions });
    firstPage.drawText(requestData.nim, { x: 224, y: 515, ...textOptions }); 
    
    const infoJurusanFakultas = `${requestData.jurusan || '-'} / ${requestData.fakultas || '-'}`;
    firstPage.drawText(infoJurusanFakultas, { x: 224, y: 501, ...textOptions }); 
    
    firstPage.drawText(requestData.semester || '-', { x: 224, y: 487, ...textOptions }); 
    firstPage.drawText(requestData.tahun_akademik || '-', { x: 224, y: 473, ...textOptions }); 

    firstPage.drawText(tanggalTtd, { x: 400, y: 368, ...textOptions });
    
    const qrImage = await pdfDoc.embedPng(qrCodeImage);
    firstPage.drawImage(qrImage, {
      x: 393,    
      y: 270,    
      width: 90, 
      height: 90,
    });

    const pdfBytes = await pdfDoc.save();
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="Surat_Aktif_${requestData.nim}.pdf"`);
    res.send(Buffer.from(pdfBytes));

  } catch (err) {
    next(err);
  }
};

const notifications = async (req, res, next) => {
  try {
    const [notifs] = await db.query(
      `SELECT id, request_nunmber, request_type, title, status, updated_at
       FROM student_requests
       WHERE requested_by = ? AND status IN (2, 3)
       ORDER BY updated_at DESC LIMIT 20`,
      [req.session.userId]
    );

    await db.query(
      `UPDATE student_requests SET is_read = 1 
       WHERE requested_by = ? AND status IN (2, 3) AND is_read = 0`,
      [req.session.userId]
    );

    res.render("requests/notifications", {
      title: "Notifikasi",
      user: req.session.username,
      notifs: notifs.map(r => ({ ...r, badge: getStatusBadge(r.status) }))
    });
  } catch (err) {
    next(err);
  }
};

const getHistoryJson = async (req, res, next) => {
  try {
    const page    = parseInt(req.query.page) || 1;
    const limit   = parseInt(req.query.limit) || 10;
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
      `SELECT sr.id, sr.request_nunmber, sr.request_type, sr.title, sr.description, 
              sr.status, sr.requested_at, sr.updated_at,
              s.name as student_name, s.regno as nim
       FROM student_requests sr
       JOIN students s ON sr.requested_by = s.id
       WHERE sr.requested_by = ?
         AND (sr.request_nunmber LIKE ? OR sr.title LIKE ? OR sr.request_type LIKE ?)
       ORDER BY sr.requested_at DESC
       LIMIT ? OFFSET ?`,
      [req.session.userId, searchPattern, searchPattern, searchPattern, limit, offset]
    );

    const mappedRequests = requests.map(r => ({
      ...r,
      status_label: getStatusBadge(r.status).label
    }));

    const totalPages = Math.ceil(total / limit);

    res.status(200).json({
      success: true,
      data: mappedRequests,
      meta: {
        current_page: page,
        total_pages: totalPages,
        total_items: total,
        items_per_page: limit,
        search_query: search
      }
    });

  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Terjadi kesalahan saat mengambil data riwayat permohonan.",
      error: err.message 
    });
  }
};

const verifyPublicDocument = async (req, res, next) => {
  try {
    const { token } = req.params;

    const [rows] = await db.query(
      `SELECT sr.*, s.name as student_name, s.regno as nim, 
              d.name as jurusan, f.name as fakultas
       FROM student_requests sr
       JOIN students s ON sr.requested_by = s.id
       LEFT JOIN departments d ON s.department_id = d.id
       LEFT JOIN faculties f ON d.faculty_id = f.id
       WHERE sr.request_nunmber = ?`,
      [token]
    );

    if (rows.length === 0) {
      return res.status(404).render("verify_failed", { title: "Verifikasi Gagal" });
    }

    const requestData = rows[0];
    res.render("verify_success", {
      title: "Verifikasi Dokumen Sah",
      request: requestData
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { index, createPage, store, show, cancel, downloadPdf, STATUS, getStatusBadge, notifications, getHistoryJson, verifyPublicDocument };