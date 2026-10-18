"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type CartItem = { variantId: string; artworkTitle: string; artworkSlug: string; variantName: string; priceCents: number; imageUrl: string | null; quantity: number };
const KEY = "bunk24-cart";
const money = (cents: number) => (cents / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });

export default function CartClient() {
  const [items, setItems] = useState<CartItem[]>([]);
  const [ready, setReady] = useState(false);
  useEffect(() => { try { setItems(JSON.parse(localStorage.getItem(KEY) || "[]")); } catch { setItems([]); } setReady(true); }, []);
  function save(next: CartItem[]) { setItems(next); localStorage.setItem(KEY, JSON.stringify(next)); }
  const subtotal = items.reduce((sum, item) => sum + item.priceCents * item.quantity, 0);

  if (!ready) return <p className="muted">Loading your cart…</p>;
  if (!items.length) return <div className="empty-state"><h2>Your cart is empty.</h2><p className="muted">Find a print that feels like yours.</p><Link className="button" href="/shop">Explore the collection</Link></div>;

  return <section className="cart-layout">
    <div className="cart-items">{items.map((item) => <article className="cart-item" key={item.variantId}>
      <Link className="cart-thumb" href={`/artwork/${item.artworkSlug}`}>{item.imageUrl ? <img src={item.imageUrl} alt="" /> : <span>B24</span>}</Link>
      <div className="cart-item-copy"><h2><Link href={`/artwork/${item.artworkSlug}`}>{item.artworkTitle}</Link></h2><p className="muted">{item.variantName}</p><strong>{money(item.priceCents)}</strong>
      <label className="field-label">Quantity <select value={item.quantity} onChange={(e) => save(items.map((row) => row.variantId === item.variantId ? { ...row, quantity: Number(e.target.value) } : row))}>{Array.from({ length: 20 }, (_, i) => <option key={i + 1} value={i + 1}>{i + 1}</option>)}</select></label>
      <button className="text-button" onClick={() => save(items.filter((row) => row.variantId !== item.variantId))}>Remove</button></div>
    </article>)}</div>
    <aside className="cart-summary"><span className="muted">Subtotal</span><strong>{money(subtotal)}</strong><p className="muted small-copy">Shipping and production details are confirmed before payment is enabled.</p><Link className="button full-button" href="/checkout">Continue to checkout</Link></aside>
  </section>;
}
