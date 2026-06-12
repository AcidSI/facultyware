const db = require("../lib/db");
const { STATUS, getStatusBadge } = require("./requestController");

const index = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const offset = (page - 1) * limit;
    const search = req.query.search || "";
    const searchPattern = `%${search}%`;

    const [[{ total }]] = await db.query(
      `SELECT COUNT(*) as total
       FROM student_requests sr
       JOIN students s ON sr.requested_by = s.id
       WHERE sr.request_nunmber LIKE ? OR s.name LIKE ? OR s.regno LIKE ?`,
      [searchPattern, searchPattern, searchPattern]
    );

    const [requests] = await db.query(
      `SELECT sr.*, s.name as student_name, s.regno as nim
       FROM student_requests sr
       JOIN students s ON sr.requested_by = s.id
       WHERE sr.request_nunmber LIKE ? OR s.name LIKE ? OR s.regno LIKE ?
       ORDER BY sr.requested_at DESC
       LIMIT ? OFFSET ?`,
      [searchPattern, searchPattern, searchPattern, limit, offset]
    );

    const mappedRequests = requests.map(r => ({ ...r, badge: getStatusBadge(r.status) }));
    const totalPages = Math.ceil(total / limit);

    res.render("admin/requests", {
      title: "Verifikasi Permohonan",
      requests: mappedRequests,
      user: req.session.username,
      pagination: { page, totalPages, total },
      search
    });
  } catch (err) {
    next(err);
  }
};

const verify = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { action, check_reason } = req.body;

    const newStatus = action === 'terima' ? STATUS.DIVERIFIKASI : STATUS.DITOLAK;

    await db.query(
      `UPDATE student_requests SET status = ?, updated_at = NOW() WHERE id = ?`,
      [newStatus, id]
    );

    const [reqData] = await db.query(`SELECT request_type FROM student_requests WHERE id = ?`, [id]);
    const type = reqData[0].request_type;

    const tableName = type === 'aktif' ? 'student_request_active_references' : 'student_request_grad_references';

    await db.query(
      `UPDATE ${tableName}
       SET checked_by = ?, checked_at = NOW(), check_reason = ?, status = ?
       WHERE student_requests_id = ?`,
      [req.session.userId, check_reason || null, action === 'terima' ? 'verified' : 'rejected', id]
    );

    res.redirect("/admin/requests");
  } catch (err) {
    next(err);
  }
};
// --- Tambahkan fungsi ini di atas module.exports ---
const show = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Ambil data permohonan
    const [rows] = await db.query(
      `SELECT sr.*, s.name as student_name, s.regno as nim
       FROM student_requests sr
       JOIN students s ON sr.requested_by = s.id
       WHERE sr.id = ?`,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).render("error", {
        message: "Permohonan tidak ditemukan.",
        error: { status: 404, stack: "" }
      });
    }

    const requestData = { ...rows[0], badge: getStatusBadge(rows[0].status) };

    // Ambil dokumen referensi sesuai jenis surat
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

    res.render("admin/show", {
      title: "Detail Verifikasi",
      request: requestData,
      documents,
      user: req.session.username,
      STATUS
    });
  } catch (err) {
    next(err);
  }
};

// --- Perbarui baris exports menjadi seperti ini ---
module.exports = { index, verify, show };
