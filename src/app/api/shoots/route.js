import { NextResponse } from "next/server";
import { requireEmployee } from "@/lib/auth/currentEmployee";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  createShootWithEquipment,
  getAdminNotifyRecipients,
} from "@/lib/db/shoots";
import { sendEmail } from "@/lib/email/zepto";
import { shootCreatedEmail } from "@/lib/email/templates/shootCreated";

export async function POST(request) {
  const ctx = await requireEmployee();
  const body = await request.json().catch(() => null);
  if (!body?.shoot?.title || !body?.shoot?.shoot_start || !body?.shoot?.shoot_end) {
    return NextResponse.json(
      { error: "title, shoot_start, and shoot_end are required" },
      { status: 400 }
    );
  }
  if (new Date(body.shoot.shoot_end) <= new Date(body.shoot.shoot_start)) {
    return NextResponse.json(
      { error: "shoot_end must be after shoot_start" },
      { status: 400 }
    );
  }

  const admin = createAdminClient();

  const shootPayload = {
    photographer_id: ctx.employee.id,
    title: body.shoot.title,
    client_name: body.shoot.client_name || null,
    location: body.shoot.location || null,
    shoot_start: body.shoot.shoot_start,
    shoot_end: body.shoot.shoot_end,
    notes: body.shoot.notes || null,
    status: "planned",
  };

  let inserted;
  try {
    inserted = await createShootWithEquipment(admin, {
      shoot: shootPayload,
      items: body.items || [],
    });
  } catch (e) {
    const status = e?.code === "AVAILABILITY" ? 409 : 400;
    return NextResponse.json(
      { error: e?.message || "Create failed" },
      { status }
    );
  }

  // Resolve item details for the email body.
  const { data: itemRows } = await admin
    .from("production_shoot_equipment")
    .select("quantity, equipment:equipment_id(name, category)")
    .eq("shoot_id", inserted.id);
  const items = (itemRows ?? []).map((r) => ({
    name: r.equipment?.name,
    category: r.equipment?.category,
    quantity: r.quantity,
  }));

  // Fire-and-forget admin email.
  getAdminNotifyRecipients(admin)
    .then(async (recipients) => {
      if (!recipients.length) return;
      const { subject, html, text } = shootCreatedEmail({
        photographer: ctx.employee,
        shoot: inserted,
        items,
      });
      await sendEmail({
        to: recipients,
        subject,
        html,
        text,
        replyTo: ctx.employee.work_email,
      });
    })
    .catch((e) => console.error("[shoots] email failed", e));

  return NextResponse.json(inserted, { status: 201 });
}
