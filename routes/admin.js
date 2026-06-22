var express = require("express");
var router = express.Router();
const adminController = require("../controllers/adminController");

const { isAuthenticated } = require("../middlewares/auth");
const { checkPermission, checkRole } = require("../middlewares/acl");

router.use(isAuthenticated);
router.use(checkRole('admin')); 


router.get("/", (req, res) => {
    res.redirect("/admin/requests");
});

router.get("/requests/export/pdf", checkPermission("verify-requests"), adminController.exportPdf);

router.get("/requests", checkPermission("verify-requests"), adminController.index);

router.get("/requests/:id", checkPermission("verify-requests"), adminController.show);

router.post("/requests/:id/verify", checkPermission("verify-requests"), adminController.verify);

module.exports = router;