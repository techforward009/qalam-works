"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function QuranIndexPage() {
  const router = useRouter();
  useEffect(() => {
    const hash = window.location.hash.replace(/^#/, "");
    const match = /^(\d{1,3}):(\d{1,3})$/.exec(hash);
    router.replace(match ? `/quran/${match[1]}/${match[2]}` : "/quran/1/1");
  }, [router]);
  return <main className="p-8 text-sm text-[#6d5a3c]">Opening the Quran…</main>;
}
