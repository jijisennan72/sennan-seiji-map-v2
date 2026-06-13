import { getSupabase } from "@/lib/supabase";
import Link from "next/link";
import SpeechResults from "./SpeechResults";

export const dynamic = "force-dynamic";

const cityNameMap: Record<string, string> = {
  sennan: "泉南市", hannan: "阪南市", izumisano: "泉佐野市",
  misaki: "岬町", tajiri: "田尻町", kumatori: "熊取町",
};

export default async function SearchSpeechesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; city?: string }>;
}) {
  const { q, city } = await searchParams;
  const query = q?.trim() ?? "";
  const cityFilter = city ?? "all";

  if (!query) {
    return (
      <div className="min-h-screen bg-slate-50">
        <header className="bg-[#0f172a] text-white">
          <div className="max-w-4xl mx-auto px-4 pt-6 pb-12">
            <Link href="/" className="text-sm text-slate-400 hover:text-white transition-colors">← トップに戻る</Link>
            <h1 className="text-3xl font-extrabold mt-3">発言検索</h1>
          </div>
        </header>
        <div className="max-w-4xl mx-auto px-4 py-12 text-center text-slate-400">
          検索キーワードを入力してください
        </div>
      </div>
    );
  }

  const supabase = getSupabase();
  const tsquery = query
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => `'${w.replace(/'/g, "''")}'`)
    .join(" & ");

  let dbQuery = supabase
    .from("speeches")
    .select("id, city, member_name, session_name, session_date, content, source_url")
    .textSearch("content", tsquery, { config: "simple" })
    .order("session_date", { ascending: false })
    .limit(50);

  if (cityFilter !== "all") {
    dbQuery = dbQuery.eq("city", cityFilter);
  }

  const { data } = await dbQuery;
  const results = data ?? [];
  const cityLabel = cityFilter === "all" ? "全市町" : (cityNameMap[cityFilter] ?? cityFilter);

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-[#0f172a] text-white">
        <div className="max-w-4xl mx-auto px-4 pt-6 pb-12">
          <Link href="/" className="text-sm text-slate-400 hover:text-white transition-colors">← トップに戻る</Link>
          <h1 className="text-3xl font-extrabold mt-3">発言検索</h1>
          <p className="mt-2 text-slate-400">
            「{query}」の検索結果 — {cityLabel} — {results.length}件
          </p>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 -mt-6 relative z-10 pb-16">
        {/* Re-search form */}
        <form action="/search-speeches" method="get" className="bg-white rounded-2xl shadow-md p-4 flex flex-col sm:flex-row gap-3 mb-6">
          <input
            type="text"
            name="q"
            defaultValue={query}
            className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-300"
          />
          <select
            name="city"
            defaultValue={cityFilter}
            className="px-3 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-600 bg-white"
          >
            <option value="all">全市町</option>
            <option value="sennan">泉南市</option>
            <option value="hannan">阪南市</option>
            <option value="izumisano">泉佐野市</option>
            <option value="misaki">岬町</option>
            <option value="tajiri">田尻町</option>
            <option value="kumatori">熊取町</option>
          </select>
          <button
            type="submit"
            className="px-6 py-2.5 bg-[#0f172a] text-white text-sm font-semibold rounded-xl hover:bg-slate-800 transition-colors"
          >
            検索
          </button>
        </form>

        {results.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-md p-12 text-center text-sm text-slate-400">
            「{query}」に一致する発言が見つかりませんでした
          </div>
        ) : (
          <SpeechResults results={results} query={query} />
        )}
      </main>
    </div>
  );
}
