/**
 * crawl-misaki-speeches.ts
 * Misaki town council meeting PDFs -> speeches table
 *
 * Usage: npx tsx scripts/crawl-misaki-speeches.ts
 */

import { createClient } from "@supabase/supabase-js";
import * as cheerio from "cheerio";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdf = require("pdf-parse");

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const PAGES = [
  { year: "令和8年", url: "https://www.town.misaki.osaka.jp/soshiki/gikai/chogikai/gijiroku/5942.html" },
  { year: "令和7年", url: "https://www.town.misaki.osaka.jp/soshiki/gikai/chogikai/gijiroku/5473.html" },
  { year: "令和6年", url: "https://www.town.misaki.osaka.jp/soshiki/gikai/chogikai/gijiroku/4989.html" },
  { year: "令和5年", url: "https://www.town.misaki.osaka.jp/soshiki/gikai/chogikai/gijiroku/4339.html" },
  { year: "令和4年", url: "https://www.town.misaki.osaka.jp/soshiki/gikai/chogikai/gijiroku/3790.html" },
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

// -- Extract session date from PDF title --
function extractDate(pdfTitle: string): string | null {
  // Pattern: 令和X年Y月Z日
  const match = pdfTitle.match(/令和(\d+)年(\d+)月(\d+)日/);
  if (!match) return null;
  const westernYear = 2018 + Number(match[1]);
  const month = match[2].padStart(2, "0");
  const day = match[3].padStart(2, "0");
  return `${westernYear}-${month}-${day}`;
}

// -- Build session name from PDF title --
function buildSessionName(pdfTitle: string): string {
  // Remove date part, keep session name
  return pdfTitle
    .replace(/（令和\d+年\d+月\d+日）/, "")
    .replace(/\s+/g, "")
    .trim();
}

// -- Parse speeches from PDF text --
// Misaki has two patterns:
// 1. Honkaigi (本会議): ○名前+role (e.g. ○坂原正勝議長, ○奥野学議員)
// 2. Iinkai (委員会): 名前+role at line start (e.g. 奥野委員長, 中原委員)
function parseSpeechesFromText(text: string, isCommittee: boolean): { speaker: string; content: string }[] {
  const speeches: { speaker: string; content: string }[] = [];

  if (!isCommittee) {
    // Honkaigi pattern: ○name+role
    const re = /○(.+?(?:議長|副議長|議員))\s/g;
    const markers: { name: string; pos: number; end: number }[] = [];
    for (const m of text.matchAll(re)) {
      const name = m[1].replace(/\s+/g, "");
      // Skip non-speech lines
      if (/出席|欠席|会議録|署名/.test(name)) continue;
      markers.push({ name, pos: m.index!, end: m.index! + m[0].length });
    }

    for (let i = 0; i < markers.length; i++) {
      const start = markers[i].end;
      const end = i + 1 < markers.length ? markers[i + 1].pos : Math.min(start + 5000, text.length);
      const content = text.slice(start, end).replace(/\s+/g, " ").trim();
      if (content.length > 10) {
        speeches.push({ speaker: markers[i].name, content });
      }
    }
  } else {
    // Committee pattern: name+role at line start (no ○ marker)
    const lines = text.split("\n");
    const memberRoles = /^(.+?(?:委員長|副委員長|委員|議長|副議長))\s+(.+)/;
    let currentSpeaker = "";
    let currentContent: string[] = [];

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      const match = trimmed.match(memberRoles);
      if (match) {
        const name = match[1].replace(/\s+/g, "");
        // Filter out admin staff
        if (/町長|副町長|教育長|部長|課長|次長|参事|室長|監$|理事/.test(name)) {
          currentSpeaker = "";
          currentContent = [];
          continue;
        }

        // Save previous
        if (currentSpeaker && currentContent.length > 0) {
          const content = currentContent.join(" ").trim();
          if (content.length > 10) {
            speeches.push({ speaker: currentSpeaker, content });
          }
        }

        currentSpeaker = name;
        currentContent = [match[2].trim()];
      } else if (currentSpeaker) {
        currentContent.push(trimmed);
      }
    }

    // Save last
    if (currentSpeaker && currentContent.length > 0) {
      const content = currentContent.join(" ").trim();
      if (content.length > 10) {
        speeches.push({ speaker: currentSpeaker, content });
      }
    }
  }

  return speeches;
}

// -- Main --
async function main() {
  console.log("=== 岬町会議録収集開始 ===\n");
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

        const pdfRes = await fetch(pdfLink.url);
        if (!pdfRes.ok) {
          console.error(`    ✗ HTTP ${pdfRes.status}`);
          await sleep(2000);
          continue;
        }
        const buffer = Buffer.from(await pdfRes.arrayBuffer());
        const pdfData = await pdf(buffer);
        const text: string = pdfData.text;

        if (!text || text.length < 100) {
          console.log(`    スキップ（テキスト抽出不可）`);
          await sleep(2000);
          continue;
        }

        // Detect committee vs honkaigi
        const isCommittee = /委員会/.test(pdfLink.title);
        const speeches = parseSpeechesFromText(text, isCommittee);

        if (speeches.length === 0) {
          console.log(`    発言なし`);
          await sleep(2000);
          continue;
        }

        const sessionName = buildSessionName(pdfLink.title);
        const sessionDate = extractDate(pdfLink.title);

        // Batch insert
        const BATCH = 100;
        let inserted = 0;
        for (let i = 0; i < speeches.length; i += BATCH) {
          const batch = speeches.slice(i, i + BATCH).map((s) => ({
            city: "misaki",
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
