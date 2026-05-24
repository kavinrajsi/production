export const ALLOWED_EMAIL_DOMAIN = "madarth.com";

export function isAllowedEmail(email) {
  if (typeof email !== "string") return false;
  return email.trim().toLowerCase().endsWith("@" + ALLOWED_EMAIL_DOMAIN);
}

export const EMAIL_DOMAIN_ERROR = `Only @${ALLOWED_EMAIL_DOMAIN} email addresses are allowed.`;
