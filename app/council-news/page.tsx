import { getSupabase } from "@/lib/supabase";
import Link from "next/link";

export const dynamic = "force-dynamic";

const cityNameMap: Record<string, string> = {
  sennan: "泉南市", hannan: "阪南市", izumisano: "泉佐野市",
  misaki: "岬町", tajiri: "田尻町", kumatori: "熊取町",
};

const cityBadgeColor: Record<string, string> = {
  sennan: "bg-orange-600", hannan: "bg-sky-600", izumisano: "bg-indigo-600",
  misaki: "bg-teal-600", tajiri: "bg-rose-600", kumatori: "bg-violet-600",
};

export default async function CouncilNewsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page: pageParam } = await searchParams;
  const currentPage = Math.max(0, Number(pageParam ?? "0"));
  const PAGE_SIZE = 20;

  const supabase = getSupabase();

  const { count } = await supabase
    .from("council_news")
    .select("id", { count: "exact", head: true })
    .not("event_date", "is", null);

  const totalCount = count ?? 0;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  const { data: rows } = await supabase
    .from("council_news")
    .select("city, event_date, title, url")
    .not("event_date", "is", null)
    .order("event_date", { ascending: false })
    .range(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE - 1);

  const items = rows ?? [];

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-[#0f172a] text-white">
        <div className="max-w-4xl mx-auto px-4 pt-6 pb-12">
          <Link href="/" className="text-sm text-slate-400 hover:text-white transition-colors">
            ← トップに戻る
          </Link>
          <h1 className="text-3xl font-extrabold mt-3 tracking-tight">最新の議会情報</h1>
          <p className="mt-2 text-slate-400">泉州6市町の議会サイトから自動収集（毎日更新）</p>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 -mt-6 relative z-10">
        <div className="bg-white rounded-2xl shadow-md divide-y divide-slate-100">
          {items.map((item, i) => (
            <a
              key={i}
              href={item.url ?? "#"}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-4 px-6 py-4 hover:bg-slate-50 transition-colors"
            >
              <time className="text-sm text-slate-400 font-mono w-24 flex-shrink-0">
                {item.event_date?.replace(/-/g, ".") ?? ""}
              </time>
              <span className={`text-xs font-semibold text-white ${cityBadgeColor[item.city] ?? "bg-slate-700"} rounded-full px-2.5 py-0.5 flex-shrink-0`}>
                {cityNameMap[item.city] ?? item.city}
              </span>
              <span className="text-sm text-slate-700 flex-1">{item.title}</span>
              <span className="text-slate-300 text-sm flex-shrink-0">↗</span>
            </a>
          ))}

          {items.length === 0 && (
            <div className="text-center py-12 text-sm text-slate-400">
              議会情報はまだありません
            </div>
          )}
        </div>

        {/* ページネーション */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-3 mt-6 pb-8">
            {currentPage > 0 && (
              <Link
                href={`/council-news?page=${currentPage - 1}`}
                className="px-4 py-2 text-sm rounded-lg bg-white shadow-sm border border-slate-200 text-slate-600 hover:bg-slate-50"
              >
                ← 前へ
              </Link>
            )}
            <span className="text-sm text-slate-500">
              {currentPage + 1} / {totalPages}
            </span>
            {currentPage < totalPages - 1 && (
              <Link
                href={`/council-news?page=${currentPage + 1}`}
                className="px-4 py-2 text-sm rounded-lg bg-white shadow-sm border border-slate-200 text-slate-600 hover:bg-slate-50"
              >
                次へ →
              </Link>
            )}
          </div>
        )}
      </main>

      <div className="h-16" />
    </div>
  );
}
