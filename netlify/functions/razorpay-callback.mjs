// POST /api/razorpay-callback — where Razorpay sends the customer back after paying.
// The checkout uses Razorpay's redirect mode: the bank / OTP page opens in the same
// tab instead of a pop-up (pop-ups get blocked, and the payment then hangs).
// Razorpay posts a form here; we check the signature, mark the order paid and
// send the customer back to the checkout page with the result.
import { paymentSignatureOk, markPaid } from '../lib/shop.mjs'

export default async (req) => {
  const back = (query) => Response.redirect(`${new URL(req.url).origin}/checkout.html?${query}`, 303)
  if (req.method !== 'POST') return back('')
  const form = await req.formData().catch(() => null)
  const orderId = form?.get('razorpay_order_id')
  const paymentId = form?.get('razorpay_payment_id')
  const signature = form?.get('razorpay_signature')

  // a failed or abandoned payment comes back with error[…] fields instead
  if (!orderId || !paymentId) {
    const reason = form?.get('error[description]') || 'The payment didn’t go through.'
    return back(`failed=${encodeURIComponent(reason)}`)
  }
  try {
    if (!paymentSignatureOk(orderId, paymentId, signature)) {
      return back(`failed=${encodeURIComponent('We couldn’t confirm that payment. If money left your account, message us — nothing is lost.')}`)
    }
    const order = await markPaid(orderId, paymentId)
    return back(`paid=${encodeURIComponent(order?.number || '')}`)
  } catch (err) {
    console.error(err)
    return back(`failed=${encodeURIComponent('Something went wrong confirming your payment. If you were charged, message us — nothing is lost.')}`)
  }
}

export const config = { path: '/api/razorpay-callback' }
