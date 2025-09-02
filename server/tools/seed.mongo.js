import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import { User, Service, Availability, Client } from '../mongo.models.js';

dotenv.config();
const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/nailflow';
await mongoose.connect(uri);

const email = process.env.SEED_USER_EMAIL || 'demo@nailflow.app';

let user = await User.findOne({ email });
if (!user) {
  const hash = bcrypt.hashSync('123456', 10);
  user = await User.create({ email, password_hash: hash, name: 'NailFlow User' });
}

const upsertService = async (s) => {
  const found = await Service.findOne({ user_id: user._id, name: s.name });
  if (found) return found;
  return Service.create({ user_id: user._id, ...s });
};

await upsertService({ name: 'Gel - Novo', kind: 'novo', price: 120, duration_minutes: 120 });
await upsertService({ name: 'Gel - Manutenção', kind: 'manutencao', price: 90, duration_minutes: 90, maintenance_interval_days: 21 });

const availCount = await Availability.countDocuments({ user_id: user._id });
if (availCount === 0) {
  const days = ['mon','tue','wed','thu','fri'];
  await Availability.insertMany(days.map(d => ({ user_id: user._id, dow: d, start: '09:00', end: '18:00' })));
}

const clients = await Client.countDocuments({ user_id: user._id });
console.log(`Seed ok.
 user=${email}
 services=${await Service.countDocuments({ user_id: user._id })}
 availability=${await Availability.countDocuments({ user_id: user._id })}
 clients=${clients}`);

await mongoose.disconnect();
process.exit(0);