import nodemailer from 'nodemailer'

const isTestingMode = process.env.TESTING_MODE === 'true'
const adminEmail = process.env.ADMIN_EMAIL || 'abhinavdogra1974@gmail.com'

// Create transporter using Gmail
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER || 'abhinavdogra1974@gmail.com',
    pass: process.env.GMAIL_APP_PASSWORD || 'lxookupcqyuwwqis'
  }
})

interface EmailOptions {
  to: string | string[]
  subject: string
  html: string
  text?: string
}

export async function sendEmail(options: EmailOptions) {
  try {
    // In testing mode, send all emails to admin email
    const recipients = isTestingMode 
      ? [adminEmail]
      : Array.isArray(options.to) 
        ? options.to 
        : [options.to]

    const mailOptions = {
      from: `Lab Management System <${process.env.GMAIL_USER || 'abhinavdogra1974@gmail.com'}>`,
      to: recipients.join(', '),
      subject: isTestingMode 
        ? `[TEST] ${options.subject}` 
        : options.subject,
      html: isTestingMode 
        ? `
          <div style="background: #fff3cd; padding: 10px; border-left: 4px solid #ffc107; margin-bottom: 20px;">
            <strong>🧪 TEST MODE</strong><br/>
            Original recipients: ${Array.isArray(options.to) ? options.to.join(', ') : options.to}
          </div>
          ${options.html}
        `
        : options.html,
      text: options.text
    }

    const info = await transporter.sendMail(mailOptions)
    console.log('✅ Email sent:', info.messageId, 'to:', recipients.join(', '))
    return { success: true, messageId: info.messageId }
  } catch (error) {
    console.error('❌ Email sending failed:', error)
    return { success: false, error }
  }
}

// Email templates
export const emailTemplates = {
  componentRequestCreated: (data: {
    requesterName: string
    requesterRole: string
    labName: string
    purpose: string
    items: Array<{ name: string; quantity: number }>
    returnDate: string
    requestId: number
  }) => ({
    subject: `New Component Request #${data.requestId} - ${data.labName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">📋 New Component Request</h2>
        
        <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Request ID:</strong> #${data.requestId}</p>
          <p><strong>Requester:</strong> ${data.requesterName} (${data.requesterRole})</p>
          <p><strong>Lab:</strong> ${data.labName}</p>
          <p><strong>Purpose:</strong> ${data.purpose || 'Not specified'}</p>
          <p><strong>Return Date:</strong> ${data.returnDate}</p>
        </div>

        <h3>Requested Components:</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr style="background: #e5e7eb;">
              <th style="padding: 8px; text-align: left; border: 1px solid #d1d5db;">Component</th>
              <th style="padding: 8px; text-align: center; border: 1px solid #d1d5db;">Quantity</th>
            </tr>
          </thead>
          <tbody>
            ${data.items.map(item => `
              <tr>
                <td style="padding: 8px; border: 1px solid #d1d5db;">${item.name}</td>
                <td style="padding: 8px; text-align: center; border: 1px solid #d1d5db;">${item.quantity}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div style="margin-top: 20px; padding: 15px; background: #dbeafe; border-radius: 8px;">
          <p style="margin: 0;"><strong>⚡ Action Required:</strong> Please review and approve/reject this request.</p>
        </div>
      </div>
    `
  }),

  componentRequestApproved: (data: {
    requesterName: string
    approverName: string
    approverRole: string
    labName: string
    requestId: number
    remarks?: string
  }) => ({
    subject: `Component Request #${data.requestId} Approved by ${data.approverRole}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #16a34a;">✅ Request Approved</h2>
        
        <div style="background: #f0fdf4; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #16a34a;">
          <p><strong>Request ID:</strong> #${data.requestId}</p>
          <p><strong>Lab:</strong> ${data.labName}</p>
          <p><strong>Approved by:</strong> ${data.approverName} (${data.approverRole})</p>
          ${data.remarks ? `<p><strong>Remarks:</strong> ${data.remarks}</p>` : ''}
        </div>

        <p>Your component request has been approved and is moving forward in the approval process.</p>
      </div>
    `
  }),

  componentRequestRejected: (data: {
    requesterName: string
    rejecterName: string
    rejecterRole: string
    labName: string
    requestId: number
    reason?: string
  }) => ({
    subject: `Component Request #${data.requestId} Rejected`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #dc2626;">❌ Request Rejected</h2>
        
        <div style="background: #fef2f2; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #dc2626;">
          <p><strong>Request ID:</strong> #${data.requestId}</p>
          <p><strong>Lab:</strong> ${data.labName}</p>
          <p><strong>Rejected by:</strong> ${data.rejecterName} (${data.rejecterRole})</p>
          ${data.reason ? `<p><strong>Reason:</strong> ${data.reason}</p>` : ''}
        </div>

        <p>Unfortunately, your component request has been rejected. Please contact the lab staff for more information.</p>
      </div>
    `
  }),

  componentIssued: (data: {
    requesterName: string
    requesterRole: string
    labName: string
    requestId: number
    items: Array<{ name: string; quantity: number }>
    returnDate: string
  }) => ({
    subject: `Components Issued - Request #${data.requestId}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">📦 Components Issued</h2>
        
        <div style="background: #dbeafe; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Request ID:</strong> #${data.requestId}</p>
          <p><strong>Lab:</strong> ${data.labName}</p>
          <p><strong>Return by:</strong> ${data.returnDate}</p>
        </div>

        <h3>Issued Components:</h3>
        <ul>
          ${data.items.map(item => `<li>${item.name} (Qty: ${item.quantity})</li>`).join('')}
        </ul>

        <div style="margin-top: 20px; padding: 15px; background: #fef3c7; border-radius: 8px;">
          <p style="margin: 0;"><strong>⚠️ Remember:</strong> Please return all components by the specified date in good condition.</p>
        </div>
      </div>
    `
  }),

  returnRequested: (data: {
    requesterName: string
    requesterRole: string
    labName: string
    requestId: number
  }) => ({
    subject: `Return Requested - Request #${data.requestId}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #ea580c;">🔄 Return Requested</h2>
        
        <div style="background: #fff7ed; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Request ID:</strong> #${data.requestId}</p>
          <p><strong>Requester:</strong> ${data.requesterName} (${data.requesterRole})</p>
          <p><strong>Lab:</strong> ${data.labName}</p>
        </div>

        <p>The requester has indicated they are ready to return the components. Please verify and approve the return.</p>
      </div>
    `
  }),

  returnApproved: (data: {
    requesterName: string
    requesterRole: string
    labName: string
    requestId: number
  }) => ({
    subject: `Return Approved - Request #${data.requestId}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #16a34a;">✅ Return Approved</h2>
        
        <div style="background: #f0fdf4; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #16a34a;">
          <p><strong>Request ID:</strong> #${data.requestId}</p>
          <p><strong>Lab:</strong> ${data.labName}</p>
        </div>

        <p>Your component return has been verified and approved. Thank you for returning the components in good condition.</p>
      </div>
    `
  }),

  extensionRequested: (data: {
    requesterName: string
    requesterRole: string
    labName: string
    requestId: number
    currentReturnDate: string
    requestedReturnDate: string
    reason: string
  }) => ({
    subject: `Extension Requested - Request #${data.requestId}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #7c3aed;">⏰ Extension Requested</h2>
        
        <div style="background: #f5f3ff; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Request ID:</strong> #${data.requestId}</p>
          <p><strong>Requester:</strong> ${data.requesterName} (${data.requesterRole})</p>
          <p><strong>Lab:</strong> ${data.labName}</p>
          <p><strong>Current Return Date:</strong> ${data.currentReturnDate}</p>
          <p><strong>Requested Return Date:</strong> ${data.requestedReturnDate}</p>
          <p><strong>Reason:</strong> ${data.reason}</p>
        </div>

        <div style="margin-top: 20px; padding: 15px; background: #dbeafe; border-radius: 8px;">
          <p style="margin: 0;"><strong>⚡ Action Required:</strong> Please review and approve/reject this extension request.</p>
        </div>
      </div>
    `
  }),

  extensionApproved: (data: {
    requesterName: string
    labName: string
    requestId: number
    newReturnDate: string
  }) => ({
    subject: `Extension Approved - Request #${data.requestId}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #16a34a;">✅ Extension Approved</h2>
        
        <div style="background: #f0fdf4; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #16a34a;">
          <p><strong>Request ID:</strong> #${data.requestId}</p>
          <p><strong>Lab:</strong> ${data.labName}</p>
          <p><strong>New Return Date:</strong> ${data.newReturnDate}</p>
        </div>

        <p>Your deadline extension request has been approved. Please ensure you return the components by the new date.</p>
      </div>
    `
  }),

  extensionRejected: (data: {
    requesterName: string
    labName: string
    requestId: number
    remarks: string
  }) => ({
    subject: `Extension Rejected - Request #${data.requestId}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #dc2626;">❌ Extension Rejected</h2>
        
        <div style="background: #fef2f2; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #dc2626;">
          <p><strong>Request ID:</strong> #${data.requestId}</p>
          <p><strong>Lab:</strong> ${data.labName}</p>
          <p><strong>Reason:</strong> ${data.remarks}</p>
        </div>

        <p>Your extension request has been rejected. Please return the components by the original deadline.</p>
      </div>
    `
  }),

  passwordResetSuccess: (data: {
    userName: string
    userEmail: string
  }) => ({
    subject: 'Password Successfully Reset - LNMIIT Lab Management',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #16a34a;">✅ Password Reset Successful</h2>
        
        <div style="background: #f0fdf4; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #16a34a;">
          <p>Dear <strong>${data.userName}</strong>,</p>
          <p>Your password has been successfully reset for the LNMIIT Lab Management System.</p>
          <p><strong>Email:</strong> ${data.userEmail}</p>
          <p><strong>Reset Time:</strong> ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</p>
        </div>

        <div style="background: #fff3cd; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ffc107;">
          <p style="margin: 0;"><strong>⚠️ Security Notice:</strong> If you did not perform this action, please contact the administrator immediately at webmaster@lnmiit.ac.in</p>
        </div>

        <p>You can now log in to the system using your new password.</p>
      </div>
    `
  }),

  requestWithdrawn: (data: {
    requesterName: string
    requesterRole: string
    labName: string
    requestId: number
    notifyEmail: string
    notifyRole: string
  }) => ({
    subject: `Request #${data.requestId} Withdrawn`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #f59e0b;">⚠️ Request Withdrawn</h2>
        
        <div style="background: #fff3cd; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
          <p><strong>Request ID:</strong> #${data.requestId}</p>
          <p><strong>Requester:</strong> ${data.requesterName} (${data.requesterRole})</p>
          <p><strong>Lab:</strong> ${data.labName}</p>
          <p><strong>Status:</strong> Withdrawn by requester</p>
        </div>

        <p>This request has been withdrawn and no further action is required.</p>
      </div>
    `
  })
}
