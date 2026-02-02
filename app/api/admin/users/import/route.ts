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
	if (!user || !hasRole(user, ["admin"])) {
		return NextResponse.json({ error: "Forbidden" }, { status: 403 })
	}
	
	try {
		const body = await req.json()
		const rows = Array.isArray(body?.rows) ? body.rows : []
		
		if (rows.length === 0) {
			return NextResponse.json({ error: "No users to import" }, { status: 400 })
		}
		
		const results = {
			created: [] as any[],
			updated: [] as any[],
			skipped: [] as any[],
			errors: [] as any[]
		}
		
		// Get all departments for validation
		const depts = await dbOperations.listDepartments()
		const deptMap = new Map(depts.map(d => [d.code.toLowerCase(), d]))
		
		for (const row of rows) {
			try {
				const email = String(row.email || '').trim().toLowerCase()
				const firstName = String(row.firstname || row.firstName || '').trim()
				const middleName = String(row.middlename || row.middleName || '').trim()
				const lastName = String(row.lastname || row.lastName || '').trim()
				const name = [firstName, middleName, lastName].filter(Boolean).join(' ')
				const role = String(row.role || '').trim().toLowerCase()
				const departmentCode = String(row.department || '').trim().toUpperCase()
				const salutation = String(row.salutation || 'none').trim().toLowerCase()
				
				// Validation
				if (!email || !firstName || !role) {
					results.errors.push({
						row: row,
						reason: "Missing required fields (firstName, email, role)"
					})
					continue
				}
				
				if (!email.endsWith('@lnmiit.ac.in')) {
					results.errors.push({
						row: row,
						reason: "Email must end with @lnmiit.ac.in"
					})
					continue
				}
				
				if (!['student', 'faculty', 'lab_staff', 'hod', 'others'].includes(role)) {
					results.errors.push({
						row: row,
						reason: `Invalid role: ${role}. Must be one of: student, faculty, lab_staff, hod, others`
					})
					continue
				}
				
				if (!['prof', 'dr', 'mr', 'mrs', 'none'].includes(salutation)) {
					results.errors.push({
						row: row,
						reason: `Invalid salutation: ${salutation}. Must be one of: prof, dr, mr, mrs, none`
					})
					continue
				}
				
				// Validate department if provided
				let departmentToUse = null
				if (departmentCode) {
					const dept = deptMap.get(departmentCode.toLowerCase())
					if (!dept) {
						results.errors.push({
							row: row,
							reason: `Department '${departmentCode}' does not exist. Available departments: ${Array.from(deptMap.keys()).map(k => k.toUpperCase()).join(', ')}`
						})
						continue
					}
					departmentToUse = dept.code
				}
				
				// Check if user exists
				const existingUser = await dbOperations.getUserByEmail(email)
				
				if (existingUser) {
					// Update existing user
					try {
						await dbOperations.updateUser(existingUser.id, {
							name: name,
							role: role,
							department: departmentToUse,
							salutation: salutation as any
						})
						results.updated.push({
							email: email,
							name: name,
							role: role,
							department: departmentToUse
						})
					} catch (updateError: any) {
						results.errors.push({
							row: row,
							reason: `Failed to update: ${updateError.message}`
						})
					}
				} else {
					// Create new user
					try {
						const created = await dbOperations.createUser({
							email: email,
							passwordHash: null,
							name: name,
							role: role,
							department: departmentToUse,
							phone: null,
							studentId: null,
							employeeId: null,
							salutation: salutation as any
						})
						
						// Generate password reset token and send welcome email
						try {
							const token = crypto.randomBytes(32).toString("hex")
							const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString()
							await dbOperations.upsertPasswordReset(created.id, token, expiresAt)
							
							const hostHeader = (req.headers as any).get?.("x-forwarded-host") || (req.headers as any).get?.("host") || undefined
							const proto = (req.headers as any).get?.("x-forwarded-proto") || "http"
							const baseUrl = hostHeader ? `${proto}://${hostHeader}` : undefined
							
							await sendWelcomeEmail(
								created.email,
								created.name,
								created.salutation || 'none',
								created.role,
								token,
								baseUrl
							)
						} catch (emailError) {
							console.error("Failed to send welcome email:", emailError)
						}
						
						results.created.push({
							email: email,
							name: name,
							role: role,
							department: departmentToUse
						})
					} catch (createError: any) {
						if (createError.code === "ER_DUP_ENTRY") {
							results.skipped.push({
								email: email,
								reason: "Email already exists"
							})
						} else {
							results.errors.push({
								row: row,
								reason: `Failed to create: ${createError.message}`
							})
						}
					}
				}
			} catch (error: any) {
				results.errors.push({
					row: row,
					reason: error.message || "Unknown error"
				})
			}
		}
		
		return NextResponse.json({
			success: true,
			summary: {
				total: rows.length,
				created: results.created.length,
				updated: results.updated.length,
				skipped: results.skipped.length,
				errors: results.errors.length
			},
			details: results
		})
	} catch (e: any) {
		console.error("Import users error:", e)
		return NextResponse.json({ 
			error: e?.message || 'Import failed',
			details: e?.stack 
		}, { status: 500 })
	}
}
