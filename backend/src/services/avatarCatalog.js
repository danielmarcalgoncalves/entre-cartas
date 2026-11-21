/**
 * avatarCatalog.js
 * Automatically discovers approved predefined portrait avatars from `avatar-base` / `avatarbase`.
 *
 * Security guarantees:
 * - Strictly allowlists regular image files (.jpg, .jpeg, .png, .webp) inside the resolved catalog directory.
 * - Never trusts client-supplied filesystem paths or arbitrary extensions.
 * - Exposes stable, opaque identifiers served via GET /api/profile/default-avatars/:id.
 */

const fs = require('fs');
const path = require('path');

const ALLOWED_EXTENSIONS = new Map([
  ['.jpg', 'image/jpeg'],
  ['.jpeg', 'image/jpeg'],
  ['.png', 'image/png'],
  ['.webp', 'image/webp'],
]);

function resolveAvatarDirectories() {
  const candidates = [
    path.resolve(__dirname, '../../../avatar-base'),
    path.resolve(__dirname, '../../../avatarbase'),
    path.resolve('/app/avatar-base'),
    path.resolve('/app/avatarbase'),
  ];
  const existing = [];
  const seen = new Set();
  for (const dir of candidates) {
    if (seen.has(dir)) continue;
    seen.add(dir);
    try {
      if (fs.existsSync(dir) && fs.statSync(dir).isDirectory()) {
        existing.push(dir);
      }
    } catch {}
  }
  return existing;
}

function buildAvatarId(filename) {
  const base = path.parse(filename).name;
  const slug = base
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
  return slug || 'avatar';
}

function loadAvatarCatalog() {
  const catalog = new Map();
  const dirs = resolveAvatarDirectories();
  let index = 1;

  for (const dir of dirs) {
    let entries = [];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      continue;
    }

    entries.sort((a, b) => a.name.localeCompare(b.name));

    for (const entry of entries) {
      if (!entry.isFile()) continue;
      const ext = path.extname(entry.name).toLowerCase();
      const contentType = ALLOWED_EXTENSIONS.get(ext);
      if (!contentType) continue;

      const fullPath = path.resolve(dir, entry.name);
      // Defense-in-depth: ensure resolved file remains strictly inside the catalog directory
      if (!fullPath.startsWith(dir + path.sep)) continue;

      let id = buildAvatarId(entry.name);
      if (catalog.has(id)) {
        id = `${id}-${index}`;
      }

      catalog.set(id, {
        id,
        label: `Portrait ${index}`,
        filename: entry.name,
        filePath: fullPath,
        contentType,
        url: `/api/profile/default-avatars/${id}`,
      });
      index += 1;
    }
  }

  return catalog;
}

function listDefaultAvatars() {
  const catalog = loadAvatarCatalog();
  return Array.from(catalog.values()).map(({ id, label, url }) => ({
    id,
    label,
    url,
  }));
}

function getDefaultAvatarById(avatarId) {
  if (!avatarId || typeof avatarId !== 'string') return null;
  const trimmed = avatarId.trim().toLowerCase();
  if (!/^[a-z0-9-]+$/.test(trimmed)) return null;
  const catalog = loadAvatarCatalog();
  return catalog.get(trimmed) || null;
}

module.exports = {
  listDefaultAvatars,
  getDefaultAvatarById,
};
