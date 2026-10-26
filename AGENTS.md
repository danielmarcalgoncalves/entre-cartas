# Business Rules and Engineering Guidelines: Entre Cartas (Between Letters)

> **MANDATORY INSTRUCTION FOR ALL AGENTS & DEVELOPERS:**
> Before making ANY change, modification, refactoring, or feature addition in this repository, you MUST read and strictly adhere to the business rules and constraints defined in this document.

---

## 1. Absolute Language Requirement (English Only)

- **Strict English UI**: ALL user-facing text, labels, navigation items, buttons, placeholders, dialogs, toasts, error messages, tooltips, aria-labels, alt texts, and metadata MUST be written strictly in **English**.
- **Target Audience**: The target audience consists of English-speaking users worldwide.
- **Zero Tolerance for Portuguese in UI**: Under NO circumstances should user-facing text in Portuguese be added, re-introduced, or left untouched if modifying a component.
- **Code Identifiers & Backwards Compatibility**: Internal storage keys (such as `entre-cartas:notebooks:v2`, `entre-cartas:journal:trash`) and backend API route paths (such as `/api/cartas`) are kept for backwards compatibility with existing databases and storage, but any text rendered to the user MUST be in English.

---

## 2. Mandatory Verification & Localhost Delivery

- **Local Execution Required**: After ANY modification to the application, you MUST verify the build and ensure the application is running locally.
- **Docker Production Environment**:
  - The application is served via Docker container `tomhanks_app` on `http://localhost:3000`.
  - Rebuilding/updating is executed via:
    ```bash
    npm --prefix frontend run build
    docker compose up -d --build app
    ```
- **Localhost Link**: In your final response to the user, you MUST ALWAYS provide the active localhost URL: `http://localhost:3000`.

---

## 3. Plan Quotas & Business Limits

The application supports two user tiers: **Standard Plan (Free)** and **Pro Sender Club (Premium)**.

| Resource | Standard Plan (Free) | Pro Sender Club (Premium) |
|---|---|---|
| **Journals (Notebook Volumes)** | Max 3 journals | Max 10 journals |
| **Correspondence Folders** | Max 3 folders | Max 10 folders |
| **Written & Archived Letters** | Max 10 letters | Max 30 letters |
| **Archive Inspiration Prompts** | Unlimited | Unlimited |
| **Paper Styles & Inks** | All 4 papers / 4 inks | All 4 papers / 4 inks |

- Quota enforcement alerts and modal prompts must clearly inform the user of their current usage and offer an upgrade to the Pro Club when limits are reached.

---

## 4. Notebook (Journal) Aesthetics & Behavior

- **Pure CSS Leather Covers**:
  - The digital journals MUST be rendered using the pure CSS leather notebook design (embossed gold framing, spine shadow gradients, stitched accents, and silk bookmark ribbon).
  - **NO Image Overwrites**: Do NOT replace the journal design with flat raster/photo images. The vintage CSS aesthetic is an established design identity.
- **The Three Allowed Color Themes**:
  1. **Brown** (`#42220b`): Rustic Leather, gold border, amber-gold silk ribbon.
  2. **Green** (`#163321`): Botanical Moss, embossed olive border, sage ribbon.
  3. **Wine** (`#3a0f18`): Noble Burgundy, crimson/bronze border, royal burgundy ribbon.
- **Pagination & Storage Rules**:
  - Ruled sheets have a 14-line capacity limit.
  - Page navigation allows advancing up to **3 blank pages** beyond the last written page. To advance further, the current page must contain written text or a title.
  - Only pages that contain written text or a title are committed to persistent storage.

---

## 5. Postal Trash & Letter Disposal Lifecycle

- **Visual State Sync**:
  - Metal postal discard bin dynamically reflects the number of discarded letters using dedicated assets:
    - `0 letters`: Empty state (`/images/lixeira/foto-nova-1.png`)
    - `1 to 2 letters`: Partially full state (`/images/lixeira/foto-nova-2.png`)
    - `3+ letters`: Full state (`/images/lixeira/foto-nova-3.png`)
- **Drag-and-Drop Discard**:
  - Letters can be dragged from 3D opened folders and dropped onto the trash bin to discard.
- **Soft Deletion & Recovery**:
  - Discarded letters are soft-deleted into `TRASH_STORAGE_KEY` (`entre-cartas:journal:trash`).
  - Users can open the trash bin modal at any time to:
    - **Restore** letters back to their original folder.
    - **Read** discarded letters.
    - **Permanently Delete** individual letters or empty the trash entirely.

---

## 6. Architecture & State Synchronization

- **LocalStorage Keys**:
  - `entre-cartas:notebooks:v2`: Array of user journals and written pages.
  - `entre-cartas:journal:entries`: Array of written and sealed letters.
  - `entre-cartas:journal:trash`: Array of discarded letters.
  - `entre-cartas:letter-folders:v1`: Array of physical correspondence folders.
  - `entre-cartas:active-notebook:id`: Currently active journal ID.
  - `entre-cartas:active-letter-folder:id`: Currently active folder ID.
- **Reactivity**:
  - State changes must dispatch `entre-cartas:journal-updated` and listen to `storage` events to ensure immediate UI synchronization across components without page reloads.
- **Backend Sync**:
  - When the user is logged in, synchronize letters and stamps with MariaDB via `/api/cartas`.
