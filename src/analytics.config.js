// PostHog (product analytics: visitors, time on site, design views, funnels…).
// The project key (phc_…) is public by design — it can only send events, never read them.
// PostHog → Project settings → Project API key. Leave empty to switch analytics off.
export const POSTHOG_KEY = 'phc_CpbMDWtZaCrviBUbeLanMswh2qAEV6tCcrKkNpTJXE7B'
// Where PostHog lives: EU cloud (https://eu.i.posthog.com) — US would be https://us.i.posthog.com.
export const POSTHOG_HOST = 'https://eu.i.posthog.com'
// Events go through this site (/ingest → PostHog, see netlify.toml) so ad blockers don't drop them.
export const POSTHOG_PROXY = '/ingest'
