import type { Metadata } from "next";
import BookAdministrationPageClient from "./BookAdministrationPageClient";

export const metadata: Metadata = {
  title: "کتابوں کا انتظام | Qalam Works",
  description: "Protected administration for book corpus imports.",
};

export default function BookAdministrationPage() {
  return <BookAdministrationPageClient />;
}
