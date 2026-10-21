// @vitest-environment happy-dom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import ResearchStudioContent from "../../app/tools/research-studio/ResearchStudioContent";

vi.mock("../../app/lib/language-context", () => ({ useLanguage: () => ({ language: "en", dir: "ltr" }) }));
vi.mock("../../app/components/knowledge/KnowledgeAssistant", () => ({ default: () => <section><form aria-label="Question form" /><ul aria-label="Source list"><li>Private source</li></ul></section> }));
vi.mock("next/dynamic", () => ({ default: () => () => <form aria-label="Document upload" /> }));
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

it.each([503, 401, 500])("the entire page hides questions, sources and uploads when access returns %s", async status => {
  const fetchMock = vi.fn(async () => new Response("{}", { status }));
  vi.stubGlobal("fetch", fetchMock);
  render(<ResearchStudioContent />);
  if (status === 401) expect(await screen.findByLabelText("Password")).toBeTruthy();
  else expect(await screen.findByRole("alert")).toBeTruthy();
  expect(screen.queryByRole("form", { name: "Question form" })).toBeNull();
  expect(screen.queryByRole("list", { name: "Source list" })).toBeNull();
  expect(screen.queryByRole("form", { name: "Document upload" })).toBeNull();
  expect(screen.queryByText("Private source")).toBeNull();
  if (status === 503) {
    expect(screen.getByRole("alert").textContent).toBe("Research Studio is locked. Access is not configured.");
    expect(screen.queryByRole("textbox")).toBeNull();
    expect(screen.queryByLabelText("Password")).toBeNull();
  }
  expect(fetchMock).toHaveBeenCalledTimes(1);
});
