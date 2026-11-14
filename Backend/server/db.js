
import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

const { Pool } = pg;

const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    // Fail fast instead of hanging the dashboard when PostgreSQL is not running.
    connectionTimeoutMillis: 4000
});

// An idle client error (e.g. PostgreSQL restarted) must not crash the server.
pool.on('error', (err) => console.warn('PostgreSQL pool error:', err.message));

export default pool;
