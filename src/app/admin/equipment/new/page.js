import { requireRole } from "@/lib/auth/requireRole";
import EquipmentForm from "../EquipmentForm";

export const dynamic = "force-dynamic";

export default async function NewEquipmentPage() {
  await requireRole("admin");
  return (
    <div className="stack">
      <h1>Add equipment</h1>
      <div className="card">
        <EquipmentForm />
      </div>
    </div>
  );
}
