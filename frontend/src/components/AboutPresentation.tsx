"use client";

import React from "react";
import Link from "next/link";
import TextHighlight from "./TextHighlight";

/**
 * AboutPresentation Component
 * Explains the intimate, contemplative soul of Between Letters.
 * Incorporates real-time scroll-triggered TextHighlight on meaningful phrases,
 * presents the authentic features of the project, and provides direct CTAs to enter the journal.
 */
export default function AboutPresentation() {
  return (
    <section className="about-presentation-section" aria-label="About Between Letters">
      <div className="about-presentation-inner">
        {/* Archival Eyebrow Tag */}
        <div className="about-eyebrow">
          <span className="about-star" aria-hidden="true">✦</span>
          <span>AN INVITATION TO SLOW DOWN</span>
          <span className="about-star" aria-hidden="true">✦</span>
        </div>

        {/* Expressive Editorial Headline */}
        <h2 className="about-title">
          For everything that still <em>finds words.</em>
        </h2>

        {/* Narrative Flow with Animated Scroll Highlights */}
        <div className="about-prose">
          <p className="about-lead">
            Between Letters was born as a quiet epistolary refuge — a place to step away
            from urgency, where private thoughts and fleeting days are accorded the dignity
            and quiet permanence of paper.
          </p>

          <p className="about-paragraph">
            In a world that hurries past memory, we fashioned a haven to{" "}
            <TextHighlight variant="pollen">
              shelter your reflections from the rush of time
            </TextHighlight>
            . Writing here is neither a metric nor a daily chore, but an unhurried ritual:
            turning inward, listening to your own cadence, and capturing sentiments
            before they slip away.
          </p>

          <p className="about-paragraph">
            Your entries rest inside{" "}
            <TextHighlight variant="terracotta">
              pure CSS leather-bound volumes
            </TextHighlight>{" "}
            embossed in gold, finished with stitched spines and silk bookmarks. With generous
            fourteen-line ruled sheets, your journals advance naturally as you write,
            preserving only the pages where your words have taken root.
          </p>

          <p className="about-paragraph">
            Switch seamlessly between{" "}
            <TextHighlight variant="olive">
              creative scrapbook editing and distraction-free writing
            </TextHighlight>
            . Place keepsake photographs, botanical stickers, and marginal notes on every sheet,
            then open your bound volume in interactive 3D whenever you wish to turn through
            what you&apos;ve kept.
          </p>
        </div>

        {/* Authentic Implemented Features Showcase */}
        <div className="features-showcase" aria-label="Actual journal features">
          <div className="features-header">
            <span className="features-kicker">BUILT WITH REVERENCE FOR THE CRAFT</span>
            <h3 className="features-title">The Tools of Your Desk</h3>
          </div>

          <div className="features-grid">
            {/* Feature 1: Leather Journals */}
            <div className="feature-item">
              <div className="feature-icon-badge" aria-hidden="true">
                <span>01</span>
              </div>
              <h4 className="feature-heading">Hardbound Leather Volumes</h4>
              <p className="feature-description">
                Handcrafted pure CSS leather covers in Rustic Brown, Botanical Moss,
                and Noble Burgundy. Feeds up to 3 blank pages ahead, committing only
                written sheets to storage.
              </p>
              <div className="feature-meta">
                <span>14-line ruled capacity</span>
                <span className="feature-bullet">•</span>
                <span>Silk ribbon marker</span>
              </div>
            </div>

            {/* Feature 2: Dual Editing & Scrapbook Modes */}
            <div className="feature-item">
              <div className="feature-icon-badge" aria-hidden="true">
                <span>02</span>
              </div>
              <h4 className="feature-heading">Dual Edit &amp; Writing Modes</h4>
              <p className="feature-description">
                Write naturally line-by-line in distraction-free Writing Mode, or switch to
                Edit Mode on the exact same sheet to place keepsake photos and stickers.
              </p>
              <div className="feature-meta">
                <span>Shared 2D sheet geometry</span>
                <span className="feature-bullet">•</span>
                <span>Focus Mode ready</span>
              </div>
            </div>

            {/* Feature 3: Interactive 3D Reading */}
            <div className="feature-item">
              <div className="feature-icon-badge" aria-hidden="true">
                <span>03</span>
              </div>
              <h4 className="feature-heading">3D Interactive Journal View</h4>
              <p className="feature-description">
                Reopen any leather-bound journal volume as a tactile 3D book with realistic
                page turning, preserved photography, and faithful ink rendering.
              </p>
              <div className="feature-meta">
                <span>Real page-turn physics</span>
                <span className="feature-bullet">•</span>
                <span>Scrapbook preservation</span>
              </div>
            </div>

            {/* Feature 4: Archival Papers & Inks */}
            <div className="feature-item">
              <div className="feature-icon-badge" aria-hidden="true">
                <span>04</span>
              </div>
              <h4 className="feature-heading">Archival Papers & Prompts</h4>
              <p className="feature-description">
                Choose between tactile paper textures and classical ink tones,
                complemented by an archive of contemplative writing prompts whenever words pause.
              </p>
              <div className="feature-meta">
                <span>Fine paper styles</span>
                <span className="feature-bullet">•</span>
                <span>Curated writing prompts</span>
              </div>
            </div>
          </div>
        </div>

        {/* Final Journal Sanctuary Invitation (Call to Action) */}
        <div className="about-invitation" aria-label="Enter Between Letters">
          <div className="about-invitation-badge">
            <span className="brand-seal-mini">BL</span>
            <span>JOURNAL SANCTUARY</span>
          </div>

          <h3 className="about-invitation-title">
            The ink is fresh. The page is open.
          </h3>

          <p className="about-invitation-sub">
            Step inside your personal digital desk. Write your day in your journal
            or browse curated inspirations gathered from quiet corners of the human heart.
          </p>

          <div className="about-invitation-actions">
            <Link
              href="/journal"
              className="about-btn-primary"
              id="enter-journal-primary-btn"
            >
              Open Journal ↗
            </Link>
            <Link
              href="/my-shelf"
              className="about-btn-secondary"
            >
              Visit My Shelf ✦
            </Link>
            <Link
              href="/discover"
              className="about-btn-secondary"
            >
              Browse Inspirations ❧
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
