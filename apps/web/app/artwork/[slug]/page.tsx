import Link from "next/link";
import { notFound } from "next/navigation";
import AddToCart from "../../../components/add-to-cart";
import { apiGet, Artwork } from "../../../lib/api";

export const dynamic = "force-dynamic";

export default async function ArtworkPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  let artwork: Artwork;
  try { artwork = await apiGet<Artwork>(`/artworks/${encodeURIComponent(slug)}`); }
  catch { notFound(); }

  return <main className="site-shell">
    <header className="topbar"><Link className="wordmark" href="/">BUNK<span>24</span></Link><nav className="nav"><Link href="/shop">Shop</Link><Link href="/cart">Cart</Link></nav></header>
    <p className="breadcrumbs"><Link href="/shop">Shop</Link> / {artwork.title}</p>
    <section className="artwork-detail">
      <div className="detail-image">{artwork.imageUrl ? <img src={artwork.imageUrl} alt={artwork.title} style={{ viewTransitionName: `artwork-${artwork.slug.replace(/[^a-zA-Z0-9_-]/g, "-")}` }} /> : <div className="artwork-placeholder" />}</div>
      <div className="detail-copy"><div className="eyebrow">TURNER / PRINT EDITION</div><h1>{artwork.title}</h1><p className="detail-description">{artwork.description || "A print edition from the BUNK24 Gallery collection."}</p><AddToCart artwork={artwork} variants={artwork.variants} /><p className="muted small-copy">Printed on demand. Production and delivery timing will be confirmed at checkout once fulfillment is connected.</p></div>
    </section>
    <footer className="site-footer"><Link href="/shop">← Back to the collection</Link><span className="muted">BUNK24 Gallery</span></footer>
  </main>;
}
