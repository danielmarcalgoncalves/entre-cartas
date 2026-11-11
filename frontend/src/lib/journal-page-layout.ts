/**
 * Single canonical source of truth for Journal Sheet dimensions, typography,
 * padding, ruled spacing, and page capacity across both:
 *  1. JournalEditor (src/components/JournalEditor.tsx)
 *  2. Cinematic 3D Notebook Viewer (src/components/notebook-experience/*)
 *
 * The Journal Editor defines the physical sheet layout; the 3D viewer renders
 * this exact canonical sheet and scales it proportionally across viewports.
 */

export const JOURNAL_PAGE_LAYOUT = {
  width: 580,
  height: 820,
  borderWidth: 1,
  paddingTop: 38,
  paddingRight: 44,
  paddingBottom: 30,
  paddingLeft: 48,
  headerHeight: 28,
  titleHeight: 28,
  bodyHeight: 644, // Exactly 23 ruled lines * 28px line-height
  footerHeight: 38,
  fontSize: 19,
  lineHeight: 28,
  titleFontSize: 17,
  dateFontSize: 14,
  maxLinesPerPage: 23,
  maxCharsPerPage: 1200,
} as const;

export const JOURNAL_PAGE_WIDTH: number = JOURNAL_PAGE_LAYOUT.width;
export const JOURNAL_PAGE_HEIGHT: number = JOURNAL_PAGE_LAYOUT.height;
export const JOURNAL_MAX_LINES_PER_PAGE: number = JOURNAL_PAGE_LAYOUT.maxLinesPerPage;
export const JOURNAL_MAX_CHARS_PER_PAGE: number = JOURNAL_PAGE_LAYOUT.maxCharsPerPage;

/**
 * Splits text using the exact explicit-line and character boundaries
 * enforced by the Journal Editor sheet capacity.
 */
export function splitJournalPageOverflow(text: string): {
  currentPageText: string;
  overflowText: string;
  exceeded: boolean;
} {
  const lines = text.split("\n");
  if (lines.length > JOURNAL_MAX_LINES_PER_PAGE) {
    return {
      currentPageText: lines.slice(0, JOURNAL_MAX_LINES_PER_PAGE).join("\n"),
      overflowText: lines.slice(JOURNAL_MAX_LINES_PER_PAGE).join("\n"),
      exceeded: true,
    };
  }
  if (text.length > JOURNAL_MAX_CHARS_PER_PAGE) {
    return {
      currentPageText: text.slice(0, JOURNAL_MAX_CHARS_PER_PAGE),
      overflowText: text.slice(JOURNAL_MAX_CHARS_PER_PAGE),
      exceeded: true,
    };
  }
  return {
    currentPageText: text,
    overflowText: "",
    exceeded: false,
  };
}

/**
 * Extracts optional attached photograph/polaroid markdown from a saved page
 * without altering the remaining plain-text layout.
 */
export function extractJournalPageMedia(
  conteudo: string,
  polaroidUrl?: string | null,
  polaroidCaption?: string | null
): {
  imageUrl: string | null;
  imageCaption: string | null;
  cleanContent: string;
} {
  let imageUrl: string | null = polaroidUrl || null;
  let imageCaption: string | null = polaroidCaption || null;
  let cleanContent = conteudo || "";

  const markdownImgMatch = cleanContent.match(/!\[(.*?)\]\((.*?)\)/);
  if (markdownImgMatch) {
    if (!imageUrl) {
      imageUrl = markdownImgMatch[2];
      imageCaption = markdownImgMatch[1] || null;
    }
    cleanContent = cleanContent.replace(/!\[(.*?)\]\((.*?)\)/g, "").trim();
  }

  return {
    imageUrl,
    imageCaption,
    cleanContent,
  };
}
