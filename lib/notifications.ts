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

// Helper function to create professional LNMIIT email template
function createEmailTemplate(content: string, baseUrl?: string): string {
  const appUrl = baseUrl || process.env.APP_URL || 'http://localhost:3000'
  return `<!DOCTYPE html>
<html>
  <head>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
    <title>The LNM Institute of Information Technology, Jaipur</title>
    <link href="https://fonts.googleapis.com/css2?family=Roboto" rel="stylesheet">
  </head>
  <body style="margin:0; padding:0; background:#eee; font-family: 'Roboto', Arial, sans-serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#eee; padding:40px; border:1px solid #ddd; margin:0 auto;">
      <tbody>
        <tr>
          <td>
            <table role="presentation" width="550" cellspacing="0" cellpadding="0" style="background:#fff; width:100%; max-width:550px; border:1px solid #ccc; padding:0; margin:0; border-collapse:collapse; border-radius:10px; overflow:hidden">
              <tbody style="border: solid 1px #034da2;">
                <tr style="background: #EEEEEE;">
                  <td style="text-align:center; padding:10px;">
                    <a href="https://lnmiit.ac.in" target="_blank" rel="noopener noreferrer">
                      <img src="${appUrl}/lnmiit-logo.png" alt="LNMIIT" style="width:200px; margin:auto; display:block; padding:10px;" />
                    </a>
                  </td>
                </tr>
                <tr>
                  <td style="padding:10px 30px; text-align:center; margin:0">
                  </td>
                </tr>
                ${content}
                <tr>
                  <td style="padding:10px 30px; margin:0; text-align:left; font-size:14px;">
                    <p>Thank you for using the Lab Management System.</p>
                    <br/>
                    <p>Best regards,</p>
                    <p><b>Lab Management Team</b></p>
                    <p><b>The LNM Institute of Information Technology</b></p>
                  </td>
                </tr>
              </tbody>
            </table>
          </td>
        </tr>
      </tbody>
    </table>
  </body>
</html>`
}

type EmailOptions = {
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
    subject: `New Component Request #${data.requestId} - LNMIIT Lab Management`,
    html: createEmailTemplate(`
      <tr>
        <td style="padding:10px 30px; margin:0; text-align:left; font-size:14px;">
          <p>Dear Team,</p>
          <p>A new component request has been submitted and requires your attention.</p>
          
          <table style="width:100%; border-collapse: collapse; margin: 20px 0;">
            <tr style="background: #f0f9ff;">
              <td style="padding: 10px; border: 1px solid #ddd;"><strong>Request ID:</strong></td>
              <td style="padding: 10px; border: 1px solid #ddd;">#${data.requestId}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #ddd;"><strong>Requester:</strong></td>
              <td style="padding: 10px; border: 1px solid #ddd;">${data.requesterName} (${data.requesterRole})</td>
            </tr>
            <tr style="background: #f0f9ff;">
              <td style="padding: 10px; border: 1px solid #ddd;"><strong>Lab:</strong></td>
              <td style="padding: 10px; border: 1px solid #ddd;">${data.labName}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #ddd;"><strong>Purpose:</strong></td>
              <td style="padding: 10px; border: 1px solid #ddd;">${data.purpose || 'Not specified'}</td>
            </tr>
            <tr style="background: #f0f9ff;">
              <td style="padding: 10px; border: 1px solid #ddd;"><strong>Expected Return Date:</strong></td>
              <td style="padding: 10px; border: 1px solid #ddd;">${data.returnDate}</td>
            </tr>
          </table>

          <p><strong>Requested Components:</strong></p>
          <table style="width:100%; border-collapse: collapse; margin: 10px 0;">
            <thead>
              <tr style="background: #034da2; color: white;">
                <th style="padding: 10px; border: 1px solid #ddd; text-align: left;">Component Name</th>
                <th style="padding: 10px; border: 1px solid #ddd; text-align: center;">Quantity</th>
              </tr>
            </thead>
            <tbody>
              ${data.items.map((item, idx) => `
                <tr style="background: ${idx % 2 === 0 ? '#f9f9f9' : 'white'};">
                  <td style="padding: 10px; border: 1px solid #ddd;">${item.name}</td>
                  <td style="padding: 10px; border: 1px solid #ddd; text-align: center;">${item.quantity}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <p style="margin-top: 20px; padding: 12px; background: #fff3cd; border-left: 4px solid #ffc107;">
            <strong>⚡ Action Required:</strong> Please review and process this request at your earliest convenience.
          </p>
        </td>
      </tr>
    `)
  }),

  componentRequestApproved: (data: {
    requesterName: string
    approverName: string
    approverRole: string
    labName: string
    requestId: number
    remarks?: string
  }) => ({
    subject: `Component Request #${data.requestId} Approved - LNMIIT Lab Management`,
    html: createEmailTemplate(`
      <tr>
        <td style="padding:10px 30px; margin:0; text-align:left; font-size:14px;">
          <p>Dear <b>${data.requesterName}</b>,</p>
          <p>We are pleased to inform you that your component request has been <b>approved</b>.</p>
          
          <table style="width:100%; border-collapse: collapse; margin: 20px 0;">
            <tr style="background: #f0fdf4;">
              <td style="padding: 10px; border: 1px solid #ddd;"><strong>Request ID:</strong></td>
              <td style="padding: 10px; border: 1px solid #ddd;">#${data.requestId}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #ddd;"><strong>Lab:</strong></td>
              <td style="padding: 10px; border: 1px solid #ddd;">${data.labName}</td>
            </tr>
            <tr style="background: #f0fdf4;">
              <td style="padding: 10px; border: 1px solid #ddd;"><strong>Approved by:</strong></td>
              <td style="padding: 10px; border: 1px solid #ddd;">${data.approverName} (${data.approverRole})</td>
            </tr>
            ${data.remarks ? `
            <tr>
              <td style="padding: 10px; border: 1px solid #ddd;"><strong>Remarks:</strong></td>
              <td style="padding: 10px; border: 1px solid #ddd;">${data.remarks}</td>
            </tr>
            ` : ''}
          </table>

          <p style="padding: 12px; background: #d1fae5; border-left: 4px solid #10b981;">
            <strong>✅ Status:</strong> Your request is now moving forward in the approval process.
          </p>
          
          <p>You will be notified once the components are ready for collection.</p>
        </td>
      </tr>
    `)
  }),

  componentRequestRejected: (data: {
    requesterName: string
    rejecterName: string
    rejecterRole: string
    labName: string
    requestId: number
    reason?: string
  }) => ({
    subject: `Component Request #${data.requestId} Rejected - LNMIIT Lab Management`,
    html: createEmailTemplate(`
      <tr>
        <td style="padding:10px 30px; margin:0; text-align:left; font-size:14px;">
          <p>Dear <b>${data.requesterName}</b>,</p>
          <p>We regret to inform you that your component request has been <b>rejected</b>.</p>
          
          <table style="width:100%; border-collapse: collapse; margin: 20px 0;">
            <tr style="background: #fee2e2;">
              <td style="padding: 10px; border: 1px solid #ddd;"><strong>Request ID:</strong></td>
              <td style="padding: 10px; border: 1px solid #ddd;">#${data.requestId}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #ddd;"><strong>Lab:</strong></td>
              <td style="padding: 10px; border: 1px solid #ddd;">${data.labName}</td>
            </tr>
            <tr style="background: #fee2e2;">
              <td style="padding: 10px; border: 1px solid #ddd;"><strong>Rejected by:</strong></td>
              <td style="padding: 10px; border: 1px solid #ddd;">${data.rejecterName} (${data.rejecterRole})</td>
            </tr>
            ${data.reason ? `
            <tr>
              <td style="padding: 10px; border: 1px solid #ddd;"><strong>Reason:</strong></td>
              <td style="padding: 10px; border: 1px solid #ddd;">${data.reason}</td>
            </tr>
            ` : ''}
          </table>

          <p style="padding: 12px; background: #fecaca; border-left: 4px solid #ef4444;">
            <strong>❌ Status:</strong> Your request has been declined.
          </p>
          
          <p>If you have any questions or need clarification, please contact the lab staff or the person who rejected the request.</p>
        </td>
      </tr>
    `)
  }),

  componentIssued: (data: {
    requesterName: string
    requesterRole: string
    labName: string
    requestId: number
    items: Array<{ name: string; quantity: number }>
    returnDate: string
  }) => ({
    subject: `Components Issued - Request #${data.requestId} - LNMIIT Lab Management`,
    html: createEmailTemplate(`
      <tr>
        <td style="padding:10px 30px; margin:0; text-align:left; font-size:14px;">
          <p>Dear <b>${data.requesterName}</b>,</p>
          <p>Your requested components have been <b>issued</b> and are ready for collection.</p>
          
          <table style="width:100%; border-collapse: collapse; margin: 20px 0;">
            <tr style="background: #dbeafe;">
              <td style="padding: 10px; border: 1px solid #ddd;"><strong>Request ID:</strong></td>
              <td style="padding: 10px; border: 1px solid #ddd;">#${data.requestId}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #ddd;"><strong>Lab:</strong></td>
              <td style="padding: 10px; border: 1px solid #ddd;">${data.labName}</td>
            </tr>
            <tr style="background: #dbeafe;">
              <td style="padding: 10px; border: 1px solid #ddd;"><strong>Return Deadline:</strong></td>
              <td style="padding: 10px; border: 1px solid #ddd;">${data.returnDate}</td>
            </tr>
          </table>

          <p><strong>Issued Components:</strong></p>
          <table style="width:100%; border-collapse: collapse; margin: 10px 0;">
            <thead>
              <tr style="background: #034da2; color: white;">
                <th style="padding: 10px; border: 1px solid #ddd; text-align: left;">Component Name</th>
                <th style="padding: 10px; border: 1px solid #ddd; text-align: center;">Quantity</th>
              </tr>
            </thead>
            <tbody>
              ${data.items.map((item, idx) => `
                <tr style="background: ${idx % 2 === 0 ? '#f9f9f9' : 'white'};">
                  <td style="padding: 10px; border: 1px solid #ddd;">${item.name}</td>
                  <td style="padding: 10px; border: 1px solid #ddd; text-align: center;">${item.quantity}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <p style="padding: 12px; background: #fef3c7; border-left: 4px solid #f59e0b;">
            <strong>⚠️ Important:</strong> Please ensure all components are returned by <b>${data.returnDate}</b> in good working condition.
          </p>
          
          <p>If you need to extend the return date, please submit an extension request through the system.</p>
        </td>
      </tr>
    `)
  }),

  returnRequested: (data: {
    requesterName: string
    requesterRole: string
    labName: string
    requestId: number
  }) => ({
    subject: `Return Request - Request #${data.requestId} - LNMIIT Lab Management`,
    html: createEmailTemplate(`
      <tr>
        <td style="padding:10px 30px; margin:0; text-align:left; font-size:14px;">
          <p>Dear Lab Staff,</p>
          <p>A user has requested to return components for the following request:</p>
          
          <table style="width:100%; border-collapse: collapse; margin: 20px 0;">
            <tr style="background: #fff7ed;">
              <td style="padding: 10px; border: 1px solid #ddd;"><strong>Request ID:</strong></td>
              <td style="padding: 10px; border: 1px solid #ddd;">#${data.requestId}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #ddd;"><strong>Requester:</strong></td>
              <td style="padding: 10px; border: 1px solid #ddd;">${data.requesterName} (${data.requesterRole})</td>
            </tr>
            <tr style="background: #fff7ed;">
              <td style="padding: 10px; border: 1px solid #ddd;"><strong>Lab:</strong></td>
              <td style="padding: 10px; border: 1px solid #ddd;">${data.labName}</td>
            </tr>
          </table>

          <p style="padding: 12px; background: #fff3cd; border-left: 4px solid #ffc107;">
            <strong>⚡ Action Required:</strong> Please verify the returned components and approve the return in the system.
          </p>
        </td>
      </tr>
    `)
  }),

  returnApproved: (data: {
    requesterName: string
    requesterRole: string
    labName: string
    requestId: number
  }) => ({
    subject: `Return Approved - Request #${data.requestId} - LNMIIT Lab Management`,
    html: createEmailTemplate(`
      <tr>
        <td style="padding:10px 30px; margin:0; text-align:left; font-size:14px;">
          <p>Dear <b>${data.requesterName}</b>,</p>
          <p>Your component return has been <b>verified and approved</b>.</p>
          
          <table style="width:100%; border-collapse: collapse; margin: 20px 0;">
            <tr style="background: #f0fdf4;">
              <td style="padding: 10px; border: 1px solid #ddd;"><strong>Request ID:</strong></td>
              <td style="padding: 10px; border: 1px solid #ddd;">#${data.requestId}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #ddd;"><strong>Lab:</strong></td>
              <td style="padding: 10px; border: 1px solid #ddd;">${data.labName}</td>
            </tr>
          </table>

          <p style="padding: 12px; background: #d1fae5; border-left: 4px solid #10b981;">
            <strong>✅ Status:</strong> Components have been successfully returned and checked.
          </p>
          
          <p>Thank you for returning the components in good condition and on time.</p>
        </td>
      </tr>
    `)
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
    subject: `Extension Request - Request #${data.requestId} - LNMIIT Lab Management`,
    html: createEmailTemplate(`
      <tr>
        <td style="padding:10px 30px; margin:0; text-align:left; font-size:14px;">
          <p>Dear Lab Staff,</p>
          <p>A deadline extension has been requested for the following component request:</p>
          
          <table style="width:100%; border-collapse: collapse; margin: 20px 0;">
            <tr style="background: #f5f3ff;">
              <td style="padding: 10px; border: 1px solid #ddd;"><strong>Request ID:</strong></td>
              <td style="padding: 10px; border: 1px solid #ddd;">#${data.requestId}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #ddd;"><strong>Requester:</strong></td>
              <td style="padding: 10px; border: 1px solid #ddd;">${data.requesterName} (${data.requesterRole})</td>
            </tr>
            <tr style="background: #f5f3ff;">
              <td style="padding: 10px; border: 1px solid #ddd;"><strong>Lab:</strong></td>
              <td style="padding: 10px; border: 1px solid #ddd;">${data.labName}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #ddd;"><strong>Current Return Date:</strong></td>
              <td style="padding: 10px; border: 1px solid #ddd;">${data.currentReturnDate}</td>
            </tr>
            <tr style="background: #f5f3ff;">
              <td style="padding: 10px; border: 1px solid #ddd;"><strong>Requested New Date:</strong></td>
              <td style="padding: 10px; border: 1px solid #ddd;">${data.requestedReturnDate}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #ddd;"><strong>Reason:</strong></td>
              <td style="padding: 10px; border: 1px solid #ddd;">${data.reason}</td>
            </tr>
          </table>

          <p style="padding: 12px; background: #fff3cd; border-left: 4px solid #ffc107;">
            <strong>⚡ Action Required:</strong> Please review and approve or reject this extension request.
          </p>
        </td>
      </tr>
    `)
  }),

  extensionApproved: (data: {
    requesterName: string
    labName: string
    requestId: number
    newReturnDate: string
  }) => ({
    subject: `Extension Approved - Request #${data.requestId} - LNMIIT Lab Management`,
    html: createEmailTemplate(`
      <tr>
        <td style="padding:10px 30px; margin:0; text-align:left; font-size:14px;">
          <p>Dear <b>${data.requesterName}</b>,</p>
          <p>Your deadline extension request has been <b>approved</b>.</p>
          
          <table style="width:100%; border-collapse: collapse; margin: 20px 0;">
            <tr style="background: #f0fdf4;">
              <td style="padding: 10px; border: 1px solid #ddd;"><strong>Request ID:</strong></td>
              <td style="padding: 10px; border: 1px solid #ddd;">#${data.requestId}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #ddd;"><strong>Lab:</strong></td>
              <td style="padding: 10px; border: 1px solid #ddd;">${data.labName}</td>
            </tr>
            <tr style="background: #f0fdf4;">
              <td style="padding: 10px; border: 1px solid #ddd;"><strong>New Return Deadline:</strong></td>
              <td style="padding: 10px; border: 1px solid #ddd;">${data.newReturnDate}</td>
            </tr>
          </table>

          <p style="padding: 12px; background: #d1fae5; border-left: 4px solid #10b981;">
            <strong>✅ Status:</strong> Your return deadline has been extended.
          </p>
          
          <p>Please ensure you return all components by <b>${data.newReturnDate}</b> in good working condition.</p>
        </td>
      </tr>
    `)
  }),

  extensionRejected: (data: {
    requesterName: string
    labName: string
    requestId: number
    remarks: string
  }) => ({
    subject: `Extension Rejected - Request #${data.requestId} - LNMIIT Lab Management`,
    html: createEmailTemplate(`
      <tr>
        <td style="padding:10px 30px; margin:0; text-align:left; font-size:14px;">
          <p>Dear <b>${data.requesterName}</b>,</p>
          <p>We regret to inform you that your deadline extension request has been <b>rejected</b>.</p>
          
          <table style="width:100%; border-collapse: collapse; margin: 20px 0;">
            <tr style="background: #fee2e2;">
              <td style="padding: 10px; border: 1px solid #ddd;"><strong>Request ID:</strong></td>
              <td style="padding: 10px; border: 1px solid #ddd;">#${data.requestId}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #ddd;"><strong>Lab:</strong></td>
              <td style="padding: 10px; border: 1px solid #ddd;">${data.labName}</td>
            </tr>
            <tr style="background: #fee2e2;">
              <td style="padding: 10px; border: 1px solid #ddd;"><strong>Reason:</strong></td>
              <td style="padding: 10px; border: 1px solid #ddd;">${data.remarks}</td>
            </tr>
          </table>

          <p style="padding: 12px; background: #fecaca; border-left: 4px solid #ef4444;">
            <strong>❌ Status:</strong> Extension request declined.
          </p>
          
          <p>Please ensure you return all components by the <b>original deadline</b>. If you have any concerns, please contact the lab staff.</p>
        </td>
      </tr>
    `)
  }),

  passwordResetSuccess: (data: {
    userName: string
    userEmail: string
  }) => ({
    subject: 'Password Successfully Reset - LNMIIT Lab Management',
    html: createEmailTemplate(`
      <tr>
        <td style="padding:10px 30px; margin:0; text-align:left; font-size:14px;">
          <p>Dear <b>${data.userName}</b>,</p>
          <p>Your password has been successfully reset for the LNMIIT Lab Management System.</p>
          
          <table style="width:100%; border-collapse: collapse; margin: 20px 0;">
            <tr style="background: #f0fdf4;">
              <td style="padding: 10px; border: 1px solid #ddd;"><strong>Email:</strong></td>
              <td style="padding: 10px; border: 1px solid #ddd;">${data.userEmail}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #ddd;"><strong>Reset Time:</strong></td>
              <td style="padding: 10px; border: 1px solid #ddd;">${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</td>
            </tr>
          </table>

          <p style="padding: 12px; background: #d4edda; border-left: 4px solid #28a745;">
            <strong>✅ Status:</strong> Password reset successful. You can now log in with your new credentials.
          </p>

          <div style="background: #fff3cd; padding: 12px; border-left: 4px solid #ffc107; margin: 20px 0;">
            <p style="margin: 0;"><strong>⚠️ Security Notice:</strong> If you did not perform this action, please contact the administrator immediately at <a href="mailto:webmaster@lnmiit.ac.in">webmaster@lnmiit.ac.in</a></p>
          </div>
        </td>
      </tr>
    `)
  }),

  requestWithdrawn: (data: {
    requesterName: string
    requesterRole: string
    labName: string
    requestId: number
    notifyEmail: string
    notifyRole: string
  }) => ({
    subject: `Request #${data.requestId} Withdrawn - LNMIIT Lab Management`,
    html: createEmailTemplate(`
      <tr>
        <td style="padding:10px 30px; margin:0; text-align:left; font-size:14px;">
          <p>Dear <b>${data.notifyRole}</b>,</p>
          <p>A component request has been withdrawn by the requester. No further action is required from your end.</p>
          
          <table style="width:100%; border-collapse: collapse; margin: 20px 0;">
            <tr style="background: #fef3c7;">
              <td style="padding: 10px; border: 1px solid #ddd;"><strong>Request ID:</strong></td>
              <td style="padding: 10px; border: 1px solid #ddd;">#${data.requestId}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #ddd;"><strong>Requester:</strong></td>
              <td style="padding: 10px; border: 1px solid #ddd;">${data.requesterName} (${data.requesterRole})</td>
            </tr>
            <tr style="background: #fef3c7;">
              <td style="padding: 10px; border: 1px solid #ddd;"><strong>Lab:</strong></td>
              <td style="padding: 10px; border: 1px solid #ddd;">${data.labName}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #ddd;"><strong>Status:</strong></td>
              <td style="padding: 10px; border: 1px solid #ddd;"><b>Withdrawn by requester</b></td>
            </tr>
          </table>

          <p style="padding: 12px; background: #fef3c7; border-left: 4px solid #f59e0b;">
            <strong>⚠️ Notice:</strong> This request has been withdrawn. No further action is required.
          </p>
          
          <p>If you have any questions, please contact the requester or lab administration.</p>
        </td>
      </tr>
    `)
  }),

  // Lab Booking Notifications
  labBookingCreated: (data: {
    requesterName: string
    requesterRole: string
    labName: string
    bookingDate: string
    startTime: string
    endTime: string
    purpose: string
    requestId: number
  }) => ({
    subject: `New Lab Booking Request #${data.requestId} - ${data.labName} - LNMIIT Lab Management`,
    html: createEmailTemplate(`
      <tr>
        <td style="padding:10px 30px; margin:0; text-align:left; font-size:14px;">
          <p>Dear Faculty/Lab Staff,</p>
          <p>A new lab booking request has been submitted and requires your review.</p>
          
          <table style="width:100%; border-collapse: collapse; margin: 20px 0;">
            <tr style="background: #dbeafe;">
              <td style="padding: 10px; border: 1px solid #ddd;"><strong>Request ID:</strong></td>
              <td style="padding: 10px; border: 1px solid #ddd;">#${data.requestId}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #ddd;"><strong>Requester:</strong></td>
              <td style="padding: 10px; border: 1px solid #ddd;">${data.requesterName} (${data.requesterRole})</td>
            </tr>
            <tr style="background: #dbeafe;">
              <td style="padding: 10px; border: 1px solid #ddd;"><strong>Lab:</strong></td>
              <td style="padding: 10px; border: 1px solid #ddd;">${data.labName}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #ddd;"><strong>Date:</strong></td>
              <td style="padding: 10px; border: 1px solid #ddd;">${data.bookingDate}</td>
            </tr>
            <tr style="background: #dbeafe;">
              <td style="padding: 10px; border: 1px solid #ddd;"><strong>Time:</strong></td>
              <td style="padding: 10px; border: 1px solid #ddd;">${data.startTime} - ${data.endTime}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #ddd;"><strong>Purpose:</strong></td>
              <td style="padding: 10px; border: 1px solid #ddd;">${data.purpose}</td>
            </tr>
          </table>

          <p style="padding: 12px; background: #dbeafe; border-left: 4px solid #3b82f6;">
            <strong>📋 Action Required:</strong> Please log in to the system to review and take action on this request.
          </p>
        </td>
      </tr>
    `)
  }),

  labBookingApproved: (data: {
    requesterName: string
    labName: string
    bookingDate: string
    startTime: string
    endTime: string
    requestId: number
    approverRole: string
    nextStep?: string
  }) => ({
    subject: `Lab Booking Request #${data.requestId} Approved - LNMIIT Lab Management`,
    html: createEmailTemplate(`
      <tr>
        <td style="padding:10px 30px; margin:0; text-align:left; font-size:14px;">
          <p>Dear <b>${data.requesterName}</b>,</p>
          <p>Good news! Your lab booking request has been approved by ${data.approverRole}.</p>
          
          <table style="width:100%; border-collapse: collapse; margin: 20px 0;">
            <tr style="background: #d4edda;">
              <td style="padding: 10px; border: 1px solid #ddd;"><strong>Request ID:</strong></td>
              <td style="padding: 10px; border: 1px solid #ddd;">#${data.requestId}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #ddd;"><strong>Lab:</strong></td>
              <td style="padding: 10px; border: 1px solid #ddd;">${data.labName}</td>
            </tr>
            <tr style="background: #d4edda;">
              <td style="padding: 10px; border: 1px solid #ddd;"><strong>Date:</strong></td>
              <td style="padding: 10px; border: 1px solid #ddd;">${data.bookingDate}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #ddd;"><strong>Time:</strong></td>
              <td style="padding: 10px; border: 1px solid #ddd;">${data.startTime} - ${data.endTime}</td>
            </tr>
          </table>

          <p style="padding: 12px; background: #d4edda; border-left: 4px solid #28a745;">
            <strong>✅ Status:</strong> Approved by ${data.approverRole}${data.nextStep ? `. ${data.nextStep}` : '.'}
          </p>
        </td>
      </tr>
    `)
  }),

  labBookingRejected: (data: {
    requesterName: string
    labName: string
    bookingDate: string
    startTime: string
    endTime: string
    requestId: number
    reason: string
    rejectedBy: string
  }) => ({
    subject: `Lab Booking Request #${data.requestId} Rejected - LNMIIT Lab Management`,
    html: createEmailTemplate(`
      <tr>
        <td style="padding:10px 30px; margin:0; text-align:left; font-size:14px;">
          <p>Dear <b>${data.requesterName}</b>,</p>
          <p>We regret to inform you that your lab booking request has been rejected.</p>
          
          <table style="width:100%; border-collapse: collapse; margin: 20px 0;">
            <tr style="background: #fee2e2;">
              <td style="padding: 10px; border: 1px solid #ddd;"><strong>Request ID:</strong></td>
              <td style="padding: 10px; border: 1px solid #ddd;">#${data.requestId}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #ddd;"><strong>Lab:</strong></td>
              <td style="padding: 10px; border: 1px solid #ddd;">${data.labName}</td>
            </tr>
            <tr style="background: #fee2e2;">
              <td style="padding: 10px; border: 1px solid #ddd;"><strong>Date:</strong></td>
              <td style="padding: 10px; border: 1px solid #ddd;">${data.bookingDate}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #ddd;"><strong>Time:</strong></td>
              <td style="padding: 10px; border: 1px solid #ddd;">${data.startTime} - ${data.endTime}</td>
            </tr>
            <tr style="background: #fee2e2;">
              <td style="padding: 10px; border: 1px solid #ddd;"><strong>Rejected By:</strong></td>
              <td style="padding: 10px; border: 1px solid #ddd;">${data.rejectedBy}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #ddd;"><strong>Reason:</strong></td>
              <td style="padding: 10px; border: 1px solid #ddd;">${data.reason}</td>
            </tr>
          </table>

          <p style="padding: 12px; background: #fecaca; border-left: 4px solid #ef4444;">
            <strong>❌ Status:</strong> Request rejected. Please contact the faculty or lab staff if you have questions.
          </p>
        </td>
      </tr>
    `)
  }),

  labBookingWithdrawn: (data: {
    labName: string
    bookingDate: string
    startTime: string
    endTime: string
    requestId: number
    requesterName: string
    requesterRole: string
  }) => ({
    subject: `Lab Booking Request #${data.requestId} Withdrawn - LNMIIT Lab Management`,
    html: createEmailTemplate(`
      <tr>
        <td style="padding:10px 30px; margin:0; text-align:left; font-size:14px;">
          <p>Dear Faculty/Lab Staff,</p>
          <p>A lab booking request has been withdrawn by the requester.</p>
          
          <table style="width:100%; border-collapse: collapse; margin: 20px 0;">
            <tr style="background: #fef3c7;">
              <td style="padding: 10px; border: 1px solid #ddd;"><strong>Request ID:</strong></td>
              <td style="padding: 10px; border: 1px solid #ddd;">#${data.requestId}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #ddd;"><strong>Requester:</strong></td>
              <td style="padding: 10px; border: 1px solid #ddd;">${data.requesterName} (${data.requesterRole})</td>
            </tr>
            <tr style="background: #fef3c7;">
              <td style="padding: 10px; border: 1px solid #ddd;"><strong>Lab:</strong></td>
              <td style="padding: 10px; border: 1px solid #ddd;">${data.labName}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #ddd;"><strong>Date:</strong></td>
              <td style="padding: 10px; border: 1px solid #ddd;">${data.bookingDate}</td>
            </tr>
            <tr style="background: #fef3c7;">
              <td style="padding: 10px; border: 1px solid #ddd;"><strong>Time:</strong></td>
              <td style="padding: 10px; border: 1px solid #ddd;">${data.startTime} - ${data.endTime}</td>
            </tr>
          </table>

          <p style="padding: 12px; background: #fef3c7; border-left: 4px solid #f59e0b;">
            <strong>⚠️ Notice:</strong> This booking request has been withdrawn. No further action is required.
          </p>
        </td>
      </tr>
    `)
  })
}
