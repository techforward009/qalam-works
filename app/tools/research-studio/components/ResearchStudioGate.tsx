"use client";

import { useEffect, useState, type FormEvent } from "react";
import type { Language } from "../../../lib/language-context";
import ResearchStudioWorkspace from "./ResearchStudioWorkspace";

type GateStatus = "loading" | "in" | "out" | "unconfigured" | "error";

const COPY = {
  en: {
    checking: "Checking access…",
    signIn: "Sign in",
    password: "Password",
    signingIn: "Signing in…",
    invalid: "That password was not accepted.",
    failed: "The request could not be completed.",
    unconfigured: "Research access is not configured.",
    logout: "Log out",
  },
  ur: {
    checking: "رسائی دیکھی جا رہی ہے…",
    signIn: "داخل ہوں",
    password: "پاس ورڈ",
    signingIn: "داخل ہو رہے ہیں…",
    invalid: "یہ پاس ورڈ قبول نہیں ہوا۔",
    failed: "درخواست مکمل نہیں ہو سکی۔",
    unconfigured: "ریسرچ رسائی ترتیب نہیں دی گئی۔",
    logout: "خارج ہوں",
  },
} as const;

export default function ResearchStudioGate({
  language,
  dir,
}: {
  language: Language;
  dir: "rtl" | "ltr";
}) {
  const t = COPY[language];
  const [status, setStatus] = useState<GateStatus>("loading");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const response = await fetch("/api/research/auth", { method: "GET", cache: "no-store", credentials: "same-origin" });
        if (cancelled) return;
        if (response.status === 200) setStatus("in");
        else if (response.status === 401) setStatus("out");
        else if (response.status === 503) setStatus("unconfigured");
        else setStatus("error");
      } catch {
        if (!cancelled) setStatus("error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/research/auth", {
        method: "POST",
        cache: "no-store",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (response.status === 200) {
        setPassword("");
        setStatus("in");
        return;
      }
      if (response.status === 503) {
        setPassword("");
        setStatus("unconfigured");
        return;
      }
      setMessage(response.status === 401 ? t.invalid : t.failed);
    } catch {
      setMessage(t.failed);
    } finally {
      setBusy(false);
    }
  }

  async function onLogout() {
    setBusy(true);
    try {
      await fetch("/api/research/auth", { method: "DELETE", cache: "no-store", credentials: "same-origin" });
    } catch {
      // The cookie is cleared when the server answers. A network failure still leaves the gate.
    } finally {
      setPassword("");
      setMessage("");
      setStatus("out");
      setBusy(false);
    }
  }

  if (status === "loading") return <p role="status">{t.checking}</p>;
  if (status === "unconfigured") return <p role="alert">{t.unconfigured}</p>;
  if (status === "error") return <p role="alert">{t.failed}</p>;

  if (status === "out") {
    return (
      <form
        onSubmit={onSubmit}
        dir={dir}
        className="max-w-md border border-gray-200 rounded-xl p-4 dark:border-white/15"
        aria-labelledby="research-sign-in"
      >
        <h2 id="research-sign-in" className="text-lg font-semibold text-[#1A3A2A] dark:text-white mb-3">
          {t.signIn}
        </h2>
        <label className="block text-sm mb-2" htmlFor="research-access-password">
          {t.password}
        </label>
        <input
          id="research-access-password"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:bg-transparent dark:border-white/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#1A3A2A]"
          type="password"
          name="password"
          dir="ltr"
          autoComplete="current-password"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          value={password}
          aria-invalid={message.length > 0}
          aria-describedby={message ? "research-access-message" : undefined}
          onChange={(event) => setPassword(event.target.value)}
        />
        <button
          type="submit"
          className="mt-4 rounded-lg bg-[#1A3A2A] text-white px-4 py-2 disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
          disabled={busy}
          aria-busy={busy}
        >
          {busy ? t.signingIn : t.signIn}
        </button>
        {message ? (
          <p id="research-access-message" className="mt-3 text-sm" role="alert">
            {message}
          </p>
        ) : null}
      </form>
    );
  }

  return (
    <div dir={dir}>
      <button
        type="button"
        className="mb-4 ms-auto block rounded-lg border border-gray-300 px-4 py-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1A3A2A] disabled:opacity-50"
        onClick={onLogout}
        disabled={busy}
      >
        {t.logout}
      </button>
      <ResearchStudioWorkspace language={language} dir={dir} />
    </div>
  );
}
