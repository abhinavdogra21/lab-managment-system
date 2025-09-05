import { NextRequest, NextResponse } from "next/server"
import { dbOperations } from "@/lib/database"
import { verifyToken, hasRole } from "@/lib/auth"

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
	const user = await verifyToken(req)
	if (!user || !hasRole(user, ["admin"])) return NextResponse.json({ error: "Forbidden" }, { status: 403 })
	const { id: idStr } = await ctx.params
	const id = Number.parseInt(idStr, 10)
	const before = await dbOperations.getUserById(id)
	const row = await dbOperations.deleteUserSoft(id)
	try {
		const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown"
		await dbOperations.createLog({
			userId: user.userId,
			action: "DELETE_USER",
			entityType: "user",
			entityId: id,
			details: { snapshot: before || null },
			ipAddress: ip,
			userAgent: req.headers.get("user-agent") || "unknown",
		})
	} catch {}
	return NextResponse.json({ user: row })
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
	const user = await verifyToken(req)
	if (!user || !hasRole(user, ["admin"])) return NextResponse.json({ error: "Forbidden" }, { status: 403 })
	const { id: idStr } = await ctx.params
	const id = Number.parseInt(idStr, 10)
	const history = await dbOperations.getUserHistory(id)
	return NextResponse.json(history)
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
	const user = await verifyToken(req)
	if (!user || !hasRole(user, ["admin"])) return NextResponse.json({ error: "Forbidden" }, { status: 403 })
	const { id: idStr } = await ctx.params
	const id = Number.parseInt(idStr, 10)
	const body = await req.json()
	// Policy: Admin cannot update any user to role 'admin'
	if (body?.role && String(body.role) === 'admin') {
		return NextResponse.json({ error: "Updating a user to role Admin is not allowed" }, { status: 400 })
	}
	const updated = await dbOperations.updateUser(id, {
		department: body?.department ?? undefined,
		role: body?.role ?? undefined,
		name: body?.name ?? undefined,
		email: body?.email ?? undefined,
		salutation: body?.salutation ?? undefined,
	})
	return NextResponse.json({ user: updated })
}
