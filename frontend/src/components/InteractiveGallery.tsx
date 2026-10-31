"use client";

import React, { useRef } from "react";
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
}

const PLATES: PlateItem[] = [
  {
    id: "plate-desk",
    plateNumber: "PLATE 01",
    category: "SANCTUARY DESK",
    title: "The Open Journal & Epistolary Collage",
    subtitle: "Hardbound leather volumes, pressed botanicals, and hand-ruled sheets.",
    quote: "A thought written by hand is a quiet promise made to one's own soul.",
    imageSrc: "/hero-collage.webp",
    imageAlt: "Open antique scrapbook journal with pressed botanicals, wax seal, and vintage photograph",
    aspect: "wide",
    href: "/journal",
    linkText: "Open Journal Desk ↗",
  },
  {
    id: "plate-manuscript",
    plateNumber: "PLATE 02",
    category: "CALLIGRAPHIC GRAIN",
    title: "Archival Manuscript & Iron Gall Inks",
    subtitle: "Parchment fibers that hold the pressure and cadence of human writing.",
    quote: "Ink on textured paper captures the silent rhythm of breath behind the words.",
    imageSrc: "/images/manuscrito-pixabay.jpg",
    imageAlt: "Historic calligraphic manuscript with textured parchment and vintage script",
    aspect: "tall",
    href: "/discover",
    linkText: "Explore Archival Letters ↗",
  },
  {
    id: "plate-folders",
    plateNumber: "PLATE 03",
    category: "PHYSICAL ARCHIVE",
    title: "Tri-Color Correspondence Folders",
    subtitle: "Rustic Brown, Botanical Moss, and Noble Wine envelopes kept in 3D perspective.",
    quote: "Kept letters grouped by sentiment, safe from the casual glance of the world.",
    imageSrc: "/images/pastas/pasta-marrom.svg",
    imageAlt: "Archival leather correspondence folder embossed with gold seal",
    aspect: "standard",
    href: "/collections",
    linkText: "View Epistolary Folders ↗",
  },
  {
    id: "plate-discard",
    plateNumber: "PLATE 04",
    category: "POSTAL RECEPTACLE",
    title: "The Postal Discard & Restoration Receptacle",
    subtitle: "A cast-iron postal discard bin with dynamic fullness and soft-deletion recovery.",
    quote: "Even discarded thoughts rest in a sanctuary, waiting to be recovered or released.",
    imageSrc: "/images/lixeira/foto-nova-1.png",
    imageAlt: "Vintage brass postal discard receptacle with cast metal details",
    aspect: "standard",
    href: "/journal",
    linkText: "Visit Postal Desk ↗",
  },
];

/**
 * InteractiveGallery Component
 * An editorial magazine-style composition presenting the tactile universe of Between Letters.
 * Features subtle cursor 3D tilt, zoom, and discreet editorial metadata captions.
 */
export default function InteractiveGallery() {
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const card = e.currentTarget;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const rotateX = ((y - centerY) / centerY) * -5;
    const rotateY = ((x - centerX) / centerX) * 5;

    card.style.transform = `perspective(900px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) translateY(-4px)`;
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
          The Tactile Anatomy of Memory
        </h2>
        <p className="gallery-section-subtitle">
          Every texture within Between Letters is crafted to feel tangible:
          ruled rag paper, hand-folded envelopes, iron gall inks, and time-weathered postal relics.
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
            <div className="gallery-card__media-wrap">
              <img
                src={plate.imageSrc}
                alt={plate.imageAlt}
                className="gallery-card__img"
                loading="lazy"
              />
              <div className="gallery-card__vignette" />
              <div className="gallery-card__plate-tag">{plate.plateNumber}</div>
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

              <div className="gallery-card__action">
                <Link href={plate.href} className="gallery-card__link">
                  <span>{plate.linkText}</span>
                  <span className="gallery-card__arrow" aria-hidden="true">→</span>
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
