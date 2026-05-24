import { createClient } from "@/lib/supabase/server";
import { requireEmployee } from "@/lib/auth/currentEmployee";
import { listEquipment } from "@/lib/db/equipment";

export const dynamic = "force-dynamic";

export default async function EquipmentPage() {
  await requireEmployee();
  const supabase = await createClient();
  const items = await listEquipment(supabase);

  const grouped = items.reduce((acc, it) => {
    const k = it.category || "Uncategorized";
    (acc[k] ||= []).push(it);
    return acc;
  }, {});

  return (
    <div className="stack">
      <h1>Equipment catalog</h1>
      {items.length === 0 ? (
        <p className="muted">No equipment yet. Ask an admin to add some.</p>
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
                  <th className="right">Quantity</th>
                </tr>
              </thead>
              <tbody>
                {list.map((it) => (
                  <tr key={it.id}>
                    <td>{it.name}</td>
                    <td className="muted">{it.description || "—"}</td>
                    <td className="right">{it.quantity}</td>
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
