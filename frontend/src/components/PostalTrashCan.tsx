"use client";

import React from "react";

interface PostalTrashCanProps {
  isOpen: boolean;
  count: number;
  onClick: () => void;
  innerRef?: React.Ref<HTMLDivElement>;
}

export default function PostalTrashCan({
  isOpen,
  count,
  onClick,
  innerRef,
}: PostalTrashCanProps) {
  return (
    <div
      ref={innerRef}
      className={`postal-trash-station ${isOpen ? "is-hovered" : ""}`}
      onClick={onClick}
      role="button"
      tabIndex={0}
      aria-label="Lixeira Postal. Arraste uma carta aqui para descartar. Clique para ver cartas descartadas."
      title="Lixeira Postal: Arraste uma carta aqui para descartar. Clique para abrir o acervo e restaurar cartas."
    >
      {/* Sombra de chão vintage no papel */}
      <div className="postal-trash-floor-shadow" />

      {/* Ilustração Vetorial 3D Skeuomorphic da Lixeira Metálica Vintage */}
      <div className="postal-trash-can-visual">
        <svg
          viewBox="0 0 160 190"
          className="postal-trash-svg"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            {/* Gradiente do corpo metálico de zinco envelhecido */}
            <linearGradient id="zincBody" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#2c2621" />
              <stop offset="15%" stopColor="#483f36" />
              <stop offset="35%" stopColor="#6e6254" />
              <stop offset="55%" stopColor="#53493e" />
              <stop offset="85%" stopColor="#3d352d" />
              <stop offset="100%" stopColor="#241e1a" />
            </linearGradient>

            {/* Gradiente das ranhuras/canaletas verticais */}
            <linearGradient id="zincRib" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#221c17" />
              <stop offset="30%" stopColor="#63574a" />
              <stop offset="70%" stopColor="#7a6d5d" />
              <stop offset="100%" stopColor="#2a231d" />
            </linearGradient>

            {/* Gradiente da tampa metálica abobadada */}
            <linearGradient id="zincLid" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#302a24" />
              <stop offset="25%" stopColor="#594e43" />
              <stop offset="50%" stopColor="#786b5c" />
              <stop offset="75%" stopColor="#4f4439" />
              <stop offset="100%" stopColor="#28221d" />
            </linearGradient>

            {/* Interior escuro da lata quando a tampa se abre */}
            <radialGradient id="trashInterior" cx="50%" cy="40%" r="60%">
              <stop offset="0%" stopColor="#2a221b" />
              <stop offset="55%" stopColor="#15110d" />
              <stop offset="100%" stopColor="#0a0806" />
            </radialGradient>

            {/* Placa de latão envelhecido */}
            <linearGradient id="brassPlate" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#967945" />
              <stop offset="50%" stopColor="#d2b57b" />
              <stop offset="100%" stopColor="#7a5f2e" />
            </linearGradient>

            {/* Filtro de sombra suave */}
            <filter id="softShadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="4" stdDeviation="4" floodOpacity="0.35" floodColor="#1a140e" />
            </filter>

            <filter id="lidShadow" x="-30%" y="-30%" width="160%" height="160%">
              <feDropShadow dx="2" dy="8" stdDeviation="6" floodOpacity="0.45" floodColor="#000000" />
            </filter>
          </defs>

          {/* ========================================================== */}
          {/* 1. CORPO DA LATA (CILINDRO COM CANALETAS VERTICAIS)       */}
          {/* ========================================================== */}

          {/* Alças laterais de ferro fundido */}
          <g className="trash-handles" stroke="#251f1a" strokeWidth="4" strokeLinecap="round">
            {/* Alça esquerda */}
            <path d="M 27 75 C 15 75 14 95 27 95" fill="none" />
            <circle cx="27" cy="75" r="2.5" fill="#4d4237" stroke="#1c1713" strokeWidth="1" />
            <circle cx="27" cy="95" r="2.5" fill="#4d4237" stroke="#1c1713" strokeWidth="1" />

            {/* Alça direita */}
            <path d="M 133 75 C 145 75 146 95 133 95" fill="none" />
            <circle cx="133" cy="75" r="2.5" fill="#4d4237" stroke="#1c1713" strokeWidth="1" />
            <circle cx="133" cy="95" r="2.5" fill="#4d4237" stroke="#1c1713" strokeWidth="1" />
          </g>

          {/* Corpo principal afunilado sutilmente para baixo */}
          <path
            d="M 28 54 L 35 168 C 35 174 125 174 125 168 L 132 54 Z"
            fill="url(#zincBody)"
            filter="url(#softShadow)"
          />

          {/* Fundo escuro da boca da lixeira (visível quando a tampa abre) */}
          <ellipse
            cx="80"
            cy="54"
            rx="52"
            ry="12"
            fill="url(#trashInterior)"
            stroke="#1b1612"
            strokeWidth="1.5"
          />

          {/* Brilho âmbar sutil dentro da lixeira quando aberta esperando a carta */}
          {isOpen && (
            <ellipse
              cx="80"
              cy="54"
              rx="46"
              ry="9"
              fill="rgba(195, 140, 70, 0.22)"
              className="trash-ambient-glow"
            />
          )}

          {/* Canaletas / Frisos verticais estampados no metal */}
          <g className="trash-ribs" opacity="0.95">
            {/* Friso 1 */}
            <rect x="42" y="62" width="9" height="96" rx="4.5" fill="url(#zincRib)" />
            <line x1="44" y1="65" x2="44" y2="155" stroke="rgba(255,255,255,0.15)" strokeWidth="1" />

            {/* Friso 2 */}
            <rect x="58" y="62" width="10" height="98" rx="5" fill="url(#zincRib)" />
            <line x1="60" y1="65" x2="60" y2="157" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />

            {/* Friso 3 (Central) */}
            <rect x="75" y="62" width="10" height="99" rx="5" fill="url(#zincRib)" />
            <line x1="77" y1="65" x2="77" y2="158" stroke="rgba(255,255,255,0.28)" strokeWidth="1" />

            {/* Friso 4 */}
            <rect x="92" y="62" width="10" height="98" rx="5" fill="url(#zincRib)" />
            <line x1="94" y1="65" x2="94" y2="157" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />

            {/* Friso 5 */}
            <rect x="109" y="62" width="9" height="96" rx="4.5" fill="url(#zincRib)" />
            <line x1="111" y1="65" x2="111" y2="155" stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
          </g>

          {/* Aro de reforço inferior da base */}
          <path
            d="M 34 163 C 34 171 126 171 126 163 L 126 168 C 126 176 34 176 34 168 Z"
            fill="#1e1814"
          />

          {/* Placa vintage em latão gravado: LIXEIRA POSTAL */}
          <g className="trash-brass-plaque" transform="translate(56, 102)">
            <rect
              x="0"
              y="0"
              width="48"
              height="18"
              rx="2"
              fill="url(#brassPlate)"
              stroke="#4a3717"
              strokeWidth="0.8"
            />
            {/* Rebites nos cantos da placa */}
            <circle cx="3" cy="3" r="0.9" fill="#2d2008" />
            <circle cx="45" cy="3" r="0.9" fill="#2d2008" />
            <circle cx="3" cy="15" r="0.9" fill="#2d2008" />
            <circle cx="45" cy="15" r="0.9" fill="#2d2008" />
            {/* Texto editorial na placa */}
            <text
              x="24"
              y="8"
              textAnchor="middle"
              fill="#2c1e09"
              fontSize="4.5"
              fontWeight="bold"
              fontFamily="serif"
              letterSpacing="0.08em"
            >
              LIXEIRA POSTAL
            </text>
            <text
              x="24"
              y="14"
              textAnchor="middle"
              fill="#523916"
              fontSize="3.8"
              fontStyle="italic"
              fontFamily="serif"
            >
              N° 1892 · DESCARTES
            </text>
          </g>

          {/* Borda superior da boca da lata */}
          <ellipse
            cx="80"
            cy="54"
            rx="52"
            ry="6.5"
            fill="none"
            stroke="#675a4c"
            strokeWidth="3.5"
          />
          <ellipse
            cx="80"
            cy="54"
            rx="52"
            ry="6.5"
            fill="none"
            stroke="#1b1612"
            strokeWidth="1.2"
          />

          {/* ========================================================== */}
          {/* 2. TAMPA METÁLICA ABOBADADA INTERATIVA (ABRE / FECHA)     */}
          {/* ========================================================== */}
          <g
            className={`trash-lid-group ${isOpen ? "trash-lid-open" : "trash-lid-closed"}`}
            filter="url(#lidShadow)"
          >
            {/* Alça superior da tampa para segurar */}
            <path
              d="M 68 28 C 68 14 92 14 92 28"
              stroke="#211b16"
              strokeWidth="5"
              strokeLinecap="round"
              fill="none"
            />
            <path
              d="M 68 28 C 68 14 92 14 92 28"
              stroke="#594d40"
              strokeWidth="2.5"
              strokeLinecap="round"
              fill="none"
            />

            {/* Base da alça com suportes rebitados */}
            <ellipse cx="68" cy="28" rx="4" ry="2" fill="#261f19" />
            <ellipse cx="92" cy="28" rx="4" ry="2" fill="#261f19" />

            {/* Cúpula / Tampa redonda estriada */}
            <path
              d="M 24 50 C 24 30 136 30 136 50 Z"
              fill="url(#zincLid)"
            />

            {/* Anéis decorativos concêntricos prensados na tampa */}
            <ellipse cx="80" cy="40" rx="40" ry="6" stroke="rgba(255,255,255,0.18)" strokeWidth="1" fill="none" />
            <ellipse cx="80" cy="35" rx="26" ry="4" stroke="rgba(255,255,255,0.14)" strokeWidth="1" fill="none" />

            {/* Aba da borda inferior da tampa que sobrepõe a boca */}
            <ellipse
              cx="80"
              cy="50"
              rx="56"
              ry="8.5"
              fill="url(#zincLid)"
              stroke="#221c17"
              strokeWidth="1.5"
            />
            {/* Linha de reflexo na borda da tampa */}
            <ellipse
              cx="80"
              cy="49"
              rx="54"
              ry="7"
              stroke="rgba(255,255,255,0.28)"
              strokeWidth="1"
              fill="none"
            />
          </g>
        </svg>

        {/* Efeito de anel de atração/alvo pulsante quando o card está em cima */}
        {isOpen && <div className="postal-trash-target-glow" />}
      </div>

      {/* Rótulo e indicador de interação */}
      <div className="postal-trash-info">
        <span className="postal-trash-title">LIXEIRA POSTAL</span>
        <span className="postal-trash-count">
          {count} {count === 1 ? "carta guardada" : "cartas guardadas"}
        </span>
        <span className={`postal-trash-hint ${isOpen ? "is-active" : ""}`}>
          {isOpen ? "Solte para descartar!" : "Arraste uma carta aqui"}
        </span>
      </div>
    </div>
  );
}
