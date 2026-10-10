import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-insecure-secret-change-me';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

if (!process.env.JWT_SECRET) {
  console.warn(
    '[auth] JWT_SECRET is not set in your environment — using an insecure development default. ' +
    'Set JWT_SECRET in .env before deploying.'
  );
}

export async function hashPassword(password) {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

export async function comparePassword(password, hash) {
  return bcrypt.compare(password, hash);
}

export function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

export function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

// Strip the password hash before a user object ever leaves the server.
export function sanitizeUser(user) {
  if (!user) return user;
  const { passwordHash, ...rest } = user;
  return rest;
}

function extractToken(req) {
  if (req.cookies?.token) return req.cookies.token;
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) return header.slice(7);
  return null;
}

// Attaches req.user (via the given lookup function) if a valid token is
// present, but never blocks the request. Mount before any route — public
// or private — that might want to know who's asking.
// Usage: app.use(attachUser((id) => findUserById(db, id)))
export function attachUser(getUserById) {
  return (req, _res, next) => {
    const token = extractToken(req);
    if (token) {
      try {
        const payload = verifyToken(token);
        const user = getUserById(payload.sub);
        if (user) req.user = user;
      } catch (err) {
        // invalid or expired token — treat the request as unauthenticated
      }
    }
    next();
  };
}

// Blocks the request unless attachUser() found a valid user.
export function requireAuth(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Authentication required' });
  next();
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Authentication required' });
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
}

export function setAuthCookie(res, token) {
  res.cookie('token', token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });
}
