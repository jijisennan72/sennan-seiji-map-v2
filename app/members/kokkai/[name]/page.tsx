import { getSupabase } from "@/lib/supabase";
import { notFound } from "next/navigation";
import Link from "next/link";
import KokkaiMemberDetail from "./KokkaiMemberDetail";

export const dynamic = "force-dynamic";

const MEMBERS: Record<string, { district: string; party: string; house: string; terms: string }> = {
  "遠藤敬":   { district: "大阪18区", party: "日本維新の会", house: "衆議院", terms: "4期" },
  "谷川とむ": { district: "大阪19区", party: "自由民主党",   house: "衆議院", terms: "3期" },
  "伊東信久": { district: "大阪19区", party: "日本維新の会", house: "衆議院", terms: "3期" },
};

export default async function KokkaiMemberPage({
  params,
}: {
  params: Promise<{ name: string }>;
}) {
  const { name: rawName } = await params;
  const name = decodeURIComponent(rawName);
  const profile = MEMBERS[name];

  if (!profile) {
    notFound();
  }

  const supabase = getSupabase();
  const { data: speeches } = await supabase
    .from("speeches")
    .select("id, session_name, session_date, content, source_url")
    .eq("city", "kokkai")
    .eq("member_name", name)
    .order("session_date", { ascending: false })
    .limit(200);

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-gradient-to-br from-red-600 to-red-700 text-white">
        <div className="max-w-4xl mx-auto px-4 pt-6 pb-14">
          <Link href="/" className="text-sm text-white/70 hover:text-white transition-colors">
            ← トップに戻る
          </Link>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold bg-white/20 rounded-full px-2.5 py-0.5">{profile.house}</span>
            <span className="text-xs font-semibold bg-white/20 rounded-full px-2.5 py-0.5">{profile.party}</span>
            <span className="text-xs font-medium bg-white/20 rounded-full px-2.5 py-0.5">{profile.district}</span>
          </div>
          <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold tracking-tight">{name}</h1>
          <p className="mt-2 text-sm text-white/70">{profile.terms} ・ {speeches?.length ?? 0}件の発言データ</p>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 -mt-6 relative z-10 pb-16">
        <KokkaiMemberDetail speeches={speeches ?? []} memberName={name} />
      </main>
    </div>
  );
}
