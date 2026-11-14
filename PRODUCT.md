# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

English-speaking writers, diarists, and thoughtful correspondents worldwide seeking a calm, intimate, tactile digital sanctuary to keep personal journals and sealed letters.

## Product Purpose

Between Letters provides a handcrafted, nostalgic digital writing desk and personal archive where users write in leather-bound journals, compose sealed or draft correspondence on vintage stationery, organize letters into physical-style folders, and revisit kept memories in an unhurried literary atmosphere.

## Positioning

Unlike generic note-taking apps or SaaS dashboards, Between Letters treats every entry as a physical keepsake—combining pure CSS leather-bound volumes, ruled 14-line sheets, wax-seal correspondence, archival filing drawers, and a metal postal discard bin with soft-delete recovery.

## Operating Context

- Users move between **My Desk** (`/my-desk`), **Journal** (`/journal`, `/notebook`), **Letters** (`/letters`), **My Shelf** (`/my-shelf`), and **Inspirations** (`/discover`).
- **My Shelf** (`/my-shelf`) serves as the user's personal archive and Collector's Study Cabinet: browsing, searching, filtering, reading, renaming, moving, and deleting hardbound journals and sealed/draft letters, plus inspecting or restoring discarded letters from the Postal Discards bin.
- Supports both Dark Organic Editorial (`data-theme="dark"`) and Light Academy (`data-theme="light"`) themes.

## Capabilities and Constraints

- **Strict English UI**: All user-facing text, labels, buttons, placeholders, tooltips, aria-labels, alt texts, and metadata must be in English.
- **Plan Quotas**:
  - Standard Plan (Free): Max 3 journals, Max 3 correspondence folders, Max 10 written/archived letters.
  - Pro Sender Club (Premium): Max 10 journals, Max 10 correspondence folders, Max 30 written/archived letters.
  - Unlimited archive inspiration prompts and all 4 paper styles / 4 inks on both plans.
- **Pure CSS Leather Journals**: Journals must use the pure CSS leather notebook design in three allowed themes: Brown (`#42220b`), Green (`#163321`), and Wine (`#3a0f18`).
- **State & Storage**: LocalStorage keys (`entre-cartas:notebooks:v2`, `entre-cartas:journal:entries`, `entre-cartas:journal:trash`, `entre-cartas:letter-folders:v1`, `entre-cartas:active-notebook:id`, `entre-cartas:active-letter-folder:id`), reactive `entre-cartas:journal-updated` event, and MariaDB sync via `/api/cartas` when authenticated.
- **Postal Trash Lifecycle**: Visual bin states (`0`, `1-2`, `3+` letters), drag-and-drop discard, soft deletion, restore, read, and permanent deletion.

## Brand Commitments

- **Between Letters** — Rustic, nostalgic, handcrafted, literary, antique celestial storybook atmosphere.
- Warm, intimate, editorial typography (Cormorant Garamond, EB Garamond, DM Serif Display, DM Sans, Caveat, Special Elite) and vintage paper/aged textures.
- Local production verification via Docker container `tomhanks_app` at `http://localhost:3000`.

## Evidence on Hand

- Existing Next.js 16 + React 19 + TypeScript + Tailwind CSS v4 + Framer Motion + GSAP frontend in `frontend/`.
- Existing `MyShelfPage.tsx`, `MyJournalCollection.tsx`, `MyLettersCollection.tsx`, `VintageFolderDrawer.tsx`, `PostalTrashCan.tsx`, and `globals.css`.

## Product Principles

1. **Tactile Literary Craft**: Every interaction should feel like handling physical stationery, leather bindings, brass-labeled drawers, and archival specimens.
2. **Intimate Clarity**: Rich atmosphere must never obscure wayfinding, search, or core actions (read, write, rename, move, discard).
3. **Respectful Preservation**: All user memories, quotas, storage keys, and backend syncs remain intact and recoverable.
