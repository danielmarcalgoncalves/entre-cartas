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
    if (count <= 0) return "Vazia";
    if (count <= 2) return "Meio cheia";
    return "Lotada";
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
      aria-label={`Lixeira postal (${getStatusLabel()}). Arraste uma carta aqui para descartar. Clique para ver cartas descartadas.`}
      title="Lixeira Postal: Arraste uma carta aqui para descartar. Clique para ver e gerenciar cartas."
    >
      {/* Sombra de chão vintage no papel */}
      <div className="postal-trash-floor-shadow" />

      {/* Visual da lixeira com a foto correspondente à quantidade */}
      <div
        className={`postal-trash-can-visual ${isOpen ? "is-open" : ""} ${
          isShaking ? "is-shaking" : ""
        }`}
      >
        <img
          key={currentImage}
          src={currentImage}
          alt={`Lixeira ${getStatusLabel()} com ${count} ${
            count === 1 ? "carta" : "cartas"
          }`}
          className="postal-trash-photo"
          draggable={false}
        />

        {/* Efeito de atração quando a carta está sendo arrastada por cima */}
        {isOpen && <div className="postal-trash-target-glow" />}
      </div>

      {/* Informações da lixeira */}
      <div className="postal-trash-info">
        <span className="postal-trash-title">LIXEIRA POSTAL</span>
        <span className="postal-trash-count">
          {count === 0
            ? "0 cartas (Vazia)"
            : count <= 2
            ? `${count} ${count === 1 ? "carta" : "cartas"} (Meio cheia)`
            : `${count} cartas (Lotada)`}
        </span>
        <span className={`postal-trash-hint ${isOpen ? "is-active" : ""}`}>
          {isOpen ? "Solte para descartar!" : "Arraste uma carta até aqui"}
        </span>
      </div>
    </div>
  );
}
