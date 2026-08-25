/**
 * richClipboardToText
 *
 * Converts clipboard HTML (from ChatGPT, Google Docs, web pages, etc.)
 * into plain text with Markdown-ish formatting markers that the existing
 * convertMarkdownForWhatsApp() + formatForWhatsAppRTL() pipeline understands.
 *
 * Security: HTML is parsed with DOMParser into an isolated document.
 * It is NEVER injected into the live DOM (no dangerouslySetInnerHTML).
 * Only safe textual structure is extracted; scripts, styles, and attributes
 * are ignored entirely.
 *
 * Conversion table:
 *   <strong> / <b>          → **text**
 *   <em> / <i>              → _text_
 *   <s> / <strike> / <del>  → ~text~
 *   <code>                  → `text`
 *   <br>                    → \n
 *   <p>                     → text + \n\n (paragraph break)
 *   <ul><li>                → - text\n
 *   <ol><li>                → 1. text\n  (auto-numbered)
 *   <h1>–<h6>               → text + \n  (heading text, no decoration)
 *   <div> / <section> etc.  → block boundary → \n
 *   Everything else         → recurse into children (text content only)
 *
 * Never converts `-` bullets into `*` bullets.
 * Never alters Urdu text, numbers, fractions, URLs, or emails.
 */

/** Returns true if the HTML string has meaningful structural tags. */
export function hasMeaningfulHtml(html: string): boolean {
  if (!html || html.trim() === "") return false;
  // Must contain at least one structural tag worth converting
  return /<(strong|b|em|i|ul|ol|li|p|h[1-6]|br|s|strike|del|code)\b/i.test(html);
}

/** Recursively walk a DOM node and emit plain text with formatting markers. */
function walk(node: Node, ctx: { olCounter: number[] }): string {
  if (node.nodeType === Node.TEXT_NODE) {
    return node.textContent ?? "";
  }
  if (node.nodeType !== Node.ELEMENT_NODE) return "";

  const el = node as Element;
  const tag = el.tagName.toLowerCase();

  // Skip scripts and styles entirely
  if (tag === "script" || tag === "style") return "";

  switch (tag) {
    case "strong":
    case "b": {
      const inner = walkChildren(el, ctx).trim();
      return inner ? `**${inner}**` : "";
    }
    case "em":
    case "i": {
      const inner = walkChildren(el, ctx).trim();
      return inner ? `_${inner}_` : "";
    }
    case "s":
    case "strike":
    case "del": {
      const inner = walkChildren(el, ctx).trim();
      return inner ? `~${inner}~` : "";
    }
    case "code": {
      const inner = walkChildren(el, ctx);
      return inner ? `\`${inner}\`` : "";
    }
    case "br":
      return "\n";
    case "hr":
      return "\n";
    case "h1":
    case "h2":
    case "h3":
    case "h4":
    case "h5":
    case "h6": {
      const inner = walkChildren(el, ctx).trim();
      return inner ? `${inner}\n` : "";
    }
    case "p": {
      const inner = walkChildren(el, ctx).trim();
      return inner ? `${inner}\n\n` : "\n";
    }
    case "li": {
      // Determined by parent — handled by ul/ol
      return walkChildren(el, ctx).trim();
    }
    case "ul": {
      // Loose list = any <li> has a direct block child (<p>, <div>, …).
      // Tight list = plain text children only. Use sep to set line spacing.
      const BLOCK_TAGS = new Set(["p", "div", "blockquote", "pre", "h1", "h2", "h3", "h4", "h5", "h6"]);
      const isLoose = Array.from(el.children).some(
        (li) => li.tagName.toLowerCase() === "li" &&
          Array.from(li.children).some((c) => BLOCK_TAGS.has(c.tagName.toLowerCase()))
      );
      const sep = isLoose ? "\n\n" : "\n";
      const items: string[] = [];
      for (const child of el.children) {
        if (child.tagName.toLowerCase() === "li") {
          const text = walk(child, ctx).trim();
          if (text) items.push(`- ${text}`);
        }
      }
      return items.length ? items.join(sep) + sep : "";
    }
    case "ol": {
      const BLOCK_TAGS = new Set(["p", "div", "blockquote", "pre", "h1", "h2", "h3", "h4", "h5", "h6"]);
      const isLoose = Array.from(el.children).some(
        (li) => li.tagName.toLowerCase() === "li" &&
          Array.from(li.children).some((c) => BLOCK_TAGS.has(c.tagName.toLowerCase()))
      );
      const sep = isLoose ? "\n\n" : "\n";
      const items: string[] = [];
      let counter = 1;
      for (const child of el.children) {
        if (child.tagName.toLowerCase() === "li") {
          const text = walk(child, ctx).trim();
          if (text) {
            items.push(`${counter}. ${text}`);
            counter++;
          }
        }
      }
      return items.length ? items.join(sep) + sep : "";
    }
    case "table":
      // Flatten table to plain text rows separated by newlines
      return walkChildren(el, ctx).trim() + "\n";
    case "tr":
      return walkChildren(el, ctx).trim() + "\n";
    case "td":
    case "th":
      return walkChildren(el, ctx).trim() + "\t";
    case "div":
    case "section":
    case "article":
    case "main":
    case "header":
    case "footer":
    case "blockquote":
    case "pre":
    case "figure": {
      const inner = walkChildren(el, ctx).trim();
      return inner ? `${inner}\n` : "";
    }
    case "a": {
      // Preserve link text; href is not useful in plain text
      return walkChildren(el, ctx);
    }
    default:
      // Inline elements and unknowns: recurse transparently
      return walkChildren(el, ctx);
  }
}

function walkChildren(el: Element, ctx: { olCounter: number[] }): string {
  let result = "";
  for (const child of el.childNodes) {
    result += walk(child, ctx);
  }
  return result;
}

/**
 * Convert HTML clipboard string to plain text with Markdown-ish markers.
 * Returns null if parsing fails or no meaningful HTML is present.
 */
export function htmlToPlainText(html: string): string | null {
  if (!hasMeaningfulHtml(html)) return null;

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");

    // Remove script and style nodes from the parsed document before walking
    doc.querySelectorAll("script, style").forEach((el) => el.remove());

    const body = doc.body;
    if (!body) return null;

    const ctx = { olCounter: [] };
    let result = walk(body, ctx);

    // Normalise: collapse 3+ consecutive newlines to 2 (preserve paragraph breaks)
    result = result.replace(/\n{3,}/g, "\n\n");

    // Trim trailing whitespace from each line, preserve intentional blank lines
    result = result
      .split("\n")
      .map((l) => l.trimEnd())
      .join("\n")
      .trim();

    return result || null;
  } catch {
    return null;
  }
}
