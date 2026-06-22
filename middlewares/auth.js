function isAuthenticated(req, res, next) {
  if (req.session.userId) {
    
    res.header('Cache-Control', 'private, no-cache, no-store, must-revalidate');
    res.header('Expires', '-1');
    res.header('Pragma', 'no-cache');
    
    return next();
  }
  res.redirect("/login");
}

function isGuest(req, res, next) {
  if (req.session.userId) {
    if (req.session.role === 'admin') return res.redirect('/admin/requests');
    if (req.session.role === 'dekan' || req.session.role === 'wakil dekan') return res.redirect('/dekan/requests');
    return res.redirect('/home');
  }
  next();
}

module.exports = {
  isAuthenticated,
  isGuest
};