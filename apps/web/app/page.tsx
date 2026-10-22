import Link from "next/link";
import { apiGet, Artwork, money } from "../lib/api";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  let artworks: Artwork[] = [];
  try { artworks = await apiGet<Artwork[]>("/artworks"); } catch { /* API status is shown by the empty catalogue state below. */ }
  const featured = artworks.filter((artwork) => artwork.featured).slice(0, 4);
  const display = featured.length ? featured : artworks.slice(0, 4);

  return <main className="site-shell">
    <header className="topbar"><Link className="wordmark" href="/">BUNK<span>24</span></Link><nav className="nav"><Link href="/shop">Shop</Link><Link href="/about">About</Link><Link href="/cart">Cart</Link><Link href="/admin">Admin</Link></nav></header>
    <section className="hero">
      <div><div className="eyebrow">Art by Turner · Atlanta, GA</div><h1>MADE TO<br />MAKE YOU<br />LOOK.</h1><p>Contemporary work shaped by instinct, texture, and the beauty of things left a little unfinished.</p><div className="actions"><Link className="button" href="/shop">Explore the prints ↗</Link><Link className="button secondary" href="/about">Meet the artist</Link></div></div>
      <div className="art-stage" aria-label="Featured artwork"><div className="artwork-placeholder" /><div className="art-label"><span>TURNER / PRINT EDITIONS</span><span>BUNK24</span></div></div>
    </section>
    <section className="featured-section gallery-bento-section"><div className="section-head"><div><div className="eyebrow">A closer look / 01—04</div><h2>Selected works<span>.</span></h2></div><Link className="text-link" href="/shop">View the collection ↗</Link></div>
      {display.length ? <div className="gallery-bento-grid">{display.map((artwork, index) => <article className={`gallery-bento-card gallery-bento-card-${index + 1}`} key={artwork.id}><Link className="gallery-bento-image" href={`/artwork/${artwork.slug}`} aria-label={`View ${artwork.title}`}>{artwork.imageUrl ? <img src={artwork.imageUrl} alt={artwork.title} loading="lazy" /> : <div className="gallery-bento-placeholder"><span>BUNK24 / TURNER</span></div>}<span className="gallery-bento-index">0{index + 1} / EDITION</span></Link><div className="product-meta"><div><h2><Link href={`/artwork/${artwork.slug}`}>{artwork.title}</Link></h2><p className="muted">Print editions · {artwork.variants.length} option{artwork.variants.length === 1 ? "" : "s"}</p></div><strong>{artwork.variants.length ? money(Math.min(...artwork.variants.map((variant) => variant.priceCents))) : "—"}</strong></div></article>)}
        <aside className="gallery-bento-note"><span className="eyebrow">BUNK24 / THE IDEA</span><p>Not made to match. Made to <em>mean something.</em></p><span className="gallery-bento-note-bottom">ART BY TURNER · ATLANTA, GA <span>↗</span></span></aside>
      </div> : <p className="muted">The collection is being prepared. New print editions will appear here soon.</p>}
    </section>
    <section id="about" className="about-band"><div className="eyebrow">The artist</div><h2>Art that leaves room for your own interpretation.</h2><p className="muted">Original work by Turner, produced as print editions and made to find a home beyond the studio.</p><Link className="text-link" href="/about">More about BUNK24 ↗</Link></section>
    <footer className="site-footer"><span className="wordmark">BUNK<span>24</span></span><span className="muted">© {new Date().getFullYear()} BUNK24 Gallery</span></footer>
  </main>;
}
