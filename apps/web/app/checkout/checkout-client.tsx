"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";

type CartItem = { variantId: string; artworkTitle: string; variantName: string; priceCents: number; quantity: number };
const KEY = "bunk24-cart";
const API = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api").replace(/\/$/, "");

export default function CheckoutClient() {
  const [items, setItems] = useState<CartItem[]>([]);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [orderNumber, setOrderNumber] = useState("");
  useEffect(() => { try { setItems(JSON.parse(localStorage.getItem(KEY) || "[]")); } catch { setItems([]); } setReady(true); }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setBusy(true);
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch(`${API}/orders`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: form.get("customerName"), customerEmail: form.get("customerEmail"),
          shippingAddress: form.get("shippingAddress"), shippingCity: form.get("shippingCity"),
          shippingRegion: form.get("shippingRegion"), shippingPostalCode: form.get("shippingPostalCode"),
          shippingCountry: form.get("shippingCountry"), items: items.map(({ variantId, quantity }) => ({ variantId, quantity })),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Could not create your order.");
      setOrderNumber(data.orderNumber);
      localStorage.removeItem(KEY);
      setItems([]);
    } catch (err) { setError(err instanceof Error ? err.message : "Could not create your order."); }
    finally { setBusy(false); }
  }

  if (!ready) return <p className="muted">Loading checkout…</p>;
  if (orderNumber) return <section className="empty-state"><div className="eyebrow">Order prepared</div><h2>Thank you.</h2><p>Your reference is <strong>{orderNumber}</strong>.</p><p className="notice">This is currently an unpaid order record. Secure payment is not active yet, so no charge has been made and the order has not been sent to Printify.</p><Link className="button" href="/shop">Return to the gallery</Link></section>;
  if (!items.length) return <div className="empty-state"><h2>Your cart is empty.</h2><Link className="button" href="/shop">Browse prints</Link></div>;

  return <form className="checkout-form" onSubmit={submit}>
    <div className="checkout-fields"><h2>Contact & shipping</h2>
      <label className="field-label">Full name<input name="customerName" autoComplete="name" required maxLength={160} /></label>
      <label className="field-label">Email<input name="customerEmail" type="email" autoComplete="email" required maxLength={254} /></label>
      <label className="field-label">Street address<input name="shippingAddress" autoComplete="street-address" required maxLength={500} /></label>
      <div className="two-fields"><label className="field-label">City<input name="shippingCity" autoComplete="address-level2" required /></label><label className="field-label">State / region<input name="shippingRegion" autoComplete="address-level1" required /></label></div>
      <div className="two-fields"><label className="field-label">ZIP / postal code<input name="shippingPostalCode" autoComplete="postal-code" required /></label><label className="field-label">Country<input name="shippingCountry" autoComplete="country-name" defaultValue="United States" required /></label></div>
      {error && <p className="error-text" role="alert">{error}</p>}
      <button className="button" disabled={busy}>{busy ? "Preparing order…" : "Prepare order"}</button>
      <p className="muted small-copy">Payment is not enabled yet. This step creates an unpaid order record only.</p>
    </div>
    <aside className="cart-summary"><h2>Order summary</h2>{items.map((item) => <div className="summary-line" key={item.variantId}><span>{item.artworkTitle}<small>{item.variantName} × {item.quantity}</small></span><strong>{((item.priceCents * item.quantity) / 100).toLocaleString("en-US", { style: "currency", currency: "USD" })}</strong></div>)}<div className="summary-total"><span>Subtotal</span><strong>{(items.reduce((sum, item) => sum + item.priceCents * item.quantity, 0) / 100).toLocaleString("en-US", { style: "currency", currency: "USD" })}</strong></div></aside>
  </form>;
}
