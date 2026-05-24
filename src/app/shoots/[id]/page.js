import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireEmployee } from "@/lib/auth/currentEmployee";
import { getShoot, nextStatuses } from "@/lib/db/shoots";
import StatusEditor from "./StatusEditor";

function statusClass(s) {
  if (s === "completed") return "green";
  if (s === "cancelled") return "red";
  if (s === "in_progress") return "amber";
  return "";
}

export const dynamic = "force-dynamic";

function fmt(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default async function ShootDetailPage({ params }) {
  const ctx = await requireEmployee();
  const { id } = await params;
  const supabase = await createClient();
  const shoot = await getShoot(supabase, id);
  if (!shoot) notFound();

  const photographerName =
    [shoot.employees?.first_name, shoot.employees?.last_name]
      .filter(Boolean)
      .join(" ") || shoot.employees?.work_email;

  const isAdmin = ctx.roles.includes("admin");
  const isOwner = shoot.photographer_id === ctx.employee.id;
  const canEditStatus = isAdmin || isOwner;
  const nextOptions = nextStatuses(shoot.status);

  return (
    <div className="stack">
      <div className="toolbar">
        <h1 style={{ margin: 0 }}>{shoot.title}</h1>
        <Link href={`/shoots/${shoot.id}/photos`} className="btn secondary">
          Photos
        </Link>
        <Link href="/shoots" className="btn secondary">
          Back to list
        </Link>
      </div>

      <div className="card stack">
        <div className="row">
          <div>
            <div className="muted">Photographer</div>
            <strong>{photographerName}</strong>
          </div>
          <div>
            <div className="muted">Status</div>
            <span className={`badge ${statusClass(shoot.status)}`}>
              {shoot.status}
            </span>
            {canEditStatus ? (
              <StatusEditor shootId={shoot.id} options={nextOptions} />
            ) : null}
          </div>
          <div>
            <div className="muted">Client</div>
            <strong>{shoot.client_name || "—"}</strong>
          </div>
          <div>
            <div className="muted">Location</div>
            <strong>{shoot.location || "—"}</strong>
          </div>
        </div>
        <div className="row">
          <div>
            <div className="muted">Start</div>
            <strong>{fmt(shoot.shoot_start)}</strong>
          </div>
          <div>
            <div className="muted">End</div>
            <strong>{fmt(shoot.shoot_end)}</strong>
          </div>
        </div>
        {shoot.notes ? (
          <div>
            <div className="muted">Notes</div>
            <div style={{ whiteSpace: "pre-wrap" }}>{shoot.notes}</div>
          </div>
        ) : null}
      </div>

      <h2>Equipment</h2>
      <div className="card">
        {shoot.items.length === 0 ? (
          <p className="muted">No equipment selected.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Item</th>
                <th>Category</th>
                <th className="right">Qty</th>
              </tr>
            </thead>
            <tbody>
              {shoot.items.map((row) => (
                <tr key={row.id}>
                  <td>
                    <strong>{row.equipment?.name}</strong>
                    {row.equipment?.description ? (
                      <div className="muted" style={{ fontSize: 13 }}>
                        {row.equipment.description}
                      </div>
                    ) : null}
                  </td>
                  <td>{row.equipment?.category || "—"}</td>
                  <td className="right">{row.quantity}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
