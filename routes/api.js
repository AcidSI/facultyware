var express = require("express");
var router = express.Router();
const requestApiController = require("../controllers/api/requestApiController");
const { isAuthenticated } = require("../middlewares/auth");
const { checkPermission } = require("../middlewares/acl");

// ✅ API juga butuh autentikasi via session
router.use(isAuthenticated);

// GET /api/requests       → list permohonan milik mahasiswa yang login
// GET /api/requests/:id   → detail permohonan
router.get("/requests", checkPermission("view-requests"), requestApiController.getList);
router.get("/requests/:id", checkPermission("view-requests"), requestApiController.getDetail);

module.exports = router;
