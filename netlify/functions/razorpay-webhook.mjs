// POST /api/razorpay-webhook — Razorpay calls this itself, so an order is marked paid
// even if the customer closed the tab before the checkout could confirm it.
// Razorpay → Settings → Webhooks: URL https://<site>/api/razorpay-webhook,
// events payment.captured, order.paid, payment.failed, and a secret (= RAZORPAY_WEBHOOK_SECRET).
import { json, webhookSignatureOk, markPaid, db, reportError } from '../lib/shop.mjs'

export default async (req) => {
  if (req.method !== 'POST') return json(405, { error: 'POST only' })
  const raw = await req.text()
  try {
    if (!webhookSignatureOk(raw, req.headers.get('x-razorpay-signature'))) return json(400, { error: 'bad signature' })
    const { event, payload } = JSON.parse(raw)
    const payment = payload?.payment?.entity
    const orderId = payment?.order_id || payload?.order?.entity?.id
    if (!orderId) return json(200, { ok: true, ignored: event })

    if (event === 'payment.captured' || event === 'order.paid') await markPaid(orderId, payment?.id || null)
    else if (event === 'payment.failed') {
      await db(`orders?razorpay_order_id=eq.${encodeURIComponent(orderId)}&status=eq.pending`, {
        method: 'PATCH', body: { status: 'failed', updated_at: new Date().toISOString() },
      })
    }
    return json(200, { ok: true })
  } catch (err) {
    console.error(err)
    await reportError(err, { function: 'razorpay-webhook' })
    return json(500, { error: 'webhook failed' }) // Razorpay retries
  }
}

export const config = { path: '/api/razorpay-webhook', rateLimit: { windowLimit: 300, windowSize: 60, aggregateBy: ['domain'] } }
