// Cloudflare Turnstile — invisible bot check on checkout (stops scripts creating orders
// or testing stolen cards). The site key is public by design. Empty = off.
// Cloudflare dashboard → Turnstile → Add widget → hostname edgexgroup.netlify.app,
// mode "Invisible" (or "Managed"). The matching secret goes in Netlify as TURNSTILE_SECRET_KEY.
export const TURNSTILE_SITE_KEY = ''
