import QuranThemeControl from "./QuranThemeControl";

export default function QuranLayout({ children }: { children: React.ReactNode }) {
  return <div><QuranThemeControl />{children}</div>;
}
