// Analytics through PostHog. Loaded after the page is idle so it never slows the
// first paint; events fired before it's ready are queued. Off when no key is set.
//
// Events we send (the admin's Insights tab reads them back):
//   $pageview / $pageleave   automatic — visitors, time on site, top pages
//   design_viewed            { slug, name }          a design's story opened
//   design_closed            { slug, seconds }       …and how long it stayed open
//   add_to_bag / remove_from_bag  { slug, size, price }
//   wishlist_add / wishlist_remove { slug }
//   checkout_started { total, items } · order_paid { number, total }
import { POSTHOG_KEY, POSTHOG_HOST } from './analytics.config.js'
import { onUser } from './account.js'

// only the real site counts — not `npm run dev` on someone's laptop
const ON = !!POSTHOG_KEY && !import.meta.env.DEV
const queue = []
let ph = null

export function track(event, props = {}, opts) {
  if (!ON) return
  ph ? ph.capture(event, props, opts) : queue.push([event, props, opts])
}

function start() {
  import('posthog-js').then(({ default: posthog }) => {
    posthog.init(POSTHOG_KEY, {
      api_host: POSTHOG_HOST,
      person_profiles: 'identified_only', // anonymous visitors stay anonymous (and cheaper)
      capture_pageview: true,
      capture_pageleave: true,             // gives time on page / session length
      autocapture: true,
      respect_dnt: true,
      capture_exceptions: true,            // JS errors → PostHog Error Tracking (if it's switched on there)
      mask_all_text: false,
      session_recording: { maskAllInputs: true }, // if recordings are switched on in PostHog, typed details stay hidden
    })
    ph = posthog
    queue.splice(0).forEach(([e, p, o]) => ph.capture(e, p, o))
    // signed in → link this visitor to the account; signed out → start a fresh anonymous visitor
    let was = null
    onUser((u) => { if (u) ph.identify(u.id); else if (was) ph.reset(); was = u })
  }).catch(() => {})
}

if (ON) {
  const go = () => (window.requestIdleCallback ? requestIdleCallback(start, { timeout: 4000 }) : setTimeout(start, 1500))
  document.readyState === 'complete' ? go() : addEventListener('load', go, { once: true })
}
