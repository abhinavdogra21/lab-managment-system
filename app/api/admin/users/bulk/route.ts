import { NextRequest, NextResponse } from "next/server"
import { dbOperations } from "@/lib/database"
import { verifyToken, hasRole } from "@/lib/auth"

export async function POST(req: NextRequest) {
	const user = await verifyToken(req)
	if (!user || !hasRole(user, ["admin"])) return NextResponse.json({ error: "Forbidden" }, { status: 403 })
	try {
		const body = await req.json()
		const department = body?.department ?? null
		const rows: Array<{ name: string; studentId: string }> = Array.isArray(body?.rows) ? body.rows : []
		const normalized = rows.map((r) => ({ name: String(r.name || '').toUpperCase(), studentId: String(r.studentId || '').trim(), department }))
		const result = await dbOperations.bulkCreateStudents(normalized)
		return NextResponse.json({ ...result })
	} catch (e: any) {
		return NextResponse.json({ error: e?.message || 'Invalid payload' }, { status: 400 })
	}
}
