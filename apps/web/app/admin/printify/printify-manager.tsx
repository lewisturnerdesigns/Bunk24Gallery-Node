"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

const API = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api").replace(/\/$/, "");

type Artist = { id: string; name: string; slug: string; bio?: string | null; imageUrl?: string | null; _count?: { artworks: number } };
type Artwork = {
  id: string; title: string; slug: string; status: string; featured: boolean; groupKey?: string | null; artistId?: string | null;
  artist?: Artist | null; imageUrl?: string | null; printifyProductId?: string | null;
  variants: { id: string; name: string; priceCents: number; printifyVariantId?: string | null; active: boolean }[];
};
type ProductVariant = {
  id: string | number; title?: string; name?: string; price?: number; cost?: number; is_enabled?: boolean;
  is_available?: boolean; sku?: string; grams?: number; options?: unknown[];
};
type ProductImage = { src?: string; is_default?: boolean; position?: number; variant_ids?: (string | number)[] };
type PrintifyProduct = {
  id: string | number; title?: string; description?: string; images?: ProductImage[]; variants?: ProductVariant[];
  tags?: string[]; options?: { name?: string; type?: string; values?: { id?: string | number; title?: string }[] }[];
  blueprint_id?: number; print_provider_id?: number; visible?: boolean; is_locked?: boolean;
  created_at?: string; updated_at?: string; external?: unknown; [key: string]: unknown;
};
type Status = { configured?: boolean; tokenConfigured?: boolean; shopConfigured?: boolean; catalogImportEnabled?: boolean; orderSubmissionEnabled?: boolean; note?: string };
type Filter = "all" | "needs-import" | "imported" | "needs-artist" | "published";

function money(cents: number) {
  return (cents / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });
}
function dateLabel(value?: string) {
  if (!value) return "Not provided";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}
function productList(value: unknown): PrintifyProduct[] {
  if (Array.isArray(value)) return value as PrintifyProduct[];
  if (value && typeof value === "object") {
    const data = value as { data?: unknown; items?: unknown; products?: unknown };
    if (Array.isArray(data.data)) return data.data as PrintifyProduct[];
    if (Array.isArray(data.items)) return data.items as PrintifyProduct[];
    if (Array.isArray(data.products)) return data.products as PrintifyProduct[];
  }
  return [];
}
function makeSlug(value: string) {
  return value.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export default function PrintifyManager({ token }: { token: string }) {
  const [status, setStatus] = useState<Status | null>(null);
  const [shops, setShops] = useState<unknown>(null);
  const [products, setProducts] = useState<PrintifyProduct[]>([]);
  const [artworks, setArtworks] = useState<Artwork[]>([]);
  const [artists, setArtists] = useState<Artist[]>([]);
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  const [selectedArtists, setSelectedArtists] = useState<Record<string, string>>({});
  const [featuredChoices, setFeaturedChoices] = useState<Record<string, boolean>>({});
  const [groupChoices, setGroupChoices] = useState<Record<string, string>>({});
  const [artistName, setArtistName] = useState("");
  const [artistSlug, setArtistSlug] = useState("");
  const [showArtistForm, setShowArtistForm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function request(path: string, init: RequestInit = {}) {
    const response = await fetch(`${API}${path}`, {
      ...init,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...(init.headers || {}) },
      cache: "no-store",
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(Array.isArray(data.message) ? data.message.join(", ") : data.message || `Request failed (${response.status})`);
    return data;
  }

  async function refreshAdminData() {
    const [artworkRows, artistRows, integrationStatus] = await Promise.all([
      request("/admin/artworks"), request("/admin/artists"), fetch(`${API}/printify/status`, { cache: "no-store" }).then((response) => response.json()),
    ]);
    setArtworks(Array.isArray(artworkRows) ? artworkRows : []);
    setArtists(Array.isArray(artistRows) ? artistRows : []);
    setStatus(integrationStatus);
  }

  useEffect(() => {
    if (!token) return;
    void refreshAdminData().catch((e) => setError(e instanceof Error ? e.message : "Could not load Printify dashboard."));
    // Token is a session credential; reload dashboard data when the signed-in session changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const importedByProductId = useMemo(() => {
    const map = new Map<string, Artwork>();
    for (const artwork of artworks) if (artwork.printifyProductId) map.set(String(artwork.printifyProductId), artwork);
    return map;
  }, [artworks]);

  const visibleProducts = useMemo(() => {
    const term = search.trim().toLowerCase();
    return products.filter((product) => {
      const artwork = importedByProductId.get(String(product.id));
      if (filter === "needs-import" && artwork) return false;
      if (filter === "imported" && !artwork) return false;
      if (filter === "needs-artist" && (!artwork || artwork.artistId || artwork.artist?.id)) return false;
      if (filter === "published" && artwork?.status !== "PUBLISHED") return false;
      if (!term) return true;
      return [product.title, product.id, product.description, ...(product.tags || [])].some((value) => String(value || "").toLowerCase().includes(term));
    });
  }, [products, search, filter, importedByProductId]);

  async function fetchProducts() {
    setError(""); setMessage(""); setBusy(true);
    try {
      const currentStatus = status || await fetch(`${API}/printify/status`, { cache: "no-store" }).then((response) => response.json());
      setStatus(currentStatus);
      if (!currentStatus.shopConfigured) {
        const connectedShops = await request("/printify/shops");
        setShops(connectedShops);
        setMessage("Your Printify shops were retrieved. Copy the correct shop ID into PRINTIFY_SHOP_ID in the root .env, restart the API, then fetch products.");
        return;
      }
      const result = await request("/printify/products");
      const list = productList(result);
      setProducts(list);
      setMessage(`Loaded ${list.length} Printify product${list.length === 1 ? "" : "s"} in read-only mode.`);
      await refreshAdminData();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not fetch Printify products.");
    } finally {
      setBusy(false);
    }
  }

  async function importProduct(product: PrintifyProduct) {
    setError(""); setMessage(""); setBusy(true);
    try {
      const result = await request(`/printify/import/${encodeURIComponent(String(product.id))}`, { method: "POST", body: JSON.stringify({}) });
      await refreshAdminData();
      setMessage(result.message || `Imported “${product.title || product.id}” as a BUNK24 draft.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not import this product.");
    } finally {
      setBusy(false);
    }
  }

  async function saveArtist(artwork: Artwork, publish = false) {
    const artistId = selectedArtists[artwork.id] ?? artwork.artistId ?? artwork.artist?.id ?? "";
    if (publish && !artistId) {
      setError("Choose an artist before publishing this item.");
      return;
    }
    setError(""); setMessage(""); setBusy(true);
    try {
      await request(`/admin/artworks/${encodeURIComponent(artwork.id)}`, {
        method: "PATCH",
        body: JSON.stringify({
          artistId: artistId || null,
          ...(publish ? { published: true, featured: featuredChoices[artwork.id] ?? artwork.featured } : {}),
        }),
      });
      await refreshAdminData();
      setMessage(publish ? `“${artwork.title}” is now published in the BUNK24 gallery.` : `Artist assignment saved for “${artwork.title}”.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update this artwork.");
    } finally {
      setBusy(false);
    }
  }

  async function saveGroup(artwork: Artwork) {
    const groupKey = (groupChoices[artwork.id] ?? artwork.groupKey ?? "").trim();
    setError(""); setMessage(""); setBusy(true);
    try {
      await request(`/admin/artworks/${encodeURIComponent(artwork.id)}`, {
        method: "PATCH",
        body: JSON.stringify({ groupKey }),
      });
      await refreshAdminData();
      setMessage(groupKey
        ? `Saved group “${groupKey}”. Imported products using the same group name will appear as one artwork with combined print options.`
        : `Removed “${artwork.title}” from its product group.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save this product group.");
    } finally {
      setBusy(false);
    }
  }

  async function createArtist(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setMessage(""); setBusy(true);
    try {
      const created = await request("/admin/artists", {
        method: "POST",
        body: JSON.stringify({ name: artistName.trim(), slug: (artistSlug || makeSlug(artistName)).trim() }),
      });
      await refreshAdminData();
      setArtistName(""); setArtistSlug(""); setShowArtistForm(false);
      setMessage(`Artist “${created.name}” added. You can now assign artwork to them.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create artist.");
    } finally {
      setBusy(false);
    }
  }

  const counts = useMemo(() => {
    const imported = products.filter((product) => importedByProductId.has(String(product.id))).length;
    const published = products.filter((product) => importedByProductId.get(String(product.id))?.status === "PUBLISHED").length;
    const needsArtist = products.filter((product) => {
      const artwork = importedByProductId.get(String(product.id));
      return Boolean(artwork && !(artwork.artistId || artwork.artist?.id));
    }).length;
    return { total: products.length, imported, published, needsArtist };
  }, [products, importedByProductId]);

  return <div className="printify-manager">
    <div className="printify-hero">
      <div><p className="eyebrow">PROVIDER CATALOGUE / BUNK24 STUDIO</p><h2>Printify, <em>curated.</em></h2><p>Build your products in Printify. Import them here, assign the artist, review every option, and publish to the BUNK24 gallery when ready.</p></div>
      <div className="printify-live-mark"><span className={status?.configured ? "printify-status-dot connected" : "printify-status-dot"} />{status?.configured ? "CONNECTED" : "CONNECTION STATUS"}<strong>{status?.configured ? "Read-only access" : "Awaiting credentials"}</strong></div>
    </div>

    <div className="printify-safety-note"><strong>SAFE MODE · NO PRINTIFY WRITES</strong><span>This dashboard only reads the Printify catalogue. “Publish to gallery” publishes the BUNK24 website listing only. It does not publish a product in Printify, create an order, buy a label, or trigger fulfillment.</span></div>

    <div className="printify-toolbar">
      <div><span className="eyebrow">CATALOGUE TOOLS</span><h3>Your Printify products</h3><p className="muted small-copy">{status?.note || "Checking integration configuration…"}</p></div>
      <button className="button" disabled={busy || !status?.tokenConfigured} onClick={() => void fetchProducts()}>{busy ? "Working…" : products.length ? "Refresh catalogue ↻" : "Fetch catalogue →"}</button>
    </div>

    {error && <p className="error-text" role="alert">{error}</p>}
    {message && <p className="notice" role="status">{message}</p>}

    {shops !== null && <details className="printify-details"><summary>Connected shops · show shop IDs</summary><pre className="json-panel">{JSON.stringify(shops, null, 2)}</pre></details>}

    {products.length > 0 && <>
      <div className="printify-metrics">
        <article><span>PROVIDER ITEMS</span><strong>{counts.total}</strong></article>
        <article><span>IMPORTED TO BUNK24</span><strong>{counts.imported}</strong></article>
        <article><span>NEED AN ARTIST</span><strong>{counts.needsArtist}</strong></article>
        <article><span>LIVE ON GALLERY</span><strong>{counts.published}</strong></article>
      </div>
      <div className="printify-catalog-tools">
        <label className="printify-search"><span aria-hidden="true">⌕</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search title, ID, description, tags…" aria-label="Search Printify products" /></label>
        <div className="printify-filter-tabs" role="group" aria-label="Filter products">
          {([{ key: "all", label: "All items" }, { key: "needs-import", label: "Not imported" }, { key: "imported", label: "Imported" }, { key: "needs-artist", label: "Needs artist" }, { key: "published", label: "Published" }] as const).map((item) => <button key={item.key} className={filter === item.key ? "active" : ""} onClick={() => setFilter(item.key)}>{item.label}</button>)}
        </div>
      </div>
      <p className="muted small-copy printify-results-count">Showing {visibleProducts.length} of {products.length} products</p>
      <div className="printify-manager-grid">
        {visibleProducts.map((product) => {
          const artwork = importedByProductId.get(String(product.id));
          const images = [...(product.images || [])].sort((a, b) => Number(Boolean(b.is_default)) - Number(Boolean(a.is_default)) || Number(a.position || 0) - Number(b.position || 0));
          const image = images.find((item) => item.src)?.src;
          const variants = product.variants || [];
          const enabled = variants.filter((variant) => variant.is_enabled !== false && variant.is_available !== false).length;
          const retailPrices = variants.map((variant) => Number(variant.price)).filter((price) => Number.isFinite(price) && price > 0);
          const costs = variants.map((variant) => Number(variant.cost)).filter((cost) => Number.isFinite(cost) && cost > 0);
          const minRetail = retailPrices.length ? Math.min(...retailPrices) : 0;
          const maxRetail = retailPrices.length ? Math.max(...retailPrices) : 0;
          const minCost = costs.length ? Math.min(...costs) : 0;
          const maxCost = costs.length ? Math.max(...costs) : 0;
          const artistId = selectedArtists[artwork?.id || ""] ?? artwork?.artistId ?? artwork?.artist?.id ?? "";
          const isFeatured = featuredChoices[artwork?.id || ""] ?? artwork?.featured ?? false;
          return <article className="printify-manager-card" key={String(product.id)}>
            <div className="printify-card-media">
              {image ? <img src={image} alt={product.title || "Printify product mockup"} loading="lazy" /> : <div className="printify-no-image">No mockup image</div>}
              <span className={artwork?.status === "PUBLISHED" ? "printify-card-status published" : artwork ? "printify-card-status imported" : "printify-card-status"}>{artwork?.status === "PUBLISHED" ? "LIVE ON BUNK24" : artwork ? "IMPORTED DRAFT" : "PRINTIFY ONLY"}</span>
              {images.length > 1 && <span className="printify-image-count">{images.length} mockups</span>}
            </div>
            <div className="printify-card-content">
              <div className="printify-card-heading"><div><p className="eyebrow">PRINTIFY ID · {product.id}</p><h3>{product.title || "Untitled product"}</h3></div><span className="printify-variant-count">{variants.length} options</span></div>
              <p className="printify-card-description">{product.description?.trim() || "No product description supplied by Printify."}</p>
              <div className="printify-facts">
                <div><span>Printify retail range</span><strong>{retailPrices.length ? minRetail === maxRetail ? money(minRetail) : `${money(minRetail)} – ${money(maxRetail)}` : "Not supplied"}</strong></div>
                <div><span>Fulfillment cost range</span><strong>{costs.length ? minCost === maxCost ? money(minCost) : `${money(minCost)} – ${money(maxCost)}` : "Not supplied"}</strong></div>
                <div><span>BUNK24 retail range</span><strong>{artwork?.variants?.length ? `${money(Math.min(...artwork.variants.map((v) => v.priceCents)))} – ${money(Math.max(...artwork.variants.map((v) => v.priceCents)))}` : "Not imported yet"}</strong></div>
              </div>

              <details className="printify-variant-details"><summary>Review variants and prices <span>{variants.length}</span></summary>
                {variants.length ? <div className="printify-variant-table-wrap"><table className="printify-variant-table"><thead><tr><th>Variant / size</th><th>Printify retail</th><th>Fulfillment cost</th><th>Availability</th><th>Variant ID</th></tr></thead><tbody>{variants.map((variant) => {
                  const retailPrice = Number(variant.price);
                  const fulfillmentCost = Number(variant.cost);
                  const live = variant.is_enabled !== false && variant.is_available !== false;
                  const retail = artwork?.variants?.find((row) => String(row.printifyVariantId || "") === String(variant.id));
                  return <tr key={String(variant.id)}><td><strong>{variant.title || variant.name || "Print option"}</strong>{variant.sku && <small>SKU {variant.sku}</small>}{retail && <small>BUNK24 retail: {money(retail.priceCents)}</small>}{typeof variant.grams === "number" && <small>{variant.grams} g</small>}</td><td>{Number.isFinite(retailPrice) && retailPrice > 0 ? money(retailPrice) : "—"}</td><td>{Number.isFinite(fulfillmentCost) && fulfillmentCost > 0 ? money(fulfillmentCost) : "—"}</td><td><span className={live ? "printify-availability available" : "printify-availability unavailable"}>{live ? "Available" : "Disabled / unavailable"}</span></td><td><code>{variant.id}</code></td></tr>;
                })}</tbody></table></div> : <p className="muted small-copy">No variants returned for this product.</p>}
              </details>

              <details className="printify-variant-details"><summary>Product metadata and mockups</summary>
                <dl className="printify-metadata">
                  <div><dt>Blueprint ID</dt><dd>{product.blueprint_id ?? "Not supplied"}</dd></div>
                  <div><dt>Print provider ID</dt><dd>{product.print_provider_id ?? "Not supplied"}</dd></div>
                  <div><dt>Tags</dt><dd>{product.tags?.length ? product.tags.join(", ") : "No tags"}</dd></div>
                  <div><dt>Product options</dt><dd>{product.options?.length ? product.options.map((option) => `${option.name || option.type || "Option"}: ${option.values?.map((value) => value.title || value.id || "Value").join(", ") || "Values not supplied"}`).join(" · ") : "Not supplied"}</dd></div>
                  <div><dt>External listing data</dt><dd>{product.external && typeof product.external === "object" ? JSON.stringify(product.external) : product.external ? String(product.external) : "Not linked"}</dd></div>
                  <div><dt>Visible in Printify</dt><dd>{typeof product.visible === "boolean" ? product.visible ? "Yes" : "No" : "Not supplied"}</dd></div>
                  <div><dt>Locked</dt><dd>{typeof product.is_locked === "boolean" ? product.is_locked ? "Yes" : "No" : "Not supplied"}</dd></div>
                  <div><dt>Created</dt><dd>{dateLabel(product.created_at)}</dd></div>
                  <div><dt>Last updated</dt><dd>{dateLabel(product.updated_at)}</dd></div>
                </dl>
                {images.length > 0 && <div className="printify-mockup-strip">{images.map((item, index) => item.src ? <a href={item.src} target="_blank" rel="noreferrer" key={item.src + index} title={item.is_default ? "Default mockup · open full image" : "Open full mockup"}><img src={item.src} alt={`Mockup ${index + 1} for ${product.title || "product"}`} loading="lazy" /><span>{item.is_default ? "DEFAULT" : `VIEW ${index + 1}`}</span></a> : null)}</div>}
                <details className="printify-raw-details"><summary>Show complete provider response</summary><pre className="json-panel">{JSON.stringify(product, null, 2)}</pre></details>
              </details>

              {artwork ? <div className="printify-publish-panel">
                <div className="printify-publish-heading"><div><p className="eyebrow">BUNK24 EDITORIAL</p><strong>{artwork.status === "PUBLISHED" ? "Gallery listing is live" : "Finish your gallery listing"}</strong></div><span className={artwork.artist ? "artist-assigned" : "artist-missing"}>{artwork.artist?.name || "Artist not assigned"}</span></div>
                <label className="printify-field">Artist
                  <select value={artistId} onChange={(event) => setSelectedArtists((current) => ({ ...current, [artwork.id]: event.target.value }))}>
                    <option value="">Choose an artist…</option>{artists.map((artist) => <option value={artist.id} key={artist.id}>{artist.name}</option>)}
                  </select>
                </label>
                <div className="printify-group-editor">
                  <label className="printify-field">Product group <span className="muted small-copy">Optional · use the same name for every format of one painting</span>
                    <input value={groupChoices[artwork.id] ?? artwork.groupKey ?? ""} onChange={(event) => setGroupChoices((current) => ({ ...current, [artwork.id]: event.target.value }))} placeholder="e.g. red-bird-study" maxLength={191} />
                  </label>
                  <button className="button secondary" disabled={busy} onClick={() => void saveGroup(artwork)}>Save group</button>
                  <p className="muted small-copy">Group related imported products (for example, canvas and poster editions) under one shared name. Published members become one shop listing with all active options.</p>
                </div>
                <label className="printify-feature-check"><input type="checkbox" checked={isFeatured} onChange={(event) => setFeaturedChoices((current) => ({ ...current, [artwork.id]: event.target.checked }))} /> Feature this artwork in the gallery</label>
                <div className="printify-card-actions">
                  <button className="button secondary" disabled={busy} onClick={() => void saveArtist(artwork, false)}>Save assignment</button>
                  <button className="button" disabled={busy || !artistId} onClick={() => void saveArtist(artwork, true)}>{busy ? "Saving…" : artwork.status === "PUBLISHED" ? "Save & update gallery ↗" : "Assign & publish ↗"}</button>
                </div>
              </div> : <button className="button printify-import-button" disabled={busy || !enabled} onClick={() => void importProduct(product)}>{busy ? "Working…" : "Import to BUNK24 drafts →"}</button>}
            </div>
          </article>;
        })}
      </div>
      {visibleProducts.length === 0 && <div className="printify-empty"><h3>No matching products</h3><p>Try another search or choose a different catalogue filter.</p></div>}
    </>}

    {products.length === 0 && <div className="printify-empty"><div className="printify-empty-icon">B<span>24</span></div><h3>Your provider catalogue, in one studio.</h3><p>Fetch your Printify products to review mockups, variant costs, availability, metadata, and BUNK24 publishing status.</p><button className="button" disabled={busy || !status?.tokenConfigured} onClick={() => void fetchProducts()}>{busy ? "Loading products…" : "Load Printify catalogue →"}</button></div>}

    <section className="printify-artists-panel">
      <div><p className="eyebrow">GALLERY ROSTER</p><h3>Artists</h3><p className="muted small-copy">Artist records power the public artist pages and product filters.</p></div>
      <button className="button secondary" onClick={() => setShowArtistForm((value) => !value)}>{showArtistForm ? "Cancel" : "+ Add artist"}</button>
      {showArtistForm && <form className="printify-create-artist" onSubmit={(event) => void createArtist(event)}>
        <label>Name<input value={artistName} onChange={(event) => { setArtistName(event.target.value); if (!artistSlug || artistSlug === makeSlug(artistName)) setArtistSlug(makeSlug(event.target.value)); }} required maxLength={120} placeholder="Artist name" /></label>
        <label>URL slug<input value={artistSlug} onChange={(event) => setArtistSlug(makeSlug(event.target.value))} required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" placeholder="artist-name" /></label>
        <button className="button" disabled={busy || !artistName.trim() || !artistSlug}>{busy ? "Saving…" : "Create artist"}</button>
      </form>}
      {artists.length ? <div className="printify-artist-list">{artists.map((artist) => <article key={artist.id}><span className="printify-artist-avatar">{artist.name.slice(0, 1).toUpperCase()}</span><div><strong>{artist.name}</strong><small>/{artist.slug}</small></div><span>{artist._count?.artworks ?? 0} work(s)</span></article>)}</div> : <p className="muted small-copy">No artists yet. Add an artist, then assign imported items before publishing.</p>}
    </section>
  </div>;
}
