import { NextRequest, NextResponse } from "next/server"
import { Database } from "@/lib/database"
import { verifyToken, hasRole } from "@/lib/auth"
import { sendMail } from "@/lib/email"

const db = Database.getInstance()

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await verifyToken(req)
    if (!user || !hasRole(user, ["lab_staff", "admin"])) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const requestId = Number(id)
    if (!requestId) {
      return NextResponse.json({ error: "Invalid request ID" }, { status: 400 })
    }

    // Get remarks from request body (optional)
    const body = await req.json().catch(() => ({}))
    const remarks = body.remarks || ''

    // Get request details with loan information
    const result = await db.query(
      `SELECT 
        cr.id as request_id,
        cr.requester_id,
        cr.initiator_role,
        cr.return_date,
        cr.issued_at,
        u.name as requester_name,
        u.email as requester_email,
        u.salutation as requester_salutation,
        l.name as lab_name,
        GROUP_CONCAT(CONCAT(c.name, ' (', c.model, ')') SEPARATOR ', ') as component_list
      FROM component_requests cr
      JOIN users u ON u.id = cr.requester_id
      JOIN labs l ON l.id = cr.lab_id
      LEFT JOIN component_request_items cri ON cri.request_id = cr.id
      LEFT JOIN components c ON c.id = cri.component_id
      WHERE cr.id = ? AND cr.issued_at IS NOT NULL AND cr.returned_at IS NULL
      GROUP BY cr.id`,
      [requestId]
    )

    if (!result.rows || result.rows.length === 0) {
      return NextResponse.json({ error: "Request not found or not yet issued" }, { status: 404 })
    }

    const requestData = result.rows[0]
    
    // Check if overdue
    const dueDate = requestData.return_date ? new Date(requestData.return_date) : null
    const today = new Date()
    let overdueInfo = ''
    
    if (dueDate) {
      const diffTime = today.getTime() - dueDate.getTime()
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
      
      if (diffDays > 0) {
        overdueInfo = `<p style="color: #dc2626; font-weight: bold; margin-top: 12px;">⚠️ This item is ${diffDays} day(s) overdue!</p>`
      }
    }

    // Format salutation
    let salutation = 'Dear'
    if (requestData.requester_salutation && requestData.requester_salutation !== 'none') {
      const salutationMap: Record<string, string> = {
        'prof': 'Prof.',
        'dr': 'Dr.',
        'mr': 'Mr.',
        'mrs': 'Mrs.'
      }
      salutation = `Dear ${salutationMap[requestData.requester_salutation] || ''}`
    }

    // Send reminder email
    const emailSubject = `Reminder: Please Return Lab Components - LNMIIT Lab Management`
    const emailBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #034da2; padding: 20px; text-align: center;">
          <h1 style="color: white; margin: 0;">LNMIIT Lab Management System</h1>
        </div>
        
        <div style="padding: 20px; background-color: #f9fafb;">
          <p><b>${salutation} ${requestData.requester_name}</b>,</p>
          
          <p>This is a friendly reminder that you have lab components that need to be returned.</p>
          
          <div style="background-color: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin: 16px 0;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #6b7280;"><strong>Lab:</strong></td>
                <td style="padding: 8px 0;">${requestData.lab_name}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280;"><strong>Components:</strong></td>
                <td style="padding: 8px 0;">${requestData.component_list || 'Various components'}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280;"><strong>Due Date:</strong></td>
                <td style="padding: 8px 0;">${dueDate ? dueDate.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : 'Not specified'}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280;"><strong>Issued On:</strong></td>
                <td style="padding: 8px 0;">${new Date(requestData.issued_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</td>
              </tr>
            </table>
            ${overdueInfo}
          </div>
          
          ${remarks ? `
          <div style="background-color: #fef3c7; border: 1px solid #fbbf24; border-radius: 8px; padding: 16px; margin: 16px 0;">
            <p style="margin: 0 0 8px 0; font-weight: bold; color: #92400e;">📝 Note from Lab Staff:</p>
            <p style="margin: 0; color: #78350f; white-space: pre-wrap;">${remarks}</p>
          </div>
          ` : ''}
          
          <p style="margin-top: 16px;">Please return the components at your earliest convenience to avoid any inconvenience.</p>
          
          <p>If you have already returned these components, please disregard this message.</p>
          
          <p style="margin-top: 24px;">Thank you for using the Lab Management System.</p>
          
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
          
          <p style="color: #6b7280; font-size: 12px; text-align: center;">
            <strong>Best regards,</strong><br />
            Lab Management Team<br />
            The LNM Institute of Information Technology
          </p>
        </div>
      </div>
    `

    await sendMail({
      to: requestData.requester_email,
      subject: emailSubject,
      html: emailBody
    })

    return NextResponse.json({ 
      success: true,
      message: `Return reminder sent to ${requestData.requester_name} successfully!`
    })

  } catch (error: any) {
    console.error("Send reminder error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to send reminder" },
      { status: 500 }
    )
  }
}
