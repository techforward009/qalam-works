import { NextRequest } from "next/server";

let client = 0;
/** Each independent PDF fixture represents a fresh client, not a rate-limit load test. */
export class PdfExportTestRequest extends NextRequest {
  constructor(...args: ConstructorParameters<typeof NextRequest>) {
    const headers = new Headers(args[1]?.headers);
    if (!headers.has("x-forwarded-for") && !headers.has("x-real-ip")) {
      headers.set("x-forwarded-for", `2001:db8::${(++client).toString(16)}`);
    }
    super(args[0], { ...args[1], headers });
  }
}
