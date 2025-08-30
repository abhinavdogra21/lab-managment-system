import { NextResponse } from "next/server"
import { db } from "@/lib/database"

export async function GET() {
  try {
    const res = await db.query("SELECT 1 AS ok")
    return NextResponse.json({ ok: true, rows: res.rows })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || String(e) }, { status: 500 })
  }
}
