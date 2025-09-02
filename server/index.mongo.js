import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import bcrypt from 'bcryptjs';
import dayjs from 'dayjs';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { signToken, authMiddleware } from './auth.js';
import { User, Client, Availability, Blocked, Service, Appointment } from './mongo.models.js';


dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/nailflow';
await mongoose.connect(MONGODB_URI);
console.log('MongoDB conectado:', MONGODB_URI);

const app = express();
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Helpers
function timeToMinutes(t){ const [h,m]=t.split(':').map(Number); return h*60+m; }
function overlap(aStart,aEnd,bStart,bEnd){ return Math.max(aStart,bStart) < Math.min(aEnd,bEnd); }
const DOW = ['sun','mon','tue','wed','thu','fri','sat'];
function toDow(dateStr){ return DOW[new Date(dateStr+'T00:00:00').getDay()]; }

// Seed demo (rodado apenas se não houver usuários)
if (!(await User.countDocuments())) {
  const hash = bcrypt.hashSync('123456', 10);
  const u = await User.create({ email:'demo@nailflow.app', password_hash:hash, name:'Demo NailFlow' });
  await Service.create([
    { user_id:u._id, name:'Gel - Novo', kind:'novo', price:120, duration_minutes:120 },
    { user_id:u._id, name:'Gel - Manutenção', kind:'manutencao', price:90, duration_minutes:90, maintenance_interval_days:21 },
  ]);
  console.log('Seed demo criado.');
}

// ---------- Auth ----------
app.post('/auth/register', async (req,res)=>{
  const { email, password, name } = req.body || {};
  if (!email || !password || !name) return res.status(400).json({ error:'missing_fields' });
  try {
    const hash = bcrypt.hashSync(password, 10);
    const u = await User.create({ email, password_hash:hash, name });
    const token = signToken({ id: u._id, email, name });
    res.json({ token, user:{ id: u._id, email, name } });
  } catch { res.status(400).json({ error:'email_in_use' }); }
});

app.post('/auth/login', async (req,res)=>{
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error:'missing_fields' });
  const u = await User.findOne({ email });
  if (!u) return res.status(401).json({ error:'invalid_credentials' });
  if (!bcrypt.compareSync(password, u.password_hash)) return res.status(401).json({ error:'invalid_credentials' });
  const token = signToken({ id: u._id, email: u.email, name: u.name });
  res.json({ token, user:{ id: u._id, email: u.email, name: u.name } });
});

app.get('/health', (_,res)=> res.json({ ok:true }));

// ---------- Protegidas ----------
app.use(authMiddleware);

// Clients
app.get('/clients', async (req,res)=>{
  const rows = await Client.find({ user_id:req.user.id }).sort({ _id:-1 });
  res.json(rows);
});
app.post('/clients', async (req,res)=>{
  const { name, phone, notes, pref_days, pref_start, pref_end, default_service_id } = req.body || {};
  if (!name) return res.status(400).json({ error:'name_required' });
  const c = await Client.create({
    user_id:req.user.id, name, phone, notes,
    pref_days: pref_days||[], pref_start, pref_end,
    default_service_id: default_service_id || null
  });
  res.json(c);
});
app.put('/clients/:id', async (req,res)=>{
  const id = req.params.id;
  const cur = await Client.findOne({ _id:id, user_id:req.user.id });
  if (!cur) return res.status(404).json({ error:'not_found' });
  const body = { ...req.body };
  if (body.default_service_id===undefined) body.default_service_id = cur.default_service_id;
  const c = await Client.findByIdAndUpdate(id, body, { new:true });
  res.json(c);
});
app.delete('/clients/:id', async (req,res)=>{
  await Client.deleteOne({ _id:req.params.id, user_id:req.user.id });
  res.json({ ok:true });
});

// Availability
app.get('/availability', async (req,res)=>{
  res.json(await Availability.find({ user_id:req.user.id }).sort({ _id:-1 }));
});
app.post('/availability', async (req,res)=>{
  const { dow, start, end } = req.body || {};
  if (!dow || !start || !end) return res.status(400).json({ error:'missing_fields' });
  res.json(await Availability.create({ user_id:req.user.id, dow, start, end }));
});
app.delete('/availability/:id', async (req,res)=>{
  await Availability.deleteOne({ _id:req.params.id, user_id:req.user.id });
  res.json({ ok:true });
});

// Blocked
app.get('/blocked', async (req,res)=>{
  res.json(await Blocked.find({ user_id:req.user.id }).sort({ date:-1, start:-1 }));
});
app.post('/blocked', async (req,res)=>{
  const { date, start, end, reason } = req.body || {};
  if (!date || !start || !end) return res.status(400).json({ error:'missing_fields' });
  res.json(await Blocked.create({ user_id:req.user.id, date, start, end, reason:reason||null }));
});
app.delete('/blocked/:id', async (req,res)=>{
  await Blocked.deleteOne({ _id:req.params.id, user_id:req.user.id });
  res.json({ ok:true });
});

// Services (Procedimentos)
app.get('/services', async (req,res)=>{
  res.json(await Service.find({ user_id:req.user.id }).sort({ _id:-1 }));
});
app.post('/services', async (req,res)=>{
  const { name, kind='outro', price=0, duration_minutes=60, maintenance_interval_days=null } = req.body || {};
  if (!name) return res.status(400).json({ error:'name_required' });
  const s = await Service.create({
    user_id:req.user.id, name, kind,
    price:+price||0, duration_minutes:+duration_minutes||60,
    maintenance_interval_days: (maintenance_interval_days===''||maintenance_interval_days==null)? null : +maintenance_interval_days
  });
  res.json(s);
});
app.put('/services/:id', async (req,res)=>{
  const id = req.params.id;
  const cur = await Service.findOne({ _id:id, user_id:req.user.id });
  if (!cur) return res.status(404).json({ error:'not_found' });
  const body = { ...req.body };
  if (body.maintenance_interval_days==='') body.maintenance_interval_days = null;
  const s = await Service.findByIdAndUpdate(id, body, { new:true });
  res.json(s);
});
app.delete('/services/:id', async (req,res)=>{
  await Service.deleteOne({ _id:req.params.id, user_id:req.user.id });
  res.json({ ok:true });
});

// Appointments
app.get('/appointments', async (req,res)=>{
  const { from, to } = req.query;
  const q = { user_id:req.user.id };
  if (from || to) q.date = {};
  if (from) q.date.$gte = from;
  if (to) q.date.$lte = to;
  const rows = await Appointment.find(q).sort({ date:-1, start:-1 });
  res.json(rows);
});
app.post('/appointments', async (req,res)=>{
  const { client_id, date, start, end, service, service_id, price, paid, notes } = req.body || {};
  if (!client_id || !date || !start || !end) return res.status(400).json({ error:'missing_fields' });

  const s = timeToMinutes(start), e = timeToMinutes(end);
  const sameDay = await Appointment.find({ user_id:req.user.id, date });
  const hasConflict = sameDay.some(a => overlap(timeToMinutes(a.start), timeToMinutes(a.end), s, e));
  if (hasConflict) return res.status(400).json({ error:'conflict' });

  const dayBlocks = await Blocked.find({ user_id:req.user.id, date });
  const blocked = dayBlocks.some(b => overlap(timeToMinutes(b.start), timeToMinutes(b.end), s, e));
  if (blocked) return res.status(400).json({ error:'blocked_period' });

  let finalPrice = +price || 0;
  let finalServiceText = service || null;
  let svcId = service_id || null;

  if (svcId) {
    const svc = await Service.findOne({ _id:svcId, user_id:req.user.id });
    if (svc) {
      if (price===undefined || price===null) finalPrice = svc.price;
      if (!service) finalServiceText = svc.name;
    } else { svcId = null; }
  }

  const a = await Appointment.create({
    user_id:req.user.id, client_id, date, start, end,
    service: finalServiceText, service_id: svcId,
    price: finalPrice, paid: !!paid, notes: notes||null
  });
  res.json(a);
});
app.put('/appointments/:id', async (req,res)=>{
  const id = req.params.id;
  const cur = await Appointment.findOne({ _id:id, user_id:req.user.id });
  if (!cur) return res.status(404).json({ error:'not_found' });

  const newDate = req.body.date ?? cur.date;
  const newStart = req.body.start ?? cur.start;
  const newEnd = req.body.end ?? cur.end;
  const s = timeToMinutes(newStart), e = timeToMinutes(newEnd);

  const sameDay = await Appointment.find({ user_id:req.user.id, date:newDate, _id:{ $ne:id } });
  const hasConflict = sameDay.some(a => overlap(timeToMinutes(a.start), timeToMinutes(a.end), s, e));
  if (hasConflict) return res.status(400).json({ error:'conflict' });

  const dayBlocks = await Blocked.find({ user_id:req.user.id, date:newDate });
  const blocked = dayBlocks.some(b => overlap(timeToMinutes(b.start), timeToMinutes(b.end), s, e));
  if (blocked) return res.status(400).json({ error:'blocked_period' });

  const updated = await Appointment.findByIdAndUpdate(id, req.body, { new:true });
  res.json(updated);
});
app.delete('/appointments/:id', async (req,res)=>{
  await Appointment.deleteOne({ _id:req.params.id, user_id:req.user.id });
  res.json({ ok:true });
});

// Sugestões
app.post('/appointments/suggest', async (req,res)=>{
  const clientId = req.query.clientId; const duration = +(req.query.durationMinutes || 60);
  if (!clientId) return res.status(400).json({ error:'client_required' });

  const client = await Client.findOne({ _id:clientId, user_id:req.user.id });
  if (!client) return res.status(404).json({ error:'client_not_found' });

  const prefDays = client.pref_days || [];
  const prefStart = client.pref_start || '08:00';
  const prefEnd   = client.pref_end   || '20:00';

  const avail   = await Availability.find({ user_id:req.user.id });
  const blocked = await Blocked.find({ user_id:req.user.id });
  const appts   = await Appointment.find({ user_id:req.user.id });

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

        results.push({ date, start: fmt(s), end: fmt(e) });
        if (results.length >= 8) break;
      }
      if (results.length >= 8) break;
    }
    cursor = cursor.add(1, 'day'); scanned++;
  }
  res.json(results);
});

// Relatórios
app.get('/reports/monthly', async (req,res)=>{
  const y = +(req.query.year || dayjs().year());
  const m = +(req.query.month || (dayjs().month()+1));
  const from = dayjs(`${y}-${String(m).padStart(2,'0')}-01`).startOf('month').format('YYYY-MM-DD');
  const to = dayjs(from).endOf('month').format('YYYY-MM-DD');
  const rows = await Appointment.find({ user_id:req.user.id, date:{ $gte:from, $lte:to } });
  const total = rows.reduce((s,a)=>s+(a.price||0),0);
  const paid = rows.filter(a=>a.paid).reduce((s,a)=>s+(a.price||0),0);
  res.json({ from, to, count: rows.length, total, paid, pending: total - paid });
});

app.get('/reports/period', async (req,res)=>{
  const { from, to } = req.query;
  if (!from || !to) return res.status(400).json({ error:'missing_period' });
  const rows = await Appointment.find({ user_id:req.user.id, date:{ $gte:from, $lte:to } });
  const total = rows.reduce((s,a)=>s+(a.price||0),0);
  const paid = rows.filter(a=>a.paid).reduce((s,a)=>s+(a.price||0),0);
  res.json({ from, to, count: rows.length, total, paid, pending: total - paid });
});

// Manutenções "a agendar"
app.get('/maintenance/due', async (req,res)=>{
  const today = dayjs().startOf('day');
  const appts = await Appointment.aggregate([
    { $match: { user_id: new mongoose.Types.ObjectId(req.user.id), service_id: { $ne:null } } },
    { $sort: { date: -1 } },
    { $group: { _id: { client_id:'$client_id', service_id:'$service_id' }, last_date: { $first:'$date' } } }
  ]);
  const results = [];
  for (const g of appts) {
    const svc = await Service.findById(g._id.service_id);
    if (!svc || !svc.maintenance_interval_days) continue;
    const cli = await Client.findById(g._id.client_id);
    const last = dayjs(g.last_date);
    const next = last.add(svc.maintenance_interval_days, 'day');
    const overdue = today.diff(next, 'day');
    if (overdue >= 0) results.push({
      client_id: cli._id, client_name: cli.name, service: svc.name,
      last_date: g.last_date, next_date: next.format('YYYY-MM-DD'),
      status:'due', days_overdue: overdue
    });
  }
  res.json(results);
});

// Start
const PORT = process.env.PORT || 4000;
app.listen(PORT, ()=> console.log(`NailFlow (Mongo) on http://localhost:${PORT}`));