import { NextRequest, NextResponse } from "next/server"
import { dbOperations } from "@/lib/database"
import { verifyToken, hasRole } from "@/lib/auth"

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
	const user = await verifyToken(req)
	if (!user || !hasRole(user, ["admin"])) return NextResponse.json({ error: "Forbidden" }, { status: 403 })
	const { id: idStr } = await ctx.params
	const id = Number.parseInt(idStr, 10)
	if (!Number.isFinite(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 })
	try {
		const { deleted, archiveId } = await dbOperations.hardDeleteUserWithArchive(id)
		const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown"
		await dbOperations.createLog({
			userId: user.userId,
			action: "HARD_DELETE_USER",
			entityType: "user",
			entityId: id,
			details: { archiveId },
			ipAddress: ip,
			userAgent: req.headers.get("user-agent") || "unknown",
		})
		return NextResponse.json({ deleted, archiveId })
	} catch (e: any) {
		return NextResponse.json({ error: e?.message || "Failed" }, { status: 400 })
	}
}
