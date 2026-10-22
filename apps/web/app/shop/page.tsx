import Link from "next/link";
import { apiGet, Artwork, money } from "../../lib/api";

export const dynamic = "force-dynamic";

export default async function ShopPage() {
  let artworks: Artwork[] = [];
  let unavailable = false;
  try { artworks = await apiGet<Artwork[]>("/artworks"); } catch { unavailable = true; }

  return <main className="site-shell">
    <header className="topbar"><Link className="wordmark" href="/">BUNK<span>24</span></Link><nav className="nav"><Link href="/shop">Shop</Link><Link href="/about">About</Link><Link href="/cart">Cart</Link></nav></header>
    <section className="page-intro"><div className="eyebrow">The collection</div><h1>Prints & editions.</h1><p className="muted">Artwork by Turner, made to live with.</p></section>
    {unavailable ? <p className="notice">The catalogue is temporarily unavailable. Make sure the API is running and try again.</p> :
      artworks.length === 0 ? <div className="empty-state"><h2>The collection is taking shape.</h2><p className="muted">Published artwork will appear here once it is added in the admin tools.</p></div> :
      <section className="shop-bento-grid shop-fluid-grid" aria-label="Art print collection">{artworks.map((artwork, index) => <article className={`product-card shop-bento-card shop-bento-card-${(index % 6) + 1}`} key={artwork.id}>
        <Link className="product-image" href={`/artwork/${artwork.slug}`}>{artwork.imageUrl ? <img src={artwork.imageUrl} alt={artwork.title} /> : <span> BUNK24 / {artwork.title}</span>}</Link>
        <div className="product-meta"><div><h2><Link href={`/artwork/${artwork.slug}`}>{artwork.title}</Link></h2><p className="muted">{artwork.variants.length} print option{artwork.variants.length === 1 ? "" : "s"}</p></div><strong>{artwork.variants.length ? money(Math.min(...artwork.variants.map((variant) => variant.priceCents))) : "—"}</strong></div>
      </article>)}</section>}
    <footer className="site-footer"><span className="wordmark">BUNK<span>24</span></span><span className="muted">© {new Date().getFullYear()} BUNK24 Gallery</span></footer>
  </main>;
}
