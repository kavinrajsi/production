import { sql } from "./client";

export async function listActivityLogs({ table = "", limit = 200 } = {}) {
  return await sql`
    select id, created_at, user_email, action, table_name, record_id, metadata
    from activity_logs
    where ${table === ""} or table_name = ${table}
    order by created_at desc
    limit ${limit}
  `;
}
