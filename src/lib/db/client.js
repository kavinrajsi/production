import { neon, Pool } from "@neondatabase/serverless";

// HTTP driver for one-shot queries. Usage: await sql`select ...`
// or await sql.query("select ... $1", [x]) for dynamic statements.
export const sql = neon(process.env.DATABASE_URL);

// Interactive transaction over a WebSocket connection. `fn` receives a
// pg-compatible client: await client.query(text, params). Any throw rolls
// the whole transaction back.
export async function withTransaction(fn) {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();
  try {
    await client.query("begin");
    const result = await fn(client);
    await client.query("commit");
    return result;
  } catch (err) {
    try {
      await client.query("rollback");
    } catch {
      // connection already dead — nothing to roll back
    }
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}
