"use client";

import { useState } from "react";
import Link from "next/link";

type Member = {
  id: number;
  name: string;
  reading: string;
  party: string;
  seat_number: number;
  terms: number | null;
  term_period: string;
  role: string | null;
};

const partyStyle: Record<string, { bg: string; text: string; dot: string; filterActive: string }> = {
  "大阪維新の会":   { bg: "bg-emerald-100", text: "text-emerald-700", dot: "bg-emerald-500", filterActive: "bg-emerald-600 text-white" },
  "公明党":         { bg: "bg-amber-100",   text: "text-amber-700",   dot: "bg-amber-500",   filterActive: "bg-amber-500 text-white" },
  "日本共産党":     { bg: "bg-red-100",     text: "text-red-700",     dot: "bg-red-500",     filterActive: "bg-red-600 text-white" },
  "自由民主党":     { bg: "bg-blue-100",    text: "text-blue-700",    dot: "bg-blue-500",    filterActive: "bg-blue-600 text-white" },
  "せんなん創政会": { bg: "bg-purple-100",  text: "text-purple-700",  dot: "bg-purple-500",  filterActive: "bg-purple-600 text-white" },
  "無所属":         { bg: "bg-slate-100",   text: "text-slate-600",   dot: "bg-slate-400",   filterActive: "bg-slate-600 text-white" },
};

const defaultStyle = { bg: "bg-purple-100", text: "text-purple-700", dot: "bg-purple-500", filterActive: "bg-purple-600 text-white" };

function getStyle(party: string) {
  return partyStyle[party] ?? defaultStyle;
}

export default function MemberGrid({ members, municipalityId }: { members: Member[]; municipalityId: number }) {
  const [filter, setFilter] = useState<string | null>(null);

  // 会派別集計（出現順を維持）
  const partyCounts: { party: string; count: number }[] = [];
  const seen = new Set<string>();
  for (const m of members) {
    if (!seen.has(m.party)) {
      seen.add(m.party);
      partyCounts.push({ party: m.party, count: 0 });
    }
    partyCounts.find((p) => p.party === m.party)!.count++;
  }
  // 人数の多い順にソート
  partyCounts.sort((a, b) => b.count - a.count);

  const filtered = filter ? members.filter((m) => m.party === filter) : members;

  return (
    <>
      {/* ── 会派内訳バッジ ── */}
      <div className="bg-white rounded-2xl shadow-md p-5 mb-6">
        <h2 className="text-sm font-semibold text-slate-500 mb-3">会派別内訳</h2>
        <div className="flex flex-wrap gap-2">
          {partyCounts.map(({ party, count }) => {
            const s = getStyle(party);
            return (
              <span key={party} className={`inline-flex items-center gap-1.5 text-sm font-medium px-3 py-1 rounded-full ${s.bg} ${s.text}`}>
                <span className={`w-2 h-2 rounded-full ${s.dot}`} />
                {party} {count}名
              </span>
            );
          })}
        </div>
      </div>

      {/* ── フィルターボタン ── */}
      <div className="flex flex-wrap gap-2 mb-6">
        <button
          onClick={() => setFilter(null)}
          className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-colors ${
            filter === null
              ? "bg-[#0f172a] text-white"
              : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
          }`}
        >
          全員 ({members.length})
        </button>
        {partyCounts.map(({ party, count }) => {
          const s = getStyle(party);
          const isActive = filter === party;
          return (
            <button
              key={party}
              onClick={() => setFilter(isActive ? null : party)}
              className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-colors ${
                isActive
                  ? s.filterActive
                  : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
              }`}
            >
              {party} ({count})
            </button>
          );
        })}
      </div>

      {/* ── 議員カードグリッド ── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((m) => {
          const s = getStyle(m.party);
          return (
            <div
              key={m.id}
              className="group bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 p-5 flex flex-col"
            >
              {/* 議席番号 */}
              <span className="text-xs font-mono text-slate-400 mb-2">
                No.{m.seat_number}
              </span>

              {/* 議員名 */}
              <h3 className="text-xl font-bold text-slate-900 leading-tight">
                {m.name}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">{m.reading}</p>

              {/* 会派バッジ */}
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${s.bg} ${s.text}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
                  {m.party}
                </span>
                {m.terms != null && (
                  <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                    {m.terms}期
                  </span>
                )}
              </div>

              {/* 役職 */}
              {m.role && (
                <p className="mt-2 text-xs text-slate-600 bg-slate-50 px-2.5 py-1 rounded-md w-fit">
                  {m.role}
                </p>
              )}

              {/* 詳細ボタン */}
              <div className="mt-auto pt-4">
                <Link
                  href={`/${municipalityId}/${m.id}`}
                  className="text-sm font-medium text-slate-400 group-hover:text-sky-600 transition-colors"
                >
                  詳細を見る →
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
