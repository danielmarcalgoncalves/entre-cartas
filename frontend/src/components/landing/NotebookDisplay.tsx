import React, { forwardRef } from "react";

export interface NotebookDisplayProps {
  id?: string;
  className?: string;
  meadowPhotoUrl?: string;
  flowerPhotoUrl?: string;
  leftDateStamp?: string;
  leftPageNumber?: string;
  rightPageNumber?: string;
  openingNote?: string;
  marginNote?: React.ReactNode;
  memoryCopy?: React.ReactNode;
  quoteQuestion?: string;
  quoteAnswer?: string;
  tornNoteLines?: string[];
  waxSealMonogram?: string;
  customComposition?: React.ReactNode;
}

const DEFAULT_MEADOW = "/images/landing/meadow.jpg";
const DEFAULT_FLOWER = "/images/landing/flower.jpg";

function BotanicalSprig() {
  return (
    <svg
      className="botanical-sprig"
      viewBox="0 0 120 210"
      aria-hidden="true"
      fill="none"
    >
      <path d="M57 205C58 158 72 103 52 20" />
      <path d="M58 173C35 159 24 142 21 120C43 124 57 140 58 173Z" />
      <path d="M62 148C79 134 90 116 90 94C69 102 60 120 62 148Z" />
      <path d="M57 116C38 104 27 87 27 68C46 73 58 91 57 116Z" />
      <path d="M57 86C71 74 77 58 76 41C59 49 53 65 57 86Z" />
      <path d="M52 39C43 31 43 18 51 8C61 16 62 29 52 39Z" />
      <path d="M48 47C35 43 28 34 28 22C41 22 50 32 48 47Z" />
    </svg>
  );
}

function Star({ className = "" }: { className?: string }) {
  return (
    <span className={`ink-star ${className}`} aria-hidden="true">
      ✦
    </span>
  );
}

export const NotebookDisplay = forwardRef<HTMLDivElement, NotebookDisplayProps>(
  (
    {
      id = "journal",
      className = "",
      meadowPhotoUrl = DEFAULT_MEADOW,
      flowerPhotoUrl = DEFAULT_FLOWER,
      leftDateStamp = "JUNE 18 · SOMEWHERE QUIET",
      leftPageNumber = "04",
      rightPageNumber = "05",
      openingNote = "I want to remember how the light found us here—",
      marginNote = (
        <>
          keep this feeling
          <br />
          somewhere safe.
        </>
      ),
      memoryCopy = (
        <>
          We stayed until the sky turned honey,
          <br />
          talking about all the lives we might live.
        </>
      ),
      quoteQuestion = "“There are years that ask questions",
      quoteAnswer = "and years that answer.”",
      tornNoteLines = ["collect moments,", "not perfect sentences."],
      waxSealMonogram = "BL",
      customComposition,
    },
    ref
  ) => {
    return (
      <div
        ref={ref}
        className={`journal-object ${className}`}
        id={id}
        aria-label="An open memory journal"
      >
        <div className="journal-shadow" />
        <div className="leather-cover" />
        <div className="page-stack page-stack-left" />
        <div className="page-stack page-stack-right" />

        {customComposition ? (
          customComposition
        ) : (
          <div className="spread">
            {/* LEFT PAGE: Ephemera, polaroid, typed fragment, pressed flower */}
            <article className="page left-page" aria-label="Left journal page">
              <div className="paper-grain" />
              <span className="page-number">{leftPageNumber}</span>
              <div className="date-stamp">{leftDateStamp}</div>

              <p className="handwriting opening-note">{openingNote}</p>

              <figure className="polaroid meadow-polaroid">
                <span className="tape tape-olive" />
                <img
                  src={meadowPhotoUrl}
                  alt="Soft white flowers in a summer meadow"
                  loading="eager"
                />
                <figcaption>the long way home</figcaption>
              </figure>

              <div className="postmark" aria-hidden="true">
                <span>WILD &amp; FREE</span>
                <i />
                <small>18 · VI · 24</small>
              </div>

              <div className="typed-fragment">
                <span>{quoteQuestion}</span>
                <span>{quoteAnswer}</span>
              </div>

              <p className="handwriting margin-note">{marginNote}</p>

              <div className="pressed-flower" aria-hidden="true">
                <i className="stem" />
                <i className="leaf leaf-one" />
                <i className="leaf leaf-two" />
                <i className="petal petal-one" />
                <i className="petal petal-two" />
                <i className="petal petal-three" />
                <i className="petal petal-four" />
              </div>

              <Star className="star-left-one" />
              <Star className="star-left-two" />
              <span className="scribble-loop" aria-hidden="true" />
            </article>

            {/* RIGHT PAGE: Envelope, analog flower polaroid, torn note, wax seal, botanical sprig */}
            <article className="page right-page" aria-label="Right journal page">
              <div className="paper-grain" />
              <span className="page-number">{rightPageNumber}</span>

              <div className="envelope">
                <span className="envelope-flap" />
                <span className="tiny-address">
                  for the days
                  <br />
                  we keep forever
                </span>
                <span className="postage-stamp">
                  <b>12</b>
                  <i>✦</i>
                </span>
              </div>

              <figure className="polaroid flower-polaroid">
                <span className="tape tape-rust" />
                <img
                  src={flowerPhotoUrl}
                  alt="Wildflowers photographed on analog film"
                  loading="eager"
                />
                <figcaption>golden hour, again</figcaption>
              </figure>

              <p className="handwriting memory-copy">{memoryCopy}</p>

              <div className="torn-note">
                {tornNoteLines.map((line, idx) => (
                  <p key={idx}>{line}</p>
                ))}
                <span className="wax-seal">{waxSealMonogram}</span>
              </div>

              <BotanicalSprig />
              <div className="ink-lines" aria-hidden="true">
                <span />
                <span />
                <span />
              </div>
              <Star className="star-right-one" />
              <Star className="star-right-two" />
              <span className="moon-doodle" aria-hidden="true">
                ☾
              </span>
            </article>

            {/* Book spine binding shadow and highlight */}
            <div className="binding" />
          </div>
        )}
      </div>
    );
  }
);

NotebookDisplay.displayName = "NotebookDisplay";

export default NotebookDisplay;
