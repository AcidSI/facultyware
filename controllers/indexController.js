const bcrypt = require("bcryptjs");
const db = require("../lib/db");
const { getStatusBadge } = require("./requestController");

const index = (req, res) => {
  if (req.session.userId) return res.redirect("/home");
  res.render("index", { title: "Facultyware" });
};

const home = async (req, res, next) => {
  try {
    // Ambil data profil mahasiswa
    const [studentRows] = await db.query(
      `SELECT s.name, s.regno, s.email, s.campus_email, s.phone_no, s.year, s.status
       FROM students s WHERE s.id = ?`,
      [req.session.userId]
    );
    const student = studentRows[0] || {};

    // Stats permohonan
    const [[{ total }]]    = await db.query(`SELECT COUNT(*) as total    FROM student_requests WHERE requested_by = ?`, [req.session.userId]);
    const [[{ menunggu }]] = await db.query(`SELECT COUNT(*) as menunggu FROM student_requests WHERE requested_by = ? AND status = 0`, [req.session.userId]);
    const [[{ diproses }]] = await db.query(`SELECT COUNT(*) as diproses FROM student_requests WHERE requested_by = ? AND status = 1`, [req.session.userId]);
    const [[{ selesai }]]  = await db.query(`SELECT COUNT(*) as selesai  FROM student_requests WHERE requested_by = ? AND status = 3`, [req.session.userId]);

    // 5 permohonan terbaru
    const [recentRequests] = await db.query(
      `SELECT id, request_nunmber, request_type, title, status, requested_at
       FROM student_requests WHERE requested_by = ?
       ORDER BY requested_at DESC LIMIT 5`,
      [req.session.userId]
    );

    res.render("home", {
      title: "Beranda",
      user: req.session.username,
      student,
      stats: { total, menunggu, diproses, selesai },
      recentRequests: recentRequests.map(r => ({ ...r, badge: getStatusBadge(r.status) }))
    });
  } catch (err) {
    next(err);
  }
};

const loginPage = (req, res) => {
  if (req.session.userId) return res.redirect("/home");
  res.render("login", { title: "Login", error: null });
};

const login = async (req, res, next) => {
  const { username, password } = req.body;
  try {
    const [rows] = await db.query("SELECT * FROM users WHERE email = ?", [username]);
    if (rows.length === 0) {
      return res.render("login", { title: "Login", error: "Email atau password salah." });
    }
    const user = rows[0];
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.render("login", { title: "Login", error: "Email atau password salah." });
    }
    req.session.userId   = user.id;
    req.session.username = user.name;
    res.redirect("/home");
  } catch (err) {
    next(err);
  }
};

const logout = (req, res, next) => {
  req.session.destroy((err) => {
    if (err) return next(err);
    res.redirect("/login");
  });
};

module.exports = { index, home, loginPage, login, logout };
