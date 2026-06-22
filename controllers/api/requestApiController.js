const db = require("../../lib/db");
const { STATUS } = require("../requestController");

const statusLabel = (status) => {
  const map = { 0: "Menunggu", 1: "Diverifikasi", 2: "Ditolak", 3: "Selesai", 4: "Dibatalkan" };
  return map[status] ?? "Unknown";
};

const getList = async (req, res) => {
  try {
    const userId = req.session.userId;
    const page   = parseInt(req.query.page) || 1;
    const limit  = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const search = req.query.search || "";
    const searchPattern = `%${search}%`;

    const [[{ total }]] = await db.query(
      `SELECT COUNT(*) as total
       FROM student_requests
       WHERE requested_by = ?
         AND (request_nunmber LIKE ? OR title LIKE ? OR request_type LIKE ?)`,
      [userId, searchPattern, searchPattern, searchPattern]
    );

    const [requests] = await db.query(
      `SELECT id, request_nunmber, request_type, title, status, requested_at, updated_at
       FROM student_requests
       WHERE requested_by = ?
         AND (request_nunmber LIKE ? OR title LIKE ? OR request_type LIKE ?)
       ORDER BY requested_at DESC
       LIMIT ? OFFSET ?`,
      [userId, searchPattern, searchPattern, searchPattern, limit, offset]
    );

    const data = requests.map(r => ({ ...r, status_label: statusLabel(r.status) }));

    res.json({
      status: "success",
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
      data
    });
  } catch (err) {
    res.status(500).json({ status: "error", message: err.message });
  }
};

const getDetail = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.session.userId;

    const [rows] = await db.query(
      `SELECT sr.*, s.name as student_name, s.regno as nim
       FROM student_requests sr
       JOIN students s ON sr.requested_by = s.id
       WHERE sr.id = ? AND sr.requested_by = ?`,
      [id, userId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ status: "error", message: "Data tidak ditemukan." });
    }

    const requestData = { ...rows[0], status_label: statusLabel(rows[0].status) };

    let documents = null;
    if (requestData.request_type === "aktif") {
      const [docs] = await db.query(
        `SELECT id, student_study_plan_file, parent_decree_file, status, checked_at, signed_at, check_reason, sign_reason
         FROM student_request_active_references WHERE student_requests_id = ?`, [id]
      );
      documents = docs[0] || null;
    } else if (requestData.request_type === "lulus") {
      const [docs] = await db.query(
        `SELECT id, cover_letter_department_file, proof_o_grad_registration_file, status, checked_at, signed_at, check_reason, sign_reason
         FROM student_request_grad_references WHERE student_requests_id = ?`, [id]
      );
      documents = docs[0] || null;
    }

    res.json({
      status: "success",
      data: { ...requestData, documents }
    });
  } catch (err) {
    res.status(500).json({ status: "error", message: err.message });
  }
};

module.exports = { getList, getDetail };