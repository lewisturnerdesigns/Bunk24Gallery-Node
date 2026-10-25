import Link from "next/link";
import { apiGet, type Artwork } from "../../lib/api";
import PortfolioView from "../../components/portfolio-view";

export const dynamic = "force-dynamic";

export default async function ShopPage() {
  let artworks: Artwork[] = [];
  let unavailable = false;
  try { artworks = await apiGet<Artwork[]>("/artworks"); } catch { unavailable = true; }

  return <main className="site-shell">
    <header className="topbar"><Link className="wordmark" href="/">BUNK<span>24</span></Link><nav className="nav"><Link href="/shop">Shop</Link><Link href="/about">About</Link><Link href="/cart">Cart</Link></nav></header>
    <section className="shop-portfolio-hero">
      <div className="shop-portfolio-topline"><span>ARTIST PORTFOLIO / 01</span><span>ATLANTA, GEORGIA</span></div>
      <div className="shop-portfolio-title-row"><h1><span className="shop-title-serif">Selected</span><span className="shop-title-sans"> works<span className="shop-title-period">.</span></span></h1><p className="shop-portfolio-intro-copy">A living collection of paintings and print editions by Turner. Made from instinct, built through texture, and meant to be lived with.</p></div>
      <div className="shop-portfolio-bottomline"><span>PAINTINGS / PRINT EDITIONS</span><span>{artworks.length.toString().padStart(2, "0")} WORKS IN THE COLLECTION <i>↘</i></span></div>
    </section>
    {unavailable ? <p className="notice">The catalogue is temporarily unavailable. Make sure the API is running and try again.</p> :
      artworks.length === 0 ? <div className="empty-state"><h2>The collection is taking shape.</h2><p className="muted">Published artwork will appear here once it is added in the admin tools.</p></div> :
      <PortfolioView artworks={artworks} />}
    <footer className="site-footer"><span className="wordmark">BUNK<span>24</span></span><span className="muted">© {new Date().getFullYear()} BUNK24 Gallery</span></footer>
  </main>;
}
