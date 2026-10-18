"use client";

import { FormEvent, useState } from "react";

const API = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api").replace(/\/$/, "");
type Variant = { id: string; name: string; priceCents: number };
type Artwork = { id: string; title: string; slug: string; status: string; imageUrl?: string | null; variants: Variant[] };
type Order = { id: string; orderNumber: string; customerName: string; customerEmail: string; status: string; totalCents: number; createdAt: string };
type PrintifyStatus = { configured: boolean; note: string };

type Section = "overview" | "artwork" | "orders" | "printify";

export default function AdminClient({ initialSection = "overview" }: { initialSection?: Section }) {
  const [key, setKey] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [section] = useState<Section>(initialSection);
  const [artworks, setArtworks] = useState<Artwork[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [printify, setPrintify] = useState<PrintifyStatus | null>(null);
  const [shops, setShops] = useState<unknown>(null);
  const [products, setProducts] = useState<unknown>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function request(path: string, init: RequestInit = {}) {
    const response = await fetch(`${API}${path}`, {
      ...init,
      headers: { "Content-Type": "application/json", "x-admin-key": key, ...(init.headers || {}) },
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(Array.isArray(data.message) ? data.message.join(", ") : data.message || `Request failed (${response.status})`);
    return data;
  }

  async function load() {
    setBusy(true); setError(""); setMessage("");
    try {
      const [a, o, p] = await Promise.all([
        request("/admin/artworks"), request("/orders/admin"), fetch(`${API}/printify/status`, { cache: "no-store" }).then((r) => r.json()),
      ]);
      setArtworks(a); setOrders(o); setPrintify(p); setUnlocked(true);
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to connect."); setUnlocked(false); }
    finally { setBusy(false); }
  }

  async function createArtwork(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setMessage(""); setBusy(true);
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    try {
      await request("/admin/artworks", { method: "POST", body: JSON.stringify({
        title: form.get("title"), slug: form.get("slug"), description: form.get("description"),
        imageUrl: form.get("imageUrl"), variantName: form.get("variantName"),
        priceCents: Math.round(Number(form.get("price")) * 100),
        published: form.get("published") === "on", featured: form.get("featured") === "on",
      }) });
      setMessage("Artwork saved."); formElement.reset(); await load();
    } catch (e) { setError(e instanceof Error ? e.message : "Could not save artwork."); }
    finally { setBusy(false); }
  }

  async function togglePublish(artwork: Artwork) {
    setError(""); setMessage(""); setBusy(true);
    try {
      await request(`/admin/artworks/${artwork.id}/publish`, { method: "POST", body: JSON.stringify({ published: artwork.status !== "PUBLISHED" }) });
      setMessage(`${artwork.title} updated.`); await load();
    } catch (e) { setError(e instanceof Error ? e.message : "Could not update artwork."); }
    finally { setBusy(false); }
  }

  async function loadPrintify() {
    setError(""); setMessage(""); setBusy(true);
    try {
      const [s, p] = await Promise.all([request("/printify/shops"), request("/printify/products")]);
      setShops(s); setProducts(p); setMessage("Printify data loaded from the connected account.");
    } catch (e) { setError(e instanceof Error ? e.message : "Could not load Printify."); }
    finally { setBusy(false); }
  }

  if (!unlocked) return <main className="admin-login">
    <a className="wordmark" href="/">BUNK<span>24</span></a><div className="eyebrow">Private workspace</div><h1>Gallery admin.</h1>
    <p className="muted">Enter the local ADMIN_API_KEY from your root .env file. It is kept in this page's memory only.</p>
    <form onSubmit={(event) => { event.preventDefault(); void load(); }}><label className="field-label">Admin API key<input type="password" value={key} onChange={(event) => setKey(event.target.value)} required autoComplete="current-password" /></label><button className="button" disabled={busy || !key}>{busy ? "Connecting…" : "Unlock workspace"}</button></form>
    {error && <p className="error-text" role="alert">{error}</p>}
    <p className="muted small-copy">This is a development admin gate, not production-grade user authentication.</p>
  </main>;

  return <main className="admin-layout">
    <aside className="admin-side"><a className="wordmark" href="/">BUNK<span>24</span></a><p className="muted small-copy">GALLERY ADMIN</p><nav aria-label="Admin navigation">
      {([{ key: "overview", label: "Overview", href: "/admin" }, { key: "artwork", label: "Artwork & prints", href: "/admin/artwork" }, { key: "orders", label: "Orders", href: "/admin/orders" }, { key: "printify", label: "Printify", href: "/admin/printify" }] as const).map((item) => <a key={item.key} className={section === item.key ? "admin-nav active" : "admin-nav"} href={item.href}>{item.label}</a>)}
      <button className="admin-nav" onClick={() => { setUnlocked(false); setKey(""); }}>Lock workspace</button>
    </nav></aside>
    <section className="admin-main"><div className="eyebrow">Workspace / {section}</div><h1>{section === "overview" ? "Good to see you." : section === "artwork" ? "Artwork & prints" : section === "orders" ? "Orders" : "Printify connection"}</h1>
      {error && <p className="error-text" role="alert">{error}</p>}{message && <p className="notice" role="status">{message}</p>}
      {section === "overview" && <><div className="stat-grid"><article className="stat"><span className="muted">ARTWORKS</span><strong>{artworks.length}</strong><p className="muted small-copy">Draft and published works</p></article><article className="stat"><span className="muted">ORDERS</span><strong>{orders.length}</strong><p className="muted small-copy">Most recent 100 orders</p></article><article className="stat"><span className="muted">PRINTIFY</span><strong>{printify?.configured ? "Ready" : "Not set"}</strong><p className="muted small-copy">{printify?.note}</p></article></div><p className="muted">Use the sections to create artwork, publish print listings, review orders, and inspect the connected Printify shop.</p></>}
      {section === "artwork" && <div className="admin-content-grid"><form className="admin-form" onSubmit={createArtwork}><h2>Add artwork</h2><label className="field-label">Title<input name="title" required maxLength={160} /></label><label className="field-label">URL slug<input name="slug" required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" placeholder="my-artwork-title" /></label><label className="field-label">Description<textarea name="description" rows={4} /></label><label className="field-label">Artwork image URL<input name="imageUrl" type="url" placeholder="https://…" /></label><label className="field-label">Print option name<input name="variantName" defaultValue="18 × 24 in print" required /></label><label className="field-label">Retail price (USD)<input name="price" type="number" min="0.01" step="0.01" required /></label><label className="check-label"><input name="featured" type="checkbox" /> Feature on home page</label><label className="check-label"><input name="published" type="checkbox" /> Publish immediately</label><button className="button" disabled={busy}>Save artwork</button></form><div><h2>Catalogue</h2>{artworks.length ? artworks.map((artwork) => <article className="admin-list-item" key={artwork.id}><div><strong>{artwork.title}</strong><p className="muted small-copy">/{artwork.slug} · {artwork.status} · {artwork.variants.length} print option(s)</p></div><button className="button secondary" disabled={busy} onClick={() => void togglePublish(artwork)}>{artwork.status === "PUBLISHED" ? "Unpublish" : "Publish"}</button></article>) : <p className="muted">No artwork yet.</p>}</div></div>}
      {section === "orders" && <div>{orders.length ? orders.map((order) => <article className="admin-list-item" key={order.id}><div><strong>{order.orderNumber}</strong><p className="muted small-copy">{order.customerName} · {order.customerEmail}</p><p className="muted small-copy">{new Date(order.createdAt).toLocaleString()} · {order.status}</p></div><strong>{(order.totalCents / 100).toLocaleString("en-US", { style: "currency", currency: "USD" })}</strong></article>) : <p className="muted">No orders have been submitted.</p>}<p className="notice">Orders created before payment integration are unpaid records. They are not automatically sent to Printify.</p></div>}
      {section === "printify" && <div><p>{printify?.note}</p><button className="button" disabled={busy || !printify?.configured} onClick={() => void loadPrintify()}>{busy ? "Loading…" : "Fetch shops & products"}</button>{shops !== null && <><h2>Connected shops</h2><pre className="json-panel">{JSON.stringify(shops, null, 2)}</pre></>}{products !== null && <><h2>Printify products</h2><pre className="json-panel">{JSON.stringify(products, null, 2)}</pre></>}<p className="muted small-copy">This reads your connected Printify account. Product creation, publishing, and paid-order submission are not enabled in this stage.</p></div>}
    </section>
  </main>;
}
