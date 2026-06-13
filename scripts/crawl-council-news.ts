/**
 * crawl-council-news.ts
 * 4市町の議会サイトをクロールして council_news テーブルに登録する
 *
 * 使い方:
 *   npx tsx scripts/crawl-council-news.ts
 */

import { createClient } from "@supabase/supabase-js";
import * as cheerio from "cheerio";

const SUPABASE_URL = process.env.SUPABASE_URL || "https://supabase.hama02.shizuku.net";
const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  "REMOVED_SERVICE_ROLE_KEY";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

type NewsItem = {
  city: string;
  event_date: string | null;
  title: string;
  url: string | null;
};

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchHtml(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { "User-Agent": "SenshuSeijiMap/1.0 (council news crawler)" },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${url}`);
  return res.text();
}

// ── 泉南市 ──────────────────────────────────────────────────────
// WordPress の RSS フィードから取得（日付付き）
async function crawlSennan(): Promise<NewsItem[]> {
  const html = await fetchHtml("https://gikai.city.sennan.osaka.jp/feed/");
  const $ = cheerio.load(html, { xml: true });
  const items: NewsItem[] = [];

  $("item").each((_, el) => {
    const title = $(el).find("title").text().trim();
    const link = $(el).find("link").text().trim();
    const pubDate = $(el).find("pubDate").text().trim();

    if (!title) return;

    let eventDate: string | null = null;
    if (pubDate) {
      const d = new Date(pubDate);
      if (!isNaN(d.getTime())) {
        eventDate = d.toISOString().slice(0, 10);
      }
    }

    items.push({ city: "sennan", event_date: eventDate, title, url: link || null });
  });

  return items;
}

// ── 阪南市 ──────────────────────────────────────────────────────
// 定例会ページから最新の定例会名と日程テーブルを取得
async function crawlHannan(): Promise<NewsItem[]> {
  const html = await fetchHtml("https://www.city.hannan.lg.jp/shigikai/annai/teirei/index.html");
  const $ = cheerio.load(html);
  const items: NewsItem[] = [];

  // 定例会名（例：令和8年第2回定例会）
  const sessionName = $("div.free-layout-area h2").first().text().replace(/\s+/g, "").trim();

  // 日程テーブルの行を取得
  $("div.wysiwyg table tbody tr").each((i, el) => {
    if (i === 0) return; // ヘッダー行をスキップ
    const cells = $(el).find("td");
    if (cells.length < 3) return;

    const dateText = $(cells[0]).text().trim(); // "6月2日"
    const schedule = $(cells[2]).text().trim();  // "個人質問"

    if (!dateText || !schedule) return;

    // 日付を YYYY-MM-DD に変換
    const dateMatch = dateText.match(/(\d+)月(\d+)日/);
    let eventDate: string | null = null;
    if (dateMatch) {
      const now = new Date();
      const month = dateMatch[1].padStart(2, "0");
      const day = dateMatch[2].padStart(2, "0");
      eventDate = `${now.getFullYear()}-${month}-${day}`;
    }

    items.push({
      city: "hannan",
      event_date: eventDate,
      title: `${sessionName} ${schedule}`,
      url: "https://www.city.hannan.lg.jp/shigikai/annai/teirei/index.html",
    });
  });

  return items;
}

// ── 岬町 ──────────────────────────────────────────────────────
// 議会日程テーブルから取得
async function crawlMisaki(): Promise<NewsItem[]> {
  const html = await fetchHtml("https://www.town.misaki.osaka.jp/soshiki/gikai/chogikai/index.html");
  const $ = cheerio.load(html);
  const items: NewsItem[] = [];

  $("div.wysiwyg table tbody tr").each((i, el) => {
    if (i === 0) return; // ヘッダー行
    const cells = $(el).find("td");
    if (cells.length < 4) return;

    const dateText = $(cells[0]).text().trim(); // "6/3"
    const schedule = $(cells[3]).text().trim();  // "第2回定例会1日目"

    if (!dateText || !schedule) return;

    const dateMatch = dateText.match(/(\d+)\/(\d+)/);
    let eventDate: string | null = null;
    if (dateMatch) {
      const now = new Date();
      const month = dateMatch[1].padStart(2, "0");
      const day = dateMatch[2].padStart(2, "0");
      eventDate = `${now.getFullYear()}-${month}-${day}`;
    }

    items.push({
      city: "misaki",
      event_date: eventDate,
      title: schedule,
      url: "https://www.town.misaki.osaka.jp/soshiki/gikai/chogikai/index.html",
    });
  });

  return items;
}

// ── 田尻町 ──────────────────────────────────────────────────────
// PDFリンクの一覧からタイトルを取得（直近のもの）
async function crawlTajiri(): Promise<NewsItem[]> {
  const html = await fetchHtml("https://www.town.tajiri.osaka.jp/kakukanojoho/gikaijimukyoku/kaigijoho/3/1133.html");
  const $ = cheerio.load(html);
  const items: NewsItem[] = [];

  // 更新日を取得
  const updateText = $("p.update").text().trim(); // "更新日：2026年05月18日"
  let baseDate: string | null = null;
  const udMatch = updateText.match(/(\d{4})年(\d{2})月(\d{2})日/);
  if (udMatch) {
    baseDate = `${udMatch[1]}-${udMatch[2]}-${udMatch[3]}`;
  }

  // PDFリンクから直近のものを取得（最大5件）
  $("p.file-link-item a.pdf").slice(0, 5).each((_, el) => {
    const title = $(el).text().replace(/\(PDF.*?\)/i, "").trim();
    const href = $(el).attr("href");
    const url = href ? (href.startsWith("//") ? `https:${href}` : href) : null;

    if (!title) return;

    items.push({
      city: "tajiri",
      event_date: baseDate,
      title,
      url,
    });
  });

  return items;
}

// ── メイン ──────────────────────────────────────────────────────

type Crawler = { city: string; fn: () => Promise<NewsItem[]> };

const crawlers: Crawler[] = [
  { city: "泉南市",   fn: crawlSennan },
  { city: "阪南市",   fn: crawlHannan },
  { city: "岬町",     fn: crawlMisaki },
  { city: "田尻町",   fn: crawlTajiri },
];

async function main() {
  console.log("=== 議会ニュースクロール開始 ===\n");
  let totalInserted = 0;

  for (const { city, fn } of crawlers) {
    try {
      const items = await fn();
      console.log(`${city}: ${items.length}件取得`);

      for (const item of items) {
        const { error } = await supabase
          .from("council_news")
          .upsert(
            {
              city: item.city,
              event_date: item.event_date,
              title: item.title,
              url: item.url,
            },
            { onConflict: "city,event_date,title", ignoreDuplicates: true }
          );

        if (error) {
          console.error(`  ✗ ${item.title}: ${error.message}`);
        } else {
          totalInserted++;
        }
      }
    } catch (err) {
      console.error(`${city}: エラー — ${err instanceof Error ? err.message : err}`);
    }

    await sleep(1500);
  }

  console.log(`\n=== 完了: ${totalInserted}件処理 ===`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
