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
            Personal letters can be folded, sealed, and grouped into{" "}
            <TextHighlight variant="olive">
              three-dimensional correspondence folders
            </TextHighlight>
            . And should you ever change your mind, our vintage postal discard receptacle keeps
            discarded pages safe in soft deletion — ready to be restored to their original folder
            or gently laid to rest.
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
                <span>📖</span>
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

            {/* Feature 2: Epistolary Folders */}
            <div className="feature-item">
              <div className="feature-icon-badge" aria-hidden="true">
                <span>📁</span>
              </div>
              <h4 className="feature-heading">Correspondence Folders</h4>
              <p className="feature-description">
                Organize letters into physical 3D archival folders. Fold, wax-seal,
                and browse letters with smooth tactile transitions and drag-and-drop actions.
              </p>
              <div className="feature-meta">
                <span>3 Folders (Free) / 10 (Pro)</span>
                <span className="feature-bullet">•</span>
                <span>3D opened desk view</span>
              </div>
            </div>

            {/* Feature 3: Postal Discard Bin */}
            <div className="feature-item">
              <div className="feature-icon-badge" aria-hidden="true">
                <span>📮</span>
              </div>
              <h4 className="feature-heading">Postal Discard Receptacle</h4>
              <p className="feature-description">
                A metal postal bin reflecting real discard volume across 3 visual states.
                Letters are soft-deleted and can be read, restored, or permanently removed at will.
              </p>
              <div className="feature-meta">
                <span>Dynamic fullness states</span>
                <span className="feature-bullet">•</span>
                <span>Complete recovery</span>
              </div>
            </div>

            {/* Feature 4: Archival Papers & Inks */}
            <div className="feature-item">
              <div className="feature-icon-badge" aria-hidden="true">
                <span>✒️</span>
              </div>
              <h4 className="feature-heading">Archival Papers & Prompts</h4>
              <p className="feature-description">
                Choose between four tactile paper textures and classical ink tones,
                complemented by an archive of contemplative writing prompts whenever words pause.
              </p>
              <div className="feature-meta">
                <span>4 paper styles</span>
                <span className="feature-bullet">•</span>
                <span>Curated epistolary prompts</span>
              </div>
            </div>
          </div>
        </div>

        {/* Final Epistolary Invitation (Call to Action) */}
        <div className="about-invitation" aria-label="Enter Between Letters">
          <div className="about-invitation-badge">
            <span className="brand-seal-mini">BL</span>
            <span>EPISTOLARY SANCTUARY</span>
          </div>

          <h3 className="about-invitation-title">
            The ink is fresh. The page is open.
          </h3>

          <p className="about-invitation-sub">
            Step inside your personal digital desk. Write your day or read letters
            preserved from the quietest corners of the human heart.
          </p>

          <div className="about-invitation-actions">
            <Link
              href="/journal"
              className="about-btn-primary"
              id="enter-journal-primary-btn"
            >
              Open My Journal Desk ↗
            </Link>
            <Link
              href="/discover"
              className="about-btn-secondary"
            >
              Explore Archival Letters
            </Link>
            <Link
              href="/clube-pro"
              className="about-btn-tertiary"
            >
              Pro Sender Club ✦
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
