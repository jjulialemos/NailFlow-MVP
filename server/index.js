import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import bcrypt from 'bcryptjs';
import dayjs from 'dayjs';
import db from './db.js';
import { signToken, authMiddleware } from './auth.js';

const app = express();
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// ---------- Helpers ----------
function timeToMinutes(t){ const [h,m]=t.split(':').map(Number); return h*60+m; }
function overlap(aStart,aEnd,bStart,bEnd){ return Math.max(aStart,bStart) < Math.min(aEnd,bEnd); }
const DOW = ['sun','mon','tue','wed','thu','fri','sat'];
function toDow(dateStr){ return DOW[new Date(dateStr+'T00:00:00').getDay()]; }

// ---------- Auth (público) ----------
app.post('/auth/register', (req,res)=>{
  const { email, password, name } = req.body || {};
  if (!email || !password || !name) return res.status(400).json({ error: 'missing_fields' });
  try {
    const hash = bcrypt.hashSync(password, 10);
    const info = db.prepare('INSERT INTO users (email, password_hash, name) VALUES (?, ?, ?)').run(email, hash, name);
    const token = signToken({ id: info.lastInsertRowid, email, name });
    res.json({ token, user: { id: info.lastInsertRowid, email, name } });
  } catch {
    res.status(400).json({ error: 'email_in_use' });
  }
});

app.post('/auth/login', (req,res)=>{
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'missing_fields' });
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user) return res.status(401).json({ error: 'invalid_credentials' });
  if (!bcrypt.compareSync(password, user.password_hash)) return res.status(401).json({ error: 'invalid_credentials' });
  const token = signToken({ id: user.id, email: user.email, name: user.name });
  res.json({ token, user: { id: user.id, email: user.email, name: user.name } });
});

app.get('/health', (_,res)=> res.json({ ok:true }));

// ---------- Rotas protegidas ----------
app.use(authMiddleware);

// ----- Clients -----
app.get('/clients', (req,res)=>{
  const rows = db.prepare('SELECT * FROM clients WHERE user_id=? ORDER BY id DESC').all(req.user.id);
  res.json(rows.map(r=>({...r, pref_days: r.pref_days? JSON.parse(r.pref_days): []})));
});

app.post('/clients', (req,res)=>{
  const { name, phone, notes, pref_days, pref_start, pref_end, default_service_id } = req.body || {};
  if (!name) return res.status(400).json({ error: 'name_required' });

  const info = db.prepare(`INSERT INTO clients (user_id,name,phone,notes,pref_days,pref_start,pref_end)
                           VALUES (?,?,?,?,?,?,?)`)
                 .run(req.user.id, name, phone||null, notes||null, JSON.stringify(pref_days||[]), pref_start||null, pref_end||null);

  if (default_service_id) {
    db.prepare('UPDATE clients SET default_service_id=? WHERE id=? AND user_id=?')
      .run(+default_service_id, info.lastInsertRowid, req.user.id);
  }

  const row = db.prepare('SELECT * FROM clients WHERE id=?').get(info.lastInsertRowid);
  row.pref_days = row.pref_days ? JSON.parse(row.pref_days) : [];
  res.json(row);
});

app.put('/clients/:id', (req,res)=>{
  const id = +req.params.id;
  const cur = db.prepare('SELECT * FROM clients WHERE id=? AND user_id=?').get(id, req.user.id);
  if (!cur) return res.status(404).json({ error: 'not_found' });

  const { name, phone, notes, pref_days, pref_start, pref_end, default_service_id } = req.body || {};
  const newPrefDays = JSON.stringify(pref_days ?? (cur.pref_days ? JSON.parse(cur.pref_days) : []));
  const newDefaultSvc = (default_service_id===undefined ? cur.default_service_id : (default_service_id || null));

  db.prepare(`UPDATE clients
              SET name=?, phone=?, notes=?, pref_days=?, pref_start=?, pref_end=?, default_service_id=?
              WHERE id=?`)
    .run(
      name??cur.name,
      phone??cur.phone,
      notes??cur.notes,
      newPrefDays,
      pref_start??cur.pref_start,
      pref_end??cur.pref_end,
      newDefaultSvc,
      id
    );

  const row = db.prepare('SELECT * FROM clients WHERE id=?').get(id);
  row.pref_days = row.pref_days ? JSON.parse(row.pref_days) : [];
  res.json(row);
});

app.delete('/clients/:id', (req,res)=>{
  db.prepare('DELETE FROM clients WHERE id=? AND user_id=?').run(+req.params.id, req.user.id);
  res.json({ ok:true });
});

// ----- Availability (janelas semanais) -----
app.get('/availability', (req,res)=>{
  res.json(db.prepare('SELECT * FROM availability WHERE user_id=? ORDER BY id DESC').all(req.user.id));
});

app.post('/availability', (req,res)=>{
  const { dow, start, end } = req.body || {};
  if (!dow || !start || !end) return res.status(400).json({ error: 'missing_fields' });
  const info = db.prepare('INSERT INTO availability (user_id,dow,start,end) VALUES (?,?,?,?)')
    .run(req.user.id, dow, start, end);
  res.json(db.prepare('SELECT * FROM availability WHERE id=?').get(info.lastInsertRowid));
});

app.delete('/availability/:id', (req,res)=>{
  db.prepare('DELETE FROM availability WHERE id=? AND user_id=?').run(+req.params.id, req.user.id);
  res.json({ ok:true });
});

// ----- Bloqueios -----
app.get('/blocked', (req,res)=>{
  res.json(db.prepare('SELECT * FROM blocked_slots WHERE user_id=? ORDER BY date DESC,start DESC').all(req.user.id));
});

app.post('/blocked', (req,res)=>{
  const { date, start, end, reason } = req.body || {};
  if (!date || !start || !end) return res.status(400).json({ error: 'missing_fields' });
  const info = db.prepare('INSERT INTO blocked_slots (user_id,date,start,end,reason) VALUES (?,?,?,?,?)')
    .run(req.user.id, date, start, end, reason||null);
  res.json(db.prepare('SELECT * FROM blocked_slots WHERE id=?').get(info.lastInsertRowid));
});

app.delete('/blocked/:id', (req,res)=>{
  db.prepare('DELETE FROM blocked_slots WHERE id=? AND user_id=?').run(+req.params.id, req.user.id);
  res.json({ ok:true });
});

// ----- Services (Procedimentos) -----
app.get('/services', (req,res)=>{
  const rows = db.prepare('SELECT * FROM services WHERE user_id=? ORDER BY id DESC').all(req.user.id);
  res.json(rows);
});

app.post('/services', (req,res)=>{
  const { name, kind='outro', price=0, duration_minutes=60, maintenance_interval_days=null } = req.body || {};
  if (!name) return res.status(400).json({ error:'name_required' });
  const info = db.prepare(`INSERT INTO services (user_id,name,kind,price,duration_minutes,maintenance_interval_days)
                           VALUES (?,?,?,?,?,?)`)
    .run(req.user.id, name, kind, +price||0, +duration_minutes||60,
         (maintenance_interval_days===''||maintenance_interval_days==null) ? null : +maintenance_interval_days);
  res.json(db.prepare('SELECT * FROM services WHERE id=?').get(info.lastInsertRowid));
});

app.put('/services/:id', (req,res)=>{
  const id = +req.params.id;
  const cur = db.prepare('SELECT * FROM services WHERE id=? AND user_id=?').get(id, req.user.id);
  if (!cur) return res.status(404).json({ error:'not_found' });
  const { name, kind, price, duration_minutes, maintenance_interval_days } = req.body || {};
  db.prepare(`UPDATE services SET name=?, kind=?, price=?, duration_minutes=?, maintenance_interval_days=? WHERE id=?`)
    .run(
      name??cur.name,
      kind??cur.kind,
      price??cur.price,
      duration_minutes??cur.duration_minutes,
      maintenance_interval_days===undefined ? cur.maintenance_interval_days : (maintenance_interval_days===''? null : maintenance_interval_days),
      id
    );
  res.json(db.prepare('SELECT * FROM services WHERE id=?').get(id));
});

app.delete('/services/:id', (req,res)=>{
  db.prepare('DELETE FROM services WHERE id=? AND user_id=?').run(+req.params.id, req.user.id);
  res.json({ ok:true });
});

// ----- Appointments -----
app.get('/appointments', (req,res)=>{
  const { from, to } = req.query;
  let sql = 'SELECT * FROM appointments WHERE user_id=?';
  const params = [req.user.id];
  if (from){ sql += ' AND date >= ?'; params.push(from); }
  if (to){ sql += ' AND date <= ?'; params.push(to); }
  sql += ' ORDER BY date DESC, start DESC';
  res.json(db.prepare(sql).all(...params));
});

app.post('/appointments', (req,res)=>{
  const { client_id, date, start, end, service, service_id, price, paid, notes } = req.body || {};
  if (!client_id || !date || !start || !end) return res.status(400).json({ error: 'missing_fields' });

  const s = timeToMinutes(start), e = timeToMinutes(end);
  const conflicts = db.prepare('SELECT * FROM appointments WHERE user_id=? AND date=?').all(req.user.id, date)
    .some(a => overlap(timeToMinutes(a.start), timeToMinutes(a.end), s, e));
  if (conflicts) return res.status(400).json({ error: 'conflict' });

  const blocked = db.prepare('SELECT * FROM blocked_slots WHERE user_id=? AND date=?').all(req.user.id, date)
    .some(b => overlap(timeToMinutes(b.start), timeToMinutes(b.end), s, e));
  if (blocked) return res.status(400).json({ error: 'blocked_period' });

  let finalPrice = +price || 0;
  let finalServiceText = service || null;
  let svcId = service_id || null;

  if (svcId) {
    const svc = db.prepare('SELECT * FROM services WHERE id=? AND user_id=?').get(svcId, req.user.id);
    if (svc) {
      if (price===undefined || price===null) finalPrice = svc.price;
      if (!service) finalServiceText = svc.name;
    } else {
      svcId = null;
    }
  }

  const info = db.prepare(`INSERT INTO appointments (user_id,client_id,date,start,end,service,price,paid,notes,service_id)
                           VALUES (?,?,?,?,?,?,?,?,?,?)`)
    .run(req.user.id, client_id, date, start, end, finalServiceText, finalPrice, paid?1:0, notes||null, svcId);
  res.json(db.prepare('SELECT * FROM appointments WHERE id=?').get(info.lastInsertRowid));
});

app.put('/appointments/:id', (req,res)=>{
  const id = +req.params.id;
  const cur = db.prepare('SELECT * FROM appointments WHERE id=? AND user_id=?').get(id, req.user.id);
  if (!cur) return res.status(404).json({ error: 'not_found' });

  const { client_id, date, start, end, service, price, paid, notes, service_id } = req.body || {};
  const newDate = date ?? cur.date;
  const newStart = start ?? cur.start;
  const newEnd = end ?? cur.end;
  const s = timeToMinutes(newStart), e = timeToMinutes(newEnd);

  const conflicts = db.prepare('SELECT * FROM appointments WHERE user_id=? AND date=? AND id<>?')
    .all(req.user.id, newDate, id)
    .some(a => overlap(timeToMinutes(a.start), timeToMinutes(a.end), s, e));
  if (conflicts) return res.status(400).json({ error: 'conflict' });

  const blocked = db.prepare('SELECT * FROM blocked_slots WHERE user_id=? AND date=?').all(req.user.id, newDate)
    .some(b => overlap(timeToMinutes(b.start), timeToMinutes(b.end), s, e));
  if (blocked) return res.status(400).json({ error: 'blocked_period' });

  db.prepare(`UPDATE appointments
              SET client_id=?, date=?, start=?, end=?, service=?, price=?, paid=?, notes=?, service_id=?
              WHERE id=?`)
    .run(
      client_id??cur.client_id,
      newDate,
      newStart,
      newEnd,
      service??cur.service,
      price??cur.price,
      (paid??cur.paid)?1:0,
      notes??cur.notes,
      service_id??cur.service_id,
      id
    );
  res.json(db.prepare('SELECT * FROM appointments WHERE id=?').get(id));
});

app.delete('/appointments/:id', (req,res)=>{
  db.prepare('DELETE FROM appointments WHERE id=? AND user_id=?').run(+req.params.id, req.user.id);
  res.json({ ok:true });
});

// ----- Agenda inteligente (sugestões) -----
app.post('/appointments/suggest', (req,res)=>{
  const clientId = +(req.query.clientId || 0);
  const duration = +(req.query.durationMinutes || 60);
  if (!clientId) return res.status(400).json({ error: 'client_required' });

  const client = db.prepare('SELECT * FROM clients WHERE id=? AND user_id=?').get(clientId, req.user.id);
  if (!client) return res.status(404).json({ error: 'client_not_found' });

  const prefDays = client.pref_days ? JSON.parse(client.pref_days) : [];
  const prefStart = client.pref_start || '08:00';
  const prefEnd   = client.pref_end   || '20:00';

  const avail   = db.prepare('SELECT * FROM availability WHERE user_id=?').all(req.user.id);
  const blocked = db.prepare('SELECT * FROM blocked_slots WHERE user_id=?').all(req.user.id);
  const appts   = db.prepare('SELECT * FROM appointments WHERE user_id=?').all(req.user.id);

  const results = [];
  let cursor = dayjs().startOf('day');
  let scanned = 0;

  while (results.length < 8 && scanned < 40) {
    const date = cursor.format('YYYY-MM-DD');
    const dow = toDow(date);
    const windows = avail.filter(a => a.dow === dow);

    for (const w of windows) {
      const startM = Math.max(timeToMinutes(w.start), timeToMinutes(prefStart));
      const endM   = Math.min(timeToMinutes(w.end),   timeToMinutes(prefEnd));
      for (let t = startM; t + duration <= endM; t += 15) {
        if (prefDays.length && !prefDays.includes(dow)) continue;
        const s = t, e = t + duration;

        const hasBlocked = blocked.filter(b => b.date === date)
          .some(b => overlap(timeToMinutes(b.start), timeToMinutes(b.end), s, e));
        if (hasBlocked) continue;

        const hasConflict = appts.filter(a => a.date === date)
          .some(a => overlap(timeToMinutes(a.start), timeToMinutes(a.end), s, e));
        if (hasConflict) continue;

        const fmt = (m) => `${String(Math.floor(m/60)).padStart(2,'0')}:${String(m%60).padStart(2,'0')}`;
        results.push({ date, start: fmt(s), end: fmt(e) });
        if (results.length >= 8) break;
      }
      if (results.length >= 8) break;
    }

    cursor = cursor.add(1, 'day'); scanned++;
  }

  res.json(results);
});

// ----- Relatórios -----
app.get('/reports/monthly', (req,res)=>{
  const year = +(req.query.year || dayjs().year());
  const month = +(req.query.month || (dayjs().month()+1)); // 1-12
  const from = dayjs(`${year}-${String(month).padStart(2,'0')}-01`).startOf('month').format('YYYY-MM-DD');
  const to = dayjs(from).endOf('month').format('YYYY-MM-DD');
  const rows = db.prepare('SELECT * FROM appointments WHERE user_id=? AND date BETWEEN ? AND ?').all(req.user.id, from, to);
  const total = rows.reduce((s,a)=>s+(a.price||0),0);
  const paid = rows.filter(a=>a.paid).reduce((s,a)=>s+(a.price||0),0);
  const pending = total - paid;
  res.json({ from, to, count: rows.length, total, paid, pending });
});

app.get('/reports/period', (req,res)=>{
  const { from, to } = req.query;
  if (!from || !to) return res.status(400).json({ error: 'missing_period' });
  const rows = db.prepare('SELECT * FROM appointments WHERE user_id=? AND date BETWEEN ? AND ?').all(req.user.id, from, to);
  const total = rows.reduce((s,a)=>s+(a.price||0),0);
  const paid = rows.filter(a=>a.paid).reduce((s,a)=>s+(a.price||0),0);
  const pending = total - paid;
  res.json({ from, to, count: rows.length, total, paid, pending });
});

// ----- Manutenções "a agendar" -----
app.get('/maintenance/due', (req,res)=>{
  const today = dayjs().startOf('day');
  const rows = db.prepare(`
    SELECT c.id as client_id, c.name as client_name, a.date as last_date,
           s.name as service_name, s.maintenance_interval_days as interval
    FROM clients c
    JOIN appointments a ON a.client_id = c.id
    JOIN services s ON a.service_id = s.id
    WHERE c.user_id = ? AND s.maintenance_interval_days IS NOT NULL
    AND a.date = (
      SELECT MAX(a2.date) FROM appointments a2
      WHERE a2.client_id = c.id AND a2.service_id = s.id
    )
    ORDER BY a.date DESC
  `).all(req.user.id);

  const due = rows.map(r=>{
    const last = dayjs(r.last_date);
    const next = last.add(r.interval, 'day');
    const overdue = today.diff(next, 'day');
    return {
      client_id: r.client_id,
      client_name: r.client_name,
      service: r.service_name,
      last_date: r.last_date,
      next_date: next.format('YYYY-MM-DD'),
      status: overdue >= 0 ? 'due' : 'ok',
      days_overdue: overdue
    }
  }).filter(x=> x.status==='due');

  res.json(due);
});

// ---------- Start ----------
const mongoose = require('mongoose');

const PORT = process.env.PORT || 4000;

const mongoUri = process.env.MONGODB_URI;
if (!mongoUri) {
  console.error('MONGODB_URI environment variable is not set.');
  process.exit(1);
}

mongoose.connect(mongoUri, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => {
    console.log('Connected to MongoDB');
    app.listen(PORT, () => console.log(`NailFlow API on http://localhost:${PORT}`));
  })
  .catch(err => {
    console.error('Failed to connect to MongoDB', err);
    process.exit(1);
  });
