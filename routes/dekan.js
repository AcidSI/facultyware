var express = require("express");
var router = express.Router();
const dekanController = require("../controllers/dekanController");
const { isAuthenticated } = require("../middlewares/auth");
const { checkRole, checkPermission } = require("../middlewares/acl");

router.use(isAuthenticated);
router.use(checkRole('dekan', 'wakil dekan'));

router.get("/requests", checkPermission("sign-request"), dekanController.index);
router.post("/requests/:id/sign", checkPermission("sign-request"), dekanController.signDocument);

module.exports = router;