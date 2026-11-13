"use client";

import React, { useState } from "react";
import {
  STICKER_CATALOG,
  STICKER_CATEGORIES,
  type StickerCategoryId,
  type StickerDefinition,
  renderStickerGraphic,
} from "@/lib/scrapbook-stickers";

export interface StickerCatalogDrawerProps {
  open: boolean;
  isGuestMode: boolean;
  onClose: () => void;
  onSelectSticker: (sticker: StickerDefinition) => void;
}

export function StickerCatalogDrawer({
  open,
  isGuestMode,
  onClose,
  onSelectSticker,
}: StickerCatalogDrawerProps) {
  const [activeCategory, setActiveCategory] = useState<StickerCategoryId>("stamps");

  if (!open) return null;

  const filteredStickers = STICKER_CATALOG.filter((s) => s.category === activeCategory);

  return (
    <div
      className="scrapbook-drawer-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label="Scrapbook Sticker Collection"
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 60,
        backgroundColor: "rgba(18, 11, 7, 0.56)",
        backdropFilter: "blur(3px)",
        display: "flex",
        justifyContent: "flex-end",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: "400px",
          height: "100%",
          backgroundColor: "#f7f0e2",
          color: "#2c1e14",
          borderLeft: "1px solid #cdb898",
          boxShadow: "-12px 0 36px rgba(15, 9, 5, 0.35)",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div
          style={{
            padding: "20px 22px 14px",
            borderBottom: "1px solid #dfd0b8",
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: "12px",
          }}
        >
          <div>
            <span
              style={{
                display: "block",
                fontSize: "10px",
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                color: "#7a5e42",
                fontWeight: 700,
              }}
            >
              Archival Ephemera
            </span>
            <h3
              style={{
                margin: "4px 0 0",
                fontFamily: "var(--serif-title, 'Cormorant Garamond', Georgia, serif)",
                fontSize: "24px",
                fontWeight: 600,
                color: "#2b1c12",
              }}
            >
              Sticker Collection
            </h3>
            {isGuestMode && (
              <p style={{ margin: "6px 0 0", fontSize: "12px", color: "#73583c" }}>
                Guest preview: stickers stay in temporary session memory.
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close sticker collection"
            style={{
              background: "transparent",
              border: "1px solid #ccb99b",
              borderRadius: "999px",
              width: "30px",
              height: "30px",
              cursor: "pointer",
              color: "#4d3826",
              fontSize: "14px",
            }}
          >
            ✕
          </button>
        </div>

        {/* Category Tabs */}
        <div
          style={{
            padding: "12px 16px",
            borderBottom: "1px solid #e6dac6",
            display: "flex",
            flexWrap: "wrap",
            gap: "6px",
            backgroundColor: "#f2e8d6",
          }}
        >
          {STICKER_CATEGORIES.map((cat) => {
            const active = cat.id === activeCategory;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setActiveCategory(cat.id)}
                style={{
                  padding: "6px 11px",
                  borderRadius: "999px",
                  border: active ? "1px solid #6b4423" : "1px solid #d5c3a7",
                  backgroundColor: active ? "#6b4423" : "#faf4e8",
                  color: active ? "#fbf5e9" : "#4b3624",
                  fontSize: "11.5px",
                  fontWeight: active ? 600 : 500,
                  cursor: "pointer",
                }}
              >
                {cat.label}
              </button>
            );
          })}
        </div>

        {/* Sticker Grid */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "18px",
            display: "grid",
            gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
            gap: "14px",
            alignContent: "start",
          }}
        >
          {filteredStickers.map((stk) => (
            <button
              key={stk.id}
              type="button"
              onClick={() => onSelectSticker(stk)}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "10px",
                padding: "14px 10px",
                backgroundColor: "#fbf6ec",
                border: "1px solid #dfd1ba",
                borderRadius: "8px",
                cursor: "pointer",
                transition: "transform 0.16s ease, box-shadow 0.16s ease",
              }}
              title={`Add ${stk.name} to current page`}
            >
              <div style={{ width: "86px", height: "86px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                {renderStickerGraphic(stk.id)}
              </div>
              <span
                style={{
                  fontSize: "12px",
                  fontWeight: 600,
                  color: "#3f2d1d",
                  textAlign: "center",
                }}
              >
                {stk.name}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
