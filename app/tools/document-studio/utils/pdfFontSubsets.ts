import nastaliq from "@fontsource/noto-nastaliq-urdu/unicode.json";
import naskh from "@fontsource/noto-naskh-arabic/unicode.json";
import amiri from "@fontsource/amiri/unicode.json";
import vazirmatn from "@fontsource/vazirmatn/unicode.json";
import inter from "@fontsource/inter/unicode.json";

const ranges: Record<string, Record<string, string>> = {
  "noto-nastaliq-urdu": nastaliq, "noto-naskh-arabic": naskh, amiri, vazirmatn, inter,
};

/** Keep each embedded subset's coverage identical to its fontsource declaration. */
export function pdfFontUnicodeRange(file: string): string | undefined {
  const match = file.match(/^@fontsource\/([^/]+)\/files\/.*-(latin-ext|latin|arabic)-\d+-normal\.woff2$/);
  return match ? ranges[match[1]]?.[match[2]] : undefined;
}
