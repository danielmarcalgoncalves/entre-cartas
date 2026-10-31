"use client";

import Link from "next/link";

export default function EntryLanding() {
  return (
    <div className="entry-landing-wrap">
      {/* 1. TOP EDITORIAL EYEBROW */}
      <div className="entry-eyebrow-bar" aria-label="Aesthetic manifesto">
        <div className="entry-eyebrow-item">
          <span className="entry-star" aria-hidden="true">✳</span>
          <span className="entry-eyebrow-text">NATURE · BALANCE · SOPHISTICATION</span>
        </div>
        <div className="entry-eyebrow-note">
          Words that breathe. Interfaces that embrace.
        </div>
      </div>

      {/* 2. HERO INTRO SECTION */}
      <section className="entry-hero-section" aria-labelledby="entry-hero-title">
        <div className="entry-hero-badge">
          <span className="entry-hero-badge-dot" aria-hidden="true">✦</span>
          <span>SAME ESSENCE · NEW LIGHT</span>
        </div>

        <h1 id="entry-hero-title" className="entry-hero-title">
          A gentle refuge for <em>your memories</em> & words.
        </h1>

        <p className="entry-hero-description">
          An intimate editorial sanctuary crafted for reflective journaling, tactile letters, and keeping genuine sentiments sheltered from the rush of time.
        </p>

        {/* Primary Action Row */}
        <div className="entry-hero-actions">
          <Link href="/journal" className="entry-primary-btn" id="enter-sanctuary-btn">
            Enter Sanctuary & My Journal ↗
          </Link>
          <Link href="/discover" className="entry-secondary-btn">
            Explore Open Archive
          </Link>
        </div>
      </section>

      {/* 3. MODULAR CONCEPT SHOWCASE (READY FOR FUTURE EXPANSION) */}
      <section className="entry-showcase-section" aria-label="Visual identity showcase">
        <div className="entry-section-header">
          <span className="section-kicker">Visual Identity & Experience</span>
          <h2 className="section-title">Rooted in Nature and Paper</h2>
          <p className="page-intro" style={{ margin: "4px auto 0" }}>
            Natural materials, warm earth pigments, and an analog soul designed to invite calm.
          </p>
        </div>

        <div className="entry-cards-grid">
          {/* Card 1: Botanical Atmosphere */}
          <article className="entry-feature-card">
            <div className="entry-card-media-box">
              <img
                src="/images/botanical-wide.jpg"
                alt="Soft warm botanical foliage"
                className="entry-card-img"
              />
              <span className="entry-card-badge">ATMOSPHERE 01</span>
            </div>
            <div className="entry-card-body">
              <span className="entry-card-tag">Natural Sanctuary</span>
              <h3 className="entry-card-title">Quiet Analog Space</h3>
              <p className="entry-card-text">
                Natural diffused light, warm organic tones, and soft analog textures that give your writing space room to breathe.
              </p>
              <div className="entry-card-foot">
                <span className="entry-card-hint">Organic Editorial</span>
                <span className="entry-card-star">✳</span>
              </div>
            </div>
          </article>

          {/* Card 2: Tactile Materials & Fine Papers */}
          <article className="entry-feature-card">
            <div className="entry-card-media-box entry-media--parchment">
              <div className="entry-paper-preview">
                <span className="entry-paper-line" />
                <span className="entry-paper-line" />
                <span className="entry-paper-line" />
                <span className="stamp-mark" style={{ margin: "auto", fontSize: "8px" }}>
                  FINE PARCHMENT
                </span>
              </div>
              <span className="entry-card-badge">MATERIALS 02</span>
            </div>
            <div className="entry-card-body">
              <span className="entry-card-tag">Archival Craft</span>
              <h3 className="entry-card-title">Pure Leather & Ruled Sheets</h3>
              <p className="entry-card-text">
                Pure CSS hardbound journals, gold-embossed covers, and delicate ruled sheets with generous line spacing.
              </p>
              <div className="entry-card-foot">
                <span className="entry-card-hint">Tactile Feel</span>
                <span className="entry-card-star">✦</span>
              </div>
            </div>
          </article>

          {/* Card 3: Epistolary Memory */}
          <article className="entry-feature-card">
            <div className="entry-card-media-box entry-media--letters">
              <div className="entry-envelope-mockup">
                <span className="entry-envelope-flap" />
                <span className="entry-seal-circle">BL</span>
              </div>
              <span className="entry-card-badge">CORRESPONDENCE 03</span>
            </div>
            <div className="entry-card-body">
              <span className="entry-card-tag">Epistolary Soul</span>
              <h3 className="entry-card-title">Sheltered Memories</h3>
              <p className="entry-card-text">
                Fold, seal, and categorize letters into 3D correspondence folders. Keep what matters close, forever unhurried.
              </p>
              <div className="entry-card-foot">
                <span className="entry-card-hint">Memory Folders</span>
                <span className="entry-card-star">❧</span>
              </div>
            </div>
          </article>
        </div>
      </section>

      {/* 4. POETIC INVITATION BANNER */}
      <section className="entry-invitation-box" aria-label="Invitation to write">
        <div className="entry-invitation-inner">
          <span className="entry-star" style={{ fontSize: "28px" }} aria-hidden="true">
            ✳
          </span>
          <h2 className="entry-invitation-title">
            The page is open. What will you preserve today?
          </h2>
          <p className="entry-invitation-sub">
            Your personal digital desk is waiting with hardbound journals and empty sheets.
          </p>
          <Link href="/journal" className="entry-primary-btn" style={{ marginTop: "12px" }}>
            Open My Journal Desk ↗
          </Link>
        </div>
      </section>
    </div>
  );
}
