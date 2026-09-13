import type { Metadata } from "next";
import CrescentVisibilityContent from "./CrescentVisibilityContent";

export const metadata: Metadata = { title: "Crescent Visibility | Qalam Works", description: "Pakistan crescent visibility dashboard." };
export default function CrescentVisibilityPage() { return <CrescentVisibilityContent />; }
