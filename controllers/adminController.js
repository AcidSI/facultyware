const db = require("../lib/db");
const { STATUS, getStatusBadge } = require("./requestController");
const PDFDocument = require("pdfkit-table");

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

    const statusLabels = {
      1: "Diproses",
      2: "Ditolak",
      3: "Selesai"
    };

    const formattedRequests = requests.map(r => ({
      id: r.id,
      request_nunmber: r.request_nunmber,
      request_type: r.request_type,
      title: r.title,
      description: r.description,
      status: r.status,
      requested_at: r.requested_at,
      updated_at: r.updated_at,
      student_name: r.student_name,
      nim: r.nim,
      status_label: statusLabels[r.status] || "Menunggu"
    }));

    if (req.query.format === "json") {
      return res.json({
        success: true,
        data: formattedRequests
      });
    }

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

const show = async (req, res, next) => {
  try {
    const { id } = req.params;

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

const exportPdf = async (req, res, next) => {
  try {
    const [rows] = await db.query(
      `SELECT sr.request_nunmber, sr.request_type, sr.status, sr.updated_at, s.name as student_name, s.regno as nim
       FROM student_requests sr
       JOIN students s ON sr.requested_by = s.id
       WHERE sr.status IN (1, 2, 3) 
       ORDER BY sr.updated_at DESC`
    );

    const doc = new PDFDocument({ margin: 30, size: 'A4' });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="Laporan_Riwayat_Surat.pdf"');

    doc.pipe(res);

    doc.font("Helvetica-Bold").fontSize(16).text("Laporan Riwayat Pemrosesan Surat", { align: "center" });
    doc.moveDown(0.5);
    doc.font("Helvetica").fontSize(10).text(`Dicetak pada: ${new Date().toLocaleDateString('id-ID')}`, { align: "center" });
    doc.moveDown(2);

    const tableData = {
      headers: [
        { label: "No. Surat", property: "no", width: 100 },
        { label: "NIM", property: "nim", width: 80 },
        { label: "Nama Mahasiswa", property: "name", width: 140 },
        { label: "Jenis Surat", property: "type", width: 80 },
        { label: "Status", property: "status", width: 60 },
        { label: "Tgl Diproses", property: "date", width: 80 }
      ],
      datas: rows.map(r => {
        let statusText = "Menunggu";
        if(r.status === 1) statusText = "Diproses";
        if(r.status === 2) statusText = "Ditolak";
        if(r.status === 3) statusText = "Selesai";

        return {
          no: r.request_nunmber || "-",
          nim: r.nim || "-",
          name: r.student_name || "-",
          type: r.request_type.toUpperCase(),
          status: statusText,
          date: new Date(r.updated_at).toLocaleDateString('id-ID')
        };
      })
    };

    await doc.table(tableData, {
      prepareHeader: () => doc.font("Helvetica-Bold").fontSize(9),
      prepareRow: (row, indexColumn, indexRow, rectRow, rectCell) => {
        doc.font("Helvetica").fontSize(9);
      },
    });

    doc.end();

  } catch (err) {
    next(err);
  }
};

module.exports = { index, verify, show, exportPdf };