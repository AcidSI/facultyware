const db = require("../lib/db");

// --- BIARKAN FUNGSI ASLI ANDA TETAP ADA ---
const checkPermission = (requiredPermissions) => {
  return async (req, res, next) => {
    if (!req.session.userId) {
      if (req.xhr || req.headers.accept?.includes('application/json')) {
        return res.status(401).json({ status: "error", message: "Unauthorized" });
      }
      return res.redirect("/login");
    }

    const permissionsArray = Array.isArray(requiredPermissions) ? requiredPermissions : [requiredPermissions];

    try {
      const [rows] = await db.query(
        `SELECT DISTINCT p.name
         FROM permissions p
         JOIN role_has_permissions rhp ON p.id = rhp.permission_id
         JOIN model_has_roles mhr ON rhp.role_id = mhr.role_id
         WHERE mhr.model_id = ?
           AND mhr.model_type LIKE '%User%'  -- <-- [PERBAIKAN SAKTI: Anti jebakan backslash]
           AND p.name IN (?)`,
        [req.session.userId, permissionsArray]
      );

      // ==================== CCTV DEbugging ====================
      console.log("\n[CCTV POS SATPAM ACL] ==========================");
      console.log("1. User ID yg mencoba masuk :", req.session.userId);
      console.log("2. Halaman ini menagih KTA  :", permissionsArray);
      console.log("3. KTA yg dipunya User di DB:", rows.map(r => r.name));
      console.log("Hasil Putusan               :", rows.length > 0 ? "DIIZINKAN MASUK 🟢" : "TENDANG KELUAR 🔴");
      console.log("================================================\n");
      // ========================================================

      if (rows.length > 0) {
        return next();
      }

      if (req.xhr || req.headers.accept?.includes('application/json')) {
        return res.status(403).json({ status: "error", message: "Forbidden" });
      }

      return res.status(403).render("error", {
        message: "Akses ditolak. Anda tidak memiliki izin untuk mengakses halaman ini.",
        error: { status: 403, stack: "" }
      });
    } catch (err) {
      next(err);
    }
  };
};
// --- TAMBAHKAN FUNGSI BARU INI SEBAGAI PENGATUR LALU LINTAS ---
const checkRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.session || !req.session.role) {
      return res.redirect('/login');
    }

    const userRole = req.session.role.toLowerCase();

    // Jika perannya sesuai dengan yang diizinkan rute, silakan masuk
    if (allowedRoles.includes(userRole)) {
      return next();
    }

    // JIKA SALAH KAMAR: Jangan tampilkan Error, arahkan kembali dengan halus!
    if (userRole === 'admin') return res.redirect('/admin/requests');
    if (userRole === 'dekan' || userRole === 'wakil dekan') return res.redirect('/dekan/requests');
    
    // Default tendang ke portal mahasiswa
    return res.redirect('/home');
  };
};

module.exports = { checkPermission, checkRole };