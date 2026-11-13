"use client";

import React, { useEffect, useState } from "react";
import { api } from "@/services/api";
import { type JournalAttachment, type JournalAttachmentStyle } from "@/lib/journal-storage";

export interface PhotoUploadModalProps {
  open: boolean;
  notebookId: string;
  nextZIndex: number;
  onClose: () => void;
  onInsertAttachment: (attachment: JournalAttachment) => void;
}

const STYLE_OPTIONS: { id: JournalAttachmentStyle; label: string; desc: string }[] = [
  { id: "polaroid", label: "Classic Polaroid", desc: "Cream frame with handwritten caption" },
  { id: "washi", label: "Washi Taped", desc: "Taped onto the sheet with linen strip" },
  { id: "vintage", label: "Vintage Print", desc: "Warm sepia tone with archival border" },
  { id: "plain", label: "Borderless", desc: "Clean cut photograph on the paper" },
];

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_MIMES = new Set(["image/jpeg", "image/png", "image/webp"]);

export function PhotoUploadModal({
  open,
  notebookId,
  nextZIndex,
  onClose,
  onInsertAttachment,
}: PhotoUploadModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [naturalDims, setNaturalDims] = useState<{ w: number; h: number }>({ w: 180, h: 160 });
  const [style, setStyle] = useState<JournalAttachmentStyle>("polaroid");
  const [caption, setCaption] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  if (!open) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ALLOWED_MIMES.has(file.type)) {
      setError("Please select a JPEG, PNG, or WebP photograph.");
      return;
    }
    if (file.size > MAX_BYTES) {
      setError("Photograph exceeds the 5 MB size limit.");
      return;
    }

    if (previewUrl) URL.revokeObjectURL(previewUrl);
    const objUrl = URL.createObjectURL(file);
    setSelectedFile(file);
    setPreviewUrl(objUrl);

    const img = new Image();
    img.onload = () => {
      const maxInitialW = 190;
      const ratio = img.naturalHeight > 0 ? img.naturalWidth / img.naturalHeight : 1;
      const w = Math.min(maxInitialW, Math.max(110, img.naturalWidth));
      const h = Math.round(w / ratio);
      setNaturalDims({ w, h: Math.min(260, Math.max(90, h)) });
    };
    img.src = objUrl;
  };

  const handleConfirmUpload = async () => {
    if (!selectedFile || !notebookId) return;
    setUploading(true);
    setError(null);
    try {
      const uploaded = await api.journal.uploadMedia(notebookId, selectedFile);
      const attachment: JournalAttachment = {
        id: `att-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        objectKey: uploaded.objectKey,
        url: uploaded.url,
        width: naturalDims.w,
        height: style === "polaroid" ? naturalDims.h + 24 : naturalDims.h,
        x: 320,
        y: 120,
        rotation: -3,
        zIndex: nextZIndex,
        style,
        caption: caption.trim() || undefined,
      };
      onInsertAttachment(attachment);
      setSelectedFile(null);
      setCaption("");
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
      onClose();
    } catch (err: any) {
      setError(err?.message || "Unable to upload photograph.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Add Photograph to Journal Page"
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 70,
        backgroundColor: "rgba(18, 11, 7, 0.65)",
        backdropFilter: "blur(3px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: "460px",
          backgroundColor: "#f8f1e4",
          color: "#2c1e14",
          borderRadius: "10px",
          border: "1px solid #cbb695",
          boxShadow: "0 20px 50px rgba(10, 6, 3, 0.45)",
          padding: "24px",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
          <div>
            <span style={{ fontSize: "10px", letterSpacing: "0.16em", textTransform: "uppercase", color: "#7a5e42", fontWeight: 700 }}>
              Scrapbook Darkroom
            </span>
            <h3 style={{ margin: "2px 0 0", fontFamily: "var(--serif-title, 'Cormorant Garamond', Georgia, serif)", fontSize: "24px" }}>
              Add Photograph
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close photograph dialog"
            style={{
              background: "transparent",
              border: "1px solid #ccb99b",
              borderRadius: "999px",
              width: "30px",
              height: "30px",
              cursor: "pointer",
              color: "#4d3826",
            }}
          >
            ✕
          </button>
        </div>

        <label
          style={{
            display: "block",
            padding: "16px",
            border: "1.5px dashed #b9a17f",
            borderRadius: "8px",
            backgroundColor: "#fbf6ec",
            textAlign: "center",
            cursor: "pointer",
            marginBottom: "14px",
          }}
        >
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFileChange}
            style={{ display: "none" }}
          />
          <span style={{ display: "block", fontWeight: 600, fontSize: "13.5px", color: "#4a3423" }}>
            {selectedFile ? selectedFile.name : "Choose a photograph (JPEG, PNG, or WebP · max 5 MB)"}
          </span>
        </label>

        {previewUrl && (
          <div style={{ marginBottom: "14px", textAlign: "center" }}>
            <img
              src={previewUrl}
              alt="Selected photograph preview"
              style={{
                maxHeight: "170px",
                maxWidth: "100%",
                borderRadius: "4px",
                border: "4px solid #fbf8f1",
                boxShadow: "0 4px 12px rgba(0,0,0,0.18)",
              }}
            />
          </div>
        )}

        <div style={{ marginBottom: "14px" }}>
          <span style={{ display: "block", fontSize: "11px", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#6e563d", marginBottom: "6px" }}>
            Presentation Style
          </span>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "8px" }}>
            {STYLE_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setStyle(opt.id)}
                style={{
                  textAlign: "left",
                  padding: "8px 10px",
                  borderRadius: "6px",
                  border: style === opt.id ? "1.5px solid #6b4423" : "1px solid #d5c3a7",
                  backgroundColor: style === opt.id ? "#efe2cc" : "#fbf6ec",
                  cursor: "pointer",
                }}
              >
                <div style={{ fontSize: "12.5px", fontWeight: 600, color: "#362417" }}>{opt.label}</div>
                <div style={{ fontSize: "11px", color: "#6d5742" }}>{opt.desc}</div>
              </button>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: "14px" }}>
          <label style={{ display: "block", fontSize: "11px", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#6e563d", marginBottom: "5px" }}>
            Caption (Optional)
          </label>
          <input
            type="text"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            maxLength={80}
            placeholder="e.g., Autumn afternoon by the window"
            style={{
              width: "100%",
              padding: "8px 10px",
              borderRadius: "6px",
              border: "1px solid #cbb695",
              backgroundColor: "#fffdf8",
              color: "#2c1e14",
              fontSize: "13px",
            }}
          />
        </div>

        {error && (
          <div role="alert" style={{ marginBottom: "12px", padding: "8px 10px", borderRadius: "6px", backgroundColor: "#fbeaea", color: "#8c2626", fontSize: "12.5px" }}>
            {error}
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: "8px 14px",
              borderRadius: "6px",
              border: "1px solid #ccb99b",
              backgroundColor: "transparent",
              color: "#4d3826",
              cursor: "pointer",
              fontSize: "13px",
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!selectedFile || uploading}
            onClick={handleConfirmUpload}
            style={{
              padding: "8px 16px",
              borderRadius: "6px",
              border: "none",
              backgroundColor: !selectedFile || uploading ? "#b5a086" : "#6b4423",
              color: "#fbf5e9",
              cursor: !selectedFile || uploading ? "not-allowed" : "pointer",
              fontSize: "13px",
              fontWeight: 600,
            }}
          >
            {uploading ? "Uploading..." : "Place on Page"}
          </button>
        </div>
      </div>
    </div>
  );
}
