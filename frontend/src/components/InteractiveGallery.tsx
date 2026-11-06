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
    plateNumber: "PRANCHA 01",
    category: "PERSONALIZAÇÃO AFETIVA",
    title: "Caderno de Memórias & Recordações de Infância",
    subtitle: "Fotografias rasgadas, carimbos 'Favorite Person', figura celeste e versos sobre viver como rei.",
    quote: "Escrever é viver duas vezes: no instante em que o sangue corre e na releitura da saudade.",
    imageSrc: "/images/nova-ui/caderno-1-cutout.png",
    imageAlt: "Caderno aberto com foto infantil rasgada e adesivos poéticos",
    aspect: "wide",
    href: "/journal",
    linkText: "Abrir Escrivaninha ↗",
    tags: ["Foto Rasgada", "Favorite Person", "Astro Andarilho", "Nuvem Grafite"],
  },
  {
    id: "plate-notebook-2",
    plateNumber: "PRANCHA 02",
    category: "COLAGEM POP & CINEMA",
    title: "Caderno Snoopy Coroado & Before Sunrise",
    subtitle: "Snoopy coroado à mão em ocre, Julie Delpy & Ethan Hawke e anjo querubim barroco.",
    quote: "A beleza está escondida nos menores detalhes. Às vezes o mais precioso não é extraordinário.",
    imageSrc: "/images/nova-ui/caderno-2-cutout.png",
    imageAlt: "Caderno aberto com Snoopy coroado, cena de filme e anjo querubim",
    aspect: "wide",
    href: "/journal",
    linkText: "Experimentar este Estilo ↗",
    tags: ["Snoopy Coroado", "Before Sunrise", "Querubim", "Gato Dormindo"],
  },
  {
    id: "plate-notebook-3",
    plateNumber: "PRANCHA 03",
    category: "DRAMATURGIA & CONCEITUAL",
    title: "Caderno Surrealismo, Veludo & Palco",
    subtitle: "Busto bipartido com pensamentos de cem dólares, cortinas de ópera e arlequim de cetro estelar.",
    quote: "A literatura é a maneira mais agradável de ignorar a vida.",
    imageSrc: "/images/nova-ui/caderno-3-cutout.png",
    imageAlt: "Caderno aberto com colagem surrealista e cortinas barrocas",
    aspect: "wide",
    href: "/journal",
    linkText: "Criar Colagem Teatral ↗",
    tags: ["Busto Surrealista", "Cortinas Barrocas", "Arlequim", "Fernando Pessoa"],
  },
  {
    id: "plate-manuscript",
    plateNumber: "PRANCHA 04",
    category: "GRÃO CALIGRÁFICO",
    title: "Manuscrito de Época & Tintas Ferrogálicas",
    subtitle: "Fibras de pergaminho que retêm a pressão e a cadência da escrita humana secular.",
    quote: "A tinta no papel texturizado captura o ritmo silencioso da respiração por trás das palavras.",
    imageSrc: "/images/manuscrito-pixabay.jpg",
    imageAlt: "Manuscrito histórico caligrafado em pergaminho de época",
    aspect: "tall",
    href: "/discover",
    linkText: "Explorar Cartas Históricas ↗",
    tags: ["Pergaminho 1820", "Pena & Nanquim", "Arquivo Histórico"],
  },
  {
    id: "plate-folders",
    plateNumber: "PRANCHA 05",
    category: "ARQUIVO FÍSICO",
    title: "Pastas Epistolares Tridimensionais",
    subtitle: "Marrom Rústico, Musgo Botânico e Vinho Nobre com fechos e selo em ouro.",
    quote: "Cartas guardadas por sentimento, protegidas do olhar apressado do mundo.",
    imageSrc: "/images/pastas/pasta-marrom.svg",
    imageAlt: "Pasta de correspondência em couro marrom gravada a ouro",
    aspect: "standard",
    href: "/collections",
    linkText: "Ver Pastas 3D ↗",
    tags: ["Couro Sintético 3D", "Selo de Lacre", "3 a 10 Pastas"],
  },
  {
    id: "plate-discard",
    plateNumber: "PRANCHA 06",
    category: "RECEPTÁCULO POSTAL",
    title: "Lixeira Postal de Ferro Fundido",
    subtitle: "Receptáculo postal com 3 estados físicos de acúmulo e restauração integral.",
    quote: "Mesmo as ideias descartadas repousam em um santuário até que decida restaurá-las.",
    imageSrc: "/images/lixeira/foto-nova-1.png",
    imageAlt: "Lixeira postal em metal antigo e detalhes artesanais",
    aspect: "standard",
    href: "/journal",
    linkText: "Visitar Escrivaninha ↗",
    tags: ["3 Níveis de Volume", "Soft Delete", "Recuperação Imediata"],
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
          <span>PRANCHAS ARQUIVÍSTICAS · EPHEMERA TÁTIL</span>
          <span className="gallery-star" aria-hidden="true">✳</span>
        </div>
        <h2 className="gallery-section-title">
          A Anatomia Visual do Seu Caderno
        </h2>
        <p className="gallery-section-subtitle">
          Cada página no Between Letters reflete a sua identidade: adesivos recortados, polaroids com fita washi,
          ilustrações feitas à mão e cadernos encadernados que respiram em sua escrivaninha.
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
                <span>🔍 Upscale</span>
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
