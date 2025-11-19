/**
 * Created by Abhinav Dogra (23ucs507) and Abhinav Thulal (23ucs508)
 */

import { NextRequest, NextResponse } from "next/server"
import { dbOperations } from "@/lib/database"
import { verifyToken, hasRole } from "@/lib/auth"
import { sendWelcomeEmail } from "@/lib/email"
import crypto from "crypto"

export async function POST(req: NextRequest) {
	const user = await verifyToken(req)
	if (!user || !hasRole(user, ["admin"])) return NextResponse.json({ error: "Forbidden" }, { status: 403 })
	try {
		const body = await req.json()
		const department = body?.department ?? null
		const rows: Array<{ name: string; studentId: string }> = Array.isArray(body?.rows) ? body.rows : []
		const normalized = rows.map((r) => ({ name: String(r.name || '').toUpperCase(), studentId: String(r.studentId || '').trim(), department }))
		const result = await dbOperations.bulkCreateStudents(normalized)
		
		// Send welcome emails to newly created students
		if (result.users && Array.isArray(result.users)) {
			const hostHeader = (req.headers as any).get?.("x-forwarded-host") || (req.headers as any).get?.("host") || undefined
			const proto = (req.headers as any).get?.("x-forwarded-proto") || "http"
			const baseUrl = hostHeader ? `${proto}://${hostHeader}` : undefined
			
			for (const student of result.users) {
				try {
					const token = crypto.randomBytes(32).toString("hex")
					const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString()
					await dbOperations.upsertPasswordReset(student.id, token, expiresAt)
					
					await sendWelcomeEmail(
						student.email,
						student.name,
						student.salutation || 'none',
						student.role,
						token,
						baseUrl
					)
				} catch (emailError) {
					console.error(`Failed to send welcome email to ${student.email}:`, emailError)
					// Continue with other emails even if one fails
				}
			}
		}
		
		return NextResponse.json({ ...result })
	} catch (e: any) {
		return NextResponse.json({ error: e?.message || 'Invalid payload' }, { status: 400 })
	}
}
