import { getSupabase } from "@/lib/supabase";
import Link from "next/link";

export const dynamic = "force-dynamic";

const cardAccent: Record<number, { border: string; badge: string; icon: string }> = {
  1: { border: "border-orange-400", badge: "bg-orange-500", icon: "text-orange-400" },
  2: { border: "border-sky-400",    badge: "bg-sky-500",    icon: "text-sky-400" },
  3: { border: "border-indigo-400", badge: "bg-indigo-500", icon: "text-indigo-400" },
};

const defaultAccent = { border: "border-slate-300", badge: "bg-slate-500", icon: "text-slate-400" };

export default async function Home() {
  const supabase = getSupabase();
  const [{ data: municipalities }, { data: members }, { data: newsRows }] = await Promise.all([
    supabase.from("municipalities").select("id, name, region").order("id"),
    supabase.from("members_v2").select("municipality_id, party"),
    supabase.from("council_news").select("city, event_date, title, url").not("event_date", "is", null).order("event_date", { ascending: false }).limit(5),
  ]);

  // 各自治体の議員数・会派数を集計
  const countMap: Record<number, number> = {};
  const partyMap: Record<number, Set<string>> = {};
  if (members) {
    for (const m of members) {
      countMap[m.municipality_id] = (countMap[m.municipality_id] || 0) + 1;
      if (!partyMap[m.municipality_id]) partyMap[m.municipality_id] = new Set();
      partyMap[m.municipality_id].add(m.party);
    }
  }

  const totalMembers = members?.length ?? 0;
  const totalMunicipalities = municipalities?.length ?? 0;

  const cityNameMap: Record<string, string> = {
    sennan: "泉南市", hannan: "阪南市", izumisano: "泉佐野市",
    misaki: "岬町", tajiri: "田尻町", kumatori: "熊取町",
  };

  const latestNews = (newsRows ?? []).map((r: { city: string; event_date: string; title: string; url: string | null }) => ({
    date: r.event_date?.replace(/-/g, ".") ?? "",
    city: cityNameMap[r.city] ?? r.city,
    label: r.title,
    url: r.url,
  }));

  return (
    <div className="min-h-screen bg-slate-50">
      {/* ── ヒーローセクション ── */}
      <header className="bg-[#0f172a] text-white">
        <div className="max-w-5xl mx-auto px-4 py-16 sm:py-20 text-center">
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight">
            泉州せいじマップ
          </h1>
          <p className="mt-4 text-lg sm:text-xl text-slate-300">
            泉州{totalMunicipalities}市・{totalMembers}名の議員情報を市民目線で可視化
          </p>
          <div className="mt-8 flex justify-center gap-4 flex-wrap">
            {[
              { value: `${totalMunicipalities}市`, label: "対象自治体" },
              { value: `${totalMembers}名`, label: "議員データ" },
              { value: "泉州エリア", label: "大阪府南部" },
            ].map((stat) => (
              <div
                key={stat.label}
                className="bg-white/10 backdrop-blur-sm rounded-lg px-5 py-3 min-w-[120px]"
              >
                <div className="text-2xl font-bold">{stat.value}</div>
                <div className="text-xs text-slate-400 mt-0.5">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </header>

      {/* ── 検索フォーム ── */}
      <div className="max-w-5xl mx-auto px-4 -mt-8 relative z-10 mb-6">
        <form action="/search-speeches" method="get" className="bg-white rounded-2xl shadow-md p-4 flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            name="q"
            placeholder="議員発言を検索... 例：子育て 財政 道路"
            className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-300"
          />
          <select
            name="city"
            defaultValue="all"
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
      </div>

      {/* ── 自治体カードセクション ── */}
      <main className="max-w-5xl mx-auto px-4 relative z-10">
        <div className="grid gap-5 sm:grid-cols-3">
          {municipalities?.map((muni) => {
            const accent = cardAccent[muni.id] ?? defaultAccent;
            const memberCount = countMap[muni.id] ?? 0;
            const partyCount = partyMap[muni.id]?.size ?? 0;
            return (
              <Link
                key={muni.id}
                href={`/${muni.id}`}
                className={`group block bg-white rounded-2xl border-t-4 ${accent.border} shadow-md hover:shadow-xl hover:-translate-y-1 transition-all duration-200 p-6`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-xl font-bold text-slate-900">{muni.name}</h3>
                    <div className="mt-3 flex gap-3">
                      <span className={`inline-flex items-center gap-1 text-sm font-semibold ${accent.icon}`}>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        {memberCount}名
                      </span>
                      <span className="inline-flex items-center gap-1 text-sm text-slate-500">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                        {partyCount}会派
                      </span>
                    </div>
                  </div>
                  <span className="text-slate-300 group-hover:text-slate-500 transition-colors text-xl mt-1">
                    →
                  </span>
                </div>
                <div className={`mt-4 text-xs font-medium text-white ${accent.badge} rounded-full px-3 py-1 w-fit`}>
                  議員一覧を見る
                </div>
              </Link>
            );
          })}
        </div>

        {/* ── 最新議会情報セクション ── */}
        <section className="mt-14">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-xl font-bold text-slate-900">最新の議会情報</h2>
            <Link href="/council-news" className="text-sm text-sky-600 hover:text-sky-700 font-medium">
              もっと見る →
            </Link>
          </div>
          <div className="bg-white rounded-2xl shadow-md divide-y divide-slate-100">
            {latestNews.map((item, i) => (
              <a
                key={i}
                href={item.url ?? "#"}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-4 px-6 py-4 hover:bg-slate-50 transition-colors"
              >
                <time className="text-sm text-slate-400 font-mono w-24 flex-shrink-0">
                  {item.date}
                </time>
                <span className="text-xs font-semibold text-white bg-slate-700 rounded-full px-2.5 py-0.5 flex-shrink-0">
                  {item.city}
                </span>
                <span className="text-sm text-slate-700 flex-1">{item.label}</span>
                <span className="text-slate-300 text-sm flex-shrink-0">↗</span>
              </a>
            ))}
          </div>
        </section>
      </main>

      {/* ── フッター ── */}
      <footer className="mt-16 border-t border-slate-200 bg-white">
        <div className="max-w-5xl mx-auto px-4 py-8 text-center">
          <p className="text-sm font-medium text-slate-600">
            泉州せいじマップ by チームしずく
          </p>
          <p className="mt-1 text-xs text-slate-400">
            データは各市議会公式サイトの公開情報に基づきます
          </p>
        </div>
      </footer>
    </div>
  );
}
