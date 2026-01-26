import Database from 'better-sqlite3';
import path from 'path';
import { mkdirSync, existsSync } from 'fs';

let db: Database.Database | null = null;

export function getDatabase(): Database.Database {
  if (db) return db;

  // Determine database path from environment variables or default
  let dbPath = process.env.DATABASE_PATH || process.env.DATABASE_URL;

  if (!dbPath) {
    // Default to local development path
    const dbDir = path.join(process.cwd(), 'database');
    if (!existsSync(dbDir)) {
      mkdirSync(dbDir, { recursive: true });
    }
    dbPath = path.join(dbDir, 'central.db');
  } else {
    // Ensure directory exists for custom path
    const dbDir = path.dirname(dbPath);
    if (!existsSync(dbDir)) {
      mkdirSync(dbDir, { recursive: true });
    }
  }

  console.log(`Abriendo base de datos en: ${dbPath}`);
  db = new Database(dbPath);

  // Habilitar foreign keys
  db.pragma('foreign_keys = ON');

  // Inicializar esquema
  initializeSchema(db);

  return db;
}

function initializeSchema(db: Database.Database) {
  // Verificar si la base de datos ya está inicializada
  const tables = db.prepare(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='users'"
  ).get();

  if (tables) {
    return; // Base de datos ya inicializada
  }

  console.log('Inicializando esquema de base de datos...');

  // Tabla de usuarios
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      last_login TEXT,
      is_active INTEGER DEFAULT 1
    )
  `);

  // Tabla de eventos
  db.exec(`
    CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      location TEXT NOT NULL,
      date TEXT NOT NULL,
      background_image_path TEXT,
      is_active INTEGER DEFAULT 1,
      created_at TEXT NOT NULL
    )
  `);

  // Tabla de personas
  db.exec(`
    CREATE TABLE IF NOT EXISTS persons (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ccodper TEXT NOT NULL,
      cnomper TEXT NOT NULL,
      cnrodni TEXT NOT NULL,
      dfecing TEXT NOT NULL,
      cnomofi TEXT NOT NULL,
      ccargo TEXT NOT NULL,
      carea TEXT NOT NULL,
      cdesest TEXT NOT NULL,
      cdeszona TEXT NOT NULL,
      event_id INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      source TEXT DEFAULT 'imported',
      created_by_device TEXT,
      is_inside INTEGER DEFAULT 0,
      FOREIGN KEY (event_id) REFERENCES events (id) ON DELETE CASCADE,
      UNIQUE(cnrodni, event_id)
    )
  `);

  // Tabla de asistencias (ahora permite múltiples registros por persona/evento)
  db.exec(`
    CREATE TABLE IF NOT EXISTS attendances (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_id INTEGER NOT NULL,
      person_id INTEGER NOT NULL,
      type TEXT NOT NULL DEFAULT 'IN', -- 'IN' para entrada, 'OUT' para salida
      check_time TEXT NOT NULL,
      notes TEXT,
      created_at TEXT NOT NULL,
      device_id TEXT NOT NULL,
      synced_at TEXT,
      FOREIGN KEY (event_id) REFERENCES events (id) ON DELETE CASCADE,
      FOREIGN KEY (person_id) REFERENCES persons (id) ON DELETE CASCADE
    )
  `);

  // Tabla de souvenirs
  db.exec(`
    CREATE TABLE IF NOT EXISTS souvenirs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_id INTEGER NOT NULL,
      codigo TEXT NOT NULL,
      nombre TEXT NOT NULL,
      descripcion TEXT,
      cantidad_inicial INTEGER NOT NULL DEFAULT 0,
      cantidad_disponible INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      is_active INTEGER DEFAULT 1,
      FOREIGN KEY (event_id) REFERENCES events (id) ON DELETE CASCADE,
      UNIQUE(event_id, codigo)
    )
  `);

  // Tabla de entregas de souvenirs
  db.exec(`
    CREATE TABLE IF NOT EXISTS souvenir_deliveries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_id INTEGER NOT NULL,
      person_id INTEGER NOT NULL,
      souvenir_id INTEGER NOT NULL,
      delivery_time TEXT NOT NULL,
      signature_path TEXT NOT NULL,
      device_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      synced_at TEXT,
      notes TEXT,
      FOREIGN KEY (event_id) REFERENCES events (id) ON DELETE CASCADE,
      FOREIGN KEY (person_id) REFERENCES persons (id) ON DELETE CASCADE,
      FOREIGN KEY (souvenir_id) REFERENCES souvenirs (id) ON DELETE CASCADE,
      UNIQUE(event_id, person_id, souvenir_id)
    )
  `);

  // Tabla de dispositivos
  db.exec(`
    CREATE TABLE IF NOT EXISTS devices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      device_id TEXT UNIQUE NOT NULL,
      device_name TEXT NOT NULL,
      device_type TEXT DEFAULT 'TC15',
      registered_at TEXT NOT NULL,
      last_sync TEXT,
      is_active INTEGER DEFAULT 1
    )
  `);

  // Tabla de cola de sincronización
  db.exec(`
    CREATE TABLE IF NOT EXISTS sync_queue (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      device_id TEXT NOT NULL,
      operation_type TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id INTEGER NOT NULL,
      payload TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      created_at TEXT NOT NULL,
      processed_at TEXT,
      error_message TEXT
    )
  `);

  // Crear índices
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_persons_dni ON persons(cnrodni);
    CREATE INDEX IF NOT EXISTS idx_persons_event ON persons(event_id);
    CREATE INDEX IF NOT EXISTS idx_persons_name ON persons(cnomper);
    CREATE INDEX IF NOT EXISTS idx_attendances_event ON attendances(event_id);
    CREATE INDEX IF NOT EXISTS idx_attendances_person ON attendances(person_id);
    CREATE INDEX IF NOT EXISTS idx_attendances_device ON attendances(device_id);
    CREATE INDEX IF NOT EXISTS idx_souvenirs_event ON souvenirs(event_id);
    CREATE INDEX IF NOT EXISTS idx_souvenirs_codigo ON souvenirs(codigo);
    CREATE INDEX IF NOT EXISTS idx_souvenir_deliveries_event ON souvenir_deliveries(event_id);
    CREATE INDEX IF NOT EXISTS idx_souvenir_deliveries_person ON souvenir_deliveries(person_id);
    CREATE INDEX IF NOT EXISTS idx_sync_queue_device ON sync_queue(device_id);
    CREATE INDEX IF NOT EXISTS idx_sync_queue_status ON sync_queue(status);
  `);

  // Insertar usuario admin por defecto
  const now = new Date().toISOString();
  db.prepare(`
    INSERT OR IGNORE INTO users (username, password, is_active, last_login)
    VALUES (?, ?, 1, ?)
  `).run('admin', 'admin123', now);

  console.log('Esquema de base de datos inicializado correctamente');
}

export function closeDatabase() {
  if (db) {
    db.close();
    db = null;
  }
}
