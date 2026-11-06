// Health endpoint. UptimeRobot points here: it monitors the monitor
// and keeps the Supabase project awake. 503 when the DB is down or
// unconfigured, so the monitor reports the outage honestly.
import { NextResponse } from "next/server";
import { isConfigured, serviceClient } from "@/lib/db.js";

export async function GET() {
  if (!isConfigured()) {
    return NextResponse.json({ status: "degraded", db: "unconfigured" }, { status: 503 });
  }
  try {
    const db = serviceClient();
    const { data, error } = await db.from("meta").select("last_check_at").eq("id", 1).single();
    if (error) throw error;
    return NextResponse.json({ status: "ok", db: "connected", last_check_at: data?.last_check_at ?? null });
  } catch {
    return NextResponse.json({ status: "degraded", db: "error" }, { status: 503 });
  }
}
