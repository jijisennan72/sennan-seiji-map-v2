import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim();
  const city = req.nextUrl.searchParams.get("city") || "all";

  if (!q) {
    return NextResponse.json({ results: [], total: 0 });
  }

  const supabase = getSupabase();

  // Build tsquery: split words and join with &
  const tsquery = q
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => `'${w.replace(/'/g, "''")}'`)
    .join(" & ");

  let query = supabase
    .from("speeches")
    .select("city, member_name, session_name, session_date, content, source_url", { count: "exact" })
    .textSearch("content", tsquery, { config: "simple" })
    .order("session_date", { ascending: false })
    .limit(50);

  if (city !== "all") {
    query = query.eq("city", city);
  }

  const { data, count, error } = await query;

  if (error) {
    return NextResponse.json({ results: [], total: 0, error: error.message }, { status: 500 });
  }

  const results = (data ?? []).map((r) => ({
    ...r,
    content: r.content.length > 200 ? r.content.slice(0, 200) + "…" : r.content,
    content_full: r.content,
  }));

  return NextResponse.json({ results, total: count ?? results.length });
}
