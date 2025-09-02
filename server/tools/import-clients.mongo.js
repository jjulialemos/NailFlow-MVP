import fs from 'node:fs';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Papa from 'papaparse';
import { User, Client, Service } from '../mongo.models.js';

dotenv.config();
const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/nailflow';
const email = process.env.IMPORT_USER_EMAIL || process.env.SEED_USER_EMAIL || 'demo@nailflow.app';

const mapDay = (s) => {
  if (!s) return null;
  const k = s.trim().toLowerCase();
  const pt = { 'seg':'mon','ter':'tue','qua':'wed','qui':'thu','sex':'fri','sab':'sat','sáb':'sat','dom':'sun' };
  const en = { 'mon':'mon','tue':'tue','wed':'wed','thu':'thu','fri':'fri','sat':'sat','sun':'sun' };
  return pt[k] || en[k] || null;
};

const ensureService = async (userId, name) => {
  if (!name) return null;
  let svc = await Service.findOne({ user_id: userId, name });
  if (!svc) svc = await Service.create({ user_id: userId, name, kind: 'outro', price: 0, duration_minutes: 60 });
  return svc._id;
};

async function main(){
  const file = process.argv[2];
  if (!file || !fs.existsSync(file)) {
    console.error('Uso: node tools/import-clients.mongo.js data/clients.csv');
    process.exit(1);
  }

  await mongoose.connect(uri);
  const user = await User.findOne({ email });
  if (!user) { console.error('Usuário não encontrado:', email); process.exit(1); }

  const csv = fs.readFileSync(file, 'utf8');
  const parsed = Papa.parse(csv, { header: true, skipEmptyLines: true });
  let ok = 0, fail = 0;

  for (const row of parsed.data) {
    try {
      const days = (row.pref_days || '')
        .split(/[|,;\/ ]+/).map(mapDay).filter(Boolean);

      const defaultServiceId = await ensureService(user._id, row.default_service);

      await Client.create({
        user_id: user._id,
        name: row.name,
        phone: row.phone || null,
        notes: row.notes || null,
        pref_days: days,
        pref_start: row.pref_start || null,
        pref_end: row.pref_end || null,
        default_service_id: defaultServiceId || null
      });
      ok++;
    } catch (e) {
      console.error('Linha com erro:', row, e.message);
      fail++;
    }
  }

  console.log(`Import finalizado. Sucesso=${ok} • Erros=${fail}`);
  await mongoose.disconnect();
}

main().catch(err => { console.error(err); process.exit(1); });