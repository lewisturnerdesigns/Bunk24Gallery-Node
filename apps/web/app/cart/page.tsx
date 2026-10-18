import Link from "next/link";
import CartClient from "./cart-client";

export default function CartPage() {
  return <main className="site-shell">
    <header className="topbar"><Link className="wordmark" href="/">BUNK<span>24</span></Link><nav className="nav"><Link href="/shop">Shop</Link><Link href="/about">About</Link></nav></header>
    <section className="page-intro"><div className="eyebrow">Your selection</div><h1>Shopping cart.</h1></section>
    <CartClient />
    <footer className="site-footer"><Link href="/shop">← Continue shopping</Link><span className="muted">BUNK24 Gallery</span></footer>
  </main>;
}
