const db = require("../lib/db");

const getUnreadCount = async (req, res, next) => {
  
  console.log("--> [CEK MIDDLEWARE] Role saat ini:", req.session ? req.session.role : "Sesi Kosong");

  if (req.session && req.session.role === 'student') {
    try {
      const [[{ count }]] = await db.query(
        `SELECT COUNT(*) as count 
         FROM student_requests 
         WHERE requested_by = ? AND status IN (2, 3) AND is_read = 0`,
        [req.session.userId]
      );
      
      console.log(`--> [NOTIF] Mahasiswa ID ${req.session.userId} punya ${count} notifikasi baru.`);
      res.locals.unreadCount = count;
    } catch (err) {
      console.error("--> [NOTIF ERROR]:", err.message);
      res.locals.unreadCount = 0;
    }
  } else {
    res.locals.unreadCount = 0;
  }
  next();
};

module.exports = { getUnreadCount };