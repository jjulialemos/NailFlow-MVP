import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';

const db = new Database('./nailflow.db');

// Tabelas
db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS clients (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  phone TEXT,
  notes TEXT,
  pref_days TEXT, -- JSON (["mon","tue",...])
  pref_start TEXT, -- "09:00"
  pref_end TEXT,   -- "17:00"
  -- default_service_id será adicionado via migração abaixo
  FOREIGN KEY(user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS availability (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  dow TEXT NOT NULL,    -- mon..sun
  start TEXT NOT NULL,  -- "09:00"
  end TEXT NOT NULL,    -- "17:00"
  FOREIGN KEY(user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS blocked_slots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  date TEXT NOT NULL, -- "YYYY-MM-DD"
  start TEXT NOT NULL,
  end TEXT NOT NULL,
  reason TEXT,
  FOREIGN KEY(user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS appointments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  client_id INTEGER NOT NULL,
  date TEXT NOT NULL,
  start TEXT NOT NULL,
  end TEXT NOT NULL,
  service TEXT,
  price REAL DEFAULT 0,
  paid INTEGER DEFAULT 0,
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  -- service_id será adicionado via migração abaixo
  FOREIGN KEY(user_id) REFERENCES users(id),
  FOREIGN KEY(client_id) REFERENCES clients(id)
);

CREATE TABLE IF NOT EXISTS services (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  kind TEXT DEFAULT 'outro', -- 'novo' | 'manutencao' | 'gel' | 'outro'
  price REAL NOT NULL DEFAULT 0,
  duration_minutes INTEGER NOT NULL DEFAULT 60,
  maintenance_interval_days INTEGER, -- ex.: 21 (opcional)
  FOREIGN KEY(user_id) REFERENCES users(id)
);
`);

// Migrações leves
const apptCols = db.prepare(`PRAGMA table_info(appointments)`).all().map(c => c.name);
if (!apptCols.includes('service_id')) {
  db.exec(`ALTER TABLE appointments ADD COLUMN service_id INTEGER REFERENCES services(id)`);
}
const clientCols = db.prepare(`PRAGMA table_info(clients)`).all().map(c => c.name);
if (!clientCols.includes('default_service_id')) {
  db.exec(`ALTER TABLE clients ADD COLUMN default_service_id INTEGER REFERENCES services(id)`);
}

// Usuária demo + serviços exemplo
const count = db.prepare('SELECT COUNT(*) as c FROM users').get().c;
if (count === 0) {
  const hash = bcrypt.hashSync('123456', 10);
  db.prepare('INSERT INTO users (email, password_hash, name) VALUES (?, ?, ?)')
    .run('demo@nailflow.app', hash, 'Demo NailFlow');

  const seed = db.prepare(`INSERT INTO services (user_id,name,kind,price,duration_minutes,maintenance_interval_days)
                           VALUES (?,?,?,?,?,?)`);
  seed.run(1,'Gel - Novo','novo',120,120,null);
  seed.run(1,'Gel - Manutenção','manutencao',90,90,21);
  seed.run(1,'Fibra - Novo','novo',150,150,null);
  seed.run(1,'Fibra - Manutenção','manutencao',120,120,28);
}

export default db;