/**
 * import-sennan-teireikai.ts
 * Import Sennan city council meeting text files into speeches table
 *
 * Usage: npx tsx scripts/import-sennan-teireikai.ts
 */

import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";
import { execSync } from "child_process";

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const SRC_DIR = "C:\\Users\\USER\\Downloads\\定例会本文";

// -- Get file list via PowerShell (handles Japanese filenames) --
function getFileList(): string[] {
  const cmd = `powershell.exe -Command "[Console]::OutputEncoding = [System.Text.Encoding]::UTF8; Get-ChildItem '${SRC_DIR}' -Filter '*.txt' -Name | Where-Object { $_ -ne 'all_in_one.txt' }"`;
  const output = execSync(cmd, { encoding: "utf-8" });
  return output.trim().split("\n").map((f) => f.trim()).filter(Boolean);
}

// -- Read file as Shift-JIS --
function readShiftJIS(filePath: string): string {
  const cmd = `powershell.exe -Command "[Console]::OutputEncoding = [System.Text.Encoding]::UTF8; [System.IO.File]::ReadAllText('${filePath}', [System.Text.Encoding]::GetEncoding('shift_jis'))"`;
  return execSync(cmd, { encoding: "utf-8", maxBuffer: 10 * 1024 * 1024 });
}

// -- Parse filename --
// "100令和２年第４回定例会（第２号）　本文開催日 2020-12-10.txt"
function parseFilename(filename: string): { sessionName: string; sessionDate: string } | null {
  const dateMatch = filename.match(/(\d{4}-\d{2}-\d{2})/);
  const nameMatch = filename.match(/\d+(.*?)　本文/);
  if (!dateMatch || !nameMatch) return null;
  return {
    sessionName: nameMatch[1].trim(),
    sessionDate: dateMatch[1],
  };
}

// -- Parse speeches from text --
// Pattern: ◯議長（名前君）, ◯XX番（名前君）
function parseSpeechesFromText(text: string): { speaker: string; content: string }[] {
  const speeches: { speaker: string; content: string }[] = [];
  const re = /◯(?:議長|副議長|\d+番)（(.+?)(?:君|さん)）/g;

  const markers: { name: string; pos: number; end: number }[] = [];
  for (const m of text.matchAll(re)) {
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

// -- Get existing session names to skip --
async function getExistingSessions(): Promise<Set<string>> {
  const { data } = await supabase
    .from("speeches")
    .select("session_name, session_date")
    .eq("city", "sennan");

  const keys = new Set<string>();
  if (data) {
    for (const r of data) {
      keys.add(`${r.session_name}|${r.session_date ?? ""}`);
    }
  }
  return keys;
}

// -- Main --
async function main() {
  console.log("=== 泉南市定例会テキスト登録開始 ===\n");

  const existingSessions = await getExistingSessions();
  const files = getFileList();
  console.log(`ファイル数: ${files.length}`);

  let totalInserted = 0;
  let skippedFiles = 0;

  for (const filename of files) {
    const parsed = parseFilename(filename);
    if (!parsed) {
      console.log(`  スキップ（パース不可）: ${filename}`);
      continue;
    }

    // Check if already imported
    const key = `${parsed.sessionName}|${parsed.sessionDate}`;
    if (existingSessions.has(key)) {
      skippedFiles++;
      continue;
    }

    try {
      const filePath = path.join(SRC_DIR, filename);
      const text = readShiftJIS(filePath);
      const speeches = parseSpeechesFromText(text);

      if (speeches.length === 0) {
        console.log(`  発言なし: ${filename}`);
        continue;
      }

      // Batch insert
      const BATCH = 100;
      let inserted = 0;
      for (let i = 0; i < speeches.length; i += BATCH) {
        const batch = speeches.slice(i, i + BATCH).map((s) => ({
          city: "sennan",
          member_name: s.speaker,
          session_name: parsed.sessionName,
          session_date: parsed.sessionDate,
          content: s.content,
          source_url: null,
        }));

        const { error } = await supabase.from("speeches").insert(batch);
        if (error) {
          console.error(`  ✗ INSERT: ${error.message}`);
        } else {
          inserted += batch.length;
        }
      }

      console.log(`✓ ${parsed.sessionName} (${parsed.sessionDate}): ${inserted}件`);
      totalInserted += inserted;
      existingSessions.add(key);
    } catch (err) {
      console.error(`  ✗ ${filename}: ${err instanceof Error ? err.message : err}`);
    }
  }

  console.log(`\n=== 完了: ${totalInserted}件登録 / ${skippedFiles}件スキップ（登録済み） ===`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
