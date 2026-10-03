// Customer sign-in (Google, through Supabase) and the wishlist.
// The Supabase library is only downloaded for people who are signed in, are
// signing in, or are coming back from Google — everyone else never pays for it.
import { SUPABASE_URL, SUPABASE_KEY } from './supabase.config.js'

const STORAGE_KEY = `sb-${new URL(SUPABASE_URL).hostname.split('.')[0]}-auth-token`
const RETURN_KEY = 'edge-return-to'

let sbPromise = null
export function supabase() {
  return (sbPromise ||= import('@supabase/supabase-js').then(({ createClient }) =>
    createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { flowType: 'pkce', detectSessionInUrl: true, persistSession: true } })))
}

const stored = () => { try { return !!localStorage.getItem(STORAGE_KEY) } catch { return false } }
const fromGoogle = () => new URLSearchParams(location.search).has('code')

/* ───────── who's signed in ───────── */

export let user = null
const watchers = new Set()
export function onUser(fn) { watchers.add(fn); fn(user); return () => watchers.delete(fn) }
function setUser(u) {
  if ((u?.id || null) === (user?.id || null)) { user = u; return }
  user = u
  watchers.forEach((fn) => fn(user))
}
export const firstName = (u = user) => (u?.user_metadata?.full_name || u?.user_metadata?.name || u?.email || '').split(/[\s@]/)[0]

export const ready = (async () => {
  if (!stored() && !fromGoogle()) return
  try {
    const sb = await supabase()
    const { data } = await sb.auth.getSession() // also finishes the Google redirect (?code=…)
    setUser(data.session?.user ?? null)
    sb.auth.onAuthStateChange((_e, session) => setUser(session?.user ?? null))
  } catch (err) {
    console.warn('Sign-in unavailable', err)
  }
  if (fromGoogle()) {
    // back from Google: put the address back the way it was (filters, open story…)
    let back = null
    try { back = sessionStorage.getItem(RETURN_KEY); sessionStorage.removeItem(RETURN_KEY) } catch {}
    history.replaceState(history.state, '', back || location.pathname)
  }
})()

export async function signIn() {
  try { sessionStorage.setItem(RETURN_KEY, location.pathname + location.search + location.hash) } catch {}
  const sb = await supabase()
  const { error } = await sb.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: location.origin + location.pathname } })
  if (error) throw error
}

export async function signOut() {
  const sb = await supabase()
  await sb.auth.signOut()
  setUser(null)
}

export async function accessToken() {
  if (!user) return null
  const { data } = await (await supabase()).auth.getSession()
  return data.session?.access_token || null
}

/* ───────── wishlist (signed-in only) ───────── */

export const wishlist = new Set()
const wishWatchers = new Set()
export function onWishlist(fn) { wishWatchers.add(fn); fn(wishlist) }
const wishChanged = () => wishWatchers.forEach((fn) => fn(wishlist))

onUser(async (u) => {
  wishlist.clear()
  wishChanged()
  if (!u) return
  const { data } = await (await supabase()).from('wishlist').select('slug').order('created_at', { ascending: false })
  ;(data || []).forEach((r) => wishlist.add(r.slug))
  wishChanged()
})

// returns false when the visitor has to sign in first
export async function toggleWish(slug) {
  if (!user) return false
  const sb = await supabase()
  const had = wishlist.has(slug)
  had ? wishlist.delete(slug) : wishlist.add(slug)
  wishChanged()
  const { error } = had ? await sb.from('wishlist').delete().eq('slug', slug) : await sb.from('wishlist').insert({ slug })
  if (error && !/duplicate/i.test(error.message)) { had ? wishlist.add(slug) : wishlist.delete(slug); wishChanged() }
  return true
}
