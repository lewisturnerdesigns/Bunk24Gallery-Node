import Link from "next/link";
import CheckoutClient from "./checkout-client";

export default function CheckoutPage() {
  return <main className="site-shell">
    <header className="topbar"><Link className="wordmark" href="/">BUNK<span>24</span></Link><nav className="nav"><Link href="/shop">Shop</Link><Link href="/cart">Cart</Link></nav></header>
    <section className="page-intro"><div className="eyebrow">Almost yours</div><h1>Checkout.</h1><p className="muted">Enter your details to prepare your order.</p></section>
    <CheckoutClient />
  </main>;
}
