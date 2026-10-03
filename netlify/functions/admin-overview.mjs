// POST /api/admin-overview { days }  — admins only.
// (Deliberately not called “insights”/“analytics”: ad blockers block URLs with those words.)
// Reads visitor behaviour back out of PostHog for the admin's Insights tab:
// visitors, time on site, most viewed designs, time spent on each, add-to-bag
// rate (guests included), top pages, where visitors come from, devices.
//
// Netlify env: POSTHOG_PERSONAL_API_KEY (a personal API key with "Query: read"),
//              POSTHOG_PROJECT_ID. The region follows POSTHOG_HOST in src/analytics.config.js.
import { handler, userFrom, db, HttpError, rawEnv, envReport } from '../lib/shop.mjs'
import { POSTHOG_HOST } from '../../src/analytics.config.js'

const clean = (v) => String(v || '').trim().replace(/^["']|["']$/g, '')

export default handler(async (req) => {
  const user = await userFrom(req)
  if (!user) throw new HttpError(401, 'Sign in to the admin first.')
  let admin
  try {
    admin = await db(`admins?select=user_id&user_id=eq.${user.id}`)
  } catch (err) {
    // a missing setting: say exactly what this function can and can't see
    if (err.status === 503) throw new HttpError(503, `${err.message} This function sees: ${envReport()}.`)
    throw err
  }
  if (!admin.length) throw new HttpError(403, 'Admins only.')

  const key = clean(rawEnv('POSTHOG_PERSONAL_API_KEY'))
  const project = clean(rawEnv('POSTHOG_PROJECT_ID'))
  if (!key || !project) return { configured: false }
  const host = clean(rawEnv('POSTHOG_API_HOST')) || POSTHOG_HOST.replace('.i.posthog.com', '.posthog.com')

  const { days: d = 30 } = await req.json().catch(() => ({}))
  const days = Math.max(1, Math.min(365, Math.floor(Number(d)) || 30))
  const recent = `timestamp > now() - INTERVAL ${days} DAY`

  const q = async (query) => {
    const res = await fetch(`${host}/api/projects/${project}/query/`, {
      method: 'POST',
      headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' },
      body: JSON.stringify({ query: { kind: 'HogQLQuery', query } }),
    })
    const data = await res.json().catch(() => ({}))
    if (res.status === 401 || res.status === 403) throw new HttpError(503, 'PostHog rejected the API key — check POSTHOG_PERSONAL_API_KEY (needs “Query: read”) and POSTHOG_PROJECT_ID.')
    if (!res.ok) throw new HttpError(502, `PostHog: ${data.detail || res.status}`)
    return data.results || []
  }

  const [overview, sessions, views, time, bagAdds, pages, sources, devices] = await Promise.all([
    q(`SELECT count(DISTINCT distinct_id), count() FROM events WHERE event = '$pageview' AND ${recent}`),
    q(`SELECT count(), avg($session_duration), quantile(0.5)($session_duration) FROM sessions WHERE $start_timestamp > now() - INTERVAL ${days} DAY`),
    q(`SELECT properties.slug, count(), count(DISTINCT distinct_id) FROM events WHERE event = 'design_viewed' AND ${recent} GROUP BY properties.slug ORDER BY count() DESC LIMIT 30`),
    q(`SELECT properties.slug, avg(toFloat(properties.seconds)) FROM events WHERE event = 'design_closed' AND ${recent} AND toFloat(properties.seconds) > 1 GROUP BY properties.slug`),
    q(`SELECT properties.slug, count(), count(DISTINCT distinct_id) FROM events WHERE event = 'add_to_bag' AND ${recent} GROUP BY properties.slug ORDER BY count() DESC LIMIT 30`),
    q(`SELECT properties.$pathname, count() FROM events WHERE event = '$pageview' AND ${recent} GROUP BY properties.$pathname ORDER BY count() DESC LIMIT 8`),
    q(`SELECT coalesce(nullif(properties.$referring_domain, ''), '$direct') AS source, count(DISTINCT distinct_id) AS people FROM events WHERE event = '$pageview' AND ${recent} GROUP BY source ORDER BY people DESC LIMIT 8`),
    q(`SELECT coalesce(properties.$device_type, 'Unknown') AS device, count(DISTINCT distinct_id) AS people FROM events WHERE event = '$pageview' AND ${recent} GROUP BY device ORDER BY people DESC`),
  ])

  const secs = Object.fromEntries(time.map(([slug, s]) => [slug, Math.round(s)]))
  const adds = Object.fromEntries(bagAdds.map(([slug, n, people]) => [slug, { adds: n, people }]))
  return {
    configured: true,
    days,
    visitors: overview[0]?.[0] || 0,
    pageviews: overview[0]?.[1] || 0,
    sessions: sessions[0]?.[0] || 0,
    avgSession: Math.round(sessions[0]?.[1] || 0),
    medianSession: Math.round(sessions[0]?.[2] || 0),
    designs: views.filter(([slug]) => slug).map(([slug, views, people]) => ({
      slug, views, people, avgSeconds: secs[slug] ?? null,
      bagPeople: adds[slug]?.people || 0,
      bagRate: people ? (adds[slug]?.people || 0) / people : 0,
    })),
    bagAdds: bagAdds.filter(([slug]) => slug).map(([slug, adds, people]) => ({ slug, adds, people })),
    pages: pages.map(([path, views]) => ({ path: path || '/', views })),
    sources: sources.map(([source, visitors]) => ({ source: source === '$direct' ? 'Direct / typed in' : source, visitors })),
    devices: devices.map(([device, visitors]) => ({ device, visitors })),
  }
})

export const config = { path: '/api/admin-overview' }
