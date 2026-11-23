// Sets req.user = { userId } when a valid login cookie is present.
// Never rejects: guests can still use routes that mount this.
const jwt = require("jsonwebtoken");

function optionalAuth(req, res, next) {
  const token = req.cookies?.token;
  if (token) {
    try {
      const { userId } = jwt.verify(token, process.env.JWT_SECRET || "dev-secret");
      if (userId) req.user = { userId: String(userId) };
    } catch {
      // Invalid or expired token: carry on as a guest.
    }
  }
  next();
}

module.exports = { optionalAuth };
