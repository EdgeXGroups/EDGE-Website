// POST /api/verify-payment  { razorpay_order_id, razorpay_payment_id, razorpay_signature }
// Called by the checkout right after Razorpay says "paid". The signature proves it.
import { handler, paymentSignatureOk, markPaid, HttpError } from '../lib/shop.mjs'

export default handler(async (req) => {
  const { razorpay_order_id: orderId, razorpay_payment_id: paymentId, razorpay_signature: signature } = await req.json().catch(() => ({}))
  if (!orderId || !paymentId || !paymentSignatureOk(orderId, paymentId, signature)) {
    throw new HttpError(400, 'We couldn’t confirm that payment. If money left your account, message us with your order number — nothing is lost.')
  }
  const order = await markPaid(orderId, paymentId)
  if (!order) throw new HttpError(404, 'Order not found.')
  return { number: order.number, status: order.status }
})

export const config = { path: '/api/verify-payment' }
