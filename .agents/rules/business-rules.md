# Entre Cartas Business Rules & Constraints

## Critical Pre-Modification Requirement
Before performing ANY code changes in this repository:
1. Review this document and [AGENTS.md](file:///home/danielmarcal/Downloads/entre-cartas/AGENTS.md).
2. All user-facing text MUST strictly be in English.
3. Verify changes locally and provide `http://localhost:3000` to the user.

## Core Rules
1. **Language**: Strictly English for all user-facing UI text, buttons, alerts, toasts, tooltips, dialogs, and accessibility attributes.
2. **Notebook Design**: Pure CSS leather journals with embossed border and bookmark ribbon in 3 colors (Brown `#42220b`, Green `#163321`, Wine `#3a0f18`). Never replace with images.
3. **Quotas**:
   - Standard: Max 3 journals, 3 folders, 10 letters.
   - Pro: Max 10 journals, 10 folders, 30 letters.
4. **Postal Trash**:
   - 3 dynamic visual states: Empty (0 letters), Partially full (1-2 letters), Full (3+ letters).
   - Drag-and-drop letter discard, soft delete in `TRASH_STORAGE_KEY` with restore and permanent deletion options.
5. **Execution**:
   - Always run/rebuild locally (`npm --prefix frontend run build` & `docker compose up -d --build app`).
   - Always output `http://localhost:3000` upon completing the task.
