const ESHIA_HOST = "lib.eshia.ir";
const PAGE_PATH = /^\/(\d+)\/(\d+)\/(\d+)$/;
const MAX_HTML_BYTES = 2_000_000;

export type EShiaPageRecord = {
  url: string;
  bookId: string;
  volume: string;
  page: string;
  bookTitle: string;
  author: string;
  text: string;
  citationUr: string;
};

function decode(value: string): string {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, "\"")
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&zwnj;/gi, "\u200C")
    .replace(/&zwj;/gi, "\u200D")
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(Number.parseInt(n, 16)))
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/\s+/g, " ")
    .trim();
}

function plain(value: string): string {
  return decode(
    value
      .replace(/<script\b[\s\S]*?<\/script>/gi, " ")
      .replace(/<style\b[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " "),
  );
}

function titleParts(html: string): { bookTitle: string; author: string } {
  const rawTitle = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "";
  const title = plain(rawTitle);
  const [bookPart = "", authorPart = ""] = title.split("|").map((item) => item.trim());
  const bookTitle = bookPart
    .replace(/[،,]?\s*[ججلد]+\s*\d+\s*[،,]\s*[صصفحه]+\s*\d+.*/u, "")
    .trim();
  return { bookTitle, author: authorPart };
}

function htmlBlocks(html: string): string[] {
  const cleaned = html
    .replace(/<script\b[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[\s\S]*?<\/style>/gi, " ");
  return cleaned
    .split(/<\/(?:div|p|td|li|section|article|blockquote)>|<br\s*\/?\s*>/gi)
    .map(plain)
    .filter(Boolean);
}

function normalized(value: string): string {
  return value
    .normalize("NFKC")
    .replace(/[\u064B-\u065F\u0670]/gu, "")
    .replace(/[أإآ]/gu, "ا")
    .replace(/ى/gu, "ی")
    .replace(/ي/gu, "ی")
    .replace(/ك/gu, "ک")
    .toLowerCase();
}

function meaningfulTokens(query: string): string[] {
  return Array.from(
    new Set(
      normalized(query)
        .split(/\s+/)
        .map((item) => item.trim())
        .filter((item) => item.length >= 3),
    ),
  );
}

function contentScore(block: string, query: string): number {
  if (block.length < 80) return -1000;
  if (/کتابخانه|جستجوی پیشرفته|صفحه.?اول|صفحه.?بعدی|اشتراک.?گذاری|هوش مصنوعی/u.test(block)) return -500;
  const letters = (block.match(/[\u0600-\u06FF]/g) ?? []).length;
  const tokens = meaningfulTokens(query);
  const hay = normalized(block);
  const matches = tokens.filter((token) => hay.includes(token)).length;
  return Math.min(block.length, 5000) + letters * 2 + matches * 1500;
}

export function parseEShiaPage(html: string, pageUrl: string, query = ""): EShiaPageRecord | null {
  let url: URL;
  try {
    url = new URL(pageUrl);
  } catch {
    return null;
  }
  if (url.hostname !== ESHIA_HOST) return null;
  const path = url.pathname.match(PAGE_PATH);
  if (!path) return null;

  const [, bookId, volume, page] = path;
  const fromTitle = titleParts(html);
  const allText = plain(html);

  const bookLabel = allText.match(/نام کتاب\s*[:：]\s*([^]+?)\s+جلد\s*[:：]/u)?.[1]?.trim();
  const authorLabel = allText.match(/نویسنده\s*[:：]\s*([^]+?)(?:جستجوی سریع|ترجمه|خلاصه|اعراب|$)/u)?.[1]?.trim();

  const blocks = htmlBlocks(html)
    .map((text) => ({ text, score: contentScore(text, query) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score);

  const text = blocks[0]?.text ?? "";
  if (!text) return null;

  const bookTitle = bookLabel || fromTitle.bookTitle || `eShia book ${bookId}`;
  const author = authorLabel || fromTitle.author;
  return {
    url: `${url.origin}${url.pathname}`,
    bookId,
    volume,
    page,
    bookTitle,
    author,
    text,
    citationUr: `${bookTitle}، ج${volume}، ص${page}${author ? `، ${author}` : ""}۔`,
  };
}

export async function fetchEShiaPage(
  pageUrl: string,
  query: string,
  options: { fetchImpl?: typeof fetch; timeoutMs?: number } = {},
): Promise<EShiaPageRecord | null> {
  let url: URL;
  try {
    url = new URL(pageUrl);
  } catch {
    return null;
  }
  if (url.hostname !== ESHIA_HOST || !PAGE_PATH.test(url.pathname)) return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? 10_000);
  try {
    const response = await (options.fetchImpl ?? fetch)(url.toString(), {
      headers: { "user-agent": "QalamWorks-KhateebStudio/1.0" },
      cache: "no-store",
      signal: controller.signal,
    });
    if (!response.ok) return null;

    let finalUrl: URL;
    try {
      finalUrl = new URL(response.url || url.toString());
    } catch {
      return null;
    }
    if (finalUrl.hostname !== ESHIA_HOST || !PAGE_PATH.test(finalUrl.pathname)) {
      return null;
    }

    const contentType = response.headers.get("content-type") ?? "";
    if (!/^(?:text\/html|application\/xhtml\+xml)(?:;|$)/i.test(contentType.trim())) {
      return null;
    }

    const declaredLength = Number(response.headers.get("content-length") ?? "0");
    if (Number.isFinite(declaredLength) && declaredLength > MAX_HTML_BYTES) {
      return null;
    }

    const html = await response.text();
    if (new TextEncoder().encode(html).byteLength > MAX_HTML_BYTES) {
      return null;
    }

    return parseEShiaPage(html, finalUrl.toString(), query);
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
