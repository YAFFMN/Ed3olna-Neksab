// Probe the RCPT Postgres schema. Run with cwd = Backend/server so dotenv finds .env.
const { default: pool } = await import('file:///C:/Users/Yassine/Desktop/Ed3olna%20Neksab/Backend/server/db.js');
try {
  const c = await pool.query(
    "select table_name, column_name, data_type, column_default from information_schema.columns where table_schema='public' order by table_name, ordinal_position"
  );
  const g = {};
  for (const r of c.rows) (g[r.table_name] ||= []).push(`${r.column_name}:${r.data_type}${r.column_default ? ' =' + r.column_default : ''}`);
  console.log(JSON.stringify(g, null, 1));
  const k = await pool.query("select conrelid::regclass::text as t, pg_get_constraintdef(oid) as d from pg_constraint where contype in ('c')");
  console.log('CHECKS', JSON.stringify(k.rows));
  const a = await pool.query('select * from astronauts order by id limit 8');
  console.log('ASTRO', JSON.stringify(a.rows));
  const p = await pool.query('select id, condition_code, title, severity from protocols');
  console.log('PROTO', JSON.stringify(p.rows));
  const n = await pool.query('select count(*)::int as n, max(recorded_at) as last from sensor_readings');
  console.log('READINGS', JSON.stringify(n.rows[0]));
  const al = await pool.query("select count(*)::int as n from alerts where status='ACTIVE'");
  console.log('ACTIVE_ALERTS', al.rows[0].n);
} catch (e) {
  console.log('DBERR', e.code || '', e.message);
} finally {
  await pool.end();
}
