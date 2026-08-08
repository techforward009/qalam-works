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
    "/api/export-pdf/route": ["./node_modules/@sparticuz/chromium/bin/**/*"],
  },
};

export default nextConfig;
