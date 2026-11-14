// Backend/server/setup-db.js
// Creates the RCPT database and tables if they are missing, then adds the starting data.
// Safe to run any time: nothing is deleted or overwritten.
//   node setup-db.js            (run from Backend/server; uses DB_* settings in .env)
// Exit code: 0 = ready, 1 = failed (message printed).
import pg from 'pg';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env'), quiet: true });

const cfg = {
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
  connectionTimeoutMillis: 5000
};
const dbName = process.env.DB_NAME || 'space_health';

function explain(err) {
  const code = err && err.code;
  if (code === 'ECONNREFUSED' || code === 'ETIMEDOUT' || /timeout/i.test(err.message)) {
    return `PostgreSQL is not reachable at ${cfg.host}:${cfg.port}. Start the PostgreSQL service (Windows: Services > postgresql-x64-18 > Start).`;
  }
  if (code === '28P01') return `Wrong password for PostgreSQL user "${cfg.user}". Fix DB_PASSWORD in Backend/server/.env.`;
  if (code === '28000') return `PostgreSQL user "${cfg.user}" is not allowed to connect. Check DB_USER in Backend/server/.env.`;
  return err.message;
}

async function main() {
  // 1. Create the database if it does not exist (connect to the default "postgres" database for this).
  const admin = new pg.Client({ ...cfg, database: 'postgres' });
  await admin.connect();
  let created = false;
  try {
    const r = await admin.query('SELECT 1 FROM pg_database WHERE datname = $1', [dbName]);
    if (r.rowCount === 0) {
      await admin.query(`CREATE DATABASE "${dbName.replace(/"/g, '""')}"`);
      created = true;
    }
  } finally {
    await admin.end();
  }

  // 2. Tables + starting data.
  const db = new pg.Client({ ...cfg, database: dbName });
  await db.connect();
  try {
    await db.query(fs.readFileSync(path.join(__dirname, 'database', 'schema.sql'), 'utf8'));
    await db.query(fs.readFileSync(path.join(__dirname, 'database', 'seed.sql'), 'utf8'));
    const c = await db.query(`SELECT
      (SELECT COUNT(*) FROM astronauts)::int AS astronauts,
      (SELECT COUNT(*) FROM protocols)::int AS protocols,
      (SELECT COUNT(*) FROM sensor_readings)::int AS readings,
      (SELECT COUNT(*) FROM alerts WHERE status = 'ACTIVE')::int AS active_alerts`);
    const s = c.rows[0];
    console.log(
      `Database "${dbName}" ready${created ? ' (created now)' : ''}: ` +
        `${s.astronauts} astronaut(s), ${s.protocols} protocols, ${s.readings} readings, ${s.active_alerts} active alert(s).`
    );
  } finally {
    await db.end();
  }
}

main().then(
  () => process.exit(0),
  (err) => {
    console.error('Database setup failed: ' + explain(err));
    process.exit(1);
  }
);
