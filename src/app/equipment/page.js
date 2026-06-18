import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireEmployee } from "@/lib/auth/currentEmployee";
import { listEquipment } from "@/lib/db/equipment";
import DeleteButton from "./DeleteButton";

export const dynamic = "force-dynamic";

export default async function EquipmentPage() {
  const ctx = await requireEmployee();
  const isAdmin = ctx.roles.includes("admin");
  const supabase = await createClient();
  const items = await listEquipment(supabase, { includeInactive: isAdmin });

  const grouped = items.reduce((acc, it) => {
    const k = it.category || "Uncategorized";
    (acc[k] ||= []).push(it);
    return acc;
  }, {});

  return (
    <div className="stack">
      <div className="toolbar">
        <h1 style={{ margin: 0 }}>Equipment catalog</h1>
        {isAdmin ? (
          <Link href="/equipment/new" className="btn">
            + Add item
          </Link>
        ) : null}
      </div>

      {items.length === 0 ? (
        <p className="muted">
          {isAdmin
            ? "No equipment yet."
            : "No equipment yet. Ask an admin to add some."}
        </p>
      ) : null}

      {Object.entries(grouped).map(([cat, list]) => (
        <section key={cat}>
          <h2>{cat}</h2>
          <div className="card">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Description</th>
                  <th>Quantity</th>
                  {isAdmin ? <th>Status</th> : null}
                  {isAdmin ? <th></th> : null}
                </tr>
              </thead>
              <tbody>
                {list.map((it) => (
                  <tr key={it.id}>
                    <td>{it.name}</td>
                    <td className="muted">{it.description || "—"}</td>
                    <td>{it.quantity}</td>
                    {isAdmin ? (
                      <td>
                        {it.is_active ? (
                          <span className="badge green">Active</span>
                        ) : (
                          <span className="badge gray">Retired</span>
                        )}
                      </td>
                    ) : null}
                    {isAdmin ? (
                      <td>
                        <Link href={`/equipment/${it.id}/edit`}>Edit</Link>
                        <span style={{ margin: "0 8px" }}>·</span>
                        <DeleteButton id={it.id} />
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}
    </div>
  );
}
