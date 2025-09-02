import mongoose from 'mongoose';

const opts = { timestamps: false, versionKey: false };

const UserSchema = new mongoose.Schema({
  email: { type:String, unique:true, required:true },
  password_hash: { type:String, required:true },
  name: { type:String, required:true },
}, opts);

const ClientSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref:'User', required:true },
  name: { type:String, required:true },
  phone: String,
  notes: String,
  pref_days: { type:[String], default: [] }, // mon..sun
  pref_start: String, // "09:00"
  pref_end: String,   // "17:00"
  default_service_id: { type: mongoose.Schema.Types.ObjectId, ref:'Service', default:null },
}, opts);

const AvailabilitySchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref:'User', required:true },
  dow: { type:String, required:true }, // mon..sun
  start: { type:String, required:true },
  end: { type:String, required:true },
}, opts);

const BlockedSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref:'User', required:true },
  date: { type:String, required:true }, // YYYY-MM-DD
  start: { type:String, required:true },
  end: { type:String, required:true },
  reason: String,
}, opts);

const ServiceSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref:'User', required:true },
  name: { type:String, required:true },
  kind: { type:String, default:'outro' }, // novo | manutencao | gel | outro
  price: { type:Number, default:0 },
  duration_minutes: { type:Number, default:60 },
  maintenance_interval_days: { type:Number, default:null },
}, opts);

const AppointmentSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref:'User', required:true },
  client_id: { type: mongoose.Schema.Types.ObjectId, ref:'Client', required:true },
  date: { type:String, required:true }, // YYYY-MM-DD
  start: { type:String, required:true },
  end: { type:String, required:true },
  service: String, // nome “congelado” para histórico
  service_id: { type: mongoose.Schema.Types.ObjectId, ref:'Service', default:null },
  price: { type:Number, default:0 },
  paid: { type:Boolean, default:false },
  notes: String,
  created_at: { type:String, default: () => new Date().toISOString() }
}, opts);

export const User = mongoose.model('User', UserSchema);
export const Client = mongoose.model('Client', ClientSchema);
export const Availability = mongoose.model('Availability', AvailabilitySchema);
export const Blocked = mongoose.model('BlockedSlot', BlockedSchema);
export const Service = mongoose.model('Service', ServiceSchema);
export const Appointment = mongoose.model('Appointment', AppointmentSchema);