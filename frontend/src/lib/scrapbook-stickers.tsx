"use client";

import React from "react";

export type StickerCategoryId =
  | "stamps"
  | "flowers"
  | "botanicals"
  | "washi"
  | "labels"
  | "celestial"
  | "notes"
  | "marks";

export interface StickerCategory {
  id: StickerCategoryId;
  label: string;
}

export interface StickerDefinition {
  id: string;
  name: string;
  category: StickerCategoryId;
  defaultWidth: number;
  defaultHeight: number;
}

export const STICKER_CATEGORIES: StickerCategory[] = [
  { id: "stamps", label: "Postage Stamps" },
  { id: "flowers", label: "Pressed Flowers" },
  { id: "botanicals", label: "Botanicals" },
  { id: "washi", label: "Washi Tape" },
  { id: "labels", label: "Vintage Labels" },
  { id: "celestial", label: "Celestial" },
  { id: "notes", label: "Handwritten Notes" },
  { id: "marks", label: "Marks & Seals" },
];

export const STICKER_CATALOG: StickerDefinition[] = [
  // Postage Stamps
  { id: "stamp-airmail-rose", name: "Crimson Air Mail", category: "stamps", defaultWidth: 82, defaultHeight: 96 },
  { id: "stamp-botanical-olive", name: "Botanical Post", category: "stamps", defaultWidth: 82, defaultHeight: 96 },
  { id: "stamp-midnight-moon", name: "Nocturne Express", category: "stamps", defaultWidth: 82, defaultHeight: 96 },

  // Pressed Flowers
  { id: "flower-chamomile", name: "Pressed Chamomile", category: "flowers", defaultWidth: 84, defaultHeight: 112 },
  { id: "flower-lavender", name: "Dried Lavender", category: "flowers", defaultWidth: 74, defaultHeight: 118 },
  { id: "flower-wild-rose", name: "Pressed Wild Rose", category: "flowers", defaultWidth: 88, defaultHeight: 98 },

  // Botanical Illustrations
  { id: "botanical-fern", name: "Archival Fern", category: "botanicals", defaultWidth: 80, defaultHeight: 116 },
  { id: "botanical-olive-branch", name: "Olive Sprig", category: "botanicals", defaultWidth: 96, defaultHeight: 84 },
  { id: "botanical-acorn", name: "Oak & Acorn", category: "botanicals", defaultWidth: 84, defaultHeight: 92 },

  // Washi Tape
  { id: "washi-linen-kraft", name: "Kraft Linen Strip", category: "washi", defaultWidth: 136, defaultHeight: 34 },
  { id: "washi-botanical-sage", name: "Sage Botanical Tape", category: "washi", defaultWidth: 136, defaultHeight: 34 },
  { id: "washi-stripe-burgundy", name: "Burgundy Pinstripe", category: "washi", defaultWidth: 136, defaultHeight: 34 },

  // Vintage Labels
  { id: "label-specimen-no", name: "Specimen Tag", category: "labels", defaultWidth: 124, defaultHeight: 62 },
  { id: "label-library-card", name: "Library Slip", category: "labels", defaultWidth: 128, defaultHeight: 68 },
  { id: "label-parchment-frame", name: "Gilded Label", category: "labels", defaultWidth: 128, defaultHeight: 64 },

  // Stars & Celestial
  { id: "celestial-crescent", name: "Crescent & Stars", category: "celestial", defaultWidth: 86, defaultHeight: 86 },
  { id: "celestial-sunburst", name: "Brass Sunburst", category: "celestial", defaultWidth: 88, defaultHeight: 88 },
  { id: "celestial-constellation", name: "Star Compass", category: "celestial", defaultWidth: 90, defaultHeight: 90 },

  // Handwritten Notes
  { id: "note-remember", name: "Remember This", category: "notes", defaultWidth: 124, defaultHeight: 74 },
  { id: "note-quiet-hour", name: "Quiet Hour", category: "notes", defaultWidth: 124, defaultHeight: 74 },
  { id: "note-keep-safe", name: "Keep Safe", category: "notes", defaultWidth: 124, defaultHeight: 74 },

  // Decorative Marks & Stamps
  { id: "mark-wax-seal", name: "Crimson Wax Seal", category: "marks", defaultWidth: 74, defaultHeight: 74 },
  { id: "mark-postmark-circle", name: "Circular Postmark", category: "marks", defaultWidth: 94, defaultHeight: 94 },
  { id: "mark-fountain-nib", name: "Fountain Nib", category: "marks", defaultWidth: 78, defaultHeight: 88 },
];

export function getStickerById(stickerId: string): StickerDefinition | undefined {
  return STICKER_CATALOG.find((s) => s.id === stickerId);
}

export function renderStickerGraphic(stickerId: string): React.ReactNode {
  switch (stickerId) {
    case "stamp-airmail-rose":
      return (
        <svg viewBox="0 0 100 118" fill="none" className="w-full h-full drop-shadow-sm">
          <path d="M8 6 H92 V112 H8 Z" fill="#FBF5E8" stroke="#CBB99B" strokeWidth="1.5" strokeDasharray="3 3" />
          <rect x="14" y="12" width="72" height="94" fill="#F6EBDC" stroke="#8B2626" strokeWidth="1.4" />
          <rect x="18" y="16" width="64" height="86" stroke="#8B2626" strokeWidth="0.6" strokeDasharray="2 2" />
          <text x="50" y="29" textAnchor="middle" fill="#8B2626" fontSize="8" fontFamily="serif" letterSpacing="1.5">AIR MAIL</text>
          <path d="M50 42 C42 42 36 49 36 56 C36 67 50 76 50 76 C50 76 64 67 64 56 C64 49 58 42 50 42 Z" fill="#9E2B2B" opacity="0.88" />
          <path d="M35 86 H65" stroke="#8B2626" strokeWidth="0.9" />
          <text x="50" y="96" textAnchor="middle" fill="#6B1D1D" fontSize="7.5" fontFamily="serif" letterSpacing="1">POST 1924</text>
        </svg>
      );

    case "stamp-botanical-olive":
      return (
        <svg viewBox="0 0 100 118" fill="none" className="w-full h-full drop-shadow-sm">
          <rect x="8" y="6" width="84" height="106" fill="#F8F5EC" stroke="#B6AF9A" strokeWidth="1.5" strokeDasharray="3 3" />
          <rect x="14" y="12" width="72" height="94" fill="#EDF0E6" stroke="#2D4A36" strokeWidth="1.4" />
          <text x="50" y="27" textAnchor="middle" fill="#2D4A36" fontSize="7.5" fontFamily="serif" letterSpacing="1.4">BOTANICA</text>
          <path d="M50 82 C50 64 49 48 54 35" stroke="#2D4A36" strokeWidth="1.6" strokeLinecap="round" />
          <ellipse cx="42" cy="52" rx="8" ry="3.5" transform="rotate(-28 42 52)" fill="#4D6F56" />
          <ellipse cx="59" cy="46" rx="8" ry="3.5" transform="rotate(24 59 46)" fill="#4D6F56" />
          <ellipse cx="42" cy="67" rx="8" ry="3.5" transform="rotate(-22 42 67)" fill="#4D6F56" />
          <ellipse cx="59" cy="62" rx="8" ry="3.5" transform="rotate(26 59 62)" fill="#4D6F56" />
          <text x="50" y="97" textAnchor="middle" fill="#2D4A36" fontSize="7.5" fontFamily="serif" letterSpacing="1">05 CENTS</text>
        </svg>
      );

    case "stamp-midnight-moon":
      return (
        <svg viewBox="0 0 100 118" fill="none" className="w-full h-full drop-shadow-sm">
          <rect x="8" y="6" width="84" height="106" fill="#F5F1E6" stroke="#A69B84" strokeWidth="1.5" strokeDasharray="3 3" />
          <rect x="14" y="12" width="72" height="94" fill="#222D3D" stroke="#C5A568" strokeWidth="1.4" />
          <text x="50" y="27" textAnchor="middle" fill="#E6D2A2" fontSize="7.5" fontFamily="serif" letterSpacing="1.4">NOCTURNE</text>
          <path d="M55 41 A17 17 0 1 0 65 70 A13 13 0 1 1 55 41 Z" fill="#E6D2A2" />
          <circle cx="62" cy="46" r="1.8" fill="#E6D2A2" />
          <circle cx="34" cy="43" r="1.4" fill="#E6D2A2" />
          <circle cx="38" cy="74" r="1.2" fill="#E6D2A2" />
          <text x="50" y="97" textAnchor="middle" fill="#E6D2A2" fontSize="7" fontFamily="serif" letterSpacing="1.2">NIGHT POST</text>
        </svg>
      );

    case "flower-chamomile":
      return (
        <svg viewBox="0 0 100 130" fill="none" className="w-full h-full drop-shadow-sm">
          <path d="M50 120 Q48 85 50 48" stroke="#5B6B46" strokeWidth="2.2" strokeLinecap="round" />
          <path d="M50 94 Q34 86 28 74" stroke="#5B6B46" strokeWidth="1.6" strokeLinecap="round" />
          <path d="M50 82 Q64 74 70 64" stroke="#5B6B46" strokeWidth="1.6" strokeLinecap="round" />
          <g transform="translate(50, 42)">
            {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((deg) => (
              <ellipse key={deg} cx="0" cy="-16" rx="4.2" ry="11" transform={`rotate(${deg})`} fill="#FDF9EE" stroke="#C9B99A" strokeWidth="0.9" />
            ))}
            <circle cx="0" cy="0" r="8.5" fill="#D59A3A" stroke="#9D6B1D" strokeWidth="1" />
          </g>
        </svg>
      );

    case "flower-lavender":
      return (
        <svg viewBox="0 0 90 140" fill="none" className="w-full h-full drop-shadow-sm">
          <path d="M45 132 Q44 82 46 24" stroke="#586A4D" strokeWidth="2" strokeLinecap="round" />
          {[28, 38, 48, 58, 68, 78].map((y, idx) => (
            <g key={y}>
              <ellipse cx={idx % 2 === 0 ? 39 : 41} cy={y} rx="4.5" ry="6.5" transform={`rotate(-22 ${idx % 2 === 0 ? 39 : 41} ${y})`} fill="#7A6596" stroke="#594673" strokeWidth="0.7" />
              <ellipse cx={idx % 2 === 0 ? 51 : 49} cy={y + 3} rx="4.5" ry="6.5" transform={`rotate(22 ${idx % 2 === 0 ? 51 : 49} ${y + 3})`} fill="#8D77AA" stroke="#594673" strokeWidth="0.7" />
            </g>
          ))}
          <ellipse cx="46" cy="18" rx="4.2" ry="6.8" fill="#8D77AA" stroke="#594673" strokeWidth="0.7" />
        </svg>
      );

    case "flower-wild-rose":
      return (
        <svg viewBox="0 0 110 120" fill="none" className="w-full h-full drop-shadow-sm">
          <path d="M55 112 Q53 84 55 62" stroke="#556B47" strokeWidth="2.2" strokeLinecap="round" />
          <ellipse cx="42" cy="88" rx="10" ry="5" transform="rotate(-24 42 88)" fill="#6C825B" />
          <ellipse cx="68" cy="84" rx="10" ry="5" transform="rotate(24 68 84)" fill="#6C825B" />
          <g transform="translate(55, 46)">
            {[0, 72, 144, 216, 288].map((deg) => (
              <ellipse key={deg} cx="0" cy="-15" rx="12" ry="15" transform={`rotate(${deg})`} fill="#D89B9B" stroke="#A66565" strokeWidth="0.9" opacity="0.92" />
            ))}
            <circle cx="0" cy="0" r="7.5" fill="#E3B964" stroke="#A37A29" strokeWidth="0.9" />
          </g>
        </svg>
      );

    case "botanical-fern":
      return (
        <svg viewBox="0 0 96 140" fill="none" className="w-full h-full drop-shadow-sm">
          <path d="M48 132 Q42 74 52 14" stroke="#3F573D" strokeWidth="1.8" strokeLinecap="round" />
          {[26, 38, 50, 62, 74, 86, 98, 110].map((y, i) => {
            const span = 12 + i * 2.2;
            return (
              <g key={y}>
                <path d={`M47 ${y} Q${47 - span} ${y - 6} ${47 - span - 4} ${y - 12}`} stroke="#496646" strokeWidth="2.2" strokeLinecap="round" />
                <path d={`M47 ${y - 2} Q${47 + span} ${y - 8} ${47 + span + 4} ${y - 14}`} stroke="#496646" strokeWidth="2.2" strokeLinecap="round" />
              </g>
            );
          })}
        </svg>
      );

    case "botanical-olive-branch":
      return (
        <svg viewBox="0 0 120 100" fill="none" className="w-full h-full drop-shadow-sm">
          <path d="M16 78 Q58 58 104 22" stroke="#4D5A3F" strokeWidth="2" strokeLinecap="round" />
          {[
            [36, 60, -35], [52, 66, 28], [58, 46, -32], [74, 52, 24], [80, 32, -28], [94, 34, 20],
          ].map(([x, y, rot], idx) => (
            <ellipse key={idx} cx={x} cy={y} rx="11" ry="4.5" transform={`rotate(${rot} ${x} ${y})`} fill="#6B7E58" stroke="#465439" strokeWidth="0.8" />
          ))}
          <circle cx="64" cy="56" r="4.5" fill="#3D4730" />
          <circle cx="84" cy="40" r="4" fill="#3D4730" />
        </svg>
      );

    case "botanical-acorn":
      return (
        <svg viewBox="0 0 100 110" fill="none" className="w-full h-full drop-shadow-sm">
          <path d="M52 24 Q58 14 66 12" stroke="#5A422B" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M28 48 C28 32 72 32 72 48 Z" fill="#6D4B2F" stroke="#4B321D" strokeWidth="1.2" />
          <path d="M32 48 C32 78 50 92 50 92 C50 92 68 78 68 48 Z" fill="#B5895A" stroke="#5A422B" strokeWidth="1.2" />
          <ellipse cx="26" cy="70" rx="12" ry="7" transform="rotate(-35 26 70)" fill="#7A8659" stroke="#4F5A35" strokeWidth="0.9" />
        </svg>
      );

    case "washi-linen-kraft":
      return (
        <svg viewBox="0 0 180 44" fill="none" className="w-full h-full">
          <path d="M4 4 L174 3 L170 15 L176 28 L172 40 L6 41 L10 29 L3 17 Z" fill="#DFCAA8" opacity="0.86" stroke="#C5AE8A" strokeWidth="0.8" />
          <path d="M14 10 H164 M14 34 H164" stroke="#BDA27B" strokeWidth="0.6" strokeDasharray="4 4" />
        </svg>
      );

    case "washi-botanical-sage":
      return (
        <svg viewBox="0 0 180 44" fill="none" className="w-full h-full">
          <path d="M5 4 L175 5 L171 18 L177 31 L173 40 L5 39 L9 26 L3 14 Z" fill="#C7D3BE" opacity="0.86" stroke="#9DAE92" strokeWidth="0.8" />
          {[32, 68, 104, 140].map((x) => (
            <g key={x} transform={`translate(${x}, 22)`}>
              <ellipse cx="-5" cy="-3" rx="6" ry="2.4" transform="rotate(-25 -5 -3)" fill="#6C8261" opacity="0.7" />
              <ellipse cx="5" cy="3" rx="6" ry="2.4" transform="rotate(25 5 3)" fill="#6C8261" opacity="0.7" />
            </g>
          ))}
        </svg>
      );

    case "washi-stripe-burgundy":
      return (
        <svg viewBox="0 0 180 44" fill="none" className="w-full h-full">
          <path d="M4 5 L176 4 L172 17 L177 29 L173 40 L6 41 L11 28 L4 16 Z" fill="#F4EAE0" opacity="0.9" stroke="#C7B2A3" strokeWidth="0.8" />
          <path d="M8 14 H172 M8 22 H172 M8 30 H172" stroke="#8C2F39" strokeWidth="2.2" opacity="0.75" />
        </svg>
      );

    case "label-specimen-no":
      return (
        <svg viewBox="0 0 160 80" fill="none" className="w-full h-full drop-shadow-sm">
          <rect x="4" y="4" width="152" height="72" rx="4" fill="#FBF5E6" stroke="#7A6548" strokeWidth="1.6" />
          <rect x="9" y="9" width="142" height="62" rx="2" stroke="#7A6548" strokeWidth="0.7" />
          <text x="80" y="30" textAnchor="middle" fill="#635036" fontSize="9.5" fontFamily="serif" letterSpacing="2">ARCHIVE SPECIMEN</text>
          <path d="M22 46 H138 M22 59 H138" stroke="#B6A386" strokeWidth="1" strokeDasharray="2 2" />
        </svg>
      );

    case "label-library-card":
      return (
        <svg viewBox="0 0 160 86" fill="none" className="w-full h-full drop-shadow-sm">
          <rect x="4" y="4" width="152" height="78" fill="#F5ECD7" stroke="#A69373" strokeWidth="1.2" />
          <path d="M12 24 H148" stroke="#A24A3F" strokeWidth="1.2" />
          <path d="M12 40 H148 M12 54 H148 M12 68 H148" stroke="#859BB0" strokeWidth="0.8" />
          <text x="16" y="18" fill="#5D4B36" fontSize="8.5" fontFamily="monospace" letterSpacing="1">FOLIO RECORD</text>
        </svg>
      );

    case "label-parchment-frame":
      return (
        <svg viewBox="0 0 160 80" fill="none" className="w-full h-full drop-shadow-sm">
          <path d="M14 6 H146 A8 8 0 0 1 154 14 V66 A8 8 0 0 1 146 74 H14 A8 8 0 0 1 6 66 V14 A8 8 0 0 1 14 6 Z" fill="#EFE4CE" stroke="#8A6D3B" strokeWidth="1.6" />
          <rect x="13" y="13" width="134" height="54" stroke="#8A6D3B" strokeWidth="0.7" />
          <text x="80" y="44" textAnchor="middle" fill="#5E4927" fontSize="11" fontFamily="serif" fontStyle="italic">Personal Chronicle</text>
        </svg>
      );

    case "celestial-crescent":
      return (
        <svg viewBox="0 0 100 100" fill="none" className="w-full h-full drop-shadow-sm">
          <path d="M56 18 A28 28 0 1 0 78 68 A21 21 0 1 1 56 18 Z" fill="#C79D4C" stroke="#8C6924" strokeWidth="1.2" />
          <path d="M68 28 L71 36 L79 39 L71 42 L68 50 L65 42 L57 39 L65 36 Z" fill="#C79D4C" />
          <circle cx="30" cy="28" r="2.2" fill="#9E7B33" />
          <circle cx="76" cy="76" r="2" fill="#9E7B33" />
        </svg>
      );

    case "celestial-sunburst":
      return (
        <svg viewBox="0 0 100 100" fill="none" className="w-full h-full drop-shadow-sm">
          {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((deg) => (
            <path key={deg} d="M50 8 L53 26 L47 26 Z" transform={`rotate(${deg} 50 50)`} fill="#C6953E" />
          ))}
          <circle cx="50" cy="50" r="18" fill="#DFB86C" stroke="#8F6721" strokeWidth="1.4" />
          <circle cx="50" cy="50" r="11" stroke="#8F6721" strokeWidth="0.8" />
        </svg>
      );

    case "celestial-constellation":
      return (
        <svg viewBox="0 0 100 100" fill="none" className="w-full h-full drop-shadow-sm">
          <circle cx="50" cy="50" r="34" stroke="#8A6D3B" strokeWidth="1.2" strokeDasharray="3 3" />
          <path d="M50 12 L55 45 L88 50 L55 55 L50 88 L45 55 L12 50 L45 45 Z" fill="#C59C4E" stroke="#7A5B22" strokeWidth="1" />
          <circle cx="50" cy="50" r="4" fill="#FBF5E6" stroke="#7A5B22" strokeWidth="1.2" />
        </svg>
      );

    case "note-remember":
      return (
        <svg viewBox="0 0 160 94" fill="none" className="w-full h-full drop-shadow-sm">
          <rect x="6" y="8" width="148" height="80" fill="#FBF3DE" stroke="#CEBC99" strokeWidth="1.2" />
          <rect x="52" y="2" width="56" height="14" fill="#D9C39E" opacity="0.8" />
          <text x="80" y="47" textAnchor="middle" fill="#4B3B2A" fontSize="16" fontFamily="cursive">Remember this</text>
          <path d="M30 62 H130" stroke="#B8A382" strokeWidth="0.9" />
        </svg>
      );

    case "note-quiet-hour":
      return (
        <svg viewBox="0 0 160 94" fill="none" className="w-full h-full drop-shadow-sm">
          <rect x="6" y="8" width="148" height="80" fill="#F3EFE4" stroke="#B9B2A2" strokeWidth="1.2" />
          <text x="80" y="46" textAnchor="middle" fill="#2F3B33" fontSize="16" fontFamily="serif" fontStyle="italic">A quiet hour</text>
          <text x="80" y="66" textAnchor="middle" fill="#6F6A5E" fontSize="8.5" fontFamily="serif" letterSpacing="2">NOTES TO SELF</text>
        </svg>
      );

    case "note-keep-safe":
      return (
        <svg viewBox="0 0 160 94" fill="none" className="w-full h-full drop-shadow-sm">
          <rect x="6" y="8" width="148" height="80" fill="#F8ECEA" stroke="#C9A8A4" strokeWidth="1.2" />
          <text x="80" y="48" textAnchor="middle" fill="#6E2D32" fontSize="15" fontFamily="cursive">Keep safe forever</text>
          <path d="M40 62 Q80 68 120 62" stroke="#9C575C" strokeWidth="1" fill="none" />
        </svg>
      );

    case "mark-wax-seal":
      return (
        <svg viewBox="0 0 100 100" fill="none" className="w-full h-full drop-shadow-md">
          <path d="M50 10 C64 8 76 16 84 26 C92 38 92 56 84 68 C78 82 64 90 50 88 C34 92 20 82 14 68 C8 54 10 36 18 24 C26 14 38 12 50 10 Z" fill="#8B1E24" stroke="#5E1015" strokeWidth="1.5" />
          <circle cx="50" cy="49" r="24" fill="#9E272E" stroke="#6E151B" strokeWidth="1.6" />
          <text x="50" y="55" textAnchor="middle" fill="#E3C391" fontSize="18" fontFamily="serif" fontWeight="bold">BL</text>
        </svg>
      );

    case "mark-postmark-circle":
      return (
        <svg viewBox="0 0 110 110" fill="none" className="w-full h-full">
          <circle cx="55" cy="55" r="42" stroke="#4D4236" strokeWidth="1.8" opacity="0.72" />
          <circle cx="55" cy="55" r="34" stroke="#4D4236" strokeWidth="0.9" strokeDasharray="3 2" opacity="0.72" />
          <text x="55" y="44" textAnchor="middle" fill="#4D4236" fontSize="8" fontFamily="monospace" letterSpacing="1.5" opacity="0.8">BETWEEN LETTERS</text>
          <path d="M25 55 H85" stroke="#4D4236" strokeWidth="1" opacity="0.7" />
          <text x="55" y="70" textAnchor="middle" fill="#4D4236" fontSize="8" fontFamily="monospace" letterSpacing="1.5" opacity="0.8">ARCHIVAL POST</text>
        </svg>
      );

    case "mark-fountain-nib":
    default:
      return (
        <svg viewBox="0 0 100 110" fill="none" className="w-full h-full drop-shadow-sm">
          <path d="M50 12 L74 58 L62 82 H38 L26 58 Z" fill="#C79E52" stroke="#6E521F" strokeWidth="1.6" />
          <path d="M50 12 V52" stroke="#3D2B0D" strokeWidth="1.6" />
          <circle cx="50" cy="54" r="4" fill="#3D2B0D" />
          <rect x="36" y="82" width="28" height="10" rx="2" fill="#4F3A19" />
        </svg>
      );
  }
}
