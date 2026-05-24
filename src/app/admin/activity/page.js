import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/requireRole";

export const dynamic = "force-dynamic";

function fmt(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleString();
}

export default async function ActivityPage({ searchParams }) {
  await requireRole("admin");
  const supabase = await createClient();
  const sp = (await searchParams) || {};
  const table = sp.table || "";

  let q = supabase
    .from("activity_logs")
    .select("id, created_at, user_email, action, table_name, record_id, metadata")
    .order("created_at", { ascending: false })
    .limit(200);
  if (table) q = q.eq("table_name", table);

  const { data: logs, error } = await q;

  return (
    <div className="stack">
      <h1>Activity log</h1>
      {error ? <div className="alert error">{error.message}</div> : null}

      <form className="row" method="get">
        <div>
          <label>Filter by table</label>
          <input
            name="table"
            defaultValue={table}
            placeholder="e.g. shoots, production_equipment"
          />
        </div>
        <div style={{ display: "flex", alignItems: "flex-end" }}>
          <button type="submit">Filter</button>
        </div>
      </form>

      <div className="card">
        <table>
          <thead>
            <tr>
              <th>When</th>
              <th>User</th>
              <th>Action</th>
              <th>Table</th>
              <th>Record</th>
            </tr>
          </thead>
          <tbody>
            {(logs ?? []).length === 0 ? (
              <tr>
                <td colSpan={5} className="muted">
                  No activity recorded.
                </td>
              </tr>
            ) : null}
            {(logs ?? []).map((l) => (
              <tr key={l.id}>
                <td>{fmt(l.created_at)}</td>
                <td>{l.user_email || "—"}</td>
                <td>
                  <span className="badge">{l.action}</span>
                </td>
                <td>{l.table_name || "—"}</td>
                <td>{l.record_id || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="muted" style={{ fontSize: 13 }}>
        Showing the 200 most recent entries.
      </p>
    </div>
  );
}
