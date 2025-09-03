import nodemailer from "nodemailer"

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
  const from = process.env.SMTP_FROM || process.env.SMTP_USER!
  const info = await transporter.sendMail({ from, ...options })
  return { messageId: info.messageId }
}

export async function sendPasswordResetEmail(email: string, token: string, baseUrl?: string) {
  const url = `${(baseUrl || getAppUrl()).replace(/\/$/, "")}/reset-password/${token}`
  const html = `<!DOCTYPE html>
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
                      <img src="${(baseUrl || getAppUrl()).replace(/\/$/, "")}/lnmiit-logo.png" alt="LNMIIT" style="width:200px; margin:auto; display:block; padding:10px;" />
                    </a>
                  </td>
                </tr>
                <tr>
                  <td style="padding:10px 30px; text-align:center; margin:0">
                  </td>
                </tr>
                <tr>
                  <td style="padding:10px 30px; margin:0; text-align:left; font-size:14px;">
                    <p>Dear <b>User</b>,</p>
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
                    <p><b>Webmaster LNMIIT</b></p>
                    <p>webmaster@lnmiit.ac.in</p>
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
  const res = await sendMail({ to: email, subject: "Reset your password", html })
  if ((res as any).skipped) {
    console.info("Password reset URL (SMTP disabled):", url)
  }
  return res
}

export async function sendDigestEmail(recipients: string[], subject: string, html: string) {
  return sendMail({ to: recipients, subject, html })
}
