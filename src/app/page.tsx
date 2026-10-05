import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 text-center">
      <div className="max-w-xl p-8 rounded-2xl border border-slate-800 bg-slate-900/50 backdrop-blur shadow-2xl">
        <div className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 mb-4">
          Feature 01 - Feature 09 Active (Product Catalog &amp; Discovery)
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-white mb-2">
          Digital Marketplace Engine
        </h1>
        <p className="text-slate-400 mb-6 text-sm">
          Controlled vertical feature-by-feature implementation mode.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/test/signup"
            className="inline-flex items-center justify-center px-4 py-2 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-white transition-colors border border-slate-700"
          >
            Test Signup →
          </Link>
          <Link
            href="/test/login"
            className="inline-flex items-center justify-center px-4 py-2 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-white transition-colors border border-slate-700"
          >
            Test Login →
          </Link>
          <Link
            href="/test/profile"
            className="inline-flex items-center justify-center px-4 py-2 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-white transition-colors border border-slate-700"
          >
            Test Profile →
          </Link>
          <Link
            href="/test/admin/sellers"
            className="inline-flex items-center justify-center px-4 py-2 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-white transition-colors border border-slate-700"
          >
            Test Admin Sellers →
          </Link>
          <Link
            href="/test/upload"
            className="inline-flex items-center justify-center px-4 py-2 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-white transition-colors border border-slate-700"
          >
            Test File Upload →
          </Link>
          <Link
            href="/test/moderation"
            className="inline-flex items-center justify-center px-4 py-2 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-white transition-colors border border-slate-700"
          >
            Test Moderation →
          </Link>
          <Link
            href="/test/catalog"
            className="inline-flex items-center justify-center px-4 py-2 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-colors shadow-lg shadow-indigo-600/25"
          >
            Test Catalog →
          </Link>
        </div>
      </div>
    </main>
  );
}
