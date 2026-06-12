var express = require("express");
var router = express.Router();
const requestController = require("../controllers/requestController");
const upload = require("../middlewares/upload");

// ✅ PERBAIKAN: Import checkRole
const { isAuthenticated } = require("../middlewares/auth");
const { checkPermission, checkRole } = require("../middlewares/acl");
const { getUnreadCount } = require("../middlewares/notification");


// PASANG SATPAM DISINI
router.use(isAuthenticated);
router.use(checkRole('student')); // ✅ TAMBAHKAN INI: Hanya mahasiswa yang bisa lewat
// ✅ 2. WAJIBKAN MESIN BERJALAN DI SEMUA HALAMAN MAHASISWA
router.use(getUnreadCount);
// Fitur 2: List riwayat
router.get("/", checkPermission("view-requests"), requestController.index);
// Taruh di bawah router.get("/", ...) atau router.get("/create", ...)
router.get("/notifications", checkPermission("view-requests"), requestController.notifications);
// Fitur 1: Form buat permohonan
router.get("/create", checkPermission("create-request"), requestController.createPage);

// Fitur 1: Submit permohonan
router.post(
  "/",
  checkPermission("create-request"),
  upload.fields([
    { name: "krs_file", maxCount: 1 },
    { name: "additional_file", maxCount: 1 }
  ]),
  requestController.store
);

// Fitur 3: Detail permohonan
router.get("/:id", checkPermission("view-requests"), requestController.show);

// Fitur 3: Batalkan permohonan
router.post("/:id/cancel", checkPermission("cancel-request"), requestController.cancel);

// Fitur 4: Route untuk tombol Unduh PDF oleh Mahasiswa
router.get("/:id/download", checkPermission("view-requests"), requestController.downloadPdf);

module.exports = router;