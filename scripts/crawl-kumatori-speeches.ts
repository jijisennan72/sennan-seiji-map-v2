/**
 * crawl-kumatori-speeches.ts
 * Kumatori town council meeting PDFs -> speeches table
 *
 * Usage: npx tsx scripts/crawl-kumatori-speeches.ts
 */

import { createClient } from "@supabase/supabase-js";
import * as cheerio from "cheerio";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdf = require("pdf-parse");

const SUPABASE_URL = process.env.SUPABASE_URL || "https://supabase.hama02.shizuku.net";
const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  "REMOVED_SERVICE_ROLE_KEY";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const PAGES = [
  { year: "令和8年", url: "https://www.town.kumatori.lg.jp/soshiki/gikai_somu/gyomu/kumatori_gikai/etsuran/15371.html" },
  { year: "令和7年", url: "https://www.town.kumatori.lg.jp/soshiki/gikai_somu/gyomu/kumatori_gikai/etsuran/14305.html" },
  { year: "令和6年", url: "https://www.town.kumatori.lg.jp/soshiki/gikai_somu/gyomu/kumatori_gikai/etsuran/12952.html" },
  { year: "令和5年", url: "https://www.town.kumatori.lg.jp/soshiki/gikai_somu/gyomu/kumatori_gikai/etsuran/11535.html" },
];

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

// -- Extract PDF links from a year page --
async function getPdfLinks(pageUrl: string): Promise<{ title: string; url: string }[]> {
  const res = await fetch(pageUrl);
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${pageUrl}`);
  const html = await res.text();
  const $ = cheerio.load(html);
  const links: { title: string; url: string }[] = [];

  $('a[href$=".pdf"]').each((_, el) => {
    const href = $(el).attr("href");
    const title = $(el).text().replace(/\(PDF.*?\)/gi, "").trim();
    if (!href || !title) return;
    const fullUrl = href.startsWith("//") ? `https:${href}` : href;
    links.push({ title, url: fullUrl });
  });

  return links;
}

// -- Parse session name from PDF title and year --
function buildSessionName(year: string, pdfTitle: string): string {
  // Try to extract month from PDF title dates
  const monthMatch = pdfTitle.match(/(\d{1,2})月/);
  if (monthMatch) {
    const month = Number(monthMatch[1]);
    if (month === 3) return `${year}第1回定例会`;
    if (month === 5) return `${year}臨時会`;
    if (month === 6) return `${year}第2回定例会`;
    if (month === 9) return `${year}第3回定例会`;
    if (month === 11) return `${year}臨時会`;
    if (month === 12) return `${year}第4回定例会`;
  }
  return `${year} ${pdfTitle}`;
}

// -- Extract session date from PDF title --
function extractDate(year: string, pdfTitle: string): string | null {
  const dateMatch = pdfTitle.match(/(\d{1,2})月(\d{1,2})日/);
  if (!dateMatch) return null;
  // Convert reiwa year to western year
  const reMatch = year.match(/令和(\d+)年/);
  if (!reMatch) return null;
  const westernYear = 2018 + Number(reMatch[1]);
  const month = dateMatch[1].padStart(2, "0");
  const day = dateMatch[2].padStart(2, "0");
  return `${westernYear}-${month}-${day}`;
}

// -- Parse speeches from PDF text --
// Kumatori format: 議長（文野慎治君）, 3番（長田健太郎君）, 委員長（大林隆昭君）
function parseSpeechesFromText(text: string): { speaker: string; content: string }[] {
  const speeches: { speaker: string; content: string }[] = [];
  const speakerRegex = /(?:委員長|副委員長|委員|議長|副議長|\d+番)（(.+?)(?:君|さん)）/g;

  const markers: { name: string; pos: number; end: number }[] = [];
  for (const m of text.matchAll(speakerRegex)) {
    markers.push({ name: m[1], pos: m.index!, end: m.index! + m[0].length });
  }

  for (let i = 0; i < markers.length; i++) {
    const start = markers[i].end;
    const end = i + 1 < markers.length ? markers[i + 1].pos : Math.min(start + 5000, text.length);
    const content = text.slice(start, end).replace(/\s+/g, " ").trim();
    if (content.length > 10) {
      speeches.push({ speaker: markers[i].name, content });
    }
  }

  return speeches;
}

// -- Main --
async function main() {
  console.log("=== 熊取町会議録収集開始 ===\n");
  let totalInserted = 0;
  let totalPdfs = 0;

  for (const { year, url } of PAGES) {
    console.log(`\n--- ${year} ---`);
    let pdfLinks: { title: string; url: string }[];
    try {
      pdfLinks = await getPdfLinks(url);
      console.log(`  PDF: ${pdfLinks.length}件`);
    } catch (err) {
      console.error(`  ✗ ページ取得失敗: ${err instanceof Error ? err.message : err}`);
      continue;
    }

    for (const pdfLink of pdfLinks) {
      totalPdfs++;
      try {
        console.log(`  処理中: ${pdfLink.title}`);

        // Download PDF
        const pdfRes = await fetch(pdfLink.url);
        if (!pdfRes.ok) {
          console.error(`    ✗ HTTP ${pdfRes.status}`);
          await sleep(2000);
          continue;
        }
        const buffer = Buffer.from(await pdfRes.arrayBuffer());

        // Extract text
        const pdfData = await pdf(buffer);
        const text = pdfData.text;

        if (!text || text.length < 100) {
          console.log(`    スキップ（テキスト抽出不可）`);
          await sleep(2000);
          continue;
        }

        // Parse speeches
        const speeches = parseSpeechesFromText(text);
        if (speeches.length === 0) {
          console.log(`    発言なし`);
          await sleep(2000);
          continue;
        }

        const sessionName = buildSessionName(year, pdfLink.title);
        const sessionDate = extractDate(year, pdfLink.title);

        // Batch insert (100 at a time)
        const BATCH = 100;
        let inserted = 0;
        for (let i = 0; i < speeches.length; i += BATCH) {
          const batch = speeches.slice(i, i + BATCH).map((s) => ({
            city: "kumatori",
            member_name: s.speaker,
            session_name: sessionName,
            session_date: sessionDate,
            content: s.content,
            source_url: pdfLink.url,
          }));

          const { error } = await supabase.from("speeches").insert(batch);
          if (error) {
            console.error(`    ✗ INSERT: ${error.message}`);
          } else {
            inserted += batch.length;
          }
        }

        console.log(`    ✓ ${inserted}件`);
        totalInserted += inserted;
      } catch (err) {
        console.error(`    ✗ ${err instanceof Error ? err.message : err}`);
      }

      await sleep(2000);
    }
  }

  console.log(`\n=== 完了: PDF ${totalPdfs}件処理 / 発言 ${totalInserted}件登録 ===`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
