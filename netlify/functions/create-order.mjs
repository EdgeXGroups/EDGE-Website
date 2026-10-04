// POST /api/create-order  { items: [{slug,size,qty}], contact: {email,phone}, address: {...} }
// Prices the bag from the database, opens a Razorpay order and a pending EDGE order.
import { handler, priceBag, checkCustomer, userFrom, razorpay, razorpayKeyId, db } from '../lib/shop.mjs'

export default handler(async (req) => {
  const body = await req.json().catch(() => ({}))
  const customer = checkCustomer(body)
  const [bag, user] = await Promise.all([priceBag(body.items), userFrom(req)])

  // our row first, so its number can go on the Razorpay order as the receipt
  const [order] = await db('orders', {
    method: 'POST', prefer: 'return=representation',
    body: { user_id: user?.id || null, ...customer, items: bag.lines, subtotal: bag.subtotal, shipping: bag.shipping, total: bag.total },
  })
  let rp
  try {
    rp = await razorpay('orders', {
      amount: Math.round(bag.total * 100), // paise
      currency: 'INR',
      receipt: order.number,
      notes: { edge_order: order.number, email: customer.email },
    })
  } catch (err) {
    await db(`orders?id=eq.${order.id}`, { method: 'DELETE' }).catch(() => {}) // no half-made orders
    throw err
  }
  await db(`orders?id=eq.${order.id}`, { method: 'PATCH', body: { razorpay_order_id: rp.id } })

  return {
    number: order.number,
    razorpayOrderId: rp.id,
    keyId: razorpayKeyId(),
    amount: rp.amount,
    currency: rp.currency,
    total: bag.total,
    customer: { name: customer.name, email: customer.email, phone: customer.phone },
  }
})

// at most 10 calls a minute from one visitor — stops scripts hammering it
export const config = { path: '/api/create-order', rateLimit: { windowLimit: 10, windowSize: 60, aggregateBy: ['ip', 'domain'] } }
