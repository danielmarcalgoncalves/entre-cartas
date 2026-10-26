"use client";

import React, { useEffect } from "react";

interface PostalTrashCanProps {
  isOpen: boolean;
  count: number;
  onClick: () => void;
  innerRef?: React.Ref<HTMLDivElement>;
  isShaking?: boolean;
}

export default function PostalTrashCan({
  isOpen,
  count,
  onClick,
  innerRef,
  isShaking = false,
}: PostalTrashCanProps) {
  // Pré-carregamento imediato das novas fotos da lixeira
  useEffect(() => {
    const urls = [
      "/images/lixeira/foto-nova-1.png",
      "/images/lixeira/foto-nova-2.png",
      "/images/lixeira/foto-nova-3.png",
    ];
    urls.forEach((url) => {
      const img = new Image();
      img.src = url;
    });
  }, []);

  // Regras de seleção da nova imagem:
  // - 0 cartas: completamente vazia -> foto nova 1
  // - 1 até 2 cartas: meio cheia -> foto nova 2
  // - 3 ou mais cartas: lotada -> foto nova 3
  const getTrashImage = (): string => {
    if (count <= 0) return "/images/lixeira/foto-nova-1.png";
    if (count <= 2) return "/images/lixeira/foto-nova-2.png";
    return "/images/lixeira/foto-nova-3.png";
  };

  const getStatusLabel = (): string => {
    if (count <= 0) return "Empty";
    if (count <= 2) return "Partially full";
    return "Full";
  };

  const currentImage = getTrashImage();

  return (
    <div
      ref={innerRef}
      className={`postal-trash-station ${isOpen ? "is-hovered" : ""} ${
        isShaking ? "is-shaking" : ""
      }`}
      onClick={onClick}
      role="button"
      tabIndex={0}
      aria-label={`Postal discards (${getStatusLabel()}). Drag a letter here to discard. Click to view discarded letters.`}
      title="Postal Discards: Drag a letter here to discard. Click to view and manage letters."
    >
      {/* Vintage floor shadow on paper */}
      <div className="postal-trash-floor-shadow" />

      {/* Trash visual matching letter capacity */}
      <div
        className={`postal-trash-can-visual ${isOpen ? "is-open" : ""} ${
          isShaking ? "is-shaking" : ""
        }`}
      >
        <img
          key={currentImage}
          src={currentImage}
          alt={`Postal trash (${getStatusLabel()}) with ${count} ${
            count === 1 ? "letter" : "letters"
          }`}
          className="postal-trash-photo"
          draggable={false}
        />

        {/* Target glow effect when dragging over */}
        {isOpen && <div className="postal-trash-target-glow" />}
      </div>

      {/* Postal trash information */}
      <div className="postal-trash-info">
        <span className="postal-trash-title">POSTAL DISCARDS</span>
        <span className="postal-trash-count">
          {count === 0
            ? "0 letters (Empty)"
            : count <= 2
            ? `${count} ${count === 1 ? "letter" : "letters"} (Partially full)`
            : `${count} letters (Full)`}
        </span>
        <span className={`postal-trash-hint ${isOpen ? "is-active" : ""}`}>
          {isOpen ? "Drop to discard!" : "Drag a letter here"}
        </span>
      </div>
    </div>
  );
}
