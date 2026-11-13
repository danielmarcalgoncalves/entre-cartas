"use client";

import React from "react";
import { AnimatePresence, motion } from "framer-motion";
import type {
  JournalAttachment,
  JournalAttachmentStyle,
  JournalSticker,
} from "@/lib/journal-storage";
import {
  JOURNAL_PAGE_HEIGHT,
  JOURNAL_PAGE_WIDTH,
} from "@/lib/journal-page-layout";
import {
  getStickerById,
  renderStickerGraphic,
} from "@/lib/scrapbook-stickers";

const STYLE_LABELS: Record<JournalAttachmentStyle, string> = {
  polaroid: "Polaroid",
  washi: "Washi Tape",
  vintage: "Vintage Frame",
  plain: "Clean Edge",
};

function derivePhotoName(attachment: JournalAttachment): string {
  const source = attachment.objectKey || attachment.url || "";
  const rawSegment = source.split("/").pop() || "";
  // Strip leading "<timestamp>-<uuid>-" prefix when present
  const cleaned = rawSegment.replace(/^\d+-[0-9a-f-]{8,}-/i, "");
  if (cleaned && cleaned.length <= 36) return cleaned;
  if (cleaned) return `${cleaned.slice(0, 28)}…`;
  return "Attached Photograph";
}

export interface ScrapbookInspectorPanelProps {
  selectedAttachment: JournalAttachment | null;
  selectedSticker: JournalSticker | null;
  onUpdateAttachment: (
    patch: Partial<Pick<JournalAttachment, "style" | "caption" | "width" | "height" | "rotation">>
  ) => void;
  onUpdateSticker: (
    patch: Partial<Pick<JournalSticker, "scale" | "rotation">>
  ) => void;
  onShiftZIndex: (direction: "forward" | "backward") => void;
  onDelete: () => void;
}

export function ScrapbookInspectorPanel({
  selectedAttachment,
  selectedSticker,
  onUpdateAttachment,
  onUpdateSticker,
  onShiftZIndex,
  onDelete,
}: ScrapbookInspectorPanelProps) {
  const stickerDef = selectedSticker
    ? getStickerById(selectedSticker.stickerId)
    : undefined;

  const activeKey = selectedAttachment
    ? `att-${selectedAttachment.id}`
    : selectedSticker
    ? `stk-${selectedSticker.id}`
    : "empty";

  const maxPhotoWidth = selectedAttachment
    ? Math.max(80, JOURNAL_PAGE_WIDTH - (selectedAttachment.x || 0) - 8)
    : 360;

  const handlePhotoWidthChange = (nextWidth: number) => {
    if (!selectedAttachment) return;
    const aspect =
      selectedAttachment.width > 0 && selectedAttachment.height > 0
        ? selectedAttachment.width / selectedAttachment.height
        : 1;
    const clampedW = Math.min(maxPhotoWidth, Math.max(64, Math.round(nextWidth)));
    const maxH = Math.max(56, JOURNAL_PAGE_HEIGHT - (selectedAttachment.y || 0) - 8);
    const clampedH = Math.min(maxH, Math.max(56, Math.round(clampedW / aspect)));
    onUpdateAttachment({ width: clampedW, height: clampedH });
  };

  return (
    <aside
      className="scrapbook-inspector-panel"
      aria-label="Contextual element studio"
    >
      <div className="scrapbook-inspector-header">
        <span className="scrapbook-inspector-eyebrow">ELEMENT STUDIO</span>
        <span className="scrapbook-inspector-ornament" aria-hidden="true">
          ✦
        </span>
      </div>

      <AnimatePresence mode="wait">
        {selectedAttachment ? (
          <motion.div
            key={activeKey}
            className="scrapbook-inspector-body"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
          >
            {/* A. Image Preview */}
            <div className="scrapbook-inspector-preview-frame">
              <img
                src={selectedAttachment.url}
                alt={selectedAttachment.caption || derivePhotoName(selectedAttachment)}
                className="scrapbook-inspector-preview-img"
              />
            </div>

            {/* B. Image Information */}
            <div className="scrapbook-inspector-meta">
              <div
                className="scrapbook-inspector-filename"
                title={derivePhotoName(selectedAttachment)}
              >
                {derivePhotoName(selectedAttachment)}
              </div>
              <div className="scrapbook-inspector-submeta">
                <span>{STYLE_LABELS[selectedAttachment.style] ?? "Polaroid"}</span>
                <span>·</span>
                <span>
                  {Math.round(selectedAttachment.width)}×{Math.round(selectedAttachment.height)}
                </span>
              </div>
              {selectedAttachment.caption ? (
                <div className="scrapbook-inspector-caption-preview">
                  “{selectedAttachment.caption}”
                </div>
              ) : null}
            </div>

            {/* C. Photograph Editing Controls */}
            <div className="scrapbook-inspector-controls">
              <label className="scrapbook-inspector-field">
                <span className="scrapbook-inspector-label">Frame Style</span>
                <select
                  className="scrapbook-inspector-select"
                  value={selectedAttachment.style}
                  onChange={(e) =>
                    onUpdateAttachment({
                      style: e.target.value as JournalAttachmentStyle,
                    })
                  }
                >
                  <option value="polaroid">Polaroid</option>
                  <option value="washi">Washi Tape</option>
                  <option value="vintage">Vintage Frame</option>
                  <option value="plain">Clean Edge</option>
                </select>
              </label>

              <label className="scrapbook-inspector-field">
                <span className="scrapbook-inspector-label">Caption</span>
                <input
                  type="text"
                  className="scrapbook-inspector-input"
                  value={selectedAttachment.caption || ""}
                  maxLength={80}
                  placeholder="Write a memory note..."
                  aria-label="Selected photo caption"
                  onChange={(e) =>
                    onUpdateAttachment({ caption: e.target.value })
                  }
                />
              </label>

              <label className="scrapbook-inspector-field">
                <div className="scrapbook-inspector-slider-head">
                  <span className="scrapbook-inspector-label">Size</span>
                  <span className="scrapbook-inspector-value">
                    {Math.round(selectedAttachment.width)}px
                  </span>
                </div>
                <input
                  type="range"
                  className="scrapbook-inspector-range"
                  min={64}
                  max={maxPhotoWidth}
                  step={2}
                  value={Math.min(maxPhotoWidth, Math.max(64, Math.round(selectedAttachment.width)))}
                  aria-label="Photo width"
                  onChange={(e) => handlePhotoWidthChange(Number(e.target.value))}
                />
              </label>

              <div className="scrapbook-inspector-field">
                <div className="scrapbook-inspector-slider-head">
                  <span className="scrapbook-inspector-label">Rotation</span>
                  <div className="scrapbook-inspector-rot-actions">
                    <span className="scrapbook-inspector-value">
                      {Math.round(selectedAttachment.rotation || 0)}°
                    </span>
                    {(selectedAttachment.rotation || 0) !== 0 && (
                      <button
                        type="button"
                        className="scrapbook-inspector-reset-btn"
                        onClick={() => onUpdateAttachment({ rotation: 0 })}
                        title="Reset rotation to 0°"
                      >
                        Reset
                      </button>
                    )}
                  </div>
                </div>
                <input
                  type="range"
                  className="scrapbook-inspector-range"
                  min={-180}
                  max={180}
                  step={1}
                  value={Math.round(selectedAttachment.rotation || 0)}
                  aria-label="Photo rotation"
                  onChange={(e) =>
                    onUpdateAttachment({ rotation: Number(e.target.value) })
                  }
                />
              </div>

              <div className="scrapbook-inspector-layer-row">
                <button
                  type="button"
                  className="scrapbook-inspector-btn"
                  onClick={() => onShiftZIndex("forward")}
                  title="Bring photograph forward"
                >
                  Bring Forward
                </button>
                <button
                  type="button"
                  className="scrapbook-inspector-btn"
                  onClick={() => onShiftZIndex("backward")}
                  title="Send photograph backward"
                >
                  Send Back
                </button>
              </div>

              <button
                type="button"
                className="scrapbook-inspector-remove-btn"
                onClick={onDelete}
                title="Remove photograph from page"
              >
                Remove Photograph
              </button>
            </div>
          </motion.div>
        ) : selectedSticker ? (
          <motion.div
            key={activeKey}
            className="scrapbook-inspector-body"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
          >
            {/* Sticker Preview */}
            <div className="scrapbook-inspector-preview-frame is-sticker">
              <div className="scrapbook-inspector-sticker-svg">
                {renderStickerGraphic(selectedSticker.stickerId)}
              </div>
            </div>

            {/* Sticker Information */}
            <div className="scrapbook-inspector-meta">
              <div className="scrapbook-inspector-filename">
                {stickerDef?.name ?? "Vintage Sticker"}
              </div>
              <div className="scrapbook-inspector-submeta">
                <span>Sticker</span>
                {stickerDef?.category ? (
                  <>
                    <span>·</span>
                    <span className="capitalize">{stickerDef.category}</span>
                  </>
                ) : null}
              </div>
            </div>

            {/* Sticker Controls */}
            <div className="scrapbook-inspector-controls">
              <label className="scrapbook-inspector-field">
                <div className="scrapbook-inspector-slider-head">
                  <span className="scrapbook-inspector-label">Scale</span>
                  <span className="scrapbook-inspector-value">
                    {(selectedSticker.scale || 1).toFixed(2)}×
                  </span>
                </div>
                <input
                  type="range"
                  className="scrapbook-inspector-range"
                  min={0.45}
                  max={2.4}
                  step={0.05}
                  value={selectedSticker.scale || 1}
                  aria-label="Sticker scale"
                  onChange={(e) =>
                    onUpdateSticker({ scale: Number(e.target.value) })
                  }
                />
              </label>

              <div className="scrapbook-inspector-field">
                <div className="scrapbook-inspector-slider-head">
                  <span className="scrapbook-inspector-label">Rotation</span>
                  <div className="scrapbook-inspector-rot-actions">
                    <span className="scrapbook-inspector-value">
                      {Math.round(selectedSticker.rotation || 0)}°
                    </span>
                    {(selectedSticker.rotation || 0) !== 0 && (
                      <button
                        type="button"
                        className="scrapbook-inspector-reset-btn"
                        onClick={() => onUpdateSticker({ rotation: 0 })}
                        title="Reset rotation to 0°"
                      >
                        Reset
                      </button>
                    )}
                  </div>
                </div>
                <input
                  type="range"
                  className="scrapbook-inspector-range"
                  min={-180}
                  max={180}
                  step={1}
                  value={Math.round(selectedSticker.rotation || 0)}
                  aria-label="Sticker rotation"
                  onChange={(e) =>
                    onUpdateSticker({ rotation: Number(e.target.value) })
                  }
                />
              </div>

              <div className="scrapbook-inspector-layer-row">
                <button
                  type="button"
                  className="scrapbook-inspector-btn"
                  onClick={() => onShiftZIndex("forward")}
                  title="Bring sticker forward"
                >
                  Bring Forward
                </button>
                <button
                  type="button"
                  className="scrapbook-inspector-btn"
                  onClick={() => onShiftZIndex("backward")}
                  title="Send sticker backward"
                >
                  Send Back
                </button>
              </div>

              <button
                type="button"
                className="scrapbook-inspector-remove-btn"
                onClick={onDelete}
                title="Remove sticker from page"
              >
                Remove Sticker
              </button>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="empty"
            className="scrapbook-inspector-empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
          >
            <svg
              width="28"
              height="28"
              viewBox="0 0 28 28"
              fill="none"
              aria-hidden="true"
              className="scrapbook-inspector-empty-icon"
            >
              <rect
                x="4"
                y="5"
                width="20"
                height="18"
                rx="2"
                stroke="currentColor"
                strokeWidth="1.2"
                strokeDasharray="3 2"
              />
              <circle cx="10.5" cy="11.5" r="2" stroke="currentColor" strokeWidth="1.2" />
              <path
                d="M6.5 19.5L11.5 14.5L15 18L18 15.5L21.5 19.5"
                stroke="currentColor"
                strokeWidth="1.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <p className="scrapbook-inspector-empty-title">
              Select an element to begin editing.
            </p>
            <p className="scrapbook-inspector-empty-hint">
              Click any photograph or sticker on the journal page to adjust its frame, size, angle, or layer.
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </aside>
  );
}
