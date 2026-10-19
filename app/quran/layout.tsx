export default function QuranLayout({ children }: { children: React.ReactNode }) {
  // Keep the bottom-left mobile theme control outside the Quran reading area.
  return <div className="pb-20 sm:pb-0">{children}</div>;
}
