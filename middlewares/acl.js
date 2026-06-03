const db = require("../lib/db");

/**
 * ACL Middleware - cek apakah user punya permission yang dibutuhkan.
 * Menggunakan tabel model_has_roles (sesuai skema Spatie Laravel Permission).
 *
 * @param {string|string[]} requiredPermissions - satu permission atau array (OR logic)
 */
const checkPermission = (requiredPermissions) => {
  return async (req, res, next) => {
    if (!req.session.userId) {
      // Jika request dari API (Accept: application/json), kembalikan JSON
      if (req.xhr || req.headers.accept?.includes('application/json')) {
        return res.status(401).json({ status: "error", message: "Unauthorized" });
      }
      return res.redirect("/login");
    }

    const permissionsArray = Array.isArray(requiredPermissions)
      ? requiredPermissions
      : [requiredPermissions];

    try {
      // ✅ PERBAIKAN: Query menggunakan model_has_roles (bukan user_has_roles)
      // dan model_type sesuai konvensi Spatie
      const [rows] = await db.query(
        `SELECT DISTINCT p.name
         FROM permissions p
         JOIN role_has_permissions rhp ON p.id = rhp.permission_id
         JOIN model_has_roles mhr ON rhp.role_id = mhr.role_id
         WHERE mhr.model_id = ?
           AND mhr.model_type = 'App\\\\Models\\\\User'
           AND p.name IN (?)`,
        [req.session.userId, permissionsArray]
      );

      if (rows.length > 0) {
        return next();
      }

      // Jika tidak punya permission
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

module.exports = { checkPermission };
