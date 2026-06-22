var express = require("express");
var router = express.Router();
const indexController = require("../controllers/indexController");
const requestController = require("../controllers/requestController");

const { isAuthenticated, isGuest } = require("../middlewares/auth");
const { checkRole } = require("../middlewares/acl");

const { getUnreadCount } = require("../middlewares/notification");


router.get("/verify/:token", requestController.verifyPublicDocument);

router.get("/", indexController.index);

router.get("/login", isGuest, indexController.loginPage);
router.post("/login", isGuest, indexController.login);

router.get("/home", isAuthenticated, checkRole('student'), getUnreadCount, indexController.home);

router.get("/logout", isAuthenticated, indexController.logout);

router.get('/profile', isAuthenticated, checkRole('student'), getUnreadCount, indexController.profile);

router.get('/profile/edit', isAuthenticated, checkRole('student'), getUnreadCount, indexController.editProfile);
router.post('/profile/edit', isAuthenticated, checkRole('student'), indexController.updateProfile);
router.get('/api/history', isAuthenticated, checkRole('student'), requestController.getHistoryJson);
module.exports = router;