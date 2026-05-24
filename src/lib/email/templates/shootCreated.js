function escapeHtml(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString();
}

export function shootCreatedEmail({ photographer, shoot, items }) {
  const photographerName = [photographer?.first_name, photographer?.last_name]
    .filter(Boolean)
    .join(" ") || photographer?.work_email || "A photographer";

  const subject = `New shoot booked: ${shoot.title}`;

  const itemRows = (items ?? [])
    .map(
      (it) =>
        `<tr><td style="padding:4px 8px;border:1px solid #eee">${escapeHtml(
          it.name
        )}</td><td style="padding:4px 8px;border:1px solid #eee">${escapeHtml(
          it.category || ""
        )}</td><td style="padding:4px 8px;border:1px solid #eee;text-align:right">${
          it.quantity
        }</td></tr>`
    )
    .join("");

  const html = `
<div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#222;max-width:640px">
  <h2 style="margin:0 0 12px">New shoot booked</h2>
  <p>${escapeHtml(photographerName)} just booked a shoot. Details:</p>
  <table style="border-collapse:collapse;margin:12px 0">
    <tr><td style="padding:4px 8px;color:#666">Title</td><td style="padding:4px 8px"><strong>${escapeHtml(
      shoot.title
    )}</strong></td></tr>
    <tr><td style="padding:4px 8px;color:#666">Client</td><td style="padding:4px 8px">${escapeHtml(
      shoot.client_name || "—"
    )}</td></tr>
    <tr><td style="padding:4px 8px;color:#666">Location</td><td style="padding:4px 8px">${escapeHtml(
      shoot.location || "—"
    )}</td></tr>
    <tr><td style="padding:4px 8px;color:#666">Start</td><td style="padding:4px 8px">${escapeHtml(
      formatDate(shoot.shoot_start)
    )}</td></tr>
    <tr><td style="padding:4px 8px;color:#666">End</td><td style="padding:4px 8px">${escapeHtml(
      formatDate(shoot.shoot_end)
    )}</td></tr>
    ${
      shoot.notes
        ? `<tr><td style="padding:4px 8px;color:#666;vertical-align:top">Notes</td><td style="padding:4px 8px;white-space:pre-wrap">${escapeHtml(
            shoot.notes
          )}</td></tr>`
        : ""
    }
  </table>
  <h3 style="margin:16px 0 8px">Equipment requested</h3>
  ${
    itemRows
      ? `<table style="border-collapse:collapse;width:100%"><thead><tr><th style="padding:4px 8px;border:1px solid #eee;text-align:left">Item</th><th style="padding:4px 8px;border:1px solid #eee;text-align:left">Category</th><th style="padding:4px 8px;border:1px solid #eee;text-align:right">Qty</th></tr></thead><tbody>${itemRows}</tbody></table>`
      : "<p><em>No equipment selected.</em></p>"
  }
</div>`;

  const textLines = [
    `New shoot booked by ${photographerName}`,
    "",
    `Title:    ${shoot.title}`,
    `Client:   ${shoot.client_name || "—"}`,
    `Location: ${shoot.location || "—"}`,
    `Start:    ${formatDate(shoot.shoot_start)}`,
    `End:      ${formatDate(shoot.shoot_end)}`,
    shoot.notes ? `Notes:    ${shoot.notes}` : null,
    "",
    "Equipment:",
    ...(items ?? []).map(
      (it) => `  - ${it.name}${it.category ? ` (${it.category})` : ""} x${it.quantity}`
    ),
  ]
    .filter(Boolean)
    .join("\n");

  return { subject, html, text: textLines };
}
