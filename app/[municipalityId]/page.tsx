import { getSupabase } from "@/lib/supabase";
import Link from "next/link";
import MemberGrid from "./MemberGrid";

export const dynamic = "force-dynamic";

export default async function MunicipalityPage({
  params,
}: {
  params: Promise<{ municipalityId: string }>;
}) {
  const { municipalityId } = await params;
  const muniId = Number(municipalityId);

  const supabase = getSupabase();
  const [{ data: municipality }, { data: members }] = await Promise.all([
    supabase.from("municipalities").select("id, name").eq("id", muniId).single(),
    supabase
      .from("members_v2")
      .select("id, name, reading, party, seat_number, terms, term_period, role")
      .eq("municipality_id", muniId)
      .order("seat_number"),
  ]);

  if (!municipality) {
    return <div className="p-8 text-center text-slate-500">自治体が見つかりません</div>;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* ── ヘッダー ── */}
      <header className="bg-[#0f172a] text-white">
        <div className="max-w-5xl mx-auto px-4 pt-6 pb-12">
          <Link href="/" className="text-sm text-slate-400 hover:text-white transition-colors">
            ← 自治体一覧に戻る
          </Link>
          <h1 className="text-3xl sm:text-4xl font-extrabold mt-3 tracking-tight">
            {municipality.name}
            <span className="text-lg sm:text-xl font-medium text-slate-300 ml-3">議員一覧</span>
          </h1>
          <p className="mt-2 text-slate-400">
            {members?.length ?? 0}名の議員情報
          </p>
        </div>
      </header>

      {/* ── メインコンテンツ ── */}
      <main className="max-w-5xl mx-auto px-4 -mt-6 relative z-10 pb-16">
        <MemberGrid members={members ?? []} municipalityId={muniId} />
      </main>
    </div>
  );
}
