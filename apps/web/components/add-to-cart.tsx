"use client";

import { useState } from "react";

type Props = {
  artwork: { id: string; title: string; slug: string; imageUrl?: string | null };
  variants: { id: string; name: string; priceCents: number }[];
};

type CartItem = {
  variantId: string;
  artworkTitle: string;
  artworkSlug: string;
  variantName: string;
  priceCents: number;
  imageUrl: string | null;
  quantity: number;
};

export default function AddToCart({ artwork, variants }: Props) {
  const [variantId, setVariantId] = useState(variants[0]?.id ?? "");
  const [message, setMessage] = useState("");
  const selected = variants.find((variant) => variant.id === variantId);

  function add() {
    if (!selected) return;
    try {
      const key = "bunk24-cart";
      const current: CartItem[] = JSON.parse(localStorage.getItem(key) || "[]");
      const existing = current.find((item) => item.variantId === selected.id);
      if (existing) existing.quantity = Math.min(20, existing.quantity + 1);
      else current.push({
        variantId: selected.id,
        artworkTitle: artwork.title,
        artworkSlug: artwork.slug,
        variantName: selected.name,
        priceCents: selected.priceCents,
        imageUrl: artwork.imageUrl || null,
        quantity: 1,
      });
      localStorage.setItem(key, JSON.stringify(current));
      setMessage("Added to cart.");
    } catch {
      setMessage("Could not save your cart in this browser.");
    }
  }

  if (!variants.length) return <p className="muted">Print options are being prepared.</p>;

  return <div className="purchase-box">
    <label className="field-label" htmlFor="print-variant">Print size / format</label>
    <select id="print-variant" value={variantId} onChange={(event) => setVariantId(event.target.value)}>
      {variants.map((variant) => <option key={variant.id} value={variant.id}>{variant.name}</option>)}
    </select>
    <div className="purchase-row"><strong>{selected ? (selected.priceCents / 100).toLocaleString("en-US", { style: "currency", currency: "USD" }) : ""}</strong><button className="button" onClick={add}>Add to cart</button></div>
    <p className="muted" aria-live="polite">{message}</p>
  </div>;
}
