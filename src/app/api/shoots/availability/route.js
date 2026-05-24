import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireEmployee } from "@/lib/auth/currentEmployee";
import { availabilityFor } from "@/lib/db/shoots";

export async function GET(request) {
  await requireEmployee();
  const { searchParams } = new URL(request.url);
  const start = searchParams.get("start");
  const end = searchParams.get("end");
  const excludeShootId = searchParams.get("excludeShootId");
  if (!start || !end) {
    return NextResponse.json(
      { error: "start and end are required" },
      { status: 400 }
    );
  }
  const supabase = await createClient();
  try {
    const items = await availabilityFor(supabase, {
      start,
      end,
      excludeShootId: excludeShootId ? Number(excludeShootId) : null,
    });
    return NextResponse.json({ items });
  } catch (e) {
    return NextResponse.json(
      { error: e?.message || "Lookup failed" },
      { status: 400 }
    );
  }
}
