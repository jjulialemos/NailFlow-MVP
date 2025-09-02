export const API_URL =
  (import.meta as any).env?.VITE_API_URL || 'http://127.0.0.1:4000';

export const api = {
  token() { return localStorage.getItem('token') || '' },
  setToken(t: string) { localStorage.setItem('token', t) },
  logout() { localStorage.removeItem('token'); localStorage.removeItem('user') },
  async req(path: string, opts: RequestInit = {}) {
    const headers: any = { 'Content-Type': 'application/json', ...(opts.headers||{}) }
    const token = api.token(); if (token) headers['Authorization'] = 'Bearer ' + token
    const res = await fetch(API_URL + path, { ...opts, headers })
    if (!res.ok) throw await res.json().catch(()=>({ error:'http_error', status:res.status }))
    return res.json()
  }
}