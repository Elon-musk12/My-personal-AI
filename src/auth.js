const crypto = require('crypto');
const jwt = require('jsonwebtoken');

const COOKIE_NAME = 'gel_session';
const SESSION_DAYS = 30;

function createSessionToken() {
  return crypto.randomBytes(32).toString('hex');
}

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function signSessionJwt(userId, sessionId, deviceId) {
  return jwt.sign(
    { userId, sessionId, deviceId },
    process.env.JWT_SECRET,
    { expiresIn: `${SESSION_DAYS}d` }
  );
}

function setSessionCookie(res, jwtToken) {
  res.cookie(COOKIE_NAME, jwtToken, {
    httpOnly: true,
    secure: process.env.COOKIE_SECURE !== 'false',
    sameSite: process.env.COOKIE_SAMESITE || 'none',
    maxAge: SESSION_DAYS * 24 * 60 * 60 * 1000,
    path: '/'
  });
}

function clearSessionCookie(res) {
  res.clearCookie(COOKIE_NAME, {
    httpOnly: true,
    secure: process.env.COOKIE_SECURE !== 'false',
    sameSite: process.env.COOKIE_SAMESITE || 'none',
    path: '/'
  });
}

module.exports = {
  COOKIE_NAME,
  createSessionToken,
  hashToken,
  signSessionJwt,
  setSessionCookie,
  clearSessionCookie
};
