import Link from "next/link";

export default function AboutPage() {
  return <main className="site-shell">
    <header className="topbar"><Link className="wordmark" href="/">BUNK<span>24</span></Link><nav className="nav"><Link href="/shop">Shop</Link><Link href="/cart">Cart</Link></nav></header>
    <section className="page-intro"><div className="eyebrow">The artist</div><h1>Art that leaves room for you.</h1><p className="detail-description">BUNK24 is the evolving home for Turner’s paintings and print editions—work shaped by instinct, texture, and the beauty of things left a little unfinished.</p><Link className="button" href="/shop">Explore the collection</Link></section>
    <footer className="site-footer"><span className="wordmark">BUNK<span>24</span></span><span className="muted">© {new Date().getFullYear()} BUNK24 Gallery</span></footer>
  </main>;
}
