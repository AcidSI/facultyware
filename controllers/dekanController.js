const db = require("../lib/db");
const { STATUS } = require("./requestController"); 

const index = async (req, res, next) => {
  try {
    const [requests] = await db.query(
      `SELECT sr.*, s.name as student_name, s.regno as nim
       FROM student_requests sr
       JOIN students s ON sr.requested_by = s.id
       WHERE sr.status = ?
       ORDER BY sr.updated_at ASC`,
      [STATUS.DIVERIFIKASI]
    );

    res.render("dekan/requests", {
      title: "Antrean Tanda Tangan",
      requests: requests,
      user: req.session.username
    });
  } catch (err) {
    next(err);
  }
};

const signDocument = async (req, res, next) => {
  try {
    const { id } = req.params;

    await db.query(
      `UPDATE student_requests SET status = ?, updated_at = NOW() WHERE id = ? AND status = ?`,
      [STATUS.SELESAI, id, STATUS.DIVERIFIKASI]
    );

    const [reqData] = await db.query(`SELECT request_type FROM student_requests WHERE id = ?`, [id]);
    
    if (reqData.length > 0) {
      const type = reqData[0].request_type;
      const tableName = type === 'aktif' ? 'student_request_active_references' : 'student_request_grad_references';

      await db.query(
        `UPDATE ${tableName}
         SET signed_by = ?, updated_at = NOW()
         WHERE student_requests_id = ?`,
        [req.session.userId, id]
      );
    }

    res.redirect("/dekan/requests");
  } catch (err) {
    next(err);
  }
};

module.exports = { index, signDocument };