export default function AdminPage() {
  return (
    <main className="admin-layout">
      <aside className="admin-side">
        <a className="wordmark" href="/">BUNK<span>24</span></a>
        <p className="muted" style={{ fontSize: 11, marginTop: 8 }}>GALLERY ADMIN</p>
        <nav aria-label="Admin navigation">
          <a className="active" href="/admin">Overview</a>
          <a href="/admin">Artwork & prints</a>
          <a href="/admin">Orders</a>
          <a href="/admin">Settings</a>
        </nav>
      </aside>
      <section className="admin-main">
        <div className="eyebrow">Workspace / Overview</div>
        <h1>Good to see you.</h1>
        <p className="muted" style={{ marginBottom: 28 }}>Your gallery workspace is ready to build out.</p>
        <div className="stat-grid">
          <article className="stat"><span className="muted">ARTWORKS</span><strong>—</strong><p className="muted">Catalogue not connected yet</p></article>
          <article className="stat"><span className="muted">OPEN ORDERS</span><strong>—</strong><p className="muted">Order management coming next</p></article>
          <article className="stat"><span className="muted">PAYMENTS</span><strong>Off</strong><p className="muted">Stripe is intentionally disabled</p></article>
        </div>
      </section>
    </main>
  );
}
