var express = require("express");
var router = express.Router();
const requestController = require("../controllers/requestController");
const { isAuthenticated } = require("../middlewares/auth");
const { checkPermission } = require("../middlewares/acl");
const upload = require("../middlewares/upload");

// Semua route butuh login
router.use(isAuthenticated);

// ✅ Tambah checkPermission di setiap route
// Fitur 2: List riwayat
router.get("/", checkPermission("view-requests"), requestController.index);

// Fitur 1: Form buat permohonan
router.get("/create", checkPermission("create-request"), requestController.createPage);

// Fitur 1: Submit permohonan - upload 2 file: krs_file (wajib) + additional_file (opsional)
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

module.exports = router;
