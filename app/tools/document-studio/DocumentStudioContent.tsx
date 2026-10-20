"use client";

import { useLanguage } from "../../lib/language-context";
import DocumentStudioEditor from "./components/DocumentStudioEditor";

export default function DocumentStudioContent({ hideHeading = false }: { hideHeading?: boolean } = {}) {
  const { language, dir } = useLanguage();
  const Root = hideHeading ? "div" : "main";

  return (
    <Root className="py-3 md:py-4" dir={dir}>
      {!hideHeading && (
        <h1 className="sr-only">
          {language === "ur" ? "قلم پیج: اردو ایڈیٹر" : "Qalam Page: Urdu Editor"}
        </h1>
      )}
      <DocumentStudioEditor />
    </Root>
  );
}
