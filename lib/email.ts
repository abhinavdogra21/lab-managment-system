/**
 * Created by Abhinav Dogra (23ucs507) and Abhinav Thulal (23ucs508)
 */

import nodemailer from "nodemailer"
import { sendEmail } from "./notifications"

type MailOptions = {
  to: string | string[]
  subject: string
  html: string
}

function getAppUrl() {
  return process.env.APP_URL || "http://localhost:3000"
}

function createTransport() {
  const host = process.env.SMTP_HOST
  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASS
  if (!host || !user || !pass) {
    return null
  }
  const port = Number(process.env.SMTP_PORT || 587)
  const secure = process.env.SMTP_SECURE === "true" || port === 465
  return nodemailer.createTransport({ host, port, secure, auth: { user, pass } })
}

export function isSmtpConfigured() {
  const host = process.env.SMTP_HOST || ""
  const user = process.env.SMTP_USER || ""
  const pass = process.env.SMTP_PASS || ""
  const port = Number(process.env.SMTP_PORT || 587)
  const secure = process.env.SMTP_SECURE === "true" || port === 465
  const from = process.env.SMTP_FROM || ""
  return { configured: Boolean(host && user && pass), host: host || undefined, port, secure, from: from || undefined }
}

export async function verifySmtp() {
  const transporter = createTransport()
  if (!transporter) return { ok: false, error: "SMTP not configured" }
  try {
    await transporter.verify()
    return { ok: true }
  } catch (e: any) {
    return { ok: false, error: e?.message || String(e) }
  }
}

export async function sendMail(options: MailOptions) {
  const transporter = createTransport()
  if (!transporter) {
  console.warn("SMTP not configured; skipping email send.", options.subject)
    return { skipped: true }
  }
  
  // If in testing mode, redirect all emails to admin email
  const testingMode = process.env.TESTING_MODE === 'true'
  const adminEmail = process.env.ADMIN_EMAIL || process.env.GMAIL_USER
  
  let actualTo = options.to
  let modifiedSubject = options.subject
  
  if (testingMode && adminEmail) {
    const originalRecipients = Array.isArray(options.to) ? options.to.join(', ') : options.to
    actualTo = adminEmail
    modifiedSubject = `[TEST - Original To: ${originalRecipients}] ${options.subject}`
    console.log(`📧 Testing mode: Redirecting email to ${adminEmail} instead of ${originalRecipients}`)
  }
  
  const from = process.env.SMTP_FROM || process.env.SMTP_USER!
  const info = await transporter.sendMail({ 
    from, 
    to: actualTo,
    subject: modifiedSubject,
    html: options.html
  })
  return { messageId: info.messageId }
}

export async function sendPasswordResetEmail(
  email: string, 
  token: string, 
  baseUrl?: string,
  userName?: string,
  salutation?: string
) {
  const url = `${(baseUrl || getAppUrl()).replace(/\/$/, "")}/reset-password/${token}`
  
  // Format salutation and greeting
  let greeting = "Dear User"
  if (userName) {
    if (salutation && salutation !== 'none') {
      const salutationMap: Record<string, string> = {
        'prof': 'Prof.',
        'dr': 'Dr.',
        'mr': 'Mr.',
        'mrs': 'Mrs.'
      }
      greeting = `Dear ${salutationMap[salutation] || ''} ${userName}`
    } else {
      greeting = `Dear ${userName}`
    }
  }
  
  const html = `<!DOCTYPE html>
<html>
  <head>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
    <title>LNMIIT Lab Management System</title>
    <link href="https://fonts.googleapis.com/css2?family=Roboto" rel="stylesheet">
  </head>
  <body style="margin:0; padding:0; background:#eee; font-family: 'Roboto', Arial, sans-serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#eee; padding:40px; border:1px solid #ddd; margin:0 auto;">
      <tbody>
        <tr>
          <td>
            <table role="presentation" width="550" cellspacing="0" cellpadding="0" style="background:#fff; width:100%; max-width:550px; border:1px solid #ccc; padding:0; margin:0; border-collapse:collapse; border-radius:10px; overflow:hidden">
              <tbody style="border: solid 1px #034da2;">
                <tr style="background: #034da2;">
                  <td style="text-align:center; padding:20px;">
                    <h1 style="color: white; margin: 0; font-size: 24px;">LNMIIT Lab Management System</h1>
                  </td>
                </tr>
                <tr>
                  <td style="padding:10px 30px; text-align:center; margin:0">
                  </td>
                </tr>
                <tr>
                  <td style="padding:10px 30px; margin:0; text-align:left; font-size:14px;">
                    <p>${greeting},</p>
                    <p>We received a request to reset the password for your account with <b>The LNM Institute of Information Technology</b>. Use the button below to set a new password.</p>
                    <p><a href="${url}" style="display:inline-block; background:#034da2; color:#ffffff; text-decoration:none; padding:10px 16px; border-radius:6px; font-weight:600;">Reset Password</a></p>
                    <p>If the button doesn’t work, copy and paste this link into your browser:</p>
                    <p style="word-break:break-all;"><a href="${url}" style="color:#034da2; text-decoration:underline;">${url}</a></p>
                    <p style="color:#555;">This link will expire in 60 minutes.</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:10px 30px; margin:0; text-align:left; font-size:14px;">
                    <p>If you did not request this reset or have any concerns about the security of your account, please contact our support team immediately at webmaster@lnmiit.ac.in.</p>
                    <p>Thank you for your cooperation in maintaining the security of your account.</p>
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
  
  // Use new Gmail-based notification system
  try {
    await sendEmail({
      to: [email],
      subject: "Reset your password - LNMIIT Lab Management",
      html
    })
    return { success: true }
  } catch (error) {
    console.error('Failed to send password reset email:', error)
    console.info("Password reset URL (email failed):", url)
    throw error
  }
}

export async function sendWelcomeEmail(
  email: string,
  name: string,
  salutation: string,
  role: string,
  token: string,
  baseUrl?: string
) {
  const url = `${(baseUrl || getAppUrl()).replace(/\/$/, "")}/reset-password/${token}`
  
  // Format salutation properly
  let greeting = "Dear"
  if (salutation && salutation !== 'none') {
    const salutationMap: Record<string, string> = {
      'prof': 'Prof.',
      'dr': 'Dr.',
      'mr': 'Mr.',
      'mrs': 'Mrs.'
    }
    greeting = `Dear ${salutationMap[salutation] || ''}`
  } else {
    greeting = "Dear"
  }
  
  // Format role name for display
  const roleDisplayMap: Record<string, string> = {
    'admin': 'Administrator',
    'hod': 'Head of Department (HoD)',
    'faculty': 'Faculty',
    'lab_staff': 'Lab Staff',
    'student': 'Student',
    'others': 'Staff Member'
  }
  const roleDisplay = roleDisplayMap[role] || role
  
  const html = `<!DOCTYPE html>
<html>
  <head>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
    <title>LNMIIT Lab Management System</title>
    <link href="https://fonts.googleapis.com/css2?family=Roboto" rel="stylesheet">
  </head>
  <body style="margin:0; padding:0; background:#eee; font-family: 'Roboto', Arial, sans-serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#eee; padding:40px; border:1px solid #ddd; margin:0 auto;">
      <tbody>
        <tr>
          <td>
            <table role="presentation" width="550" cellspacing="0" cellpadding="0" style="background:#fff; width:100%; max-width:550px; border:1px solid #ccc; padding:0; margin:0; border-collapse:collapse; border-radius:10px; overflow:hidden">
              <tbody style="border: solid 1px #034da2;">
                <tr style="background: #034da2;">
                  <td style="text-align:center; padding:20px;">
                    <h1 style="color: white; margin: 0; font-size: 24px;">LNMIIT Lab Management System</h1>
                  </td>
                </tr>
                <tr>
                  <td style="padding:10px 30px; text-align:center; margin:0">
                  </td>
                </tr>
                <tr>
                  <td style="padding:10px 30px; margin:0; text-align:left; font-size:14px;">
                    <p>${greeting} <b>${name}</b>,</p>
                    <p>Welcome to the <b>LNMIIT Lab Management System</b>!</p>
                    <p>An account has been created for you with the role of <b>${roleDisplay}</b>. To get started, please set up your password using the button below:</p>
                    <p><a href="${url}" style="display:inline-block; background:#034da2; color:#ffffff; text-decoration:none; padding:10px 16px; border-radius:6px; font-weight:600;">Set Up Password</a></p>
                    <p>If the button doesn't work, copy and paste this link into your browser:</p>
                    <p style="word-break:break-all;"><a href="${url}" style="color:#034da2; text-decoration:underline;">${url}</a></p>
                    <p style="color:#555;">This link will expire in 60 minutes.</p>
                    <p>Your account details:</p>
                    <ul style="color:#555;">
                      <li><b>Email:</b> ${email}</li>
                      <li><b>Role:</b> ${roleDisplay}</li>
                    </ul>
                  </td>
                </tr>
                <tr>
                  <td style="padding:10px 30px; margin:0; text-align:left; font-size:14px;">
                    <p>If you have any questions or need assistance, please contact our support team at webmaster@lnmiit.ac.in.</p>
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
  
  try {
    await sendEmail({
      to: [email],
      subject: "Welcome to LNMIIT Lab Management System",
      html
    })
    return { success: true }
  } catch (error) {
    console.error('Failed to send welcome email:', error)
    console.info("Password setup URL (email failed):", url)
    throw error
  }
}

export async function sendDigestEmail(recipients: string[], subject: string, html: string) {
  return sendMail({ to: recipients, subject, html })
}
