import { NextRequest, NextResponse } from "next/server"
import { verifyToken, hasRole } from "@/lib/auth"
import { db } from "@/lib/database"

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await verifyToken(req)
    if (!user || !hasRole(user, ["lab_staff", "admin"])) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const requestId = Number(params.id)
    if (!requestId) {
      return NextResponse.json({ error: "Invalid request ID" }, { status: 400 })
    }

    // Verify request is approved and not yet issued
    const check = await db.query(
      `SELECT r.id, r.status, r.issued_at, r.lab_id
       FROM component_requests r
       WHERE r.id = ?`,
      [requestId]
    )

    if (check.rows.length === 0) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 })
    }

    const request = check.rows[0]

    // Verify lab staff is assigned to this lab
    const labCheck = await db.query(
      `SELECT lab_id FROM lab_staff_assignments WHERE staff_id = ? AND lab_id = ?`,
      [user.userId, request.lab_id]
    )

    if (labCheck.rows.length === 0) {
      return NextResponse.json({ error: "You are not assigned to this lab" }, { status: 403 })
    }

    if (request.status !== 'approved') {
      return NextResponse.json({ error: "Request must be approved before issuing" }, { status: 400 })
    }

    if (request.issued_at) {
      return NextResponse.json({ error: "Components already issued" }, { status: 400 })
    }

    // Get all items in this request
    const items = await db.query(
      `SELECT component_id, quantity_requested FROM component_request_items WHERE request_id = ?`,
      [requestId]
    )

    console.log(`Issue request #${requestId}: Found ${items.rows.length} items to issue`)
    for (const item of items.rows) {
      console.log(`  - Component ${item.component_id}: issuing ${item.quantity_requested} units`)
    }

    // Mark as issued and decrease component quantities in a transaction
    await db.transaction(async (client) => {
      // Mark as issued
      await client.query(
        `UPDATE component_requests SET issued_at = NOW() WHERE id = ?`,
        [requestId]
      )

      // Decrease quantities for each component
      for (const item of items.rows) {
        const result = await client.query(
          `UPDATE components 
           SET quantity_available = quantity_available - ? 
           WHERE id = ? AND quantity_available >= ?`,
          [item.quantity_requested, item.component_id, item.quantity_requested]
        )
        console.log(`  - Updated component ${item.component_id}: affected ${result.affectedRows} rows`)
        
        if (result.affectedRows === 0) {
          throw new Error(`Insufficient quantity for component ${item.component_id}`)
        }
      }
    })

    console.log(`Issue request #${requestId}: Transaction completed successfully`)

    return NextResponse.json({ 
      message: "Components marked as issued to student and quantities updated" 
    })

  } catch (e) {
    console.error("lab-staff component-requests issue error:", e)
    return NextResponse.json({ error: "Failed to issue components" }, { status: 500 })
  }
}
