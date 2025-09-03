import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import dayjs from 'dayjs';
import dotenv from 'dotenv';
import { authMiddleware } from './auth.js';
import * as firestore from './firestore.models.js';
import { authMiddleware, verifyFirebaseIdToken } from './auth.js';
import * as firestore from './firestore.models.js';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const allowedOrigins = process.env.NODE_ENV === 'production'
  ? [process.env.FRONTEND_URL || 'https://your-app.onrender.com']
  : ['http://localhost:3000', 'http://localhost:5173'];
app.use(cors({ origin: allowedOrigins }));
app.use(express.json());
app.use(morgan('dev'));

// Helpers
function timeToMinutes(t){ const [h,m]=t.split(':').map(Number); return h*60+m; }
function overlap(aStart,aEnd,bStart,bEnd){ return Math.max(aStart,bStart) < Math.min(aEnd,bEnd); }
const DOW = ['sun','mon','tue','wed','thu','fri','sat'];
function toDow(dateStr){ return DOW[new Date(dateStr+'T00:00:00').getDay()]; }

app.get('/health', (_,res)=> res.json({ ok:true }));

app.post('/auth/register', async (req,res)=>{
  res.status(501).json({ error: 'Use Firebase Authentication on client side' });
});

app.post('/auth/login', async (req,res)=>{
  res.status(501).json({ error: 'Use Firebase Authentication on client side' });
});

// ---------- Protegidas ----------
app.use(verifyFirebaseIdToken);

// Clients
app.get('/clients', async (req,res)=>{
  try {
    const rows = await firestore.getClients(req.user.id);
    res.json(rows);
  } catch (e) { res.status(500).json({ error:'server_error' }); }
});
app.post('/clients', async (req,res)=>{
  const { name, phone, notes, pref_days, pref_start, pref_end, default_service_id } = req.body || {};
  if (!name) return res.status(400).json({ error:'name_required' });
  try {
    const c = await firestore.createClient(req.user.id, { name, phone, notes, pref_days: pref_days||[], pref_start, pref_end, default_service_id });
    res.json(c);
  } catch (e) { res.status(500).json({ error:'server_error' }); }
});
app.put('/clients/:id', async (req,res)=>{
  const id = req.params.id;
  try {
    const c = await firestore.updateClient(req.user.id, id, req.body);
    res.json(c);
  } catch (e) { res.status(404).json({ error:'not_found' }); }
});
app.delete('/clients/:id', async (req,res)=>{
  try {
    await firestore.deleteClient(req.user.id, req.params.id);
    res.json({ ok:true });
  } catch (e) { res.status(500).json({ error:'server_error' }); }
});

// Availability
app.get('/availability', async (req,res)=>{
  try {
    const rows = await firestore.getAvailability(req.user.id);
    res.json(rows);
  } catch (e) { res.status(500).json({ error:'server_error' }); }
});
app.post('/availability', async (req,res)=>{
  const { dow, start, end } = req.body || {};
  if (!dow || !start || !end) return res.status(400).json({ error:'missing_fields' });
  try {
    const a = await firestore.createAvailability(req.user.id, { dow, start, end });
    res.json(a);
  } catch (e) { res.status(500).json({ error:'server_error' }); }
});
app.delete('/availability/:id', async (req,res)=>{
  try {
    await firestore.deleteAvailability(req.user.id, req.params.id);
    res.json({ ok:true });
  } catch (e) { res.status(500).json({ error:'server_error' }); }
});

// Blocked
app.get('/blocked', async (req,res)=>{
  try {
    const rows = await firestore.getBlocked(req.user.id);
    res.json(rows);
  } catch (e) { res.status(500).json({ error:'server_error' }); }
});
app.post('/blocked', async (req,res)=>{
  const { date, start, end, reason } = req.body || {};
  if (!date || !start || !end) return res.status(400).json({ error:'missing_fields' });
  try {
    const b = await firestore.createBlocked(req.user.id, { date, start, end, reason });
    res.json(b);
  } catch (e) { res.status(500).json({ error:'server_error' }); }
});
app.delete('/blocked/:id', async (req,res)=>{
  try {
    await firestore.deleteBlocked(req.user.id, req.params.id);
    res.json({ ok:true });
  } catch (e) { res.status(500).json({ error:'server_error' }); }
});

// Services
app.get('/services', async (req,res)=>{
  try {
    const rows = await firestore.getServices(req.user.id);
    res.json(rows);
  } catch (e) { res.status(500).json({ error:'server_error' }); }
});
app.post('/services', async (req,res)=>{
  const { name, kind='outro', price=0, duration_minutes=60, maintenance_interval_days=null } = req.body || {};
  if (!name) return res.status(400).json({ error:'name_required' });
  try {
    const s = await firestore.createService(req.user.id, { name, kind, price: +price||0, duration_minutes: +duration_minutes||60, maintenance_interval_days });
    res.json(s);
  } catch (e) { res.status(500).json({ error:'server_error' }); }
});
app.put('/services/:id', async (req,res)=>{
  try {
    const s = await firestore.updateService(req.user.id, req.params.id, req.body);
    res.json(s);
  } catch (e) { res.status(404).json({ error:'not_found' }); }
});
app.delete('/services/:id', async (req,res)=>{
  try {
    await firestore.deleteService(req.user.id, req.params.id);
    res.json({ ok:true });
  } catch (e) { res.status(500).json({ error:'server_error' }); }
});

// Appointments
app.get('/appointments', async (req,res)=>{
  const { from, to } = req.query;
  try {
    const rows = await firestore.getAppointments(req.user.id, from, to);
    res.json(rows);
  } catch (e) { res.status(500).json({ error:'server_error' }); }
});
app.post('/appointments', async (req,res)=>{
  const { client_id, date, start, end, service, service_id, price, paid, notes } = req.body || {};
  if (!client_id || !date || !start || !end) return res.status(400).json({ error:'missing_fields' });

  try {
    const s = timeToMinutes(start), e = timeToMinutes(end);
    const sameDay = await firestore.getAppointments(req.user.id, date, date);
    const hasConflict = sameDay.some(a => overlap(timeToMinutes(a.start), timeToMinutes(a.end), s, e));
    if (hasConflict) return res.status(400).json({ error:'conflict' });

    const dayBlocks = await firestore.getBlocked(req.user.id);
    const blocked = dayBlocks.filter(b => b.date === date).some(b => overlap(timeToMinutes(b.start), timeToMinutes(b.end), s, e));
    if (blocked) return res.status(400).json({ error:'blocked_period' });

    let finalPrice = +price || 0;
    let finalServiceText = service || null;
    let svcId = service_id || null;

    if (svcId) {
      const svc = await firestore.getServices(req.user.id).then(svcs => svcs.find(s => s.id === svcId));
      if (svc) {
        if (price===undefined || price===null) finalPrice = svc.price;
        if (!service) finalServiceText = svc.name;
      } else { svcId = null; }
    }

    const a = await firestore.createAppointment(req.user.id, { client_id, date, start, end, service: finalServiceText, service_id: svcId, price: finalPrice, paid: !!paid, notes });
    res.json(a);
  } catch (e) { res.status(500).json({ error:'server_error' }); }
});
app.put('/appointments/:id', async (req,res)=>{
  const id = req.params.id;
  try {
    const cur = await firestore.getAppointments(req.user.id).then(appts => appts.find(a => a.id === id));
    if (!cur) return res.status(404).json({ error:'not_found' });

    const newDate = req.body.date ?? cur.date;
    const newStart = req.body.start ?? cur.start;
    const newEnd = req.body.end ?? cur.end;
    const s = timeToMinutes(newStart), e = timeToMinutes(newEnd);

    const sameDay = await firestore.getAppointments(req.user.id, newDate, newDate);
    const hasConflict = sameDay.filter(a => a.id !== id).some(a => overlap(timeToMinutes(a.start), timeToMinutes(a.end), s, e));
    if (hasConflict) return res.status(400).json({ error:'conflict' });

    const dayBlocks = await firestore.getBlocked(req.user.id);
    const blocked = dayBlocks.filter(b => b.date === newDate).some(b => overlap(timeToMinutes(b.start), timeToMinutes(b.end), s, e));
    if (blocked) return res.status(400).json({ error:'blocked_period' });

    const updated = await firestore.updateAppointment(req.user.id, id, req.body);
    res.json(updated);
  } catch (e) { res.status(500).json({ error:'server_error' }); }
});
app.delete('/appointments/:id', async (req,res)=>{
  try {
    await firestore.deleteAppointment(req.user.id, req.params.id);
    res.json({ ok:true });
  } catch (e) { res.status(500).json({ error:'server_error' }); }
});

// Sugestões
app.post('/appointments/suggest', async (req,res)=>{
  const clientId = req.query.clientId; const duration = +(req.query.durationMinutes || 60);
  if (!clientId) return res.status(400).json({ error:'client_required' });

  try {
    const clients = await firestore.getClients(req.user.id);
    const client = clients.find(c => c.id === clientId);
    if (!client) return res.status(404).json({ error:'client_not_found' });

    const prefDays = client.pref_days || [];
    const prefStart = client.pref_start || '08:00';
    const prefEnd = client.pref_end || '20:00';

    const avail = await firestore.getAvailability(req.user.id);
    const blocked = await firestore.getBlocked(req.user.id);
    const appts = await firestore.getAppointments(req.user.id);

    const results = [];
    let cursor = dayjs().startOf('day');
    let scanned = 0;

    function fmt(m){ return `${String(Math.floor(m/60)).padStart(2,'0')}:${String(m%60).padStart(2,'0')}` }

    while (results.length < 8 && scanned < 40) {
      const date = cursor.format('YYYY-MM-DD');
      const dow = toDow(date);
      const windows = avail.filter(a => a.dow === dow);

      for (const w of windows) {
        const startM = Math.max(timeToMinutes(w.start), timeToMinutes(prefStart));
        const endM = Math.min(timeToMinutes(w.end), timeToMinutes(prefEnd));
        for (let t = startM; t + duration <= endM; t += 15) {
          if (prefDays.length && !prefDays.includes(dow)) continue;
          const s = t, e = t + duration;

          const hasBlocked = blocked.filter(b => b.date === date).some(b => overlap(timeToMinutes(b.start), timeToMinutes(b.end), s, e));
          if (hasBlocked) continue;

          const hasConflict = appts.filter(a => a.date === date).some(a => overlap(timeToMinutes(a.start), timeToMinutes(a.end), s, e));
          if (hasConflict) continue;

          results.push({ date, start: fmt(s), end: fmt(e) });
          if (results.length >= 8) break;
        }
        if (results.length >= 8) break;
      }
      cursor = cursor.add(1, 'day'); scanned++;
    }
    res.json(results);
  } catch (e) { res.status(500).json({ error:'server_error' }); }
});

// Relatórios
app.get('/reports/monthly', async (req,res)=>{
  const y = +(req.query.year || dayjs().year());
  const m = +(req.query.month || (dayjs().month()+1));
  const from = dayjs(`${y}-${String(m).padStart(2,'0')}-01`).startOf('month').format('YYYY-MM-DD');
  const to = dayjs(from).endOf('month').format('YYYY-MM-DD');
  try {
    const report = await firestore.getMonthlyReport(req.user.id, y, m);
    res.json(report);
  } catch (e) { res.status(500).json({ error:'server_error' }); }
});

app.get('/reports/period', async (req,res)=>{
  const { from, to } = req.query;
  if (!from || !to) return res.status(400).json({ error:'missing_period' });
  try {
    const report = await firestore.getPeriodReport(req.user.id, from, to);
    res.json(report);
  } catch (e) { res.status(500).json({ error:'server_error' }); }
});

// Manutenções
app.get('/maintenance/due', async (req,res)=>{
  try {
    const results = await firestore.getMaintenanceDue(req.user.id);
    res.json(results);
  } catch (e) { res.status(500).json({ error:'server_error' }); }
});

// Start
const PORT = process.env.PORT || 4000;
app.listen(PORT, ()=> console.log(`NailFlow (Firestore) on http://localhost:${PORT}`));
