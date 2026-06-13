"use client";

import { useState } from "react";

type Speech = {
  id: string;
  city: string;
  member_name: string;
  session_name: string;
  session_date: string | null;
  content: string;
  source_url: string | null;
};

const cityNameMap: Record<string, string> = {
  sennan: "泉南市", hannan: "阪南市", izumisano: "泉佐野市",
  misaki: "岬町", tajiri: "田尻町", kumatori: "熊取町",
  kokkai: "国会",
};

const cityBadgeColor: Record<string, string> = {
  sennan: "bg-orange-600", hannan: "bg-sky-600", izumisano: "bg-indigo-600",
  misaki: "bg-teal-600", tajiri: "bg-rose-600", kumatori: "bg-violet-600",
  kokkai: "bg-red-700",
};

function highlightText(text: string, query: string) {
  if (!query.trim()) return text;
  const words = query.split(/\s+/).filter(Boolean);
  const pattern = words.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
  const parts = text.split(new RegExp(`(${pattern})`, "gi"));
  return parts.map((part, i) =>
    words.some((w) => part.toLowerCase() === w.toLowerCase()) ? (
      <mark key={i} className="bg-yellow-200 text-slate-900 rounded px-0.5">{part}</mark>
    ) : (
      part
    )
  );
}

const CONTENT_LIMIT = 200;

function SpeechCard({ speech, query }: { speech: Speech; query: string }) {
  const [expanded, setExpanded] = useState(false);
  const needsTruncation = speech.content.length > CONTENT_LIMIT;
  const displayText = !expanded && needsTruncation
    ? speech.content.slice(0, CONTENT_LIMIT) + "…"
    : speech.content;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <span className={`text-xs font-semibold text-white ${cityBadgeColor[speech.city] ?? "bg-slate-700"} rounded-full px-2.5 py-0.5`}>
          {cityNameMap[speech.city] ?? speech.city}
        </span>
        <span className="text-sm font-bold text-slate-800">{speech.member_name}</span>
        <span className="text-xs text-slate-400">{speech.session_name}</span>
        {speech.session_date && (
          <span className="text-xs text-slate-400 font-mono">{speech.session_date}</span>
        )}
      </div>

      <p className="text-sm text-slate-700 leading-relaxed">
        {highlightText(displayText, query)}
      </p>

      <div className="flex items-center gap-3 mt-3">
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
            PDF ↗
          </a>
        )}
      </div>
    </div>
  );
}

export default function SpeechResults({ results, query }: { results: Speech[]; query: string }) {
  return (
    <div className="flex flex-col gap-4">
      {results.map((speech) => (
        <SpeechCard key={speech.id} speech={speech} query={query} />
      ))}
    </div>
  );
}
