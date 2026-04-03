// Email alert sender using Resend.com (free: 3,000 emails/month)
// Sign up at resend.com and get a free API key

interface AlertEmailData {
  to: string | string[]
  vendorName: string
  daysLeft: number
  endDate: string
  value: number
  currency: string
  contractId: string
  autoRenews: boolean
}

interface InviteEmailData {
  to: string
  orgName: string
  inviterName: string
  inviteUrl: string
}

export async function sendInviteEmail(data: InviteEmailData) {
  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Team Invitation</title></head>
<body style="font-family:system-ui,sans-serif;background:#f5f5f4;padding:24px;margin:0">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb">
    <div style="background:#0B1F3A;padding:24px 28px">
      <div style="color:#fff;font-size:22px;font-weight:700;letter-spacing:-0.5px">Clausr</div>
      <div style="color:#93c5fd;font-size:13px;margin-top:2px">Vendor Contract Intelligence</div>
    </div>
    <div style="padding:28px">
      <div style="font-size:22px;font-weight:600;color:#0B1F3A;margin-bottom:6px">
        You're invited to join ${data.orgName}
      </div>
      <div style="color:#6b7280;font-size:14px;margin-bottom:24px">
        ${data.inviterName} has invited you to collaborate on vendor contracts.
      </div>
      <div style="text-align:center;margin-bottom:24px">
        <a href="${data.inviteUrl}" style="background:#185FA5;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;display:inline-block">
          Accept Invitation
        </a>
      </div>
      <div style="color:#6b7280;font-size:12px;text-align:center">
        If the button doesn't work, copy and paste this link: ${data.inviteUrl}
      </div>
    </div>
  </div>
</body>
</html>`

  // In development, skip external email send and print invite URL to console
  if (process.env.NODE_ENV === 'development') {
    console.log(`DEV invite email: to=${data.to}`)
    console.log(`DEV invite URL: ${data.inviteUrl}`)
    return
  }

  const toEmail = data.to

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'Clausr <support.clausr@gmail.com>',
      to: toEmail,
      subject: `Join ${data.orgName} on Clausr`,
      html,
    }),
  })

  if (!res.ok) {
    const error = await res.text()
    throw new Error(`Resend error: ${error}`)
  }
}

export async function sendAlertEmail(data: AlertEmailData) {
  const appUrl = process.env.APP_URL || 'http://localhost:3000'
  const urgency = data.daysLeft <= 7 ? '🔴' : data.daysLeft <= 30 ? '🟡' : '🟢'
  const valueFormatted = new Intl.NumberFormat('en-IN', {
    style: 'currency', currency: data.currency, maximumFractionDigits: 0,
  }).format(data.value)

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Contract Renewal Alert</title></head>
<body style="font-family:system-ui,sans-serif;background:#f5f5f4;padding:24px;margin:0">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb">
    <div style="background:#0B1F3A;padding:24px 28px">
      <div style="color:#fff;font-size:22px;font-weight:700;letter-spacing:-0.5px">Clausr</div>
      <div style="color:#93c5fd;font-size:13px;margin-top:2px">Vendor Contract Intelligence</div>
    </div>
    <div style="padding:28px">
      <div style="font-size:22px;font-weight:600;color:#0B1F3A;margin-bottom:6px">
        ${urgency} Contract Renewal Alert
      </div>
      <div style="color:#6b7280;font-size:14px;margin-bottom:24px">
        ${data.daysLeft <= 0 ? 'This contract has expired' : `${data.daysLeft} days until renewal`}
      </div>
      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:20px;margin-bottom:24px">
        <table style="width:100%;border-collapse:collapse">
          <tr>
            <td style="color:#6b7280;font-size:13px;padding:6px 0">Vendor</td>
            <td style="color:#0B1F3A;font-size:13px;font-weight:600;text-align:right">${data.vendorName}</td>
          </tr>
          <tr>
            <td style="color:#6b7280;font-size:13px;padding:6px 0">Annual Value</td>
            <td style="color:#0B1F3A;font-size:13px;font-weight:600;text-align:right">${valueFormatted}</td>
          </tr>
          <tr>
            <td style="color:#6b7280;font-size:13px;padding:6px 0">End Date</td>
            <td style="color:#0B1F3A;font-size:13px;font-weight:600;text-align:right">${data.endDate}</td>
          </tr>
          <tr>
            <td style="color:#6b7280;font-size:13px;padding:6px 0">Auto-Renews</td>
            <td style="font-size:13px;font-weight:600;text-align:right;color:${data.autoRenews ? '#dc2626' : '#16a34a'}">${data.autoRenews ? '⚠️ YES — action required' : 'No'}</td>
          </tr>
        </table>
      </div>
      <div style="display:flex;gap:12px;margin-bottom:24px">
        <a href="${appUrl}/contracts/${data.contractId}?action=renew" style="flex:1;background:#185FA5;color:#fff;text-align:center;padding:12px;border-radius:8px;text-decoration:none;font-size:13px;font-weight:600">Renew Contract</a>
        <a href="${appUrl}/contracts/${data.contractId}?action=cancel" style="flex:1;background:#fff;color:#374151;text-align:center;padding:12px;border-radius:8px;text-decoration:none;font-size:13px;font-weight:600;border:1px solid #d1d5db">Cancel Contract</a>
        <a href="${appUrl}/contracts/${data.contractId}" style="flex:1;background:#fff;color:#374151;text-align:center;padding:12px;border-radius:8px;text-decoration:none;font-size:13px;font-weight:600;border:1px solid #d1d5db">View Details</a>
      </div>
      <div style="color:#9ca3af;font-size:12px;text-align:center">
        This alert was sent by Clausr. <a href="${appUrl}/settings" style="color:#185FA5">Manage alerts</a>
      </div>
    </div>
  </div>
</body>
</html>`

  const recipients = Array.isArray(data.to) ? data.to : [data.to]

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'Clausr Alerts <support.clausr@gmail.com>',
      to: process.env.NODE_ENV === 'development' 
        ? ['samuelm99729@gmail.com']
        : recipients,
      subject: `${urgency} ${data.vendorName} contract ${data.daysLeft <= 0 ? 'has expired' : `renews in ${data.daysLeft} days`} — ${valueFormatted}/yr`,
      html,
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Resend error: ${err}`)
  }
  return res.json()
}
