import { auth } from './firebase.js';

export async function authMiddleware(req, res, next){
  const h = req.headers.authorization || '';
  const idToken = h.startsWith('Bearer ') ? h.slice(7) : null;
  if (!idToken) return res.status(401).json({ error:'missing_token' });
  try {
    const decodedToken = await auth.verifyIdToken(idToken);
    req.user = { id: decodedToken.uid, email: decodedToken.email, name: decodedToken.name };
    next();
  } catch (error) {
    res.status(401).json({ error:'invalid_token' });
  }
}
