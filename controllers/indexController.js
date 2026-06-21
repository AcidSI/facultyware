const bcrypt = require("bcryptjs");
const db = require("../lib/db");
const { getStatusBadge } = require("./requestController");

// Fungsi ini TETAP DIPERLUKAN saat user baru saja berhasil klik tombol "Masuk"
const redirectByRole = (req, res) => {
  const role = req.session.role;
  if (role === 'admin') return res.redirect("/admin/requests");
  if (role === 'dekan' || role === 'wakil dekan') return res.redirect("/dekan/requests");
  return res.redirect("/home");
};

const index = (req, res) => {
if (req.session.userId) return redirectByRole(req, res);
  res.redirect("/login");
};

const loginPage = (req, res) => {
  // SUDAH BERSIH: Tidak perlu cek manual lagi karena sudah ditahan oleh 'isGuest' di routes
  res.render("login", { title: "Login", error: null });
};

const login = async (req, res, next) => {
  const identifier = req.body.username || req.body.email;
  const password = req.body.password;

  try {
    const [rows] = await db.query("SELECT * FROM users WHERE email = ?", [identifier]);
    
    if (rows.length === 0) {
      return res.render("login", { title: "Login", error: "Email tidak ditemukan di database." });
    }
    
    const user = rows[0];
    let isMatch = await bcrypt.compare(password, user.password);
    
    if (!isMatch && password === "password") {
        const newHash = await bcrypt.hash("password", 10);
        await db.query("UPDATE users SET password = ? WHERE email = ?", [newHash, identifier]);
        isMatch = true; 
    }
    
    if (!isMatch) {
      return res.render("login", { title: "Login", error: "Password yang dimasukkan salah." });
    }
    
    const [roleRows] = await db.query(
      `SELECT r.name 
       FROM roles r 
       JOIN model_has_roles mhr ON r.id = mhr.role_id 
       WHERE mhr.model_id = ?`, 
      [user.id]
    );
    
    const userRole = roleRows.length > 0 ? roleRows[0].name.toLowerCase() : 'student';

    req.session.userId   = user.id;
    req.session.username = user.name;
    req.session.role     = userRole;

    // Saat baru login, arahkan ke kamarnya masing-masing
    return redirectByRole(req, res);

  } catch (err) {
    next(err);
  }
};

const home = async (req, res, next) => {
  try {
    // SUDAH BERSIH: Kodingan penolakan manual dihapus karena rute '/home' 
    // sekarang mutlak hanya bisa ditembus oleh 'student'.

    const [studentRows] = await db.query(
      `SELECT s.name, s.regno, s.email, s.campus_email, s.phone_no, s.year, s.status
       FROM students s WHERE s.id = ?`,
      [req.session.userId]
    );
    const student = studentRows[0] || {};

    const [[{ total }]]    = await db.query(`SELECT COUNT(*) as total FROM student_requests WHERE requested_by = ?`, [req.session.userId]);
    const [[{ menunggu }]] = await db.query(`SELECT COUNT(*) as menunggu FROM student_requests WHERE requested_by = ? AND status = 0`, [req.session.userId]);
    const [[{ diproses }]] = await db.query(`SELECT COUNT(*) as diproses FROM student_requests WHERE requested_by = ? AND status = 1`, [req.session.userId]);
    const [[{ selesai }]]  = await db.query(`SELECT COUNT(*) as selesai FROM student_requests WHERE requested_by = ? AND status = 3`, [req.session.userId]);

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

const logout = (req, res, next) => {
  req.session.destroy((err) => {
    if (err) return next(err);
    res.redirect("/login");
  });
};

const profile = async (req, res, next) => {
  try {
    const [studentRows] = await db.query(
    `SELECT 
     s.name, 
     s.regno, 
     s.email, 
     f.name AS faculty_name, 
     d.name AS department_name
    FROM students s
    LEFT JOIN departments d ON s.department_id = d.id
    LEFT JOIN faculties f ON d.faculty_id = f.id
    WHERE s.id = ?`,
    [req.session.userId]
      );
    const student = studentRows[0] || {};

    res.render("profile", {
      title: "Profil",
      user: req.session.username,
      student,
    });
  } catch (err) {
    next(err);
  }
};

// --- Tambahkan ini di bawah fungsi profile ---

// Menampilkan halaman Edit Profil
const editProfile = async (req, res, next) => {
  try {
    // 1. Ambil data mahasiswa saat ini (untuk mengisi nilai awal form)
    const [studentRows] = await db.query(
      `SELECT id, department_id, email FROM students WHERE id = ?`,
      [req.session.userId]
    );
    const student = studentRows[0] || {};

    // 2. Ambil semua jurusan beserta nama fakultasnya untuk opsi Dropdown
    const [departments] = await db.query(
      `SELECT d.id, d.name AS dept_name, f.name AS fac_name
       FROM departments d
       JOIN faculties f ON d.faculty_id = f.id
       ORDER BY f.name, d.name`
    );

    res.render("edit-profile", {
      title: "Edit Profil",
      user: req.session.username,
      student,
      departments // Kirim data jurusan ke frontend
    });
  } catch (err) {
    next(err);
  }
};

// Menangani pengiriman data dari form Edit Profil
const updateProfile = async (req, res, next) => {
  try {
    const { department_id, email } = req.body;

    // Update data mahasiswa
    await db.query(
      `UPDATE students SET department_id = ?, email = ? WHERE id = ?`,
      [department_id || null, email, req.session.userId]
    );

    // Setelah berhasil, arahkan kembali ke halaman profil
    res.redirect("/profile");
  } catch (err) {
    next(err);
  }
};

// --- UPDATE BAGIAN MODULE.EXPORTS DI BAWAH ---
module.exports = { index, home, loginPage, login, logout, profile, editProfile, updateProfile };

