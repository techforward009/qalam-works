import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Deployment fix (2026-08-08): @sparticuz/chromium ships its Chromium
  // binary as data files (bin/*.br) that it reads at runtime via fs, not
  // via a static `require()`/`import`. Next.js's bundler and its separate
  // "Output File Tracing" step (which decides which files actually get
  // copied into the deployed serverless function) don't discover files
  // accessed that way through static analysis — resulting in exactly the
  // reported runtime error: the bin/ directory is simply missing from the
  // deployed function, even though it's present in node_modules at build
  // time and works fine locally.
  //
  // Two separate settings fix two separate problems:
  // 1. serverExternalPackages tells Next.js's bundler to leave these
  //    packages alone entirely (plain require() at runtime, not bundled
  //    into a single trace-mangled chunk) — needed because bundling a
  //    package that does its own dynamic, path-relative file lookups can
  //    silently break those lookups.
  // 2. outputFileTracingIncludes forces the specific binary files back
  //    in — Next.js's automatic file tracer only follows static
  //    import/require graphs, and @sparticuz/chromium's bin/ files are
  //    read via runtime fs calls the tracer can't see on its own.
  serverExternalPackages: ["@sparticuz/chromium", "puppeteer-core"],
  outputFileTracingIncludes: {
    "/api/export-pdf/route": [
      // Chromium binary — see comment above
      "./node_modules/@sparticuz/chromium/bin/**/*",
      // @fontsource WOFF2 files read at runtime by fontRegistry.ts via fs.
      // Next.js's static tracer cannot follow runtime fs lookups, so every
      // font file referenced in fontRegistry.ts is listed explicitly here.
      // Noto Nastaliq Urdu
      "./node_modules/@fontsource/noto-nastaliq-urdu/files/noto-nastaliq-urdu-arabic-400-normal.woff2",
      "./node_modules/@fontsource/noto-nastaliq-urdu/files/noto-nastaliq-urdu-latin-400-normal.woff2",
      "./node_modules/@fontsource/noto-nastaliq-urdu/files/noto-nastaliq-urdu-arabic-700-normal.woff2",
      "./node_modules/@fontsource/noto-nastaliq-urdu/files/noto-nastaliq-urdu-latin-700-normal.woff2",
      // Amiri
      "./node_modules/@fontsource/amiri/files/amiri-arabic-400-normal.woff2",
      "./node_modules/@fontsource/amiri/files/amiri-latin-400-normal.woff2",
      "./node_modules/@fontsource/amiri/files/amiri-latin-ext-400-normal.woff2",
      "./node_modules/@fontsource/amiri/files/amiri-arabic-700-normal.woff2",
      "./node_modules/@fontsource/amiri/files/amiri-latin-700-normal.woff2",
      "./node_modules/@fontsource/amiri/files/amiri-latin-ext-700-normal.woff2",
      // Noto Naskh Arabic
      "./node_modules/@fontsource/noto-naskh-arabic/files/noto-naskh-arabic-arabic-400-normal.woff2",
      "./node_modules/@fontsource/noto-naskh-arabic/files/noto-naskh-arabic-latin-400-normal.woff2",
      "./node_modules/@fontsource/noto-naskh-arabic/files/noto-naskh-arabic-latin-ext-400-normal.woff2",
      "./node_modules/@fontsource/noto-naskh-arabic/files/noto-naskh-arabic-arabic-700-normal.woff2",
      // Vazirmatn
      "./node_modules/@fontsource/vazirmatn/files/vazirmatn-arabic-400-normal.woff2",
      "./node_modules/@fontsource/vazirmatn/files/vazirmatn-latin-400-normal.woff2",
      "./node_modules/@fontsource/vazirmatn/files/vazirmatn-latin-ext-400-normal.woff2",
      "./node_modules/@fontsource/vazirmatn/files/vazirmatn-arabic-700-normal.woff2",
      "./node_modules/@fontsource/vazirmatn/files/vazirmatn-latin-700-normal.woff2",
      "./node_modules/@fontsource/vazirmatn/files/vazirmatn-latin-ext-700-normal.woff2",
      // Inter
      "./node_modules/@fontsource/inter/files/inter-latin-400-normal.woff2",
      "./node_modules/@fontsource/inter/files/inter-latin-ext-400-normal.woff2",
      "./node_modules/@fontsource/inter/files/inter-latin-700-normal.woff2",
      "./node_modules/@fontsource/inter/files/inter-latin-ext-700-normal.woff2",
      // Server-only licensed fonts (assets/fonts/ — NOT under public/).
      // This directory is empty until a licensed font asset is supplied and
      // enabled in fontRegistry.ts. The glob is added now so the trace
      // machinery is in place; an empty match is harmless.
      "./assets/fonts/*.woff2",
    ],
  },
};

export default nextConfig;
