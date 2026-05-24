import { createClient } from "@/lib/supabase/server";
import { requireEmployee } from "@/lib/auth/currentEmployee";
import { listEquipment } from "@/lib/db/equipment";
import NewShootForm from "./NewShootForm";

export const dynamic = "force-dynamic";

export default async function NewShootPage() {
  const ctx = await requireEmployee();
  const supabase = await createClient();
  const equipment = await listEquipment(supabase);

  return (
    <div className="stack">
      <h1>Book a new shoot</h1>
      <NewShootForm
        employee={{
          id: ctx.employee.id,
          name: [ctx.employee.first_name, ctx.employee.last_name]
            .filter(Boolean)
            .join(" "),
        }}
        equipment={equipment}
      />
    </div>
  );
}
