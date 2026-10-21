// @vitest-environment happy-dom
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import BookLibraryPanel from "../app/tools/khateeb-studio/BookLibraryPanel";

vi.mock("../app/tools/khateeb-studio/BookTopicGuide", () => ({ default: () => null }));
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

for (const locale of ["ur", "en"] as const) {
  it(`public ${locale} library keeps reading/search but has no legacy admin upload or research lock`, async () => {
    const catalog = { ready: true, sources: [], recordCount: 4978 };
    const fetchMock = vi.fn(async (url: string) => {
      if (String(url).includes("op=search")) return new Response(JSON.stringify({
        hits: [], total: 0, page: 1, pageSize: 20
      }), { status: 200 });
      return new Response(JSON.stringify(catalog), { status: 200 });
    });
    vi.stubGlobal("fetch", fetchMock);
    const { container } = render(<BookLibraryPanel locale={locale} />);
    const button = await screen.findByRole("button", { name: locale === "ur" ? "کتاب میں تلاش کریں" : "Search books" });
    expect(container.querySelector('[data-testid="book-library"]')).toBeTruthy();
    expect(container.querySelector('input[type="file"]')).toBeNull();
    expect(screen.queryByText("کتابی ذخیرے کا انتظام — مالک کے لیے")).toBeNull();
    expect(screen.queryByText("Book library management — owner only")).toBeNull();
    expect(screen.queryByText("ریسرچ اسٹوڈیو مقفل ہے۔ رسائی ترتیب نہیں دی گئی۔")).toBeNull();
    fireEvent.click(button);
    await waitFor(() => expect(fetchMock.mock.calls.some(([url]) => String(url).includes("op=search"))).toBe(true));
    expect(fetchMock.mock.calls.every(([url]) => !String(url).includes("/api/research/auth"))).toBe(true);
    expect(screen.getByText(locale === "ur" ? "0 نتائج" : "0 results")).toBeTruthy();
  });
}
