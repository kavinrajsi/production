export const SHOOT_STATUSES = [
  "planned",
  "in_progress",
  "completed",
  "cancelled",
];

const STATUS_TRANSITIONS = {
  planned: ["in_progress", "cancelled"],
  in_progress: ["completed", "cancelled"],
  completed: [],
  cancelled: [],
};

export function nextStatuses(current) {
  return STATUS_TRANSITIONS[current] ?? [];
}

export function canTransition(from, to) {
  return nextStatuses(from).includes(to);
}

export async function updateShootStatus(supabaseAdmin, id, status) {
  const { data, error } = await supabaseAdmin
    .from("production_shoots")
    .update({ status })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export const SHOOT_PHOTO_KINDS = ["before", "after"];

const PHOTO_KIND_STATUSES = {
  before: ["planned", "in_progress"],
  after: ["in_progress", "completed"],
};

export function canUploadPhotoKind(shootStatus, kind) {
  return (PHOTO_KIND_STATUSES[kind] ?? []).includes(shootStatus);
}

export async function listShootPhotos(supabase, shootId) {
  const { data, error } = await supabase
    .from("production_shoot_photos")
    .select(
      "id, kind, url, uploaded_at, employees:uploaded_by ( first_name, last_name, work_email )"
    )
    .eq("shoot_id", shootId)
    .order("uploaded_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function recordShootPhoto(
  supabaseAdmin,
  { shootId, kind, url, uploadedBy }
) {
  const { data, error } = await supabaseAdmin
    .from("production_shoot_photos")
    .insert({
      shoot_id: shootId,
      kind,
      url,
      uploaded_by: uploadedBy ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function listShoots(supabase, { photographerId } = {}) {
  let q = supabase
    .from("production_shoots")
    .select(
      "id, title, client_name, location, shoot_start, shoot_end, status, photographer_id, employees:photographer_id ( first_name, last_name, work_email )"
    )
    .order("shoot_start", { ascending: false });
  if (photographerId) q = q.eq("photographer_id", photographerId);
  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

export async function getShoot(supabase, id) {
  const { data: shoot, error } = await supabase
    .from("production_shoots")
    .select(
      "*, employees:photographer_id ( first_name, last_name, work_email )"
    )
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!shoot) return null;

  const { data: items, error: itemsErr } = await supabase
    .from("production_shoot_equipment")
    .select(
      "id, quantity, equipment:equipment_id ( id, name, category, description, image_url )"
    )
    .eq("shoot_id", id);
  if (itemsErr) throw itemsErr;

  return { ...shoot, items: items ?? [] };
}

export async function availabilityFor(
  supabase,
  { start, end, excludeShootId = null }
) {
  const { data: all, error } = await supabase
    .from("production_equipment")
    .select("id, name, category, description, quantity, is_active")
    .eq("is_active", true)
    .order("category", { ascending: true, nullsFirst: false })
    .order("name", { ascending: true });
  if (error) throw error;

  const result = [];
  for (const eq of all ?? []) {
    const { data: avail, error: aerr } = await supabase.rpc(
      "equipment_available_qty",
      {
        p_equipment_id: eq.id,
        p_start: start,
        p_end: end,
        p_exclude_shoot_id: excludeShootId,
      }
    );
    if (aerr) throw aerr;
    result.push({
      ...eq,
      available: typeof avail === "number" ? avail : eq.quantity,
    });
  }
  return result;
}

export async function createShootWithEquipment(
  supabaseAdmin,
  { shoot, items }
) {
  const { data: inserted, error: insErr } = await supabaseAdmin
    .from("production_shoots")
    .insert(shoot)
    .select()
    .single();
  if (insErr) throw insErr;

  const validItems = (items ?? []).filter(
    (it) => it.equipment_id && it.quantity > 0
  );

  if (validItems.length > 0) {
    const rows = validItems.map((it) => ({
      shoot_id: inserted.id,
      equipment_id: it.equipment_id,
      quantity: it.quantity,
    }));
    const { error: linkErr } = await supabaseAdmin
      .from("production_shoot_equipment")
      .insert(rows);
    if (linkErr) {
      await supabaseAdmin.from("production_shoots").delete().eq("id", inserted.id);
      throw linkErr;
    }

    for (const it of validItems) {
      const { data: remaining, error: rerr } = await supabaseAdmin.rpc(
        "equipment_available_qty",
        {
          p_equipment_id: it.equipment_id,
          p_start: shoot.shoot_start,
          p_end: shoot.shoot_end,
          p_exclude_shoot_id: null,
        }
      );
      if (rerr) {
        await supabaseAdmin.from("production_shoots").delete().eq("id", inserted.id);
        throw rerr;
      }
      if (typeof remaining === "number" && remaining < 0) {
        await supabaseAdmin.from("production_shoots").delete().eq("id", inserted.id);
        const { data: eq } = await supabaseAdmin
          .from("production_equipment")
          .select("name")
          .eq("id", it.equipment_id)
          .maybeSingle();
        const err = new Error(
          `Not enough availability for "${eq?.name ?? "item"}" in that date range.`
        );
        err.code = "AVAILABILITY";
        throw err;
      }
    }
  }

  return inserted;
}

export async function getAdminNotifyRecipients(supabaseAdmin) {
  const { data, error } = await supabaseAdmin
    .from("employees")
    .select("work_email, first_name, last_name, employee_roles!inner(roles!inner(name))")
    .eq("employee_roles.roles.name", "admin")
    .eq("employee_status", "active");
  if (error) {
    console.error("[shoots] fetch admins failed", error);
  }
  const fromDb = (data ?? [])
    .map((e) => ({
      address: e.work_email,
      name: [e.first_name, e.last_name].filter(Boolean).join(" "),
    }))
    .filter((r) => r.address);

  const envList = (process.env.ADMIN_NOTIFY_EMAILS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((address) => ({ address }));

  const seen = new Set();
  return [...fromDb, ...envList].filter((r) => {
    const k = r.address.toLowerCase();
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}
