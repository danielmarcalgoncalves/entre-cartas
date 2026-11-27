"use client";

import React from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import "./explore.css";

export default function ExploreExperience() {
  const { user, loading } = useAuth();
  const isAuthenticated = !loading && Boolean(user);

  return (
    <div className="explore-page-wrap">
      {/* 1. Editorial Navigation Bar */}
      <header className="explore-topbar">
        <Link href="/" className="explore-brand-link" aria-label="Return to Between Letters landing page">
          <span className="explore-brand-seal" aria-hidden="true">✦</span>
          <span>Between Letters</span>
        </Link>

        <nav className="explore-topbar-links" aria-label="Introduction navigation">
          <a href="#intro-journal" className="explore-nav-link">
            My Journal
          </a>
          {isAuthenticated ? (
            <Link href="/my-desk" className="explore-auth-pill">
              Open My Desk →
            </Link>
          ) : (
            <Link href="/login" className="explore-auth-pill">
              Sign In
            </Link>
          )}
        </nav>
      </header>

      {/* 2. Opening Section */}
      <section className="explore-hero" aria-labelledby="explore-hero-heading">
        <div>
          <span className="explore-eyebrow">
            <span aria-hidden="true">✦</span>
            <span>A PERSONAL SPACE FOR WRITING</span>
          </span>

          <h1 id="explore-hero-heading" className="explore-hero-title">
            Some things deserve to be <em>written down.</em>
          </h1>

          <p className="explore-hero-lead">
            Create a quiet sanctuary for your daily thoughts, preserve moments that matter,
            and keep hardbound memories inside Between Letters.
          </p>

          <div className="explore-hero-actions">
            <a href="#intro-journal" className="explore-jump-btn explore-jump-btn--primary">
              <span>Explore My Journal</span>
              <span aria-hidden="true">↓</span>
            </a>
            <Link href="/journal" className="explore-jump-btn explore-jump-btn--secondary">
              <span>Try My Journal</span>
              <span aria-hidden="true">→</span>
            </Link>
          </div>
        </div>

        <div className="explore-hero-visual">
          <img
            src="/images/nova-ui/caderno-1-cutout.png"
            alt="Open vintage journal with handwritten memories and notes"
            className="explore-hero-img"
            width={440}
            height={440}
            loading="eager"
          />
        </div>
      </section>

      {/* 3. My Journal Introduction & Live Interface Preview */}
      <section
        id="intro-journal"
        className="explore-feature-section"
        aria-labelledby="intro-journal-title"
      >
        <div className="explore-feature-grid">
          <div className="explore-feature-copy">
            <span className="explore-section-kicker">PERSONAL VOLUMES · LEATHER-BOUND SANCTUARY</span>
            <h2 id="intro-journal-title" className="explore-section-title">
              My Journal — A place for your thoughts.
            </h2>
            <p className="explore-section-desc">
              Your personal space to write freely, record your days, and preserve the moments
              you don&apos;t want to forget.
            </p>

            <ul className="explore-capabilities-list">
              <li>
                <span className="explore-cap-bullet" aria-hidden="true">✦</span>
                <span>Create personal journal volumes with classic leather covers.</span>
              </li>
              <li>
                <span className="explore-cap-bullet" aria-hidden="true">✦</span>
                <span>Write about daily experiences, thoughts, and memories on ruled pages.</span>
              </li>
              <li>
                <span className="explore-cap-bullet" aria-hidden="true">✦</span>
                <span>Customize sheet paper, fountain-pen ink color, and typography.</span>
              </li>
              <li>
                <span className="explore-cap-bullet" aria-hidden="true">✦</span>
                <span>Enter distraction-free Focus Mode whenever you want quiet time to write.</span>
              </li>
              <li>
                <span className="explore-cap-bullet" aria-hidden="true">✦</span>
                <span>Pull writing prompts and literary inspiration when starting a new page.</span>
              </li>
              <li>
                <span className="explore-cap-bullet" aria-hidden="true">✦</span>
                <span>Mark favorite pages and return to previous entries whenever you want.</span>
              </li>
            </ul>

            <Link href="/journal" className="explore-try-cta">
              <span>Try My Journal</span>
              <span aria-hidden="true">→</span>
            </Link>
            {!isAuthenticated && (
              <span className="explore-try-note">
                No account required — try writing in temporary preview mode.
              </span>
            )}
          </div>

          {/* Authentic Interface Preview of My Journal */}
          <div className="explore-feature-preview">
            <div className="explore-preview-frame" aria-label="Preview of My Journal interface">
              <span className="explore-preview-badge">
                <span aria-hidden="true">✎</span>
                <span>My Journal Workspace</span>
              </span>

              <div className="preview-journal-desk">
                <div className="preview-journal-left">
                  <div className="preview-leather-book">
                    <span className="preview-leather-ribbon" aria-hidden="true" />
                    <span className="preview-leather-tag">ACTIVE JOURNAL</span>
                    <span className="preview-leather-title">Autumn Reflections</span>
                    <span className="preview-leather-date">Page 1 · Personal Volume</span>
                  </div>

                  <div className="preview-tools-mini">
                    <div className="preview-tool-pill">Paper &amp; Ink ▾</div>
                    <div className="preview-tool-pill">Focus Mode</div>
                    <div className="preview-tool-pill preview-tool-pill--accent">
                      Save Journal Page
                    </div>
                  </div>
                </div>

                <div className="preview-ruled-sheet">
                  <div className="preview-sheet-header">
                    <span>Sunday Afternoon</span>
                    <span>page 1 of 3</span>
                  </div>
                  <div className="preview-sheet-title">Tea by the window</div>
                  <div className="preview-sheet-lines">
                    The rain finally slowed around four o&apos;clock, leaving the garden quiet
                    and silver. I wanted to keep this afternoon somewhere safe before the week
                    begins again...
                  </div>
                  <div className="preview-sheet-footer">
                    <div className="preview-swatches-mini" aria-hidden="true">
                      <span className="preview-swatch-dot" style={{ background: "#FCFBF7" }} />
                      <span className="preview-swatch-dot" style={{ background: "#F5EAD6" }} />
                      <span className="preview-swatch-dot" style={{ background: "#262626" }} />
                      <span className="preview-swatch-dot" style={{ background: "#4A2E1B" }} />
                    </div>
                    <span className="preview-fav-stamp">FAVORITED ♥</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Gentle Invitation Footer */}
      <section className="explore-closing" aria-label="Account invitation">
        <h2 className="explore-closing-title">
          {isAuthenticated
            ? "Your writing desk is ready whenever you are."
            : "Try freely now, keep what you love."}
        </h2>
        <p className="explore-closing-text">
          {isAuthenticated
            ? "Return to your personal desk anytime to open your leather volumes, craft scrapbook pages, and revisit your shelf."
            : "Explore My Journal right away in temporary preview mode. When you want to preserve your writing, photos, and volumes on your personal shelf, creating an account takes only a moment."}
        </p>

        <div className="explore-closing-actions">
          {isAuthenticated ? (
            <Link href="/my-desk" className="explore-jump-btn explore-jump-btn--primary">
              Go to My Desk →
            </Link>
          ) : (
            <>
              <Link href="/login?mode=register" className="explore-jump-btn explore-jump-btn--primary">
                Create an account
              </Link>
              <Link href="/" className="explore-jump-btn explore-jump-btn--secondary">
                Back to Landing Page
              </Link>
            </>
          )}
        </div>
      </section>
    </div>
  );
}
