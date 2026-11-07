"use client";

import React, { useState } from "react";
import Link from "next/link";

interface PlateItem {
  id: string;
  plateNumber: string;
  category: string;
  title: string;
  subtitle: string;
  quote: string;
  imageSrc: string;
  imageAlt: string;
  aspect: "wide" | "tall" | "standard";
  href: string;
  linkText: string;
  tags: string[];
}

const PLATES: PlateItem[] = [
  {
    id: "plate-notebook-1",
    plateNumber: "PLATE 01",
    category: "PERSONAL JOURNALING",
    title: "Memories & Childhood Keepsakes",
    subtitle: "Torn paper photographs, Favorite Person marks, celestial motifs and poetic reminders.",
    quote: "To write is to live twice: in the moment and in hindsight.",
    imageSrc: "/images/nova-ui/caderno-1-cutout.png",
    imageAlt: "Open journal with torn photos and stickers",
    aspect: "wide",
    href: "/journal",
    linkText: "Open Writing Desk ↗",
    tags: ["Torn Photo", "Favorite Person", "Starlit Motif", "Graphite Notes"],
  },
  {
    id: "plate-notebook-2",
    plateNumber: "PLATE 02",
    category: "POP COLLAGE & CINEMA",
    title: "Crowned Snoopy & Before Sunrise",
    subtitle: "Hand-inked playful sketches, film stills, and baroque cherub cutouts.",
    quote: "Beauty is hidden in the smallest details of the ordinary day.",
    imageSrc: "/images/nova-ui/caderno-2-cutout.png",
    imageAlt: "Open journal with playful illustrations and cherubs",
    aspect: "wide",
    href: "/journal",
    linkText: "Try This Style ↗",
    tags: ["Crowned Sketch", "Before Sunrise", "Cherub", "Resting Cat"],
  },
  {
    id: "plate-notebook-3",
    plateNumber: "PLATE 03",
    category: "DRAMATIC & CONCEPTUAL",
    title: "Surrealism, Velvet & Stage",
    subtitle: "Surrealist cutouts, theatre curtains and starry harlequins.",
    quote: "Literature is the most pleasant way to ignore life.",
    imageSrc: "/images/nova-ui/caderno-3-cutout.png",
    imageAlt: "Open journal with surrealist art and baroque drapes",
    aspect: "wide",
    href: "/journal",
    linkText: "Create Theatrical Collage ↗",
    tags: ["Surreal Bust", "Baroque Drapes", "Harlequin", "Literary Quote"],
  },
  {
    id: "plate-manuscript",
    plateNumber: "PLATE 04",
    category: "CALLIGRAPHIC GRAIN",
    title: "Historical Manuscript & Archival Ink",
    subtitle: "Aged parchment fibers capturing the cadence of human handwriting.",
    quote: "Ink on textured paper preserves the rhythm of the writer.",
    imageSrc: "/images/manuscrito-pixabay.jpg",
    imageAlt: "Historical manuscript written on vintage parchment",
    aspect: "tall",
    href: "/discover",
    linkText: "Explore Historic Letters ↗",
    tags: ["Aged Parchment", "Pen & Ink", "Archival Reserve"],
  },
  {
    id: "plate-folders",
    plateNumber: "PLATE 05",
    category: "PHYSICAL ARCHIVE",
    title: "Three-Dimensional Epistolary Folders",
    subtitle: "Rustic Brown, Botanical Moss, and Noble Burgundy with gold-embossed clasps.",
    quote: "Letters kept by feeling, shielded from the rush of the world.",
    imageSrc: "/images/pastas/pasta-marrom.svg",
    imageAlt: "Brown leather epistolary folder embossed in gold",
    aspect: "standard",
    href: "/collections",
    linkText: "View 3D Folders ↗",
    tags: ["3D Leather", "Wax Seal", "3 to 10 Folders"],
  },
  {
    id: "plate-discard",
    plateNumber: "PLATE 06",
    category: "POSTAL RECEPTACLE",
    title: "Cast Metal Postal Bin",
    subtitle: "Postal receptacle reflecting 3 fullness states and full letter restoration.",
    quote: "Even discarded thoughts rest gently until you choose to restore them.",
    imageSrc: "/images/lixeira/foto-nova-1.png",
    imageAlt: "Postal discard receptacle with artisan metal details",
    aspect: "standard",
    href: "/journal",
    linkText: "Visit Writing Desk ↗",
    tags: ["3 Fullness States", "Soft Delete", "Instant Recovery"],
  },
];

export default function InteractiveGallery() {
  const [upscalePlate, setUpscalePlate] = useState<PlateItem | null>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const card = e.currentTarget;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const rotateX = ((y - centerY) / centerY) * -3;
    const rotateY = ((x - centerX) / centerX) * 3;

    window.requestAnimationFrame(() => {
      card.style.transform = `perspective(900px) rotateX(${rotateX.toFixed(1)}deg) rotateY(${rotateY.toFixed(1)}deg) translateY(-3px)`;
    });
  };

  const handleMouseLeave = (e: React.MouseEvent<HTMLDivElement>) => {
    const card = e.currentTarget;
    card.style.transform = `perspective(900px) rotateX(0deg) rotateY(0deg) translateY(0px)`;
  };

  return (
    <section className="interactive-gallery-section" aria-label="Visual plates of Between Letters">
      <div className="gallery-section-intro">
        <div className="gallery-section-kicker">
          <span className="gallery-star" aria-hidden="true">✳</span>
          <span>ARCHIVAL PLATES · TACTILE EPHEMERA</span>
          <span className="gallery-star" aria-hidden="true">✳</span>
        </div>
        <h2 className="gallery-section-title">
          Visual Anatomy of Your Writing Desk
        </h2>
        <p className="gallery-section-subtitle">
          Every page reflects your authentic thoughts: artisan leather journals, tactile epistolary folders, and honest memories kept safe.
        </p>
      </div>

      <div className="gallery-grid">
        {PLATES.map((plate) => (
          <div
            key={plate.id}
            className={`gallery-card gallery-card--${plate.aspect}`}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
          >
            <div
              className="gallery-card__media-wrap"
              onClick={() => setUpscalePlate(plate)}
              title="Clique para dar upscale e inspecionar em alta resolução"
            >
              <img
                src={plate.imageSrc}
                alt={plate.imageAlt}
                className="gallery-card__img"
                loading="lazy"
              />
              <div className="gallery-card__vignette" />
              <div className="gallery-card__plate-tag">{plate.plateNumber}</div>
              <button
                type="button"
                className="gallery-card__upscale-btn"
                aria-label={`Upscale ${plate.title}`}
                onClick={(e) => {
                  e.stopPropagation();
                  setUpscalePlate(plate);
                }}
              >
                <span>Upscale</span>
              </button>
            </div>

            <div className="gallery-card__content">
              <div className="gallery-card__header">
                <span className="gallery-card__category">{plate.category}</span>
                <h3 className="gallery-card__title">{plate.title}</h3>
              </div>

              <p className="gallery-card__subtitle">{plate.subtitle}</p>

              <blockquote className="gallery-card__quote">
                “{plate.quote}”
              </blockquote>

              <div className="gallery-card__tags">
                {plate.tags.map((tag, idx) => (
                  <span key={idx} className="gallery-card__tag">
                    #{tag}
                  </span>
                ))}
              </div>

              <div className="gallery-card__action">
                <Link href={plate.href} className="gallery-card__link">
                  <span>{plate.linkText}</span>
                  <span className="gallery-card__arrow" aria-hidden="true">→</span>
                </Link>
                <button
                  type="button"
                  className="gallery-card__inspect-action"
                  onClick={() => setUpscalePlate(plate)}
                >
                  Inspecionar ↗
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* High-Resolution Upscale Lightbox Modal */}
      {upscalePlate && (
        <div
          className="upscale-modal-backdrop"
          onClick={() => setUpscalePlate(null)}
          role="dialog"
          aria-modal="true"
          aria-label={`Inspeção de ${upscalePlate.title}`}
        >
          <div
            className="upscale-modal-card"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="upscale-close-btn"
              onClick={() => setUpscalePlate(null)}
              aria-label="Fechar inspeção"
            >
              ✕
            </button>

            <div className="upscale-modal-header">
              <span className="upscale-badge">{upscalePlate.plateNumber} · {upscalePlate.category}</span>
              <h3 className="upscale-title">{upscalePlate.title}</h3>
              <p className="upscale-quote">“{upscalePlate.quote}”</p>
            </div>

            <div className="upscale-image-viewport">
              <img
                src={upscalePlate.imageSrc}
                alt={upscalePlate.imageAlt}
                className="upscale-large-img"
              />
            </div>

            <div className="upscale-modal-footer">
              <div className="upscale-stickers-list">
                <span className="stickers-heading">Elementos & Texturas:</span>
                <div className="stickers-tags">
                  {upscalePlate.tags.map((tag, i) => (
                    <span key={i} className="sticker-chip">
                      ✦ {tag}
                    </span>
                  ))}
                </div>
              </div>

              <div className="upscale-cta-row">
                <Link
                  href={upscalePlate.href}
                  className="upscale-action-btn"
                  onClick={() => setUpscalePlate(null)}
                >
                  {upscalePlate.linkText}
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
