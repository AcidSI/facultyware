var express = require("express");
var router = express.Router();
const requestController = require("../controllers/requestController");
const upload = require("../middlewares/upload");

const { isAuthenticated } = require("../middlewares/auth");
const { checkPermission, checkRole } = require("../middlewares/acl");
const { getUnreadCount } = require("../middlewares/notification");


router.use(isAuthenticated);
router.use(checkRole('student')); 

router.use(getUnreadCount);

router.get("/", checkPermission("view-requests"), requestController.index);

router.get("/notifications", checkPermission("view-requests"), requestController.notifications);

router.get("/create", checkPermission("create-request"), requestController.createPage);

router.post(
  "/",
  checkPermission("create-request"),
  upload.fields([
    { name: "krs_file", maxCount: 1 },
    { name: "additional_file", maxCount: 1 }
  ]),
  requestController.store
);

router.get("/:id", checkPermission("view-requests"), requestController.show);

router.post("/:id/cancel", checkPermission("cancel-request"), requestController.cancel);

router.get("/:id/download", checkPermission("view-requests"), requestController.downloadPdf);

module.exports = router;