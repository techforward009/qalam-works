import Link from "next/link";

export default function NotFound() {
  return (
    <main className="bg-white min-h-[60vh] flex items-center justify-center px-6">
      <div className="text-center max-w-md">
        <div className="font-nastaliq text-[6rem] text-[#B8935A]/30 leading-none mb-4" aria-hidden="true">
          ۴۰۴
        </div>
        <h1 className="text-2xl font-bold text-[#1A3A2A] mb-3">Page not found</h1>
        <p className="text-[#5B5748] mb-8">
          The page you are looking for does not exist or has been moved.
        </p>
        <Link
          href="/"
          className="inline-block bg-[#1A3A2A] hover:bg-[#244D38] text-white font-semibold px-6 py-3 rounded-lg transition-colors text-sm"
        >
          Back to home
        </Link>
      </div>
    </main>
  );
}
