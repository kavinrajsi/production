export async function listEquipment(supabase, { includeInactive = false } = {}) {
  let q = supabase
    .from("production_equipment")
    .select("id, name, description, category, quantity, image_url, is_active, created_at")
    .order("category", { ascending: true, nullsFirst: false })
    .order("name", { ascending: true });
  if (!includeInactive) q = q.eq("is_active", true);
  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

export async function getEquipment(supabase, id) {
  const { data, error } = await supabase
    .from("production_equipment")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function createEquipment(supabase, payload, createdBy) {
  const { data, error } = await supabase
    .from("production_equipment")
    .insert({
      name: payload.name,
      description: payload.description || null,
      category: payload.category || null,
      quantity: payload.quantity ?? 1,
      image_url: payload.image_url || null,
      is_active: payload.is_active ?? true,
      created_by: createdBy ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateEquipment(supabase, id, payload) {
  const update = {};
  for (const k of [
    "name",
    "description",
    "category",
    "quantity",
    "image_url",
    "is_active",
  ]) {
    if (k in payload) update[k] = payload[k];
  }
  const { data, error } = await supabase
    .from("production_equipment")
    .update(update)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteEquipment(supabase, id) {
  const { error } = await supabase
    .from("production_equipment")
    .delete()
    .eq("id", id);
  if (error) throw error;
}
