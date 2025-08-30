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
  const html = `
    <p>You requested to reset your password.</p>
    <p>Click the link below to set a new password. This link will expire in 60 minutes.</p>
    <p><a href="${url}">Reset your password</a></p>
    <p>If you did not request this, you can ignore this email.</p>
  `
  const res = await sendMail({ to: email, subject: "Reset your password", html })
  if ((res as any).skipped) {
    console.info("Password reset URL (SMTP disabled):", url)
  }
  return res
}

export async function sendDigestEmail(recipients: string[], subject: string, html: string) {
  return sendMail({ to: recipients, subject, html })
}
