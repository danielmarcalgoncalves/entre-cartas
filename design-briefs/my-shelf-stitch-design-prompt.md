# My Shelf — UI/UX Analysis & Google Stitch Design Prompt

---

## Part 1 — My Shelf Analysis

### 1.1 Route, Entry Points & Shell Context
- **Primary Route:** `/my-shelf` (`frontend/src/app/my-shelf/page.tsx`) rendered inside the global collapsible left navigation sidebar (`SiteShell.tsx`), which connects **My Desk** (`/my-desk`), **Journal** (`/journal`), **Letters** (`/letters`), **My Shelf** (`/my-shelf`), and **Inspirations** (`/discover`).
- **URL Query Parameters:** Supports `?section=journals` (or `journal`) and `?section=letters` (or `letter`) so deep links from the Journal editor ("My Shelf ↗") or Letters editor land directly in the relevant archive section.
- **Access & Lifecycle States:**
  - **Loading State (`authLoading`):** Centered italic serif notice (*"Opening archive…"*).
  - **Guest Gate (`!user`):** Renders `GuestAccountPromptCard` (`variant="shelf"`) with heading *"Your memories need a home."*, primary CTA **"Create account"**, and secondary **"Go back"**.
  - **Master Empty State:** Displayed when both `notebooks` and `lettersWritten` are empty, featuring leather-book & sealed-envelope emblems, *"Your shelf is waiting for memories."*, and CTAs **"Create a Journal"** (`/journal?create=1`) and **"Write a Letter"** (`/letters`).
  - **Empty Search State:** Displayed when an active search query matches zero journals and zero letters, with a **"Clear Search"** recovery button.

### 1.2 Complete Feature & Interaction Inventory

| Area | Component | Displayed Information | User Actions & Resulting Flow |
|---|---|---|---|
| **Cabinet Masthead & Ledger** | `MyShelfPage.tsx` | Page title (*"My Shelf."*), subtitle, capacity progress meters for **Journals** (`X/3` Free, `X/10` Pro), **Letters** (`X/10` Free, `X/30` Pro), and **Folders** (`X/3` Free, `X/10` Pro), plan badge (`Standard Plan` / `Pro Sender`), and Pro upgrade link (`/clube-pro`). | **Create a Journal** → `/journal?create=1`; **Write a Letter** → `/letters`; **Upgrade to Pro Club ↗** → `/clube-pro`. |
| **Cataloguing Desk Toolbar** | `MyShelfPage.tsx` | Section tabs (**All Archive**, **My Journal**, **My Letters**) with live item counts, unified search input (`/` keyboard shortcut + clear button), and sort selector (**Recently Updated**, **Oldest First**, **Title A–Z**). | Filters and sorts both journals (by title, cover theme, page titles/content) and letters (by title, recipient, body, seal, folder name) in real time. |
| **My Journal Collection** | `MyJournalCollection.tsx` | Hardbound leather journal volumes seated on a shelf ledge. Each volume shows its theme tag (`BROWN · RUSTIC LEATHER`, `GREEN · BOTANICAL MOSS`, `WINE · NOBLE BURGUNDY`), embossed title, written page count, created/updated dates, spine shadow, and silk bookmark ribbon. | Clicking the volume or **View Journal** → `/notebook?id=...` (3D realistic viewer); **Quick Read** → opens Dark Reading Room modal (page-by-page reader with `←`/`→`/`Esc` keyboard navigation, paper/ink/font rendering, favorited badge, Continue Writing, Rename, Delete); **Write ↗** → `/journal?notebook=...&page=...`; **Rename** → Rename modal; **Delete** → Permanent deletion warning modal. |
| **Correspondence Filing Cabinet** | `VintageFolderDrawer.tsx` (inside `MyLettersCollection.tsx`) | Physical-style recessed filing drawer with staggered manila folder tabs (`FLD.01`, `FLD.02`, …), folder title, filed letter count, creation date, and accordion interior view revealing filed letters. | **+ New Folder** → Create Folder modal (enforces Free `3` / Pro `10` quota); click folder tab → toggle accordion interior; **Open Folder View** → full-page opened folder view with **← Back to Filing Drawer** and **+ Write Letter in this Folder** (`/letters`); rename/delete folder; read, edit (`/letters?edit=...`), move, or drag-and-drop discard letters. |
| **Postal Discard Station** | `PostalTrashCan.tsx` + Trash Modal (inside `MyLettersCollection.tsx`) | Dynamic metal postal discard bin reflecting trash count via 3 dedicated states: `0` (empty), `1–2` (partially full), `3+` (full), plus live count label and header badge when `> 0`. | Drag-and-drop a letter onto the bin to soft-delete; click bin or **Inspect Discards** → opens **Postal Discards** modal listing soft-deleted letters with **Read**, **Restore** (returns to folder), **Delete Permanently** (in-app confirmation modal), and **Empty Discards** (in-app confirmation modal). |
| **Correspondence Index** | `MyLettersCollection.tsx` | Status filter pills (**All**, **Sealed**, **Drafts**), folder filter pills (**All Folders** + each folder), layout switcher (**Cards** vs. **Ledger**), and either stationery cards or archival ledger rows showing seal code/draft tag, title, recipient (`To: ...`), folder badge, snippet, and date. | Click card/row → opens **Letter Reading Modal** (styled in the letter's chosen paper color, ink color, font, handwritten signature, and stamp, with **Continue Editing**, **Rename**, **Discard to Trash**, **Close**); inline **Edit**, **Move** (Move to Folder modal), and **Discard** (soft-delete + toast notification). |
| **Closing Literary Note** | `MyShelfPage.tsx` | Ornamental fleuron (`❧`), *"What is written with care never truly fades."*, and *"— Between Letters ✦"* signature. | Passive atmospheric footer. |

### 1.3 Established Visual Identity & Design Tokens (`globals.css` & `my-shelf.css`)
- **Dual Theme Support:**
  - **Dark Organic Editorial (Default, `data-theme="dark"`):** Deep canvas `#1e1813` / `#19130e`, warm charcoal surfaces `#2b221a` / `#342b22` / `#2e261e`, Birch Paper cream text `#ece1c9`, soft parchment `#c9bc9f`, muted metadata `#9c8e76`, Pollen Brass accent `#cfa96f`, Red Sands terracotta primary `#ad5b30`, Dried Petals wine `#793b2b`, Olive Sage `#514c34`.
  - **Light Academy (`data-theme="light"`):** Warm cream canvas `#fdfbf6`, soft sand `#f6f2e8`, birch warm surface `#f8f5e9`, charcoal ink `#3e3a2f`, earthy secondary `#6b6454`, olive muted `#8a835f`, terracotta light `#d7a27a` / `#b85e33`, pollen gold `#e6c89a`.
- **Typography Stack:**
  - Display: `"DM Serif Display"`, `"Cormorant Garamond"`, Georgia, serif
  - Editorial / Titles: `"Cormorant Garamond"`, `"EB Garamond"`, Georgia, serif
  - Body / UI Controls: `"DM Sans"`, `"Inter"`, sans-serif
  - Handwritten Accents: `"Caveat"`, cursive
  - Typewriter / Archival Codes: `"Special Elite"`, monospace
- **Pure CSS Leather Journal Themes (Mandatory):**
  1. **Brown** (`#42220b`): Rustic Leather, gold border, amber-gold silk ribbon.
  2. **Green** (`#163321`): Botanical Moss, embossed olive border, sage ribbon.
  3. **Wine** (`#3a0f18`): Noble Burgundy, crimson/bronze border, royal burgundy ribbon.

### 1.4 Key Functional Constraints
- Strictly **English-only** UI copy across all labels, tooltips, badges, and dialogs.
- Journals **must** remain rendered as tactile leather-bound volumes (not replaced by flat raster stock photos) in the three allowed color themes.
- Plan quotas (`3/10` journals, `3/10` folders, `10/30` letters) and Pro upgrade paths must stay transparent and actionable.
- Postal Trash must preserve its 3-state visual bin (`0`, `1–2`, `3+`), drag-to-discard affordance, and full recovery modal.
- Real-time synchronization via `entre-cartas:journal-updated` and MariaDB `/api/cartas` sync; no mock-only features.

---

## Part 2 — Stitch Design Prompt

Copy and paste the entire block below directly into **Google Stitch**:

```text
DESIGN BRIEF — "MY SHELF" COMPLETE UI/UX REDESIGN FOR BETWEEN LETTERS

================================================================================
1. PROJECT CONTEXT — WHAT BETWEEN LETTERS IS
================================================================================
Between Letters is a web application for English-speaking writers, diarists, and correspondents worldwide. It is an intimate, contemplative digital sanctuary for slow writing: users maintain personal hardbound leather journals (with 14-line ruled pages, customizable paper tones, inks, and scripts) and compose sealed or draft letters on vintage stationery organized into physical-style folders.

The application consists of five primary spaces connected via a collapsible left navigation rail:
- My Desk (/my-desk): Overhead personal writing desk with a Polaroid portrait, About Me note, active journal, and envelope.
- Journal (/journal & /notebook): Distraction-free ruled writing canvas and 3D page-turning notebook reader.
- Letters (/letters): Vintage stationery letter composer with wax seals and folder filing.
- My Shelf (/my-shelf): The user's personal literary archive — THE SCREEN TO REDESIGN.
- Inspirations (/discover): Curated literary prompts and epistolary inspiration archive.

================================================================================
2. PURPOSE OF "MY SHELF"
================================================================================
My Shelf is the heart of memory preservation in Between Letters. It is where every leather-bound journal volume, correspondence folder, sealed letter, draft, and softly discarded letter rests so the user can browse, search, organize, reopen, reread, continue writing, or recover their keepsakes.

It must feel like stepping into a private, candlelit Collector's Literary Archive or Antique Study Library — NOT a generic SaaS dashboard, NOT a modern note-taking grid, and NOT a minimalist blank-white productivity app.

================================================================================
3. COMPLETE EXISTING FUNCTIONALITY TO PRESERVE (DO NOT REMOVE OR INVENT FEATURES)
================================================================================
Every single existing capability below must be thoughtfully integrated into the redesigned interface:

A. Archive Overview & Plan Capacity (Quotas)
- Displays the user's current plan tier: "Standard Plan" (Free) or "Pro Sender" (Premium).
- Displays live usage against plan limits:
  * Journals: X / 3 (Free) or X / 10 (Pro)
  * Letters: X / 10 (Free) or X / 30 (Pro)
  * Folders: X / 3 (Free) or X / 10 (Pro)
- For Standard Plan users, includes a tasteful "Upgrade to Pro Club ↗" link.
- Primary quick-creation actions: "Create a Journal" and "Write a Letter".

B. Unified Archival Navigation, Search & Sorting
- Section switcher tabs with live item counts:
  * "All Archive" (total journals + letters)
  * "My Journal" (journal count)
  * "My Letters" (letter count)
- Real-time search input filtering across both journals (title, cover theme, page titles/content) and letters (title, recipient, body, wax seal, folder name), featuring a subtle "/" keyboard shortcut hint and a clear button when active.
- Sort control with three options: "Recently Updated", "Oldest First", and "Title (A–Z)".

C. My Journal — Hardbound Leather Volumes
- Displays all user-created journals in three authentic leather themes:
  1. Rustic Leather (Brown, #42220b) — embossed gold framing, amber-gold silk ribbon.
  2. Botanical Moss (Green, #163321) — embossed olive-gold framing, sage ribbon.
  3. Noble Burgundy (Wine, #3a0f18) — crimson/bronze framing, burgundy ribbon.
- Each journal volume shows: leather theme label, embossed title, written page count (e.g., "14 pages written"), created date, and last modified date.
- Actions per journal:
  * Primary click / "View Journal": opens the 3D page-turning notebook viewer.
  * "Quick Read": opens an immersive Dark Reading Room modal (showing the sheet in its actual paper color, ink color, font, date badge, optional "FAVORITED ♥" badge, previous/next page arrows, and top-bar actions for Continue Writing, Rename, Delete, Close).
  * "Write ↗" (Continue Writing): jumps directly into the Journal editor at the last written page.
  * "Rename": opens a Rename Journal dialog.
  * "Delete": opens a Permanent Deletion warning dialog.

D. My Letters — Correspondence Filing Drawer & Folder Management
- Interactive physical-style Correspondence Filing Drawer holding staggered manila/archival folders (coded FLD.01, FLD.02, etc.) with folder name, filed letter count, and creation date.
- "+ New Folder" action (respecting 3/10 folder quota) opening a New Folder dialog with name and folder color theme selection.
- Clicking a folder expands it inside the drawer (or opens a dedicated "Opened Folder View" with "← Back to Filing Drawer", folder heading, "+ Write Letter in this Folder", and all letters inside that folder).
- Folder actions: Rename Folder, Delete Folder, Open Full View, Write Letter in Folder.

E. Postal Discard Station (Soft Deletion & Recovery)
- A dedicated, tactile Metal Postal Discard Bin situated alongside the Correspondence Filing Drawer.
- Visually reflects 3 distinct capacity states: Empty (0 letters), Partially Full (1–2 letters), Full (3+ letters).
- Supports drag-and-drop: users can drag a letter onto the bin to soft-delete it (with a subtle hover/drop highlight state).
- Clicking the bin or "Inspect Discards" opens the "Postal Discards" modal, where each discarded letter can be Read, Restored back to its folder, or Permanently Deleted (via confirmation dialog), plus an "Empty Discards" bulk action.
- Also shows a subtle discarded-count pill in the Letters section header when trash > 0, and transient archival toast notifications on actions (rename, move, discard, restore).

F. Correspondence Index (All Letters Overview)
- Filter pills by status: "All", "Sealed", "Drafts" (each with counts).
- Filter pills by folder: "All Folders" plus each user folder.
- View mode switcher: "Cards" (tactile vintage stationery cards) and "Ledger" (compact, scannable archival catalog rows).
- Each letter item displays: wax seal code (or "DRAFT" badge), folder tag, letter title, optional recipient ("To: ..."), brief text excerpt (in Cards view), and date.
- Clicking any letter opens the "Letter Reading Modal" styled in the letter's paper tone, ink color, font, handwritten signature, and stamp, with actions: "Continue Editing", "Rename", "Discard to Trash", "Close".
- Quick actions per letter: "Edit", "Move" (opens Move to Folder modal), and "Discard" (moves to Postal Discards).

G. Required System States
- Authenticated populated state (both Journals and Letters present).
- Master Empty State (0 journals, 0 letters) with warm literary invitation and dual CTAs.
- Search No-Match State with "Clear Search" button.
- Section Empty States (e.g., 0 journals created yet, or an empty folder).
- Guest Gate State (unauthenticated visitor prompt to create an account).
- Loading State ("Opening archive…").

================================================================================
4. VISUAL IDENTITY — PRESERVE THE BETWEEN LETTERS UNIVERSE
================================================================================
Atmosphere & Artistic References:
- Rustic, nostalgic, handcrafted, literary, and intimate.
- Inspired by antique celestial storybooks, late-19th-century stationery, museum library cataloguing cabinets, embossed leather bookbinding, archival specimen plates, and wax-sealed correspondence.
- Sophisticated and editorial — never childish, never sterile minimalism, never generic dark-mode SaaS cards.

Exact Color System (Design for Primary Dark Organic Editorial, while keeping Light Academy harmony in mind):
- Deep Canvas / Backdrop: #19130e and #1e1813 (warm aged espresso/walnut, never cold blue-black)
- Elevated Wood & Study Surfaces: #2b221a, #342b22, #2e261e
- Primary Text (Birch Paper Cream): #ece1c9
- Secondary Text (Soft Parchment): #c9bc9f
- Muted Metadata: #9c8e76
- Brass / Gold Accent (Pollen): #cfa96f
- Primary Action Accent (Red Sands Terracotta): #ad5b30
- Deep Earthy Accents: Dried Petals Wine (#793b2b), Olive Sage (#514c34)
- Fine Borders & Hairlines: rgba(207, 169, 111, 0.16) to rgba(207, 169, 111, 0.34)
- Leather Volume Covers: Brown (#42220b), Green (#163321), Wine (#3a0f18)
- (Light Academy companion palette uses #fdfbf6 canvas, #f6f2e8 warm sand surfaces, #3e3a2f charcoal ink, and #8c4824/#b85e33 terracotta accents.)

Typography System:
- Display Headline: DM Serif Display (400 weight, tight editorial tracking) paired with Cormorant Garamond Italic for poetic emphasis ("My Shelf.").
- Section Headings & Volume/Letter Titles: Cormorant Garamond (600 weight).
- Literary Subtitles, Quotes & Counts: EB Garamond (regular & italic, tabular numerals for counts/dates).
- UI Controls, Tabs, Search, Badges & Metadata: DM Sans (clean, crisp, restrained uppercase micro-labels).
- Handwritten Accents (signatures / archival notes): Caveat.
- Catalog / Stamp Codes (FLD.01, seal codes): Special Elite (subtle typewriter character, used sparingly for authentic catalog tags only).

Textures, Materials & Decorative Restraint:
- Subtle aged paper grain and warm radial desk-lamp vignettes.
- Double-ruled inset brass framing (1px subtle inner hairline inside cabinet panels).
- Carved wooden shelf ledges beneath bound leather volumes, realistic multi-layer spine shadows, stitched gold-foil borders, and hanging silk bookmark ribbons.
- Engraved brass specimen plates for section indices and the Postal Discard Station.
- Crisp 1.6px–1.8px stroke literary line icons (no generic emojis like 📁 or ✎).
- Delicate typographic ornaments (such as ❧ fleuron in the closing note) used with editorial restraint.

================================================================================
5. NEW CREATIVE DIRECTION FOR MY SHELF
================================================================================
Rethink the entire layout and spatial choreography of My Shelf as a **Curated Collector's Study & Archival Library** rather than stacked rectangular boxes:

- Do NOT simply stack uniform cards inside uniform borders. Create varied, editorial spatial rhythms:
  1. An atmospheric **Archival Masthead & Collector's Ledger** at the top — asymmetrical editorial composition with the literary display title and poetic subtitle on the left, tactile stationery creation buttons on the right, and a sleek brass-ruled capacity ledger integrated seamlessly along the bottom edge of the masthead (no floating SaaS metric cards).
  2. A grounded **Cataloguing Desk Strip** directly below — combining the pill/brass-tab section switcher, an integrated archival search field with "/" shortcut badge, and a refined sort selector in one cohesive horizontal bar.
  3. **The Leather Volumes Alcove (My Journal)** — present the user's hardbound journals resting physically on a warm carved walnut bookshelf ledge with realistic depth, embossed leather grain, and silk ribbons. Keep the leather cover face dignified and uncluttered (title, theme, page count, dates), placing secondary actions (Quick Read, Write, Rename, Delete) in a restrained, brass-trimmed lower binding bar or subtle hover reveal so the book never feels like a crowded form.
  4. **The Correspondence Cabinet & Discard Station (My Letters)** — an asymmetric two-column editorial stage: the tactile recessed Correspondence Filing Drawer with staggered manila folder tabs occupies the primary left ~72% width, while the Brass-Plated Postal Discard Station (metal bin + drag-and-drop cue + Inspect Discards button) anchors the right ~28% column as a distinct physical desk companion.
  5. **The Correspondence Index** — below the filing cabinet, give users a curated archival index with refined status & folder filter pills and a tactile "Cards / Ledger" toggle. In "Cards" mode, letters look like aged, slightly textured correspondence slips with wax-seal codes and delicate hairline dividers; in "Ledger" mode, letters flow like an antique library register with tabular dates and crisp inline actions.
  6. **Closing Colophon** — a quiet, centered literary sign-off ("❧ What is written with care never truly fades. — Between Letters ✦").

================================================================================
6. INTERACTION & STATE DESIGN REQUIREMENTS
================================================================================
Design clear, unmistakable visual representations for:
- Hover states: gentle physical lift (-4px to -6px) on leather volumes and stationery cards, brass border illumination, subtle arrow/action reveal.
- Active / Selected states: warm brass highlight on active section tab, active filter pill, selected folder tab inside the drawer, and active Cards/Ledger toggle.
- Focus states: crisp 2px Pollen Brass (#cfa96f) focus-visible outline for keyboard accessibility.
- Modals & Overlays: show design treatment for the Dark Reading Room (journal sheet centered on deep vignette with left/right arrows), Letter Reading Sheet (parchment stationery modal), Postal Discards Modal (list with Read / Restore / Delete Permanently), and Confirmation Dialogs.
- Feedback: subtle top/floating archival toast notification with brass accent for rename, move, discard, and restore events.
- Motion philosophy: calm, tactile, paper-weight transitions (exponential ease-out), respecting prefers-reduced-motion.

================================================================================
7. RESPONSIVE REQUIREMENTS (DESKTOP & MOBILE)
================================================================================
Desktop (1280px–1440px):
- Max-width ~1180px centered within the main workspace beside the collapsed left navigation rail.
- Generous editorial margins, clear vertical breathing room between the Journal Shelf Alcove and the Correspondence Cabinet.
- Balanced two-column Correspondence Cabinet + Discard Station; 3-column leather volume shelf; 3-column stationery cards grid (or full-width 5-column archival ledger).

Mobile (375px–430px):
- Reorganize naturally rather than shrinking desktop columns:
  * Masthead stacks title, quick actions, and a compact 3-column capacity meter row cleanly with zero horizontal overflow.
  * Cataloguing toolbar stacks section tabs into a full-width segmented strip above the full-width search + sort row.
  * Leather volumes render as full-width tactile books with comfortable 44px+ touch targets for actions.
  * Correspondence Cabinet stacks the Filing Drawer above a compact horizontal Discard Station bar.
  * Ledger view adapts gracefully to 2-line mobile register rows (hiding secondary folder/date columns or tucking them under the title).
  * Modals adapt as smooth bottom-sheets or full-height drawers on mobile.

================================================================================
8. STRICT DESIGN CONSTRAINTS (MUST FOLLOW)
================================================================================
- DO NOT turn My Shelf into a generic Notion/Linear/SaaS productivity dashboard.
- DO NOT invent unsupported features (no tags, no social sharing, no AI summaries, no folders for journals, no calendar heatmaps).
- DO NOT remove any existing action (View 3D Journal, Quick Read, Continue Writing, Rename, Delete, Create Folder, Open Folder View, Drag-to-Trash, Restore, Permanent Delete, Cards/Ledger toggle, Search, Sort, Plan Quotas, Upgrade link).
- DO NOT replace the pure CSS leather journal covers with generic stock photos or flat colored rectangles.
- DO NOT use raw emojis as UI icons; use cohesive line-art icons.
- DO NOT overload the screen with noisy ornaments; let typography, warm materials, negative space, and hierarchy carry the sophistication.
- ALL UI copy must be strictly in English.
```

---

## Part 3 — Design Considerations for Google Stitch

1. **Pure CSS Leather Journal Identity (`AGENTS.md` Rule):** The leather journals in Between Letters are a signature brand element rendered via pure CSS (embossed gold borders, layered spine shadows, silk bookmark ribbons, and strictly 3 color themes: Brown `#42220b`, Green `#163321`, Wine `#3a0f18`). Stitch should design them as bespoke tactile book objects, never as photographic book mockups or generic rounded SaaS cards.
2. **Postal Discard Bin 3-State Visual Asset:** The Postal Discard Station uses three real illustrated metal-bin states (`0` empty, `1–2` partially full, `3+` full) and acts as a real drag-and-drop dropzone for letters dragged out of the filing drawer. The layout must keep the Discard Station visually paired with the Correspondence Filing Drawer on desktop so drag-and-drop feels spatially natural.
3. **Coexistence with the Global Collapsible Sidebar (`SiteShell`):** My Shelf does not own the top/left global navigation—it renders inside `SiteShell`, which already provides a left-edge collapsible sidebar (with user avatar, theme toggle, My Desk, Journal, Letters, My Shelf, Inspirations, and Sign Out). Stitch should **not** duplicate a second global navigation sidebar inside My Shelf; internal navigation is scoped strictly to `All Archive / My Journal / My Letters`.
4. **Dual Theme Compatibility:** While **Dark Organic Editorial** (`#1e1813` ground, `#ece1c9` cream ink, `#cfa96f` brass) is the primary atmospheric identity, users can toggle **Light Academy** (`#fdfbf6` ground, `#3e3a2f` charcoal ink). Contrast ratios (≥ 4.5:1 for body text, ≥ 3:1 for large headings) and brass/terracotta accents should translate cleanly across both palettes.
5. **Cross-Page Journeys:** Clicking a journal opens `/notebook?id=...` (3D viewer) or `/journal?notebook=...&page=...` (editor); clicking Edit on a letter opens `/letters?edit=...`; clicking Upgrade opens `/clube-pro`. Visual affordances should subtly distinguish *in-place inspection* (Quick Read modal, Letter Reading modal, Opened Folder View) from *cross-page navigation* (subtle `↗` directional cues on Continue Writing / Upgrade).
6. **Quota Transparency Without Nagging:** Plan quotas (`3/10` journals, `3/10` folders, `10/30` letters) are core business rules. Presenting them as an understated brass-ruled Collector's Ledger (rather than loud upsell banners) preserves the literary sanctuary atmosphere while keeping limits immediately legible.
