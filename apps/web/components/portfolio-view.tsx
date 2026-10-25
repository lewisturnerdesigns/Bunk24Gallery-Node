"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import type { Artwork } from "../lib/api";
import { money } from "../lib/api";

type Props = { artworks: Artwork[] };

export default function PortfolioView({ artworks }: Props) {
  const [view, setView] = useState<"grid" | "3d">("grid");
  const [activeIndex, setActiveIndex] = useState(0);
  const touchStartX = useRef<number | null>(null);

  const move = (step: number) => {
    setActiveIndex((current) => (current + step + artworks.length) % artworks.length);
  };

  return (
    <section className="portfolio-view-section" aria-label="Artwork portfolio">
      <div className="portfolio-view-toolbar">
        <span className="portfolio-count">{String(artworks.length).padStart(2, "0")} WORKS / TURNER</span>
        <div className="portfolio-view-switch" role="group" aria-label="Portfolio view">
          <button type="button" className={view === "grid" ? "active" : ""} aria-pressed={view === "grid"} onClick={() => setView("grid")}>Grid view</button>
          <button type="button" className={view === "3d" ? "active" : ""} aria-pressed={view === "3d"} onClick={() => setView("3d")}>3D gallery <span aria-hidden="true">↗</span></button>
        </div>
      </div>

      {view === "grid" ? (
        <div className="shop-bento-grid shop-fluid-grid portfolio-grid">
          {artworks.map((artwork, index) => (
            <article className={`product-card shop-bento-card shop-bento-card-${(index % 6) + 1}`} key={artwork.id}>
              <Link className="product-image" href={`/artwork/${artwork.slug}`} aria-label={`View ${artwork.title}`}>
                {artwork.imageUrl ? <img src={artwork.imageUrl} alt={artwork.title} loading={index > 2 ? "lazy" : "eager"} /> : <span>BUNK24 / {artwork.title}</span>}
                <span className="portfolio-image-index">0{index + 1} / PRINT EDITION</span>
              </Link>
              <div className="product-meta">
                <div><h2><Link href={`/artwork/${artwork.slug}`}>{artwork.title}</Link></h2><p className="muted">{artwork.variants.length} available variation{artwork.variants.length === 1 ? "" : "s"}</p></div>
                <strong>{artwork.variants.length ? money(Math.min(...artwork.variants.map((variant) => variant.priceCents))) : "—"}</strong>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="portfolio-3d" aria-roledescription="carousel" aria-label="Three-dimensional artwork gallery">
          <div className="portfolio-3d-stage">
            {artworks.map((artwork, index) => {
              let offset = index - activeIndex;
              if (offset > artworks.length / 2) offset -= artworks.length;
              if (offset < -artworks.length / 2) offset += artworks.length;
              const visible = Math.abs(offset) <= 2;
              return (
                <Link
                  href={`/artwork/${artwork.slug}`}
                  className={`portfolio-3d-card ${offset === 0 ? "is-active" : ""}`}
                  key={artwork.id}
                  aria-label={`View ${artwork.title}`}
                  onClick={(event) => { if (offset !== 0) { event.preventDefault(); setActiveIndex(index); } }}
                  aria-hidden={!visible}
                  tabIndex={visible ? 0 : -1}
                  style={{
                    transform: `translateX(${offset * 66}%) translateZ(${-Math.abs(offset) * 115}px) rotateY(${offset * -24}deg) scale(${offset === 0 ? 1 : Math.max(.72, 1 - Math.abs(offset) * .12)})`,
                    opacity: visible ? (Math.abs(offset) === 2 ? .42 : 1) : 0,
                    zIndex: 10 - Math.abs(offset),
                    pointerEvents: visible ? "auto" : "none",
                  }}
                >
                  <div className="portfolio-3d-art">
                    {artwork.imageUrl ? <img src={artwork.imageUrl} alt="" draggable={false} /> : <span>BUNK24 / TURNER</span>}
                  </div>
                  <div className="portfolio-3d-caption"><span>{String(index + 1).padStart(2, "0")} / {String(artworks.length).padStart(2, "0")}</span><h2>{artwork.title}</h2><p>{artwork.variants.length ? `From ${money(Math.min(...artwork.variants.map((variant) => variant.priceCents)))}` : "Print edition"}</p></div>
                </Link>
              );
            })}
          </div>
          <div className="portfolio-3d-controls">
            <button type="button" onClick={() => move(-1)} aria-label="Previous artwork">←</button>
            <span>{String(activeIndex + 1).padStart(2, "0")} <i>/</i> {String(artworks.length).padStart(2, "0")}</span>
            <button type="button" onClick={() => move(1)} aria-label="Next artwork">→</button>
          </div>
          <p className="portfolio-3d-hint">SELECT A WORK TO EXPLORE ITS PRINT EDITIONS</p>
        </div>
      )}
    </section>
  );
}
