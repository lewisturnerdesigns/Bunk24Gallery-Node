"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";

const API = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api").replace(/\/$/, "");
type Variant = { id: string; name: string; priceCents: number };
type Artwork = { id: string; title: string; slug: string; status: string; imageUrl?: string | null; variants: Variant[] };
type Order = { id: string; orderNumber: string; customerName: string; customerEmail: string; status: string; totalCents: number; createdAt: string };
type PrintifyStatus = { configured: boolean; tokenConfigured?: boolean; shopConfigured?: boolean; note: string };

type Section = "overview" | "artwork" | "orders" | "printify";

export default function AdminClient({ initialSection = "overview" }: { initialSection?: Section }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [token, setToken] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const [section] = useState<Section>(initialSection);
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [artworks, setArtworks] = useState<Artwork[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [printify, setPrintify] = useState<PrintifyStatus | null>(null);
  const [shops, setShops] = useState<unknown>(null);
  const [products, setProducts] = useState<unknown>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function request(path: string, init: RequestInit = {}, authToken = token) {
    const response = await fetch(`${API}${path}`, {
      ...init,
      headers: { "Content-Type": "application/json", ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}), ...(init.headers || {}) },
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(Array.isArray(data.message) ? data.message.join(", ") : data.message || `Request failed (${response.status})`);
    return data;
  }

  async function load(authToken = token) {
    setBusy(true); setError(""); setMessage("");
    try {
      const [a, o, p] = await Promise.all([
        request("/admin/artworks", {}, authToken), request("/orders/admin", {}, authToken), fetch(`${API}/printify/status`, { cache: "no-store" }).then((r) => r.json()),
      ]);
      setArtworks(a); setOrders(o); setPrintify(p); setUnlocked(true);
    } catch (e) {
      const detail = e instanceof Error ? e.message : "Unable to connect.";
      setError(detail);
      // Keep the dashboard open for server/database errors; only auth failures sign out.
      if (/401|403|session has expired|invalid session|please sign in/i.test(detail)) {
        window.sessionStorage.removeItem("bunk24-admin-token");
        setToken("");
        setUnlocked(false);
      }
    } finally {
      setAuthReady(true);
      setBusy(false);
    }
  }

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setBusy(true);
    try {
      const response = await fetch(`${API}/auth/admin/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || typeof data.accessToken !== "string") throw new Error(data.message || "Email or password is incorrect.");
      window.sessionStorage.setItem("bunk24-admin-token", data.accessToken);
      setToken(data.accessToken);
      await load(data.accessToken);
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to sign in."); }
    finally { setBusy(false); }
  }

  useEffect(() => {
    const saved = window.sessionStorage.getItem("bunk24-admin-token");
    if (saved) {
      setToken(saved);
      void load(saved);
    } else {
      setAuthReady(true);
    }
    // Restore the short-lived admin session when moving between admin pages.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      const s = await request("/printify/shops");
      setShops(s);
      if (!printify?.shopConfigured) {
        setMessage("Your Printify shops loaded. Add the correct shop ID to the root .env file, restart the API, then fetch again to load products.");
        return;
      }
      const p = await request("/printify/products");
      setProducts(p); setMessage("Printify shops and products loaded.");
    } catch (e) { setError(e instanceof Error ? e.message : "Could not load Printify."); }
    finally { setBusy(false); }
  }

  const analytics = useMemo(() => {
    const paidOrders = orders.filter((order) => order.status === "PAID" || order.status === "FULFILLING" || order.status === "SHIPPED");
    const revenueCents = paidOrders.reduce((sum, order) => sum + order.totalCents, 0);
    const days = Array.from({ length: 7 }, (_, index) => {
      const date = new Date(); date.setHours(0, 0, 0, 0); date.setDate(date.getDate() - (6 - index));
      const next = new Date(date); next.setDate(next.getDate() + 1);
      const dayOrders = paidOrders.filter((order) => { const created = new Date(order.createdAt); return created >= date && created < next; });
      return { label: date.toLocaleDateString("en-US", { weekday: "short" }), amount: dayOrders.reduce((sum, order) => sum + order.totalCents, 0), count: dayOrders.length };
    });
    const maxDay = Math.max(1, ...days.map((day) => day.amount));
    return { paidOrders, revenueCents, days, maxDay, pending: orders.filter((order) => order.status === "PENDING").length, published: artworks.filter((artwork) => artwork.status === "PUBLISHED").length, drafts: artworks.filter((artwork) => artwork.status === "DRAFT").length };
  }, [orders, artworks]);

  if (!authReady) return <main className="admin-login admin-login-normal admin-session-check">
    <Link className="wordmark" href="/">BUNK<span>24</span></Link>
    <div className="eyebrow">STUDIO CONTROL</div>
    <h1>Opening your studio…</h1>
    <p className="muted">Restoring your secure session.</p>
  </main>;

  if (!unlocked) return <main className="admin-login admin-login-normal">
    <a className="wordmark" href="/">BUNK<span>24</span></a>
    <div className="eyebrow">STUDIO CONTROL</div>
    <h1>Welcome back.</h1>
    <p className="muted">Sign in to manage your artwork, print editions, and orders.</p>
    <form onSubmit={(event) => void login(event)} className="admin-login-form">
      <label className="field-label">Email address<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required autoComplete="username" placeholder="you@example.com" /></label>
      <label className="field-label">Password<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required autoComplete="current-password" /></label>
      <button className="button" disabled={busy || !email || !password}>{busy ? "Signing in…" : "Sign in"} <span aria-hidden="true">→</span></button>
    </form>
    {error && <p className="error-text" role="alert">{error}</p>}
    <p className="muted small-copy">BUNK24 Studio · Private workspace</p>
  </main>;

  return <main className="admin-layout">
    <aside className={sidebarExpanded ? "admin-side expanded" : "admin-side"} onMouseEnter={() => setSidebarExpanded(true)} onMouseLeave={() => setSidebarExpanded(false)}><Link className="wordmark" href="/" aria-label="BUNK24 home"><span className="side-brand-full">BUNK<span>24</span></span><span className="side-brand-short">B<span>24</span></span></Link><p className="muted small-copy side-caption">STUDIO</p><nav aria-label="Admin navigation">
      {([{ key: "overview", label: "Overview", icon: "⌂", href: "/admin" }, { key: "artwork", label: "Artwork & prints", icon: "▧", href: "/admin/artwork" }, { key: "orders", label: "Orders", icon: "↗", href: "/admin/orders" }, { key: "printify", label: "Printify", icon: "◉", href: "/admin/printify" }] as const).map((item) => <Link key={item.key} title={item.label} className={section === item.key ? "admin-nav active" : "admin-nav"} href={item.href}><span className="admin-nav-icon" aria-hidden="true">{item.icon}</span><span className="admin-nav-label">{item.label}</span></Link>)}
      <button className="admin-nav" title="Sign out" onClick={() => { window.sessionStorage.removeItem("bunk24-admin-token"); setUnlocked(false); setToken(""); setPassword(""); }}><span className="admin-nav-icon" aria-hidden="true">↪</span><span className="admin-nav-label">Sign out</span></button>
    </nav></aside>
    <section className="admin-main"><div className="eyebrow">Workspace / {section}</div><h1>{section === "overview" ? "Good to see you." : section === "artwork" ? "Artwork & prints" : section === "orders" ? "Orders" : "Printify connection"}</h1>
      {error && <p className="error-text" role="alert">{error}</p>}{message && <p className="notice" role="status">{message}</p>}
      {section === "overview" && <div className="admin-dashboard">
        <div className="admin-welcome-row"><div><p className="muted small-copy">YOUR STUDIO AT A GLANCE</p><h2>Overview</h2><p className="muted">A snapshot of your gallery activity and print business.</p></div><Link className="button" href="/admin/artwork">Add artwork <span>＋</span></Link></div>
        <div className="stat-grid analytics-stats">
          <article className="stat"><span className="muted">PAID SALES</span><strong>{(analytics.revenueCents / 100).toLocaleString("en-US", { style: "currency", currency: "USD" })}</strong><p className="muted small-copy">Paid, fulfilling and shipped orders</p></article>
          <article className="stat"><span className="muted">ORDERS</span><strong>{orders.length}</strong><p className="muted small-copy">{analytics.pending} awaiting payment/status update</p></article>
          <article className="stat"><span className="muted">PUBLISHED WORKS</span><strong>{analytics.published}</strong><p className="muted small-copy">{analytics.drafts} draft works in catalogue</p></article>
          <article className="stat"><span className="muted">PRINTIFY</span><strong className={printify?.configured ? "status-ready" : ""}>{printify?.configured ? "Connected" : printify?.tokenConfigured ? "Token set" : "Not connected"}</strong><p className="muted small-copy">{printify?.configured ? "API credentials detected" : printify?.tokenConfigured ? "Fetch shops to find your shop ID" : "Add a Printify API token"}</p></article>
        </div>
        <div className="admin-dashboard-grid">
          <article className="admin-panel analytics-chart"><div className="panel-heading"><div><p className="muted small-copy">LAST 7 DAYS</p><h2>Paid sales activity</h2></div><span className="chart-legend"><i /> Sales</span></div>
            <div className="sales-chart" role="img" aria-label="Paid sales by day for the last seven days">{analytics.days.map((day) => <div className="sales-day" key={day.label} title={day.label + ": " + (day.amount / 100).toLocaleString("en-US", { style: "currency", currency: "USD" })}><div className="sales-bar-track"><div className="sales-bar" style={{ height: `${Math.max(day.amount > 0 ? 8 : 2, day.amount / analytics.maxDay * 100)}%` }} /></div><span>{day.label}</span></div>)}</div>
            <p className="muted small-copy">Revenue is calculated from orders marked paid, fulfilling, or shipped. New unpaid order records do not count as sales.</p>
          </article>
          <article className="admin-panel status-panel"><div className="panel-heading"><div><p className="muted small-copy">ORDER PIPELINE</p><h2>Order status</h2></div><Link href="/admin/orders">View all →</Link></div>
            {(["PENDING", "PAID", "FULFILLING", "SHIPPED", "CANCELLED", "REFUNDED"] as const).map((status) => { const count = orders.filter((order) => order.status === status).length; return <div className="status-row" key={status}><span><i className={`status-dot ${status.toLowerCase()}`} />{status.charAt(0) + status.slice(1).toLowerCase()}</span><strong>{count}</strong></div>; })}
          </article>
        </div>
        <article className="admin-panel recent-orders"><div className="panel-heading"><div><p className="muted small-copy">LATEST ACTIVITY</p><h2>Recent orders</h2></div><Link href="/admin/orders">All orders →</Link></div>
          {orders.length ? <div className="recent-order-list">{orders.slice(0, 5).map((order) => <div className="recent-order" key={order.id}><div><strong>{order.orderNumber}</strong><p className="muted small-copy">{order.customerName} · {new Date(order.createdAt).toLocaleDateString()}</p></div><span className={`order-status-pill ${order.status.toLowerCase()}`}>{order.status}</span><strong>{(order.totalCents / 100).toLocaleString("en-US", { style: "currency", currency: "USD" })}</strong></div>)}</div> : <p className="muted">No orders yet. Once customers place orders, the latest activity will appear here.</p>}
        </article>
      </div>}
      {section === "artwork" && <div className="admin-content-grid"><form className="admin-form" onSubmit={createArtwork}><h2>Add artwork</h2><label className="field-label">Title<input name="title" required maxLength={160} /></label><label className="field-label">URL slug<input name="slug" required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" placeholder="my-artwork-title" /></label><label className="field-label">Description<textarea name="description" rows={4} /></label><label className="field-label">Artwork image URL<input name="imageUrl" type="url" placeholder="https://…" /></label><label className="field-label">Print option name<input name="variantName" defaultValue="18 × 24 in print" required /></label><label className="field-label">Retail price (USD)<input name="price" type="number" min="0.01" step="0.01" required /></label><label className="check-label"><input name="featured" type="checkbox" /> Feature on home page</label><label className="check-label"><input name="published" type="checkbox" /> Publish immediately</label><button className="button" disabled={busy}>Save artwork</button></form><div><h2>Catalogue</h2>{artworks.length ? artworks.map((artwork) => <article className="admin-list-item" key={artwork.id}><div><strong>{artwork.title}</strong><p className="muted small-copy">/{artwork.slug} · {artwork.status} · {artwork.variants.length} print option(s)</p></div><button className="button secondary" disabled={busy} onClick={() => void togglePublish(artwork)}>{artwork.status === "PUBLISHED" ? "Unpublish" : "Publish"}</button></article>) : <p className="muted">No artwork yet.</p>}</div></div>}
      {section === "orders" && <div>{orders.length ? orders.map((order) => <article className="admin-list-item" key={order.id}><div><strong>{order.orderNumber}</strong><p className="muted small-copy">{order.customerName} · {order.customerEmail}</p><p className="muted small-copy">{new Date(order.createdAt).toLocaleString()} · {order.status}</p></div><strong>{(order.totalCents / 100).toLocaleString("en-US", { style: "currency", currency: "USD" })}</strong></article>) : <p className="muted">No orders have been submitted.</p>}<p className="notice">Orders created before payment integration are unpaid records. They are not automatically sent to Printify.</p></div>}
      {section === "printify" && <div><p>{printify?.note}</p><button className="button" disabled={busy || !printify?.tokenConfigured} onClick={() => void loadPrintify()}>{busy ? "Loading…" : "Fetch shops & products"}</button>{shops !== null && <><h2>Connected shops</h2><pre className="json-panel">{JSON.stringify(shops, null, 2)}</pre></>}{products !== null && <><h2>Printify products</h2><pre className="json-panel">{JSON.stringify(products, null, 2)}</pre></>}<p className="muted small-copy">This reads your connected Printify account. Product creation, publishing, and paid-order submission are not enabled in this stage.</p></div>}
    </section>
  </main>;
}
