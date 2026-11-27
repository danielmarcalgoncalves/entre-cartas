-- ============================================================================
-- Migration: Decommission Legacy Letters Tables (Non-Destructive & Reversible)
-- Date: 2026-11-27
-- Purpose:
--   Safely isolate and archive legacy database tables that existed solely for
--   the retired Letters system without deleting historical user records.
--
-- Pre-migration MariaDB audit snapshot (local environment):
--   - carta_favoritos : 0 rows
--   - itens_pasta     : 0 rows
--   - notas_cartas    : 0 rows
--   - pastas_memorias : 0 rows
--   - pastas_cartas   : 1 row  (user correspondence folder)
--   - cartas          : 9 rows (8 seeded archive records + 1 user-authored row)
--
-- Shared / Preserved tables (NEVER touched by this migration):
--   usuarios, reset_tokens, codigos_verificacao, revoked_tokens, refresh_tokens,
--   cadernos (user Journals & pages), stripe_subscriptions, stripe_webhook_events,
--   favoritos, comentarios.
--
-- NOTE: This script is NOT auto-executed during startup so operators retain full
-- control over backup and archival timing in Portainer/MariaDB.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- UP: Archive (Rename) Letters-only tables in reversible fashion
-- ----------------------------------------------------------------------------
RENAME TABLE
  carta_favoritos TO archived_legacy_carta_favoritos,
  itens_pasta     TO archived_legacy_itens_pasta,
  notas_cartas    TO archived_legacy_notas_cartas,
  pastas_memorias TO archived_legacy_pastas_memorias,
  pastas_cartas   TO archived_legacy_pastas_cartas,
  cartas          TO archived_legacy_cartas;

-- ----------------------------------------------------------------------------
-- DOWN (Rollback): Restore original legacy Letters table names
-- ----------------------------------------------------------------------------
-- RENAME TABLE
--   archived_legacy_cartas          TO cartas,
--   archived_legacy_pastas_cartas   TO pastas_cartas,
--   archived_legacy_pastas_memorias TO pastas_memorias,
--   archived_legacy_notas_cartas    TO notas_cartas,
--   archived_legacy_itens_pasta     TO itens_pasta,
--   archived_legacy_carta_favoritos TO carta_favoritos;

-- ----------------------------------------------------------------------------
-- OPTIONAL FINAL PURGE (Execute ONLY after exporting an external backup and
-- confirming historical Letter data is no longer needed)
-- ----------------------------------------------------------------------------
-- DROP TABLE IF EXISTS archived_legacy_carta_favoritos;
-- DROP TABLE IF EXISTS archived_legacy_itens_pasta;
-- DROP TABLE IF EXISTS archived_legacy_notas_cartas;
-- DROP TABLE IF EXISTS archived_legacy_pastas_memorias;
-- DROP TABLE IF EXISTS archived_legacy_pastas_cartas;
-- DROP TABLE IF EXISTS archived_legacy_cartas;
