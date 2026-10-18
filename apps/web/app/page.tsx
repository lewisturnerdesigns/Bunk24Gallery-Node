const pieces = [
  { name: "Selected Works", detail: "Original paintings and studies" },
  { name: "Print Editions", detail: "Collected works, made accessible" },
  { name: "About Turner", detail: "Process, practice, and point of view" },
];

export default function HomePage() {
  return (
    <main className="site-shell">
      <header className="topbar">
        <a className="wordmark" href="/">BUNK<span>24</span></a>
        <nav className="nav" aria-label="Main navigation">
          <a href="#works">Works</a><a href="#about">About</a><a href="/admin">Admin</a>
        </nav>
      </header>
      <section className="hero">
        <div>
          <div className="eyebrow">Art by Turner · Atlanta, GA</div>
          <h1>MADE TO<br />MAKE YOU<br />LOOK.</h1>
          <p>Contemporary work shaped by instinct, texture, and the beauty of things left a little unfinished.</p>
          <div className="actions">
            <a className="button" href="#works">Explore the work ↗</a>
            <a className="button secondary" href="#about">Meet the artist</a>
          </div>
        </div>
        <div className="art-stage" aria-label="Artwork preview placeholder">
          <div className="artwork-placeholder" />
          <div className="art-label"><span>TURNER / STUDY 001</span><span>BUNK24</span></div>
        </div>
      </section>
      <section id="works">
        <div className="section-head"><h2>A practice in progress.</h2><span className="muted">01 — 03</span></div>
        <div className="stat-grid">
          {pieces.map((piece, index) => <article className="stat" key={piece.name}>
            <span className="eyebrow">0{index + 1}</span><strong>{piece.name}</strong><p className="muted">{piece.detail}</p>
          </article>)}
        </div>
      </section>
      <section id="about" style={{ padding: "72px 0 48px" }}>
        <div className="eyebrow">The artist</div><h2 style={{ fontSize: "clamp(32px, 5vw, 64px)", letterSpacing: "-.07em", maxWidth: 720 }}>Art that leaves room for your own interpretation.</h2>
        <p className="muted" style={{ maxWidth: 520, lineHeight: 1.8 }}>BUNK24 is the evolving home for Turner’s paintings and print editions. The gallery and checkout experience will grow here as the catalogue is added.</p>
      </section>
      <footer className="topbar"><span className="wordmark">BUNK<span>24</span></span><span className="muted">© {new Date().getFullYear()} BUNK24 Gallery</span></footer>
    </main>
  );
}
