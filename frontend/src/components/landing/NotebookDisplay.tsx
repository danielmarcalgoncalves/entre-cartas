"use client";

import React, {
  forwardRef,
  useState,
  useEffect,
  useRef,
  useCallback,
} from "react";
import { useRouter } from "next/navigation";

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
    name: "Memories & Affection",
    category: "PERSONAL JOURNAL",
    tagline: "A new way to live life · Intimate memories",
    imageSrc: "/images/nova-ui/caderno-1-cutout.png",
    alt: "Customized journal with vintage photos and handwritten notes",
    description:
      "Handmade journaling with nostalgic cutouts, personal notes, and reflective prose.",
    stickers: [
      "Vintage Cutout",
      "Favorite Person Stamp",
      "Starlit Notes",
      "Graphite Sketch",
    ],
    quote: "“We write to prove life twice, in the moment and in hindsight.”",
  },
  {
    id: "caderno-snoopy",
    name: "Cinema & Ephemera",
    category: "POP COLLAGE & FILM",
    tagline: "This is soo good (: · Cinema memories",
    imageSrc: "/images/nova-ui/caderno-2-cutout.png",
    alt: "Journal with film scenes and handwritten calligraphy",
    description:
      "Playful journaling inspired by classic cinema, whimsical art, and spontaneous quotes.",
    stickers: [
      "Golden Crown Sketch",
      "Film Still Polaroid",
      "Baroque Cherub",
      "Sleeping Cat",
    ],
    quote: "“Beauty is everywhere, hidden in the smallest details.”",
  },
  {
    id: "caderno-surrealismo",
    name: "Surrealism & Stage",
    category: "DRAMATIC & CONCEPTUAL",
    tagline: "Literature is the most pleasant way to ignore life",
    imageSrc: "/images/nova-ui/caderno-3-cutout.png",
    alt: "Journal with conceptual art and velvet drape collages",
    description:
      "Dramatic collage aesthetics featuring surrealist compositions and literary aphorisms.",
    stickers: [
      "Surreal Portrait",
      "Crimson Velvet Drapes",
      "Celestial Harlequin",
      "Literary Aphorism",
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
    const router = useRouter();
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isHovered, setIsHovered] = useState(false);
    const frameRef = useRef<HTMLDivElement>(null);
    const rafRef = useRef<number | null>(null);
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
      if (isHovered) return;

      timerRef.current = setInterval(() => {
        advanceNext();
      }, 5000);

      return () => {
        if (timerRef.current) clearInterval(timerRef.current);
      };
    }, [isHovered, advanceNext]);

    // Interactive 3D tilt tracking cursor via rAF without React state re-renders
    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;

      const rotX = ((y - centerY) / centerY) * -2.5;
      const rotY = ((x - centerX) / centerX) * 2.5;

      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        if (frameRef.current) {
          frameRef.current.style.transform = `perspective(1100px) rotateX(${rotX.toFixed(
            2
          )}deg) rotateY(${rotY.toFixed(2)}deg)`;
        }
      });
    };

    const handleMouseLeave = () => {
      setIsHovered(false);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (frameRef.current) {
        frameRef.current.style.transform =
          "perspective(1100px) rotateX(0deg) rotateY(0deg)";
      }
    };

    const handleOpenNotebookExperience = () => {
      if (onSelectNotebook) {
        onSelectNotebook(activeNotebook);
      }
      router.push("/explore");
    };

    return (
      <div
        ref={ref}
        id={id}
        className={`notebook-showcase-container ${className}`}
        aria-label="Interactive customized journal showcase"
      >
        {/* Notebook Presentation Area */}
        <div
          className="notebook-stage-wrap"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={handleMouseLeave}
          onMouseMove={handleMouseMove}
        >
          {/* Subtle Ambient Floor Shadow */}
          <div className="notebook-ambient-shadow" aria-hidden="true" />

          {/* Tilt Container */}
          <div ref={frameRef} className="notebook-floating-frame">
            {/* The 3 Customized Notebooks with smooth transition */}
            <div className="notebook-cards-stack">
              {NOTEBOOK_SHOWCASE.map((item, index) => {
                const isActive = index === currentIndex;
                return (
                  <div
                    key={item.id}
                    className={`notebook-slide ${
                      isActive
                        ? "notebook-slide--active"
                        : "notebook-slide--inactive"
                    }`}
                    aria-hidden={!isActive}
                  >
                    <img
                      src={item.imageSrc}
                      alt={item.alt}
                      className="notebook-cutout-img"
                      draggable={false}
                      loading="eager"
                      role="link"
                      tabIndex={isActive ? 0 : -1}
                      onClick={handleOpenNotebookExperience}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          handleOpenNotebookExperience();
                        }
                      }}
                      title="Explore My Journal & My Letters preview experience"
                    />
                  </div>
                );
              })}
            </div>

            {/* Quick Explore Badge overlay on hover */}
            <button
              type="button"
              className="notebook-inspect-btn"
              onClick={handleOpenNotebookExperience}
              aria-label="Explore My Journal and My Letters experience"
            >
              <span>Explore Journal &amp; Letters →</span>
            </button>
          </div>

          {/* Lateral Previous/Next tactile paper buttons */}
          <button
            type="button"
            className="notebook-nav-arrow arrow-left"
            onClick={advancePrev}
            aria-label="Previous notebook"
            title="View previous notebook"
          >
            ‹
          </button>
          <button
            type="button"
            className="notebook-nav-arrow arrow-right"
            onClick={advanceNext}
            aria-label="Next notebook"
            title="View next notebook"
          >
            ›
          </button>
        </div>

        {/* Subtle dot indicators for active notebook slide */}
        <div className="notebook-controls-dock" aria-label="Slide indicators">
          <div className="notebook-dots-row" role="tablist">
            {NOTEBOOK_SHOWCASE.map((item, idx) => {
              const isActive = idx === currentIndex;
              return (
                <button
                  key={item.id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  aria-label={`Slide ${idx + 1}`}
                  className={`notebook-dot-pill ${
                    isActive ? "notebook-dot-pill--active" : ""
                  }`}
                  onClick={() => {
                    setCurrentIndex(idx);
                    if (onSelectNotebook) onSelectNotebook(item);
                  }}
                />
              );
            })}
          </div>
        </div>
      </div>
    );
  }
);

NotebookDisplay.displayName = "NotebookDisplay";

export default NotebookDisplay;
