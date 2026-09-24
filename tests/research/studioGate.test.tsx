/** @vitest-environment happy-dom */

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import ResearchStudioGate from "../../app/tools/research-studio/components/ResearchStudioGate";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

function renderGate(language: "en" | "ur" = "en") {
  return render(<ResearchStudioGate language={language} dir={language === "ur" ? "rtl" : "ltr"} />);
}

describe("Research Studio auth gate", () => {
  it("asks for a password and does not mount the workspace when signed out", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      expect(String(input)).toBe("/api/research/auth");
      return jsonResponse({ authenticated: false }, 401);
    });
    vi.stubGlobal("fetch", fetchMock);
    renderGate();
    expect(await screen.findByLabelText("Password")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Ask" })).toBeNull();
    expect(screen.queryByText("No documents yet. Upload a PDF, DOCX, TXT, or MD file.")).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("uses Urdu copy and keeps the password field left to right", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => jsonResponse({ authenticated: false }, 401)));
    renderGate("ur");
    const field = await screen.findByLabelText("پاس ورڈ");
    expect(field.getAttribute("dir")).toBe("ltr");
    expect(field.getAttribute("type")).toBe("password");
    expect(screen.getByRole("button", { name: "داخل ہوں" })).toBeTruthy();
  });

  it("shows a configuration error without the workspace", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => jsonResponse({
      error: "Research access is not configured.",
      code: "auth_not_configured",
    }, 503)));
    renderGate();
    expect(await screen.findByRole("alert")).toHaveProperty("textContent", "Research access is not configured.");
    expect(screen.queryByLabelText("Password")).toBeNull();
    expect(screen.queryByRole("button", { name: "Ask" })).toBeNull();
  });

  it("opens the existing workspace after a correct password and closes it on logout", async () => {
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      if (init?.method === "POST") return jsonResponse({ authenticated: true });
      if (init?.method === "DELETE") return jsonResponse({ authenticated: false });
      return jsonResponse({ authenticated: false }, 401);
    });
    vi.stubGlobal("fetch", fetchMock);
    renderGate();
    fireEvent.change(await screen.findByLabelText("Password"), { target: { value: "secret-value" } });
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));
    expect(await screen.findByRole("button", { name: "Ask" })).toBeTruthy();
    expect(screen.queryByLabelText("Password")).toBeNull();
    const post = fetchMock.mock.calls.find((call) => call[1]?.method === "POST");
    expect(post?.[1]?.body).toBe(JSON.stringify({ password: "secret-value" }));
    expect(String(post?.[0])).toBe("/api/research/auth");

    fireEvent.click(screen.getByRole("button", { name: "Log out" }));
    expect(await screen.findByLabelText("Password")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Ask" })).toBeNull();
    expect(fetchMock.mock.calls.some((call) => call[1]?.method === "DELETE")).toBe(true);
    expect(fetchMock.mock.calls.every((call) => String(call[0]) === "/api/research/auth")).toBe(true);
  });
});
