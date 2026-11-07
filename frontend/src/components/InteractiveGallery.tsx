"use client";

import React from "react";

export interface PlateItem {
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

/**
 * 3D perspective tilt animation handlers preserved for upcoming replacement elements.
 */
export function handleCardMouseMove(e: React.MouseEvent<HTMLDivElement>) {
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
}

export function handleCardMouseLeave(e: React.MouseEvent<HTMLDivElement>) {
  const card = e.currentTarget;
  card.style.transform = `perspective(900px) rotateX(0deg) rotateY(0deg) translateY(0px)`;
}

export default function InteractiveGallery() {
  return (
    <section className="interactive-gallery-section" aria-label="Visual plates of Between Letters">
      {/* Ready slot for upcoming element replacement */}
    </section>
  );
}
