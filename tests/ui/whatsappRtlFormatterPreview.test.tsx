/**
 * WhatsApp RTL Formatter — preview rendering (not clipboard/export)
 * @vitest-environment happy-dom
 */
/// <reference types="vitest/globals" />
import React from "react";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import WhatsAppRtlFormatter from "../../app/tools/whatsapp-rtl-formatter/components/WhatsAppRtlFormatter";
import { formatForWhatsAppRTL } from "../../app/utils/whatsappRtlFormatter";

vi.mock("../../app/lib/analytics", () => ({
  trackEvent: vi.fn(),
  trackToolOpenOnce: vi.fn(),
}));

afterEach(() => {
  cleanup();
  localStorage.clear();
});

function formatPreview(text: string) {
  render(<WhatsAppRtlFormatter language="en" />);
  fireEvent.change(screen.getByLabelText(/Paste Text/i), { target: { value: text } });
  fireEvent.click(screen.getByRole("button", { name: /Format for WhatsApp/i }));
  return document.getElementById("waf-output") as HTMLElement;
}

describe("WhatsApp RTL preview rendering", () => {
  it("does not render formatted output in a dir=auto textarea", () => {
    const el = formatPreview("1) Lachesis —\nمناسبت: بائیں طرف");
    expect(el.tagName).not.toBe("TEXTAREA");
    expect(el.style.unicodeBidi).toBe("plaintext");
  });

  it("keeps numbered English headings in source order", () => {
    const input =
      "1) Lachesis —\nمناسبت: بائیں طرف\n2) Spigelia —\nدل کی طرف درد\n3) Carbo vegetabilis —\nخون کی کمی";
    const el = formatPreview(input);
    const shown = el.textContent ?? "";
    const visible = shown.replace(/[\u2066\u2067\u2069\u200E\u200F\u061C]/g, "");
    expect(shown).toBe(formatForWhatsAppRTL(input));
    expect(visible).toContain("1) Lachesis —");
    expect(visible).toContain("2) Spigelia —");
    expect(visible).toContain("3) Carbo vegetabilis —");
    expect(visible.indexOf("1) Lachesis —")).toBeLessThan(visible.indexOf("مناسبت"));
    expect(visible.indexOf("2) Spigelia —")).toBeLessThan(visible.indexOf("دل کی طرف درد"));
  });

  it("preserves pure Urdu as RTL plaintext", () => {
    const urdu = "یہ ایک سادہ اردو جملہ ہے۔";
    const el = formatPreview(urdu);
    expect(el.getAttribute("dir")).toBe("auto");
    expect(el.style.unicodeBidi).toBe("plaintext");
    expect(el.textContent).toBe(formatForWhatsAppRTL(urdu));
    expect(el.textContent).toContain(urdu);
  });
});
