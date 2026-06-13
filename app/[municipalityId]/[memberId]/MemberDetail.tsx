"use client";

import { useState } from "react";
import Link from "next/link";

type SocialLinks = {
  x?: string;
  instagram?: string;
  facebook?: string;
  website?: string;
  blog?: string;
  youtube?: boolean;
  line?: boolean;
};

type Member = {
  id: number;
  name: string;
  reading: string;
  party: string;
  seat_number: number;
  terms: number | null;
  term_period: string;
  role: string | null;
  social_links: SocialLinks | null;
};

type Policy = { category: string; score: number };
type Committee = { name: string; role: string | null };
type Utterance = { id: number; session_label: string; session_type: string; content: string; source_file: string };
type Accent = { from: string; to: string; label: string };

const partyStyle: Record<string, { bg: string; text: string }> = {
  "大阪維新の会":   { bg: "bg-emerald-100", text: "text-emerald-700" },
  "公明党":         { bg: "bg-amber-100",   text: "text-amber-700" },
  "日本共産党":     { bg: "bg-red-100",     text: "text-red-700" },
  "自由民主党":     { bg: "bg-blue-100",    text: "text-blue-700" },
  "せんなん創政会": { bg: "bg-purple-100",  text: "text-purple-700" },
  "無所属":         { bg: "bg-slate-100",   text: "text-slate-600" },
};
const defaultParty = { bg: "bg-purple-100", text: "text-purple-700" };

const policyBarColor: Record<string, string> = {
  "教育・子育て":     "bg-pink-500",
  "福祉・医療":       "bg-rose-500",
  "財政":             "bg-amber-500",
  "まちづくり・産業": "bg-sky-500",
  "環境":             "bg-emerald-500",
  "行政改革":         "bg-violet-500",
  "市民生活":         "bg-orange-500",
};

const tabs = ["基本情報", "発言録", "選挙データ"] as const;
type Tab = (typeof tabs)[number];

export default function MemberDetail({
  member,
  municipality,
  policies,
  committees,
  utterances,
  accent,
  municipalityId,
}: {
  member: Member;
  municipality: { id: number; name: string };
  policies: Policy[];
  committees: Committee[];
  utterances: Utterance[];
  accent: Accent;
  municipalityId: number;
}) {
  const [activeTab, setActiveTab] = useState<Tab>("基本情報");
  const ps = partyStyle[member.party] ?? defaultParty;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* ── ヘッダーカード ── */}
      <header className={`bg-gradient-to-br ${accent.from} ${accent.to} text-white`}>
        <div className="max-w-4xl mx-auto px-4 pt-6 pb-14">
          <Link
            href={`/${municipalityId}`}
            className="text-sm text-white/70 hover:text-white transition-colors"
          >
            ← {municipality.name} 議員一覧に戻る
          </Link>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="text-xs font-mono bg-white/20 rounded-full px-2.5 py-0.5">
              No.{member.seat_number}
            </span>
            <span className={`text-xs font-semibold rounded-full px-2.5 py-0.5 ${ps.bg} ${ps.text}`}>
              {member.party}
            </span>
            {member.role && (
              <span className="text-xs font-medium bg-white/20 rounded-full px-2.5 py-0.5">
                {member.role}
              </span>
            )}
          </div>

          <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold tracking-tight">
            {member.name}
          </h1>
          <p className="text-sm text-white/70 mt-1">{member.reading}</p>

          <div className="mt-3 flex flex-wrap gap-4 text-sm text-white/80">
            {member.terms != null && <span>{member.terms}期</span>}
            <span>任期 {member.term_period}</span>
          </div>
        </div>
      </header>

      {/* ── タブ ── */}
      <div className="max-w-4xl mx-auto px-4 -mt-6 relative z-10">
        <div className="bg-white rounded-2xl shadow-md">
          <div className="flex border-b border-slate-100">
            {tabs.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-3.5 text-sm font-semibold text-center transition-colors relative ${
                  activeTab === tab
                    ? "text-slate-900"
                    : "text-slate-400 hover:text-slate-600"
                }`}
              >
                {tab}
                {activeTab === tab && (
                  <span className={`absolute bottom-0 left-1/4 right-1/4 h-0.5 bg-gradient-to-r ${accent.from} ${accent.to} rounded-full`} />
                )}
              </button>
            ))}
          </div>

          <div className="p-5 sm:p-6">
            {activeTab === "基本情報" && (
              <BasicInfoTab
                policies={policies}
                committees={committees}
                socialLinks={member.social_links}
              />
            )}
            {activeTab === "発言録" && <MinutesTab utterances={utterances} municipalityId={municipalityId} />}
            {activeTab === "選挙データ" && <ElectionTab />}
          </div>
        </div>
      </div>

      <div className="h-16" />
    </div>
  );
}

/* ── 基本情報タブ ── */

function BasicInfoTab({
  policies,
  committees,
  socialLinks,
}: {
  policies: Policy[];
  committees: Committee[];
  socialLinks: SocialLinks | null;
}) {
  const maxScore = 6;

  return (
    <div className="flex flex-col gap-8">
      {/* 政策関心分野 */}
      {policies.length > 0 && (
        <section>
          <h3 className="text-sm font-bold text-slate-700 mb-4">政策関心分野</h3>
          <div className="flex flex-col gap-3">
            {policies.map((p) => (
              <div key={p.category} className="flex items-center gap-3">
                <span className="text-sm text-slate-600 w-32 sm:w-36 flex-shrink-0 truncate">
                  {p.category}
                </span>
                <div className="flex-1 bg-slate-100 rounded-full h-5 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${policyBarColor[p.category] ?? "bg-slate-400"} transition-all duration-500`}
                    style={{ width: `${(p.score / maxScore) * 100}%` }}
                  />
                </div>
                <span className="text-xs font-mono text-slate-400 w-8 text-right">
                  {p.score}/{maxScore}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 所属委員会 */}
      {committees.length > 0 && (
        <section>
          <h3 className="text-sm font-bold text-slate-700 mb-3">所属委員会</h3>
          <div className="flex flex-col gap-2">
            {committees.map((c, i) => (
              <div
                key={i}
                className="flex items-center justify-between bg-slate-50 rounded-lg px-4 py-2.5"
              >
                <span className="text-sm text-slate-700">{c.name}</span>
                {c.role && (
                  <span className="text-xs font-semibold text-white bg-slate-500 rounded-full px-2.5 py-0.5">
                    {c.role}
                  </span>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* SNSリンク */}
      {socialLinks && Object.keys(socialLinks).length > 0 && (
        <section>
          <h3 className="text-sm font-bold text-slate-700 mb-3">SNS・リンク</h3>
          <div className="flex flex-wrap gap-2">
            {socialLinks.x && (
              <SnsButton label="X" href={`https://x.com/${socialLinks.x}`} />
            )}
            {socialLinks.instagram && (
              <SnsButton label="Instagram" href={`https://instagram.com/${socialLinks.instagram}`} />
            )}
            {socialLinks.facebook && (
              <SnsButton label="Facebook" href={String(socialLinks.facebook)} />
            )}
            {socialLinks.website && (
              <SnsButton label="Website" href={String(socialLinks.website)} />
            )}
            {socialLinks.blog && (
              <SnsButton label="Blog" href={String(socialLinks.blog)} />
            )}
            {socialLinks.youtube && (
              <span className="text-xs font-medium bg-red-100 text-red-600 rounded-full px-3 py-1.5">
                YouTube
              </span>
            )}
            {socialLinks.line && (
              <span className="text-xs font-medium bg-green-100 text-green-600 rounded-full px-3 py-1.5">
                LINE
              </span>
            )}
          </div>
        </section>
      )}

      {/* データなし */}
      {policies.length === 0 && committees.length === 0 && (
        <div className="text-center text-sm text-slate-400 py-8">
          基本情報はまだ登録されていません
        </div>
      )}
    </div>
  );
}

function SnsButton({ label, href }: { label: string; href: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-xs font-medium bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-full px-3 py-1.5 transition-colors"
    >
      {label} ↗
    </a>
  );
}

/* ── 発言録タブ ── */

const sessionTypeBadge: Record<string, { bg: string; text: string }> = {
  regular:   { bg: "bg-blue-100",    text: "text-blue-700" },
  committee: { bg: "bg-emerald-100", text: "text-emerald-700" },
  rinji:     { bg: "bg-orange-100",  text: "text-orange-700" },
};

const UTTERANCE_LIMIT = 200;
const PAGE_SIZE = 10;

function UtteranceCard({ u }: { u: Utterance }) {
  const [expanded, setExpanded] = useState(false);
  const badge = sessionTypeBadge[u.session_type] ?? sessionTypeBadge.regular;
  const needsTruncation = u.content.length > UTTERANCE_LIMIT;
  const displayText = !expanded && needsTruncation ? u.content.slice(0, UTTERANCE_LIMIT) : u.content;

  return (
    <div className="bg-slate-50 rounded-xl p-4">
      <span className={`inline-block text-xs font-semibold px-2.5 py-0.5 rounded-full mb-2 ${badge.bg} ${badge.text}`}>
        {u.session_label}
      </span>
      <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">
        {displayText}
        {!expanded && needsTruncation && "…"}
      </p>
      {needsTruncation && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-1.5 text-xs font-medium text-sky-600 hover:text-sky-700"
        >
          {expanded ? "折りたたむ" : "続きを読む"}
        </button>
      )}
    </div>
  );
}

function MinutesTab({ utterances, municipalityId }: { utterances: Utterance[]; municipalityId: number }) {
  const [filter, setFilter] = useState<string | null>(null);
  const [page, setPage] = useState(0);

  // 発言がない場合（泉南市以外）
  if (utterances.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-4xl mb-4">📝</div>
        <p className="text-sm text-slate-500 mb-4">発言録データは準備中です</p>
        {municipalityId === 1 && (
          <a
            href="https://gikai.shizuku.net"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block text-sm font-medium text-sky-600 hover:text-sky-700 bg-sky-50 rounded-full px-4 py-2 transition-colors"
          >
            泉南市の詳細な発言録はせんなん政治マップで見られます ↗
          </a>
        )}
      </div>
    );
  }

  // 種別別カウント
  const regularCount = utterances.filter((u) => u.session_type === "regular").length;
  const committeeCount = utterances.filter((u) => u.session_type === "committee").length;
  const rinjiCount = utterances.filter((u) => u.session_type === "rinji").length;

  const filtered = filter ? utterances.filter((u) => u.session_type === filter) : utterances;
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const handleFilter = (f: string | null) => {
    setFilter(f);
    setPage(0);
  };

  return (
    <div className="flex flex-col gap-5">
      {/* 件数サマリー */}
      <div className="flex flex-wrap gap-3 text-sm">
        <span className="text-slate-500">全{utterances.length}件</span>
        {regularCount > 0 && (
          <span className="text-blue-600">定例会 {regularCount}件</span>
        )}
        {committeeCount > 0 && (
          <span className="text-emerald-600">委員会 {committeeCount}件</span>
        )}
        {rinjiCount > 0 && (
          <span className="text-orange-600">臨時会 {rinjiCount}件</span>
        )}
      </div>

      {/* フィルターボタン */}
      <div className="flex flex-wrap gap-2">
        {[
          { key: null, label: "全件", count: utterances.length },
          ...(regularCount > 0 ? [{ key: "regular" as string | null, label: "定例会", count: regularCount }] : []),
          ...(committeeCount > 0 ? [{ key: "committee" as string | null, label: "委員会", count: committeeCount }] : []),
          ...(rinjiCount > 0 ? [{ key: "rinji" as string | null, label: "臨時会", count: rinjiCount }] : []),
        ].map((item) => (
          <button
            key={item.label}
            onClick={() => handleFilter(item.key)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors ${
              filter === item.key
                ? "bg-slate-800 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {item.label} ({item.count})
          </button>
        ))}
      </div>

      {/* 発言一覧 */}
      <div className="flex flex-col gap-3">
        {paginated.map((u) => (
          <UtteranceCard key={u.id} u={u} />
        ))}
      </div>

      {/* ページネーション */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <button
            onClick={() => setPage(Math.max(0, page - 1))}
            disabled={page === 0}
            className="px-3 py-1.5 text-sm rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            ←
          </button>
          <span className="text-sm text-slate-500">
            {page + 1} / {totalPages}
          </span>
          <button
            onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
            disabled={page >= totalPages - 1}
            className="px-3 py-1.5 text-sm rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            →
          </button>
        </div>
      )}
    </div>
  );
}

/* ── 選挙データタブ ── */

function ElectionTab() {
  return (
    <div className="text-center py-12">
      <div className="text-4xl mb-4">🗳️</div>
      <p className="text-sm text-slate-500">選挙データは準備中です</p>
    </div>
  );
}
