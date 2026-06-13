"use client";

import { useState } from "react";

type Speech = {
  id: string;
  session_name: string;
  session_date: string | null;
  content: string;
  source_url: string | null;
};

const PAGE_SIZE = 10;
const CONTENT_LIMIT = 200;

function SpeechCard({ speech, query }: { speech: Speech; query: string }) {
  const [expanded, setExpanded] = useState(false);
  const needsTruncation = speech.content.length > CONTENT_LIMIT;
  const displayText = !expanded && needsTruncation
    ? speech.content.slice(0, CONTENT_LIMIT) + "…"
    : speech.content;

  // Highlight query words
  const highlighted = query.trim()
    ? displayText.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi")).map((part, i) =>
        part.toLowerCase() === query.toLowerCase()
          ? <mark key={i} className="bg-yellow-200 text-slate-900 rounded px-0.5">{part}</mark>
          : part
      )
    : displayText;

  return (
    <div className="bg-slate-50 rounded-xl p-4">
      <div className="flex flex-wrap items-center gap-2 mb-2">
        <span className="text-xs font-semibold bg-red-100 text-red-700 rounded-full px-2.5 py-0.5">
          {speech.session_name}
        </span>
        {speech.session_date && (
          <span className="text-xs text-slate-400 font-mono">{speech.session_date}</span>
        )}
      </div>
      <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">{highlighted}</p>
      <div className="flex items-center gap-3 mt-2">
        {needsTruncation && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-xs font-medium text-sky-600 hover:text-sky-700"
          >
            {expanded ? "折りたたむ" : "全文を表示"}
          </button>
        )}
        {speech.source_url && (
          <a
            href={speech.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-medium text-slate-400 hover:text-slate-600"
          >
            国会会議録 ↗
          </a>
        )}
      </div>
    </div>
  );
}

export default function KokkaiMemberDetail({
  speeches,
  memberName,
}: {
  speeches: Speech[];
  memberName: string;
}) {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);

  const filtered = query.trim()
    ? speeches.filter((s) => s.content.includes(query.trim()))
    : speeches;

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const handleSearch = (q: string) => {
    setQuery(q);
    setPage(0);
  };

  return (
    <div className="bg-white rounded-2xl shadow-md p-5 sm:p-6">
      {/* Search */}
      <div className="relative mb-5">
        <input
          type="text"
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder={`${memberName}の発言を検索...`}
          className="w-full pl-4 pr-9 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-300"
        />
        {query && (
          <button
            onClick={() => handleSearch("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-lg"
          >
            ×
          </button>
        )}
      </div>

      {/* Count */}
      <p className="text-sm text-slate-500 mb-4">
        {query ? `${filtered.length}件ヒット（全${speeches.length}件中）` : `全${speeches.length}件`}
      </p>

      {/* Speeches */}
      <div className="flex flex-col gap-3">
        {paginated.map((s) => (
          <SpeechCard key={s.id} speech={s} query={query} />
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-8 text-sm text-slate-400">
          {query ? `「${query}」に一致する発言がありません` : "発言データなし"}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-4">
          <button
            onClick={() => setPage(Math.max(0, page - 1))}
            disabled={page === 0}
            className="px-3 py-1.5 text-sm rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 disabled:opacity-30"
          >
            ←
          </button>
          <span className="text-sm text-slate-500">{page + 1} / {totalPages}</span>
          <button
            onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
            disabled={page >= totalPages - 1}
            className="px-3 py-1.5 text-sm rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 disabled:opacity-30"
          >
            →
          </button>
        </div>
      )}
    </div>
  );
}
