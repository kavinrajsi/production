import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/requireRole";
import { listEquipment } from "@/lib/db/equipment";
import DeleteButton from "./DeleteButton";

export const dynamic = "force-dynamic";

export default async function AdminEquipmentPage() {
  await requireRole("admin");
  const supabase = await createClient();
  const items = await listEquipment(supabase, { includeInactive: true });

  return (
    <div className="stack">
      <div className="toolbar">
        <h1 style={{ margin: 0 }}>Manage equipment</h1>
        <Link href="/admin/equipment/new" className="btn">
          + Add item
        </Link>
      </div>

      <div className="card">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Category</th>
              <th className="right">Qty</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={5} className="muted">
                  No equipment yet.
                </td>
              </tr>
            ) : null}
            {items.map((it) => (
              <tr key={it.id}>
                <td>
                  <strong>{it.name}</strong>
                  {it.description ? (
                    <div className="muted" style={{ fontSize: 13 }}>
                      {it.description}
                    </div>
                  ) : null}
                </td>
                <td>{it.category || "—"}</td>
                <td className="right">{it.quantity}</td>
                <td>
                  {it.is_active ? (
                    <span className="badge green">Active</span>
                  ) : (
                    <span className="badge gray">Retired</span>
                  )}
                </td>
                <td className="right">
                  <Link href={`/admin/equipment/${it.id}/edit`}>Edit</Link>
                  <span style={{ margin: "0 8px" }}>·</span>
                  <DeleteButton id={it.id} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
