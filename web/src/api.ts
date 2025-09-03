import { auth } from './firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged, User, updateProfile } from 'firebase/auth';

export const API_URL =
  (import.meta as any).env?.VITE_API_URL || 'http://127.0.0.1:4000';

export const api = {
  user: null as User | null,
  async token() { return this.user ? await this.user.getIdToken() : null },
  setUser(u: User | null) { this.user = u },
  logout() { signOut(auth); this.user = null },
  async req(path: string, opts: RequestInit = {}) {
    const headers: any = { 'Content-Type': 'application/json', ...(opts.headers||{}) }
    const token = await this.token(); if (token) headers['Authorization'] = 'Bearer ' + token
    const res = await fetch(API_URL + path, { ...opts, headers })
    if (!res.ok) throw await res.json().catch(()=>({ error:'http_error', status:res.status }))
    return res.json()
  },
  async login(email: string, password: string) {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    this.setUser(userCredential.user);
    return { user: { id: userCredential.user.uid, email: userCredential.user.email, name: userCredential.user.displayName } };
  },
  async register(email: string, password: string, name: string) {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(userCredential.user, { displayName: name });
    this.setUser(userCredential.user);
    return { user: { id: userCredential.user.uid, email: userCredential.user.email, name } };
  }
}

// Listen to auth state changes
onAuthStateChanged(auth, (user) => {
  api.setUser(user);
});
