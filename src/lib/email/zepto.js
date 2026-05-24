export async function sendEmail({ to, subject, html, text, replyTo }) {
  const token = process.env.ZEPTO_API_TOKEN;
  const url = process.env.ZEPTO_API_URL || "https://api.zeptomail.in/v1.1/email";
  const fromAddress = process.env.ZEPTO_FROM_EMAIL;
  const fromName = process.env.ZEPTO_FROM_NAME || "Production Bookings";

  if (!token || !fromAddress) {
    console.warn("[zepto] missing ZEPTO_API_TOKEN or ZEPTO_FROM_EMAIL; skipping send");
    return { ok: false, skipped: true };
  }

  const recipients = (Array.isArray(to) ? to : [to])
    .filter(Boolean)
    .map((r) =>
      typeof r === "string"
        ? { email_address: { address: r } }
        : { email_address: { address: r.address, name: r.name } }
    );

  if (recipients.length === 0) return { ok: false, skipped: true };

  const body = {
    from: { address: fromAddress, name: fromName },
    to: recipients,
    subject,
    htmlbody: html,
    textbody: text,
  };
  if (replyTo) body.reply_to = [{ address: replyTo }];

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Zoho-enczapikey ${token}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errBody = await res.text().catch(() => "");
    console.error("[zepto] send failed", res.status, errBody);
    return { ok: false, status: res.status, error: errBody };
  }
  return { ok: true };
}
