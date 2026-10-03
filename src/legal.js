// The policy pages: /privacy, /terms, /refunds, /shipping. Google (for sign-in)
// and Razorpay (for going live) both need these to exist.
// Contact details and shipping numbers come from the admin, so they stay in sync.
// These are a sensible starting point — have them read over before going live.
import './style.css'
import './pages.css'
import { brand } from './content.js'
import { $, esc, fillBrand, lenis, initCursor, pageEnter, gsap } from './shared.js'
import { shippingRules, money } from './commerce.js'

const UPDATED = '4 October 2026'
const email = brand.email ? `<a href="mailto:${esc(brand.email)}">${esc(brand.email)}</a>` : 'the email on our Contact page'
const where = esc(brand.location || 'India')
const ship = shippingRules(brand)
const shipLine = ship.fee
  ? `Shipping is ${money(ship.fee)} per order${ship.freeAbove != null ? `, and free on orders of ${money(ship.freeAbove)} or more` : ''}.`
  : 'Shipping is free on every order.'

const PAGES = {
  privacy: {
    title: 'Privacy <em class="serif">policy.</em>',
    body: `
      <p>This policy explains what ${esc(brand.name || 'EDGE')} (“we”, “us”) collects when you use this website, why, and what you can do about it. We collect as little as we can and we never sell your data.</p>
      <h2>What we collect</h2>
      <ul>
        <li><b>If you sign in with Google:</b> your name, email address and profile picture link, shared by Google with your permission. We never see your Google password.</li>
        <li><b>When you place an order:</b> your name, email, mobile number, delivery address and what you bought.</li>
        <li><b>Your wishlist, bag and saved addresses</b>, if you're signed in, so they're there on every device.</li>
        <li><b>In your browser only:</b> your bag (for guests), your last-used checkout details and a few display preferences, kept in local storage on your device.</li>
      </ul>
      <h2>Payments</h2>
      <p>Payments are handled by <b>Razorpay</b>. Your card, UPI and bank details go straight to Razorpay and never reach our servers. We only receive confirmation that a payment succeeded and its reference number. See Razorpay's privacy policy for how they handle your payment data.</p>
      <h2>Why we use it</h2>
      <ul>
        <li>To deliver your order and contact you about it (including by phone or WhatsApp for delivery).</li>
        <li>To keep your account, wishlist and bag working.</li>
        <li>To handle returns, refunds and questions you send us.</li>
        <li>To meet legal, tax and accounting requirements.</li>
      </ul>
      <p>We don't send marketing messages unless you ask us to, and we don't use advertising trackers.</p>
      <h2>Who else processes it</h2>
      <p>Only the services that run the shop for us: <b>Supabase</b> (our database and sign-in), <b>Netlify</b> (website hosting), <b>Razorpay</b> (payments), <b>Google</b> (sign-in) and the courier delivering your order, who receives your name, phone and address.</p>
      <h2>How long we keep it</h2>
      <p>Order records are kept for as long as tax and accounting law requires (generally up to 8 years). Your account, wishlist and saved addresses are kept until you ask us to delete them.</p>
      <h2>Your rights</h2>
      <p>Under India's Digital Personal Data Protection Act, 2023, you can ask to see, correct or delete your personal data, or withdraw your consent. Email ${email} and we'll respond within 30 days. Deleting your account doesn't delete order records we're legally required to keep.</p>
      <h2>Children</h2>
      <p>This site isn't meant for anyone under 18 to buy from without a parent or guardian.</p>
      <h2>Changes</h2>
      <p>If we change this policy, we'll update the date at the top of this page.</p>
      <h2>Contact</h2>
      <p>${esc(brand.name || 'EDGE')}, ${where} — ${email}</p>`,
  },
  terms: {
    title: 'Terms of <em class="serif">use.</em>',
    body: `
      <p>By using this website or buying from ${esc(brand.name || 'EDGE')}, you agree to these terms.</p>
      <h2>Orders</h2>
      <ul>
        <li>All prices are in Indian Rupees and include applicable taxes. ${shipLine}</li>
        <li>An order is confirmed once payment succeeds and you see an order number.</li>
        <li>Our designs are made in small runs. If something sells out or a mistake in a price or listing slips through, we may cancel the order and refund you in full.</li>
        <li>Colours on screen can differ slightly from the printed garment.</li>
      </ul>
      <h2>Payments</h2>
      <p>Payments are processed securely by Razorpay. We don't store your card, UPI or bank details.</p>
      <h2>Your account</h2>
      <p>You sign in with Google and are responsible for activity on your account. Tell us at ${email} if you think someone else has used it.</p>
      <h2>Our designs</h2>
      <p>All designs, artwork, photos and text on this site belong to ${esc(brand.name || 'EDGE')}. Please don't copy, reproduce or sell them without our written permission.</p>
      <h2>Liability</h2>
      <p>We're responsible for delivering what you ordered as described. To the extent the law allows, we aren't liable for indirect losses, and our total liability for an order is limited to what you paid for it.</p>
      <h2>Law</h2>
      <p>These terms are governed by the laws of India, and disputes are subject to the courts of India.</p>
      <h2>Also see</h2>
      <p><a href="/privacy.html">Privacy policy</a> · <a href="/refunds.html">Refunds &amp; cancellations</a> · <a href="/shipping.html">Shipping</a></p>
      <h2>Contact</h2>
      <p>${esc(brand.name || 'EDGE')}, ${where} — ${email}</p>`,
  },
  refunds: {
    title: 'Refunds &amp; <em class="serif">cancellations.</em>',
    body: `
      <h2>Cancelling an order</h2>
      <p>You can cancel any order until it ships. Email ${email} with your order number (it looks like EDGE-1001) and we'll refund you in full.</p>
      <h2>Wrong size</h2>
      <p>If the size isn't right, write to us within <b>7 days of delivery</b>. If the piece is unworn, unwashed and has its tags, we'll exchange it for another size while stock lasts, or refund it if we can't. Return shipping for size exchanges is paid by you.</p>
      <h2>Damaged or wrong item</h2>
      <p>If your order arrives damaged, misprinted or isn't what you ordered, email us within <b>48 hours of delivery</b> with your order number and photos. We'll send a replacement or refund you in full, including shipping, at no cost to you.</p>
      <h2>Refunds</h2>
      <p>Approved refunds go back to your original payment method through Razorpay within <b>5–7 business days</b>. Your bank may take a little longer to show it.</p>
      <h2>What we can't take back</h2>
      <p>Custom or made-to-order pieces (for example hall or club runs), and items that have been worn, washed or damaged after delivery.</p>
      <h2>Contact</h2>
      <p>${email}</p>`,
  },
  shipping: {
    title: 'Shipping <em class="serif">policy.</em>',
    body: `
      <h2>Where we ship</h2>
      <p>Anywhere in India.</p>
      <h2>Cost</h2>
      <p>${shipLine} You'll see the exact amount in your bag before you pay.</p>
      <h2>How long it takes</h2>
      <ul>
        <li>We pack and dispatch orders within <b>3–7 business days</b> — small runs, made with care.</li>
        <li>Delivery usually takes another <b>3–7 business days</b> depending on your PIN code.</li>
      </ul>
      <p>Once your order ships, we'll send you the courier and tracking number by email, SMS or WhatsApp, and you can see its status in <a href="/account.html#orders">your account</a> if you're signed in.</p>
      <h2>Delivery problems</h2>
      <p>Please check your address and phone number at checkout — the courier will call that number. If a parcel comes back to us because of an incorrect address or failed delivery attempts, we'll contact you to re-ship it, and re-shipping may be charged.</p>
      <h2>Contact</h2>
      <p>${email}</p>`,
  },
}

const page = document.body.dataset.page
const p = PAGES[page]
$('[data-legal-title]').innerHTML = p.title
$('[data-legal-body]').innerHTML = `<p class="mono legal__date">Last updated ${UPDATED}</p>${p.body}`

fillBrand()
initCursor()
gsap.from('.sub__head > *, .legal > *', { y: 24, opacity: 0, duration: 0.9, stagger: 0.03, ease: 'expo.out', delay: 0.2 })
pageEnter()
lenis?.start()
