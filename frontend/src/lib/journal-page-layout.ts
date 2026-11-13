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
 * Normalizes line endings to LF without stripping intentional leading or internal
 * whitespace or blank lines.
 */
export function normalizeJournalLineEndings(text: string): string {
  return (text || "").replace(/\r\n?/g, "\n");
}

/**
 * Returns true only when text contains at least one visible non-whitespace character
 * (ignoring spaces, tabs, line breaks, and zero-width invisible characters).
 */
export function hasMeaningfulJournalText(text?: string | null): boolean {
  if (typeof text !== "string" || text.length === 0) return false;
  return text.replace(/[\s\u200B-\u200D\uFEFF]/g, "").length > 0;
}

/**
 * Returns true when a journal page contains actual written text, a title, or attached media.
 * Pages with only empty lines or whitespace are NOT considered meaningful/filled.
 */
export function isJournalPageMeaningful(
  page?: {
    titulo?: string | null;
    conteudo?: string | null;
    polaroid_url?: string | null;
    attachments?: unknown[] | null;
    stickers?: unknown[] | null;
  } | null
): boolean {
  if (!page) return false;
  return (
    hasMeaningfulJournalText(page.titulo) ||
    hasMeaningfulJournalText(page.conteudo) ||
    Boolean(page.polaroid_url) ||
    (Array.isArray(page.attachments) && page.attachments.length > 0) ||
    (Array.isArray(page.stickers) && page.stickers.length > 0)
  );
}

/**
 * Normalizes page body content for persistent storage:
 * - Normalizes CRLF/CR to LF.
 * - Converts whitespace/newline-only content to "" so empty lines are never stored as content.
 * - Preserves intentional leading blank lines and internal paragraph spacing.
 * - Removes only trailing whitespace-only lines at the very end of the page.
 */
export function normalizeJournalContentForStorage(text?: string | null): string {
  const normalized = normalizeJournalLineEndings(text || "");
  if (!hasMeaningfulJournalText(normalized)) {
    return "";
  }
  return normalized.replace(/(?:\n[ \t]*)+$/, "");
}

/**
 * Counts characters that actually occupy horizontal text space (excluding line breaks).
 */
export function countNonNewlineChars(text: string): number {
  return normalizeJournalLineEndings(text).replace(/\n/g, "").length;
}

/**
 * Finds the string index in `text` corresponding to `limit` non-newline characters.
 */
function sliceByNonNewlineCharLimit(
  text: string,
  limit: number
): { head: string; tail: string } {
  let seen = 0;
  for (let i = 0; i < text.length; i++) {
    if (text[i] !== "\n") {
      seen++;
      if (seen > limit) {
        return {
          head: text.slice(0, i),
          tail: text.slice(i),
        };
      }
    }
  }
  return { head: text, tail: "" };
}

/**
 * Splits text using the exact explicit-line and character boundaries
 * enforced by the Journal Editor sheet capacity, ensuring empty lines and
 * whitespace-only content never trigger artificial page overflow.
 */
export function splitJournalPageOverflow(text: string): {
  currentPageText: string;
  overflowText: string;
  exceeded: boolean;
} {
  const normalized = normalizeJournalLineEndings(text);
  const lines = normalized.split("\n");

  // Pages with only whitespace / empty lines must never overflow to another page.
  if (!hasMeaningfulJournalText(normalized)) {
    const clampedBlankLines =
      lines.length > JOURNAL_MAX_LINES_PER_PAGE
        ? lines.slice(0, JOURNAL_MAX_LINES_PER_PAGE).join("\n")
        : normalized;
    return {
      currentPageText: clampedBlankLines,
      overflowText: "",
      exceeded: false,
    };
  }

  if (lines.length > JOURNAL_MAX_LINES_PER_PAGE) {
    const headLines = lines.slice(0, JOURNAL_MAX_LINES_PER_PAGE);
    const tailLines = lines.slice(JOURNAL_MAX_LINES_PER_PAGE);
    const tailText = tailLines.join("\n");

    // Trailing empty lines beyond line 23 do not constitute overflow content.
    if (!hasMeaningfulJournalText(tailText)) {
      return {
        currentPageText: headLines.join("\n"),
        overflowText: "",
        exceeded: false,
      };
    }

    // Leading empty lines alone must never fill Page 1 and push real text to Page 2.
    if (!hasMeaningfulJournalText(headLines.join("\n"))) {
      const firstMeaningfulIdx = lines.findIndex((l) =>
        hasMeaningfulJournalText(l)
      );
      const meaningfulSlice = lines.slice(firstMeaningfulIdx);
      const maxLeadingBlanks = Math.max(
        0,
        JOURNAL_MAX_LINES_PER_PAGE - meaningfulSlice.length
      );
      const keptLeadingCount = Math.min(firstMeaningfulIdx, maxLeadingBlanks);
      const shiftedLines = [
        ...Array.from({ length: keptLeadingCount }, () => ""),
        ...meaningfulSlice,
      ];

      if (shiftedLines.length <= JOURNAL_MAX_LINES_PER_PAGE) {
        return {
          currentPageText: shiftedLines.join("\n"),
          overflowText: "",
          exceeded: false,
        };
      }

      const shiftedHead = shiftedLines.slice(0, JOURNAL_MAX_LINES_PER_PAGE);
      const shiftedTail = shiftedLines.slice(JOURNAL_MAX_LINES_PER_PAGE);
      return {
        currentPageText: shiftedHead.join("\n"),
        overflowText: shiftedTail.join("\n"),
        exceeded: hasMeaningfulJournalText(shiftedTail.join("\n")),
      };
    }

    return {
      currentPageText: headLines.join("\n"),
      overflowText: tailText,
      exceeded: true,
    };
  }

  if (countNonNewlineChars(normalized) > JOURNAL_MAX_CHARS_PER_PAGE) {
    const { head, tail } = sliceByNonNewlineCharLimit(
      normalized,
      JOURNAL_MAX_CHARS_PER_PAGE
    );
    if (!hasMeaningfulJournalText(tail)) {
      return {
        currentPageText: head,
        overflowText: "",
        exceeded: false,
      };
    }
    return {
      currentPageText: head,
      overflowText: tail,
      exceeded: true,
    };
  }

  return {
    currentPageText: normalized,
    overflowText: "",
    exceeded: false,
  };
}

/**
 * Splits a potentially multi-page string into an array of page-sized strings,
 * preserving intentional formatting while never generating empty overflow pages.
 */
export function splitJournalPagesRecursive(text: string): string[] {
  const pages: string[] = [];
  let remaining = normalizeJournalLineEndings(text);

  for (let guard = 0; guard < 100; guard++) {
    const { currentPageText, overflowText, exceeded } =
      splitJournalPageOverflow(remaining);
    pages.push(currentPageText);
    if (!exceeded || !hasMeaningfulJournalText(overflowText)) {
      break;
    }
    remaining = overflowText;
  }

  return pages.length > 0 ? pages : [""];
}

/**
 * Extracts optional attached photograph/polaroid markdown from a saved page
 * without altering the remaining plain-text layout or intentional leading spacing.
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
  let cleanContent = normalizeJournalLineEndings(conteudo || "");

  const markdownImgMatch = cleanContent.match(/!\[(.*?)\]\((.*?)\)/);
  if (markdownImgMatch) {
    if (!imageUrl) {
      imageUrl = markdownImgMatch[2];
      imageCaption = markdownImgMatch[1] || null;
    }
    cleanContent = cleanContent
      .replace(/!\[(.*?)\]\((.*?)\)/g, "")
      .replace(/^\n+/, "");
  }

  return {
    imageUrl,
    imageCaption,
    cleanContent,
  };
}
