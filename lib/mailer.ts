/**
 * Created by Abhinav Dogra (23ucs507) and Abhinav Thulal (23ucs508)
 */

// Minimal mailer abstraction; replace with real provider (SMTP, Resend, SES)
export type MailOptions = {
  to: string
  subject: string
  html: string
}

export async function sendMail(opts: MailOptions) {
  // Demo: log to server console; integrate a real mailer later.
  // Example SMTP (nodemailer) or API-based providers.
  console.log("[MAIL]", { to: opts.to, subject: opts.subject })
  // no-op success
  return { success: true }
}
