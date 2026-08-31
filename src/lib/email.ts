import 'server-only'

/**
 * Transactional email via Resend's REST API — the "come back" channel that the
 * in-app bell can't cover once the tab closes.
 *
 * Deliberately optional: without RESEND_API_KEY every call is a silent no-op,
 * so the app works end-to-end before email is set up, and a mail outage can
 * never break a Server Action. Nothing awaits delivery guarantees.
 */
export async function sendEmail(to: string, subject: string, bodyHtml: string) {
  const key = process.env.RESEND_API_KEY
  if (!key) return

  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM ?? 'SkillSwap <onboarding@resend.dev>',
        to,
        subject,
        html: emailShell(subject, bodyHtml),
      }),
    })
  } catch {
    // Email is best-effort; the in-app notification already exists.
  }
}

function emailShell(title: string, body: string) {
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
  return `<!doctype html>
<body style="margin:0;background:#faf7f2;font-family:ui-sans-serif,system-ui,sans-serif;color:#23201c">
  <div style="max-width:480px;margin:0 auto;padding:32px 20px">
    <p style="font-weight:800;font-size:18px;margin:0 0 20px">&#8644; SkillSwap</p>
    <div style="background:#ffffff;border:1px solid #e9e2d6;border-radius:16px;padding:24px">
      <h1 style="font-size:18px;margin:0 0 10px">${title}</h1>
      <div style="font-size:14px;line-height:1.6;color:#5c554d">${body}</div>
      <p style="margin:20px 0 0"><a href="${site}/sessions" style="display:inline-block;background:#0e7a5f;color:#ffffff;text-decoration:none;font-weight:600;font-size:14px;padding:10px 20px;border-radius:999px">Open SkillSwap</a></p>
    </div>
    <p style="font-size:12px;color:#8b8378;margin:16px 0 0">1 credit = 1 hour of someone's time. No money involved.</p>
  </div>
</body>`
}
