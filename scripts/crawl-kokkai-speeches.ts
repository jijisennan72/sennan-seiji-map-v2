/**
 * crawl-kokkai-speeches.ts
 * Fetch speeches from National Diet Library API for specified members
 *
 * Usage: npx tsx scripts/crawl-kokkai-speeches.ts
 */

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const API_BASE = "https://kokkai.ndl.go.jp/api/speech";
const PAGE_SIZE = 100;

const MEMBERS = [
  "遠藤敬",
  "谷川とむ",
  "伊東信久",
];

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

type SpeechRecord = {
  speech: string;
  speechRecord: string;
  nameOfHouse: string;
  nameOfMeeting: string;
  session: string;
  date: string;
  speechURL: string;
  speaker: string;
};

async function fetchSpeeches(speaker: string): Promise<SpeechRecord[]> {
  const all: SpeechRecord[] = [];
  let startRecord = 1;

  // First request to get total
  const firstUrl = `${API_BASE}?speaker=${encodeURIComponent(speaker)}&maximumRecords=1&recordPacking=json`;
  const firstRes = await fetch(firstUrl);
  if (!firstRes.ok) throw new Error(`HTTP ${firstRes.status}`);
  const firstData = await firstRes.json();
  const total = firstData.numberOfRecords;
  console.log(`  総件数: ${total}`);

  await sleep(1000);

  while (startRecord <= total) {
    const url = `${API_BASE}?speaker=${encodeURIComponent(speaker)}&maximumRecords=${PAGE_SIZE}&startRecord=${startRecord}&recordPacking=json`;
    const res = await fetch(url);
    if (!res.ok) {
      console.error(`  ✗ HTTP ${res.status} at startRecord=${startRecord}`);
      break;
    }

    const data = await res.json();
    const records: SpeechRecord[] = data.speechRecord ?? [];
    if (records.length === 0) break;

    all.push(...records);
    console.log(`  取得: ${all.length}/${total}`);

    startRecord += PAGE_SIZE;
    await sleep(1000);
  }

  return all;
}

function buildSessionName(record: SpeechRecord): string {
  // e.g. "第213回国会 衆議院 予算委員会"
  const session = record.session ? `第${record.session}回国会` : "";
  const parts = [session, record.nameOfHouse, record.nameOfMeeting].filter(Boolean);
  return parts.join(" ");
}

async function main() {
  console.log("=== 国会会議録取得開始 ===\n");
  let totalInserted = 0;

  for (const speaker of MEMBERS) {
    console.log(`\n--- ${speaker} ---`);
    try {
      const records = await fetchSpeeches(speaker);

      // Filter to only this speaker's speeches (API may return other speakers in same meeting)
      const filtered = records.filter((r) => r.speaker === speaker);
      console.log(`  本人発言: ${filtered.length}件（全${records.length}件中）`);

      // Batch insert
      const BATCH = 100;
      let inserted = 0;
      for (let i = 0; i < filtered.length; i += BATCH) {
        const batch = filtered.slice(i, i + BATCH).map((r) => ({
          city: "kokkai",
          member_name: r.speaker,
          session_name: buildSessionName(r),
          session_date: r.date ?? null,
          content: r.speech,
          source_url: r.speechURL ?? null,
        }));

        const { error } = await supabase.from("speeches").insert(batch);
        if (error) {
          console.error(`  ✗ INSERT: ${error.message}`);
        } else {
          inserted += batch.length;
        }
      }

      console.log(`  ✓ ${inserted}件登録`);
      totalInserted += inserted;
    } catch (err) {
      console.error(`  ✗ ${err instanceof Error ? err.message : err}`);
    }
  }

  console.log(`\n=== 完了: ${totalInserted}件登録 ===`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
