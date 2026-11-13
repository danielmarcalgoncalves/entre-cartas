"use client";

import React, { useRef, useState } from "react";
import {
  type JournalAttachment,
  type JournalSticker,
} from "@/lib/journal-storage";
import {
  JOURNAL_PAGE_HEIGHT,
  JOURNAL_PAGE_WIDTH,
} from "@/lib/journal-page-layout";
import {
  getStickerById,
  renderStickerGraphic,
} from "@/lib/scrapbook-stickers";

export type SelectedScrapbookItem =
  | { kind: "attachment"; id: string }
  | { kind: "sticker"; id: string }
  | null;

export interface ScrapbookLayerProps {
  attachments?: JournalAttachment[];
  stickers?: JournalSticker[];
  readonly?: boolean;
  sheetScale?: number;
  selectedItem?: SelectedScrapbookItem;
  onSelectItem?: (item: SelectedScrapbookItem) => void;
  onChangeAttachments?: (next: JournalAttachment[], commit?: boolean) => void;
  onChangeStickers?: (next: JournalSticker[], commit?: boolean) => void;
}

function clamp(val: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, val));
}

function getAttachmentFrameStyle(style: JournalAttachment["style"]): React.CSSProperties {
  switch (style) {
    case "polaroid":
      return {
        backgroundColor: "#fbf8f1",
        padding: "8px 8px 24px 8px",
        borderRadius: "2px",
        boxShadow: "0 8px 20px rgba(24, 15, 8, 0.24), 0 1px 3px rgba(24, 15, 8, 0.16)",
        border: "1px solid rgba(180, 162, 134, 0.45)",
      };
    case "washi":
      return {
        backgroundColor: "#f8f3e8",
        padding: "5px",
        borderRadius: "2px",
        boxShadow: "0 6px 16px rgba(24, 15, 8, 0.22)",
        border: "1px solid rgba(170, 152, 124, 0.4)",
      };
    case "vintage":
      return {
        backgroundColor: "#efe4cf",
        padding: "6px",
        borderRadius: "3px",
        boxShadow: "0 6px 16px rgba(28, 18, 10, 0.24)",
        border: "2px solid #cbb692",
      };
    case "plain":
    default:
      return {
        backgroundColor: "transparent",
        padding: 0,
        borderRadius: "2px",
        boxShadow: "0 5px 14px rgba(24, 15, 8, 0.2)",
      };
  }
}

export function ScrapbookLayer({
  attachments = [],
  stickers = [],
  readonly = false,
  sheetScale = 1,
  selectedItem = null,
  onSelectItem,
  onChangeAttachments,
  onChangeStickers,
}: ScrapbookLayerProps) {
  const layerRef = useRef<HTMLDivElement>(null);
  const [isInteracting, setIsInteracting] = useState(false);

  const safeScale = sheetScale > 0 ? sheetScale : 1;

  const startDragAttachment = (
    e: React.PointerEvent,
    item: JournalAttachment,
    mode: "move" | "resize" | "rotate"
  ) => {
    if (readonly) return;
    e.stopPropagation();
    e.preventDefault();
    onSelectItem?.({ kind: "attachment", id: item.id });
    setIsInteracting(true);

    const startClientX = e.clientX;
    const startClientY = e.clientY;
    const origX = item.x;
    const origY = item.y;
    const origW = item.width;
    const origH = item.height;
    const aspect = origH > 0 ? origW / origH : 1;
    const rect = layerRef.current?.getBoundingClientRect();
    const centerX = rect ? rect.left + (origX + origW / 2) * safeScale : startClientX;
    const centerY = rect ? rect.top + (origY + origH / 2) * safeScale : startClientY;
    const startAngle = Math.atan2(startClientY - centerY, startClientX - centerX);
    const origRot = item.rotation || 0;

    let latestList = attachments;

    const handleMove = (mv: PointerEvent) => {
      const dx = (mv.clientX - startClientX) / safeScale;
      const dy = (mv.clientY - startClientY) / safeScale;

      latestList = attachments.map((att) => {
        if (att.id !== item.id) return att;
        if (mode === "move") {
          return {
            ...att,
            x: Math.round(clamp(origX + dx, 4, JOURNAL_PAGE_WIDTH - att.width - 4)),
            y: Math.round(clamp(origY + dy, 4, JOURNAL_PAGE_HEIGHT - att.height - 4)),
          };
        }
        if (mode === "resize") {
          const nextW = Math.round(clamp(origW + dx, 64, JOURNAL_PAGE_WIDTH - origX - 8));
          const nextH = Math.round(clamp(nextW / aspect, 56, JOURNAL_PAGE_HEIGHT - origY - 8));
          return {
            ...att,
            width: nextW,
            height: nextH,
          };
        }
        const curAngle = Math.atan2(mv.clientY - centerY, mv.clientX - centerX);
        const degDelta = ((curAngle - startAngle) * 180) / Math.PI;
        return {
          ...att,
          rotation: Math.round(clamp(origRot + degDelta, -180, 180)),
        };
      });

      onChangeAttachments?.(latestList, false);
    };

    const handleUp = () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
      setIsInteracting(false);
      onChangeAttachments?.(latestList, true);
    };

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
  };

  const startDragSticker = (
    e: React.PointerEvent,
    item: JournalSticker,
    mode: "move" | "resize" | "rotate"
  ) => {
    if (readonly) return;
    e.stopPropagation();
    e.preventDefault();
    onSelectItem?.({ kind: "sticker", id: item.id });
    setIsInteracting(true);

    const def = getStickerById(item.stickerId);
    const baseW = def?.defaultWidth || 84;
    const baseH = def?.defaultHeight || 84;
    const curW = baseW * (item.scale || 1);
    const curH = baseH * (item.scale || 1);

    const startClientX = e.clientX;
    const startClientY = e.clientY;
    const origX = item.x;
    const origY = item.y;
    const origScale = item.scale || 1;

    const rect = layerRef.current?.getBoundingClientRect();
    const centerX = rect ? rect.left + (origX + curW / 2) * safeScale : startClientX;
    const centerY = rect ? rect.top + (origY + curH / 2) * safeScale : startClientY;
    const startAngle = Math.atan2(startClientY - centerY, startClientX - centerX);
    const origRot = item.rotation || 0;

    let latestList = stickers;

    const handleMove = (mv: PointerEvent) => {
      const dx = (mv.clientX - startClientX) / safeScale;
      const dy = (mv.clientY - startClientY) / safeScale;

      latestList = stickers.map((stk) => {
        if (stk.id !== item.id) return stk;
        if (mode === "move") {
          const w = baseW * (stk.scale || 1);
          const h = baseH * (stk.scale || 1);
          return {
            ...stk,
            x: Math.round(clamp(origX + dx, 0, JOURNAL_PAGE_WIDTH - w)),
            y: Math.round(clamp(origY + dy, 0, JOURNAL_PAGE_HEIGHT - h)),
          };
        }
        if (mode === "resize") {
          const deltaScale = dx / Math.max(baseW, 40);
          const nextScale = Number(clamp(origScale + deltaScale, 0.45, 2.4).toFixed(2));
          return {
            ...stk,
            scale: nextScale,
          };
        }
        const curAngle = Math.atan2(mv.clientY - centerY, mv.clientX - centerX);
        const degDelta = ((curAngle - startAngle) * 180) / Math.PI;
        return {
          ...stk,
          rotation: Math.round(clamp(origRot + degDelta, -180, 180)),
        };
      });

      onChangeStickers?.(latestList, false);
    };

    const handleUp = () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
      setIsInteracting(false);
      onChangeStickers?.(latestList, true);
    };

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
  };

  const handleItemKeyDown = (
    e: React.KeyboardEvent,
    kind: "attachment" | "sticker",
    id: string
  ) => {
    if (readonly) return;
    const step = e.shiftKey ? 10 : 2;
    if (e.key === "Escape") {
      e.stopPropagation();
      onSelectItem?.(null);
      return;
    }
    if (e.key === "Delete" || e.key === "Backspace") {
      e.preventDefault();
      e.stopPropagation();
      if (kind === "attachment") {
        onChangeAttachments?.(attachments.filter((a) => a.id !== id), true);
      } else {
        onChangeStickers?.(stickers.filter((s) => s.id !== id), true);
      }
      onSelectItem?.(null);
      return;
    }
    if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key)) {
      e.preventDefault();
      e.stopPropagation();
      const dx = e.key === "ArrowLeft" ? -step : e.key === "ArrowRight" ? step : 0;
      const dy = e.key === "ArrowUp" ? -step : e.key === "ArrowDown" ? step : 0;
      if (kind === "attachment") {
        onChangeAttachments?.(
          attachments.map((a) =>
            a.id === id
              ? {
                  ...a,
                  x: Math.round(clamp(a.x + dx, 4, JOURNAL_PAGE_WIDTH - a.width - 4)),
                  y: Math.round(clamp(a.y + dy, 4, JOURNAL_PAGE_HEIGHT - a.height - 4)),
                }
              : a
          ),
          true
        );
      } else {
        onChangeStickers?.(
          stickers.map((s) => {
            if (s.id !== id) return s;
            const def = getStickerById(s.stickerId);
            const w = (def?.defaultWidth || 84) * (s.scale || 1);
            const h = (def?.defaultHeight || 84) * (s.scale || 1);
            return {
              ...s,
              x: Math.round(clamp(s.x + dx, 0, JOURNAL_PAGE_WIDTH - w)),
              y: Math.round(clamp(s.y + dy, 0, JOURNAL_PAGE_HEIGHT - h)),
            };
          }),
          true
        );
      }
    }
  };

  return (
    <div
      ref={layerRef}
      className={`scrapbook-layer ${readonly ? "is-readonly" : "is-interactive"} ${isInteracting ? "is-dragging" : ""}`}
      style={{
        position: "absolute",
        inset: 0,
        width: `${JOURNAL_PAGE_WIDTH}px`,
        height: `${JOURNAL_PAGE_HEIGHT}px`,
        pointerEvents: "none",
        zIndex: 12,
        overflow: "hidden",
      }}
      aria-label={readonly ? undefined : "Scrapbook decorations layer"}
    >
      {/* Photographs */}
      {attachments.map((att) => {
        const isSelected = !readonly && selectedItem?.kind === "attachment" && selectedItem.id === att.id;
        const frameStyle = getAttachmentFrameStyle(att.style);

        return (
          <div
            key={att.id}
            role={readonly ? undefined : "button"}
            tabIndex={readonly ? undefined : 0}
            aria-label={readonly ? undefined : `Photograph${att.caption ? `: ${att.caption}` : ""}`}
            onPointerDown={(e) => startDragAttachment(e, att, "move")}
            onClick={(e) => {
              if (!readonly) {
                e.stopPropagation();
                onSelectItem?.({ kind: "attachment", id: att.id });
              }
            }}
            onKeyDown={(e) => handleItemKeyDown(e, "attachment", att.id)}
            style={{
              position: "absolute",
              left: `${att.x}px`,
              top: `${att.y}px`,
              width: `${att.width}px`,
              height: `${att.height}px`,
              transform: `rotate(${att.rotation || 0}deg)`,
              transformOrigin: "center center",
              zIndex: att.zIndex || 1,
              pointerEvents: readonly ? "none" : "auto",
              cursor: readonly ? "default" : "grab",
              touchAction: "none",
              userSelect: "none",
              outline: isSelected ? "2px dashed #8c5a2b" : "none",
              outlineOffset: "4px",
              ...frameStyle,
            }}
          >
            {/* Washi tape top accent for 'washi' style */}
            {att.style === "washi" && (
              <span
                aria-hidden="true"
                style={{
                  position: "absolute",
                  top: "-10px",
                  left: "50%",
                  transform: "translateX(-50%) rotate(-2deg)",
                  width: "58px",
                  height: "16px",
                  background: "rgba(218, 195, 152, 0.85)",
                  border: "1px solid rgba(176, 150, 108, 0.45)",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.12)",
                  pointerEvents: "none",
                }}
              />
            )}

            <div
              style={{
                width: "100%",
                height: att.style === "polaroid" && att.caption ? "calc(100% - 18px)" : "100%",
                overflow: "hidden",
                backgroundColor: "#e6dccb",
                position: "relative",
              }}
            >
              <img
                src={att.url}
                alt={att.caption || "Journal photograph"}
                draggable={false}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  display: "block",
                  filter: att.style === "vintage" ? "sepia(0.24) contrast(0.96)" : undefined,
                }}
              />
            </div>

            {att.style === "polaroid" && att.caption && (
              <div
                style={{
                  marginTop: "4px",
                  fontSize: "11px",
                  lineHeight: "14px",
                  textAlign: "center",
                  color: "#433425",
                  fontFamily: "'Caveat', cursive",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {att.caption}
              </div>
            )}

            {isSelected && (
              <>
                <button
                  type="button"
                  aria-label="Rotate photograph"
                  title="Drag to rotate"
                  onPointerDown={(e) => startDragAttachment(e, att, "rotate")}
                  style={{
                    position: "absolute",
                    top: "-26px",
                    left: "50%",
                    transform: "translateX(-50%)",
                    width: "20px",
                    height: "20px",
                    borderRadius: "999px",
                    backgroundColor: "#fdf7eb",
                    border: "1.5px solid #6b4423",
                    color: "#6b4423",
                    fontSize: "11px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "crosshair",
                    touchAction: "none",
                  }}
                >
                  ↻
                </button>
                <button
                  type="button"
                  aria-label="Resize photograph"
                  title="Drag to resize"
                  onPointerDown={(e) => startDragAttachment(e, att, "resize")}
                  style={{
                    position: "absolute",
                    right: "-9px",
                    bottom: "-9px",
                    width: "18px",
                    height: "18px",
                    borderRadius: "4px",
                    backgroundColor: "#fdf7eb",
                    border: "1.5px solid #6b4423",
                    cursor: "nwse-resize",
                    touchAction: "none",
                  }}
                />
              </>
            )}
          </div>
        );
      })}

      {/* Stickers */}
      {stickers.map((stk) => {
        const def = getStickerById(stk.stickerId);
        if (!def) return null;
        const width = Math.round(def.defaultWidth * (stk.scale || 1));
        const height = Math.round(def.defaultHeight * (stk.scale || 1));
        const isSelected = !readonly && selectedItem?.kind === "sticker" && selectedItem.id === stk.id;

        return (
          <div
            key={stk.id}
            role={readonly ? undefined : "button"}
            tabIndex={readonly ? undefined : 0}
            aria-label={readonly ? undefined : `Sticker: ${def.name}`}
            onPointerDown={(e) => startDragSticker(e, stk, "move")}
            onClick={(e) => {
              if (!readonly) {
                e.stopPropagation();
                onSelectItem?.({ kind: "sticker", id: stk.id });
              }
            }}
            onKeyDown={(e) => handleItemKeyDown(e, "sticker", stk.id)}
            style={{
              position: "absolute",
              left: `${stk.x}px`,
              top: `${stk.y}px`,
              width: `${width}px`,
              height: `${height}px`,
              transform: `rotate(${stk.rotation || 0}deg)`,
              transformOrigin: "center center",
              zIndex: stk.zIndex || 2,
              pointerEvents: readonly ? "none" : "auto",
              cursor: readonly ? "default" : "grab",
              touchAction: "none",
              userSelect: "none",
              outline: isSelected ? "2px dashed #8c5a2b" : "none",
              outlineOffset: "4px",
            }}
          >
            {renderStickerGraphic(stk.stickerId)}

            {isSelected && (
              <>
                <button
                  type="button"
                  aria-label="Rotate sticker"
                  title="Drag to rotate"
                  onPointerDown={(e) => startDragSticker(e, stk, "rotate")}
                  style={{
                    position: "absolute",
                    top: "-26px",
                    left: "50%",
                    transform: "translateX(-50%)",
                    width: "20px",
                    height: "20px",
                    borderRadius: "999px",
                    backgroundColor: "#fdf7eb",
                    border: "1.5px solid #6b4423",
                    color: "#6b4423",
                    fontSize: "11px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "crosshair",
                    touchAction: "none",
                  }}
                >
                  ↻
                </button>
                <button
                  type="button"
                  aria-label="Resize sticker"
                  title="Drag to resize"
                  onPointerDown={(e) => startDragSticker(e, stk, "resize")}
                  style={{
                    position: "absolute",
                    right: "-9px",
                    bottom: "-9px",
                    width: "18px",
                    height: "18px",
                    borderRadius: "4px",
                    backgroundColor: "#fdf7eb",
                    border: "1.5px solid #6b4423",
                    cursor: "nwse-resize",
                    touchAction: "none",
                  }}
                />
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}
