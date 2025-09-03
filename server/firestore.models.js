import { db } from './firebase.js';

// Helper to get user doc ref
const userDoc = (userId) => db.collection('users').doc(userId);

// Users
export const createUser = async (userId, data) => {
  await db.collection('users').doc(userId).set(data);
};

export const getUser = async (userId) => {
  const doc = await db.collection('users').doc(userId).get();
  return doc.exists ? { id: doc.id, ...doc.data() } : null;
};

// Clients
export const getClients = async (userId) => {
  const snapshot = await userDoc(userId).collection('clients').get();
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const createClient = async (userId, data) => {
  const ref = await userDoc(userId).collection('clients').add(data);
  return { id: ref.id, ...data };
};

export const updateClient = async (userId, clientId, data) => {
  await userDoc(userId).collection('clients').doc(clientId).update(data);
  return { id: clientId, ...data };
};

export const deleteClient = async (userId, clientId) => {
  await userDoc(userId).collection('clients').doc(clientId).delete();
};

// Availability
export const getAvailability = async (userId) => {
  const snapshot = await userDoc(userId).collection('availability').get();
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const createAvailability = async (userId, data) => {
  const ref = await userDoc(userId).collection('availability').add(data);
  return { id: ref.id, ...data };
};

export const deleteAvailability = async (userId, availId) => {
  await userDoc(userId).collection('availability').doc(availId).delete();
};

// Blocked
export const getBlocked = async (userId) => {
  const snapshot = await userDoc(userId).collection('blocked').get();
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const createBlocked = async (userId, data) => {
  const ref = await userDoc(userId).collection('blocked').add(data);
  return { id: ref.id, ...data };
};

export const deleteBlocked = async (userId, blockedId) => {
  await userDoc(userId).collection('blocked').doc(blockedId).delete();
};

// Services
export const getServices = async (userId) => {
  const snapshot = await userDoc(userId).collection('services').get();
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const createService = async (userId, data) => {
  const ref = await userDoc(userId).collection('services').add(data);
  return { id: ref.id, ...data };
};

export const updateService = async (userId, serviceId, data) => {
  await userDoc(userId).collection('services').doc(serviceId).update(data);
  return { id: serviceId, ...data };
};

export const deleteService = async (userId, serviceId) => {
  await userDoc(userId).collection('services').doc(serviceId).delete();
};

// Appointments
export const getAppointments = async (userId, from, to) => {
  let query = userDoc(userId).collection('appointments').orderBy('date', 'desc').orderBy('start', 'desc');
  if (from) query = query.where('date', '>=', from);
  if (to) query = query.where('date', '<=', to);
  const snapshot = await query.get();
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const createAppointment = async (userId, data) => {
  const ref = await userDoc(userId).collection('appointments').add(data);
  return { id: ref.id, ...data };
};

export const updateAppointment = async (userId, apptId, data) => {
  await userDoc(userId).collection('appointments').doc(apptId).update(data);
  return { id: apptId, ...data };
};

export const deleteAppointment = async (userId, apptId) => {
  await userDoc(userId).collection('appointments').doc(apptId).delete();
};

// Reports
export const getMonthlyReport = async (userId, year, month) => {
  const from = `${year}-${String(month).padStart(2,'0')}-01`;
  const to = new Date(year, month, 0).toISOString().split('T')[0];
  const appts = await getAppointments(userId, from, to);
  const total = appts.reduce((s,a)=>s+(a.price||0),0);
  const paid = appts.filter(a=>a.paid).reduce((s,a)=>s+(a.price||0),0);
  return { from, to, count: appts.length, total, paid, pending: total - paid };
};

export const getPeriodReport = async (userId, from, to) => {
  const appts = await getAppointments(userId, from, to);
  const total = appts.reduce((s,a)=>s+(a.price||0),0);
  const paid = appts.filter(a=>a.paid).reduce((s,a)=>s+(a.price||0),0);
  return { from, to, count: appts.length, total, paid, pending: total - paid };
};

// Maintenance due
export const getMaintenanceDue = async (userId) => {
  const today = new Date().toISOString().split('T')[0];
  const appts = await userDoc(userId).collection('appointments').where('service_id', '!=', null).orderBy('service_id').orderBy('date', 'desc').get();
  const groups = {};
  appts.docs.forEach(doc => {
    const data = doc.data();
    const key = data.service_id;
    if (!groups[key]) groups[key] = data.date;
  });
  const results = [];
  for (const svcId in groups) {
    const svcDoc = await userDoc(userId).collection('services').doc(svcId).get();
    if (!svcDoc.exists) continue;
    const svc = svcDoc.data();
    if (!svc.maintenance_interval_days) continue;
    const lastDate = groups[svcId];
    const nextDate = new Date(lastDate);
    nextDate.setDate(nextDate.getDate() + svc.maintenance_interval_days);
    const nextStr = nextDate.toISOString().split('T')[0];
    const overdue = new Date(today) > nextDate ? Math.floor((new Date(today) - nextDate) / (1000*60*60*24)) : 0;
    if (overdue > 0) {
      const clientDoc = await userDoc(userId).collection('clients').doc(data.client_id).get();
      const client = clientDoc.exists ? clientDoc.data() : {};
      results.push({
        client_id: data.client_id, client_name: client.name, service: svc.name,
        last_date: lastDate, next_date: nextStr,
        status:'due', days_overdue: overdue
      });
    }
  }
  return results;
};
