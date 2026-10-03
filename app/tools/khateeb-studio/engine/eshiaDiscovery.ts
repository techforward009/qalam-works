const ESHIA_BASE = "https://lib.eshia.ir";
const ESHIA_ADVANCED_SEARCH = `${ESHIA_BASE}/advanced-search`;
const PAGE_PATH = /^\/(\d+)\/(\d+)\/(\d+)(?:\/.*)?$/;

export type EShiaDiscoveryHit = {
  url: string;
  title: string;
  snippet?: string;
};

export type EShiaDiscoveryResult = {
  query: string;
  provider: "eshia-library";
  status: "ok" | "unavailable" | "no-results";
  hits: readonly EShiaDiscoveryHit[];
  diagnostic?: string;
};

function decodeHtml(value: string): string {
  return value
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function stripTags(value: string): string {
  return decodeHtml(value.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " "));
}

function attrs(tag: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const match of tag.matchAll(/([:\w-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g)) {
    out[match[1].toLowerCase()] = match[2] ?? match[3] ?? match[4] ?? "";
  }
  return out;
}

export function parseEShiaSearchForm(html: string): {
  action: string;
  method: "GET" | "POST";
  queryField: string;
  hidden: Record<string, string>;
} | null {
  const forms = [...html.matchAll(/<form\b[^>]*>[\s\S]*?<\/form>/gi)];
  for (const formMatch of forms) {
    const form = formMatch[0];
    if (!/advanced|جستجو|search/i.test(form)) continue;
    const open = form.match(/^<form\b[^>]*>/i)?.[0] ?? "";
    const formAttrs = attrs(open);
    const inputs = [...form.matchAll(/<input\b[^>]*>/gi)].map((m) => attrs(m[0]));
    const textInputs = inputs.filter((input) => {
      const type = (input.type || "text").toLowerCase();
      return type === "text" || type === "search";
    });
    const queryField = textInputs.find((input) => input.name)?.name;
    if (!queryField) continue;

    const hidden: Record<string, string> = {};
    for (const input of inputs) {
      if ((input.type || "").toLowerCase() === "hidden" && input.name) hidden[input.name] = input.value || "";
    }

    return {
      action: formAttrs.action || "/advanced-search",
      method: (formAttrs.method || "GET").toUpperCase() === "POST" ? "POST" : "GET",
      queryField,
      hidden,
    };
  }
  return null;
}

export function parseEShiaResultLinks(html: string, limit = 12): readonly EShiaDiscoveryHit[] {
  const hits: EShiaDiscoveryHit[] = [];
  const seen = new Set<string>();
  const anchors = [...html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)];

  for (const match of anchors) {
    const a = attrs(`<a ${match[1]}>`);
    if (!a.href) continue;

    let url: URL;
    try {
      url = new URL(a.href, ESHIA_BASE);
    } catch {
      continue;
    }

    const pageMatch = url.pathname.match(PAGE_PATH);
    if (url.hostname !== "lib.eshia.ir" || !pageMatch) continue;
    const canonical = `${url.origin}/${pageMatch[1]}/${pageMatch[2]}/${pageMatch[3]}`;
    if (seen.has(canonical)) continue;

    const title = stripTags(match[2]);
    if (!title) continue;

    seen.add(canonical);
    hits.push({ url: canonical, title });
    if (hits.length >= limit) break;
  }

  return hits;
}

function absoluteEShiaUrl(action: string): string {
  const url = new URL(action, ESHIA_BASE);
  if (url.hostname !== "lib.eshia.ir") throw new Error("Unexpected eShia search action host");
  return url.toString();
}

export async function discoverEShia(
  query: string,
  options: { fetchImpl?: typeof fetch; limit?: number; timeoutMs?: number } = {},
): Promise<EShiaDiscoveryResult> {
  const clean = query.trim().replace(/\s+/g, " ");
  if (clean.length < 2 || clean.length > 160) {
    return { query: clean, provider: "eshia-library", status: "no-results", hits: [], diagnostic: "invalid-query" };
  }

  const fetchImpl = options.fetchImpl ?? fetch;
  const timeoutMs = options.timeoutMs ?? 10_000;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const searchPage = await fetchImpl(ESHIA_ADVANCED_SEARCH, {
      headers: { "user-agent": "QalamWorks-KhateebStudio/1.0" },
      cache: "no-store",
      signal: controller.signal,
    });
    if (!searchPage.ok) {
      return { query: clean, provider: "eshia-library", status: "unavailable", hits: [], diagnostic: `form-http-${searchPage.status}` };
    }

    const formHtml = await searchPage.text();
    const form = parseEShiaSearchForm(formHtml);
    if (!form) {
      return { query: clean, provider: "eshia-library", status: "unavailable", hits: [], diagnostic: "search-form-not-found" };
    }

    const params = new URLSearchParams(form.hidden);
    params.set(form.queryField, clean);
    const target = absoluteEShiaUrl(form.action);

    const response = form.method === "POST"
      ? await fetchImpl(target, {
          method: "POST",
          headers: {
            "content-type": "application/x-www-form-urlencoded;charset=UTF-8",
            "user-agent": "QalamWorks-KhateebStudio/1.0",
          },
          body: params.toString(),
          cache: "no-store",
          signal: controller.signal,
        })
      : await fetchImpl(`${target}${target.includes("?") ? "&" : "?"}${params.toString()}`, {
          headers: { "user-agent": "QalamWorks-KhateebStudio/1.0" },
          cache: "no-store",
          signal: controller.signal,
        });

    if (!response.ok) {
      return { query: clean, provider: "eshia-library", status: "unavailable", hits: [], diagnostic: `search-http-${response.status}` };
    }

    const resultHtml = await response.text();
    const hits = parseEShiaResultLinks(resultHtml, options.limit ?? 12);
    console.info("[khateeb-eshia] discovery", {
      query: clean,
      action: target,
      method: form.method,
      queryField: form.queryField,
      responseUrl: response.url,
      htmlLength: resultHtml.length,
      candidateHrefs: [...resultHtml.matchAll(/<a\b[^>]*href=(?:"([^"]+)"|'([^']+)'|([^\s>]+))/gi)]
        .slice(0, 20)
        .map((match) => match[1] ?? match[2] ?? match[3] ?? ""),
      hitCount: hits.length,
    });
    return {
      query: clean,
      provider: "eshia-library",
      status: hits.length ? "ok" : "no-results",
      hits,
    };
  } catch (error) {
    const diagnostic = error instanceof Error ? error.name : "fetch-error";
    return { query: clean, provider: "eshia-library", status: "unavailable", hits: [], diagnostic };
  } finally {
    clearTimeout(timer);
  }
}
