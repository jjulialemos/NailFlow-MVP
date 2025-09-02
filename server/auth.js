import jwt from 'jsonwebtoken';

const SECRET = process.env.JWT_SECRET || 'dev-secret';

export function signToken(payload){
  return jwt.sign(payload, SECRET, { expiresIn: '7d' });
}

export function authMiddleware(req, res, next){
  const h = req.headers.authorization || '';
  const t = h.startsWith('Bearer ') ? h.slice(7) : null;
  if (!t) return res.status(401).json({ error:'missing_token' });
  try {
    req.user = jwt.verify(t, SECRET);
    next();
  } catch {
    res.status(401).json({ error:'invalid_token' });
  }
}