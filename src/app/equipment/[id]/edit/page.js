import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/requireRole";
import { getEquipment } from "@/lib/db/equipment";
import EquipmentForm from "../../EquipmentForm";

export const dynamic = "force-dynamic";

export default async function EditEquipmentPage({ params }) {
  await requireRole("admin");
  const { id } = await params;
  const supabase = await createClient();
  const item = await getEquipment(supabase, id);
  if (!item) notFound();

  return (
    <div className="stack">
      <h1>Edit equipment</h1>
      <div className="card">
        <EquipmentForm initial={item} equipmentId={item.id} />
      </div>
    </div>
  );
}
