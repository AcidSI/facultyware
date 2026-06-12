var express = require("express");
var router = express.Router();
const adminController = require("../controllers/adminController");

// ✅ PERBAIKAN: Tambahkan checkRole di dalam kurung kurawal
const { isAuthenticated } = require("../middlewares/auth");
const { checkPermission, checkRole } = require("../middlewares/acl");

// PASANG SATPAM DISINI
router.use(isAuthenticated);
router.use(checkRole('admin')); // HANYA admin yang bisa lewat

// Opsional: Redirect /admin langsung ke /admin/requests
router.get("/", (req, res) => {
    res.redirect("/admin/requests");
});

// Fitur 5: Halaman Daftar Permohonan
router.get("/requests", checkPermission("verify-requests"), adminController.index);

// Fitur 5: Halaman Detail Permohonan (Cek Berkas)
router.get("/requests/:id", checkPermission("verify-requests"), adminController.show);

// Fitur 6: Proses Verifikasi (Terima/Tolak)
router.post("/requests/:id/verify", checkPermission("verify-requests"), adminController.verify);

module.exports = router;