import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireEmployee } from "@/lib/auth/currentEmployee";
import { listShoots } from "@/lib/db/shoots";

export const dynamic = "force-dynamic";

function fmt(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default async function ShootsPage() {
  const ctx = await requireEmployee();
  const isAdmin = ctx.roles.includes("admin");
  const supabase = await createClient();
  const shoots = await listShoots(supabase, {
    photographerId: isAdmin ? undefined : ctx.employee.id,
  });

  return (
    <div className="stack">
      <div className="toolbar">
        <h1 style={{ margin: 0 }}>{isAdmin ? "All shoots" : "My shoots"}</h1>
        <Link href="/shoots/new" className="btn">
          + New shoot
        </Link>
      </div>

      <div className="card">
        <table>
          <thead>
            <tr>
              <th>Title</th>
              <th>Client</th>
              <th>Start</th>
              <th>End</th>
              {isAdmin ? <th>Photographer</th> : null}
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {shoots.length === 0 ? (
              <tr>
                <td colSpan={isAdmin ? 6 : 5} className="muted">
                  No shoots yet.
                </td>
              </tr>
            ) : null}
            {shoots.map((s) => (
              <tr key={s.id}>
                <td>
                  <Link href={`/shoots/${s.id}`}>{s.title}</Link>
                  {s.location ? (
                    <div className="muted" style={{ fontSize: 13 }}>
                      {s.location}
                    </div>
                  ) : null}
                </td>
                <td>{s.client_name || "—"}</td>
                <td>{fmt(s.shoot_start)}</td>
                <td>{fmt(s.shoot_end)}</td>
                {isAdmin ? (
                  <td>
                    {[s.employees?.first_name, s.employees?.last_name]
                      .filter(Boolean)
                      .join(" ") || s.employees?.work_email}
                  </td>
                ) : null}
                <td>
                  <span
                    className={`badge ${
                      s.status === "completed"
                        ? "green"
                        : s.status === "cancelled"
                          ? "red"
                          : s.status === "in_progress"
                            ? "amber"
                            : ""
                    }`}
                  >
                    {s.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
