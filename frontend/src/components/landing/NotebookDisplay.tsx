"use client";

import React, {
  forwardRef,
  useState,
  useEffect,
  useRef,
  useCallback,
} from "react";
import Link from "next/link";

export interface NotebookItem {
  id: string;
  name: string;
  category: string;
  tagline: string;
  imageSrc: string;
  alt: string;
  description: string;
  stickers: string[];
  quote: string;
}

const NOTEBOOK_SHOWCASE: NotebookItem[] = [
  {
    id: "caderno-afeto",
    name: "01 · Memórias & Afeto",
    category: "PERSONALIZAÇÃO EMOCIONAL",
    tagline: "A new way to live life · Recordações Íntimas",
    imageSrc: "/images/nova-ui/caderno-1-cutout.png",
    alt: "Caderno Entre Cartas personalizado com foto de infância, adesivo Favorite Person, constelação e nuvem ilustrada",
    description:
      "Demonstração de colagem afetiva: fotos antigas recortadas à mão, notas afetuosas ('Favorite person'), figura celeste e versos sobre viver plenamente.",
    stickers: [
      "Foto de Infância Rasgada",
      "Selo 'Favorite person'",
      "Astro Andarilho",
      "Nuvem a Grafite",
      "Citação Poética",
    ],
    quote: "“We write to prove life twice, in the moment and in hindsight.”",
  },
  {
    id: "caderno-snoopy",
    name: "02 · Snoopy & Cinema",
    category: "COLAGEM POP & CINEMATOGRÁFICA",
    tagline: "This is soo good (: · Before Sunrise & Querubins",
    imageSrc: "/images/nova-ui/caderno-2-cutout.png",
    alt: "Caderno Entre Cartas personalizado com Snoopy coroado, cena de Before Sunrise, anjo querubim e gatinho",
    description:
      "Demonstração de diário pop e cinematográfico: ilustração do Snoopy coroado a traço livre, recorte de Julie Delpy e Ethan Hawke em Before Sunrise, querubim e gatinho.",
    stickers: [
      "Snoopy com Coroa de Ouro",
      "Before Sunrise Polaroid",
      "Querubim Barroco",
      "Gatinho Dormindo",
      "Caligrafia Espontânea",
    ],
    quote: "“Beauty is everywhere, hidden in the smallest details.”",
  },
  {
    id: "caderno-surrealismo",
    name: "03 · Surrealismo & Palco",
    category: "DRAMATURGIA & CONCEITUAL",
    tagline: "Literature is the most pleasant way to ignore life",
    imageSrc: "/images/nova-ui/caderno-3-cutout.png",
    alt: "Caderno Entre Cartas personalizado com colagem de cabeça partida surrealista, cortinas de ópera e arlequim",
    description:
      "Demonstração de estética dramática e conceitual: colagem surrealista com nota de $100 saindo dos pensamentos, cortinas teatrais de veludo carmesim e arlequim renascentista.",
    stickers: [
      "Retrato Bipartido Surrealista",
      "Cortinas de Veludo Carmesim",
      "Arlequim com Cetro Estelar",
      "Aforismo de Fernando Pessoa",
    ],
    quote: "“Literature is the most pleasant way to ignore life.”",
  },
];

export interface NotebookDisplayProps {
  id?: string;
  className?: string;
  onSelectNotebook?: (notebook: NotebookItem) => void;
}

export const NotebookDisplay = forwardRef<HTMLDivElement, NotebookDisplayProps>(
  ({ id = "journal", className = "", onSelectNotebook }, ref) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isHovered, setIsHovered] = useState(false);
    const [isUpscaleOpen, setIsUpscaleOpen] = useState(false);
    const [mouseTilt, setMouseTilt] = useState({ rotateX: 0, rotateY: 0 });
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    const activeNotebook = NOTEBOOK_SHOWCASE[currentIndex];

    // 5-second interval auto-advance
    const advanceNext = useCallback(() => {
      setCurrentIndex((prev) => (prev + 1) % NOTEBOOK_SHOWCASE.length);
    }, []);

    const advancePrev = useCallback(() => {
      setCurrentIndex((prev) =>
        prev === 0 ? NOTEBOOK_SHOWCASE.length - 1 : prev - 1
      );
    }, []);

    useEffect(() => {
      if (isHovered || isUpscaleOpen) return;

      timerRef.current = setInterval(() => {
        advanceNext();
      }, 5000); // Exatos 5 segundos solicitados pelo usuário

      return () => {
        if (timerRef.current) clearInterval(timerRef.current);
      };
    }, [isHovered, isUpscaleOpen, advanceNext]);

    // Interactive 3D tilt tracking cursor
    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;

      // Gentle tilt between -3.5deg and 3.5deg
      const rotX = ((y - centerY) / centerY) * -3.5;
      const rotY = ((x - centerX) / centerX) * 3.5;

      setMouseTilt({ rotateX: rotX, rotateY: rotY });
    };

    const handleMouseLeave = () => {
      setIsHovered(false);
      setMouseTilt({ rotateX: 0, rotateY: 0 });
    };

    return (
      <div
        ref={ref}
        id={id}
        className={`notebook-showcase-container ${className}`}
        aria-label="Demonstração interativa dos cadernos personalizados"
      >
        {/* Notebook Floating Presentation Area */}
        <div
          className="notebook-stage-wrap"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={handleMouseLeave}
          onMouseMove={handleMouseMove}
        >
          {/* Subtle Ambient Floor Shadow */}
          <div className="notebook-ambient-shadow" aria-hidden="true" />

          {/* Gentle Floating & Tilt Container */}
          <div
            className="notebook-floating-frame"
            style={{
              transform: `perspective(1100px) rotateX(${mouseTilt.rotateX.toFixed(
                2
              )}deg) rotateY(${mouseTilt.rotateY.toFixed(2)}deg)`,
            }}
          >
            {/* The 3 Customized Notebooks with smooth transition */}
            <div className="notebook-cards-stack">
              {NOTEBOOK_SHOWCASE.map((item, index) => {
                const isActive = index === currentIndex;
                return (
                  <div
                    key={item.id}
                    className={`notebook-slide ${
                      isActive ? "notebook-slide--active" : "notebook-slide--inactive"
                    }`}
                    aria-hidden={!isActive}
                  >
                    <img
                      src={item.imageSrc}
                      alt={item.alt}
                      className="notebook-cutout-img"
                      draggable={false}
                      loading="eager"
                      onClick={() => setIsUpscaleOpen(true)}
                      title="Clique para inspecionar em alta resolução"
                    />
                  </div>
                );
              })}
            </div>

            {/* Quick Inspect Badge overlay on hover */}
            <button
              type="button"
              className="notebook-inspect-btn"
              onClick={() => setIsUpscaleOpen(true)}
              aria-label="Ampliar e inspecionar detalhes do caderno"
            >
              <span className="inspect-icon">🔍</span>
              <span>Inspecionar Personalização</span>
            </button>
          </div>

          {/* Lateral Previous/Next tactile paper buttons */}
          <button
            type="button"
            className="notebook-nav-arrow arrow-left"
            onClick={advancePrev}
            aria-label="Caderno anterior"
            title="Ver personalização anterior"
          >
            ‹
          </button>
          <button
            type="button"
            className="notebook-nav-arrow arrow-right"
            onClick={advanceNext}
            aria-label="Próximo caderno"
            title="Ver próxima personalização (intercala a cada 5s)"
          >
            ›
          </button>
        </div>

        {/* 5-Second Cycle Progress Bar & Interactive Selector Tabs */}
        <div className="notebook-controls-dock" aria-label="Controles de demonstração">
          {/* Circular/Linear 5s Progress Bar */}
          <div className="cycle-progress-track" title="Intercalando a cada 5 segundos">
            <div
              key={currentIndex}
              className={`cycle-progress-bar ${isHovered ? "cycle-paused" : ""}`}
            />
          </div>

          {/* Interactive Selector Tabs for the 3 Notebooks */}
          <div className="notebook-tabs-row" role="tablist">
            {NOTEBOOK_SHOWCASE.map((item, idx) => {
              const isActive = idx === currentIndex;
              return (
                <button
                  key={item.id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  className={`notebook-tab-pill ${
                    isActive ? "notebook-tab-pill--active" : ""
                  }`}
                  onClick={() => {
                    setCurrentIndex(idx);
                    if (onSelectNotebook) onSelectNotebook(item);
                  }}
                >
                  <span className="tab-dot" />
                  <span className="tab-label">{item.name}</span>
                </button>
              );
            })}
          </div>

          {/* Active Notebook Feature Tagline */}
          <div className="active-notebook-meta">
            <span className="meta-category">{activeNotebook.category}</span>
            <span className="meta-sep">·</span>
            <span className="meta-tagline">{activeNotebook.tagline}</span>
          </div>
        </div>

        {/* High-Resolution Upscale Inspection Lightbox Modal */}
        {isUpscaleOpen && (
          <div
            className="upscale-modal-backdrop"
            onClick={() => setIsUpscaleOpen(false)}
            role="dialog"
            aria-modal="true"
            aria-label={`Inspeção de ${activeNotebook.name}`}
          >
            <div
              className="upscale-modal-card"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                className="upscale-close-btn"
                onClick={() => setIsUpscaleOpen(false)}
                aria-label="Fechar inspeção"
              >
                ✕
              </button>

              <div className="upscale-modal-header">
                <span className="upscale-badge">{activeNotebook.category}</span>
                <h3 className="upscale-title">{activeNotebook.name}</h3>
                <p className="upscale-quote">{activeNotebook.quote}</p>
              </div>

              <div className="upscale-image-viewport">
                <img
                  src={activeNotebook.imageSrc}
                  alt={activeNotebook.alt}
                  className="upscale-large-img"
                />
              </div>

              <div className="upscale-modal-footer">
                <div className="upscale-stickers-list">
                  <span className="stickers-heading">Recortes & Adesivos Utilizados:</span>
                  <div className="stickers-tags">
                    {activeNotebook.stickers.map((stk, i) => (
                      <span key={i} className="sticker-chip">
                        ✦ {stk}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="upscale-cta-row">
                  <Link
                    href="/journal"
                    className="upscale-action-btn"
                    onClick={() => setIsUpscaleOpen(false)}
                  >
                    Personalizar Meu Caderno Agora ↝
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }
);

NotebookDisplay.displayName = "NotebookDisplay";

export default NotebookDisplay;
