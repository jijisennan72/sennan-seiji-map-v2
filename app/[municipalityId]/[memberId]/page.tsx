import { getSupabase } from "@/lib/supabase";
import { notFound } from "next/navigation";
import MemberDetail from "./MemberDetail";

export const dynamic = "force-dynamic";

const muniAccent: Record<number, { from: string; to: string; label: string }> = {
  1: { from: "from-orange-500", to: "to-orange-600", label: "泉南市" },
  2: { from: "from-sky-500",    to: "to-sky-600",    label: "阪南市" },
  3: { from: "from-indigo-500", to: "to-indigo-600", label: "泉佐野市" },
};

const defaultAccent = { from: "from-slate-600", to: "to-slate-700", label: "" };

export default async function MemberPage({
  params,
}: {
  params: Promise<{ municipalityId: string; memberId: string }>;
}) {
  const { municipalityId, memberId } = await params;
  const muniId = Number(municipalityId);
  const memId = Number(memberId);

  const supabase = getSupabase();
  const [
    { data: municipality },
    { data: member },
    { data: policies },
    { data: committees },
    { data: utterances },
  ] = await Promise.all([
    supabase.from("municipalities").select("id, name").eq("id", muniId).single(),
    supabase
      .from("members_v2")
      .select("id, name, reading, party, seat_number, terms, term_period, role, social_links")
      .eq("id", memId)
      .eq("municipality_id", muniId)
      .single(),
    supabase
      .from("policy_interests")
      .select("category, score")
      .eq("member_id", memId)
      .order("id"),
    supabase
      .from("committees")
      .select("name, role")
      .eq("member_id", memId)
      .order("id"),
    supabase
      .from("utterances")
      .select("id, session_label, session_type, content, source_file")
      .eq("member_id", memId)
      .eq("municipality_id", muniId)
      .order("id"),
  ]);

  if (!municipality || !member) {
    notFound();
  }

  const accent = muniAccent[muniId] ?? defaultAccent;

  return (
    <MemberDetail
      member={member}
      municipality={municipality}
      policies={policies ?? []}
      committees={committees ?? []}
      utterances={utterances ?? []}
      accent={accent}
      municipalityId={muniId}
    />
  );
}
