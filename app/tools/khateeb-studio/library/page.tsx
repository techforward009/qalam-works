import type { Metadata } from "next";
import BookLibraryPageClient from "./BookLibraryPageClient";

export const metadata: Metadata = {
  title: "کتاب خانہ | Qalam Works",
  description: "Read complete source books in a focused, spacious library.",
};

export default function BookLibraryPage() {
  return <BookLibraryPageClient />;
}
