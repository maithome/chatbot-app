import { readFileSync } from "fs";
import path from "path";

type Row = { id: string; teema: string; tase: string; kysimus: string; vastus: string };

export const FALLBACK_ANSWER =
  "Ma ei leidnud sellele küsimusele näidisvastust. Küsi näiteks käänete, tegusõnade pööramise, kellaaegade või igapäevafraaside kohta.";

let rows: Row[] | null = null;

// Minimal CSV parser: handles quoted fields, doubled quotes and commas inside quotes.
function parseCsv(text: string): string[][] {
  const out: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') inQuotes = false;
      else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      if (row.some((f) => f !== "")) out.push(row);
      row = [];
      field = "";
    } else field += c;
  }
  row.push(field);
  if (row.some((f) => f !== "")) out.push(row);
  return out;
}

function loadRows(): Row[] {
  if (rows) return rows;
  const file = path.join(process.cwd(), "data", "naidisvastused.csv");
  const [header, ...data] = parseCsv(readFileSync(file, "utf8").replace(/^﻿/, ""));
  rows = data.map((r) => Object.fromEntries(header.map((h, i) => [h.trim(), r[i] ?? ""])) as Row);
  return rows;
}

function words(text: string): Set<string> {
  const cleaned = text.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, " ");
  return new Set(cleaned.split(/\s+/).filter((w) => w.length >= 3));
}

export function findAnswer(text: string): string {
  let data: Row[];
  try {
    data = loadRows();
  } catch (err) {
    console.error("Could not read data/naidisvastused.csv", err);
    return FALLBACK_ANSWER;
  }
  const query = words(text);
  let best: Row | null = null;
  let bestScore = 0;
  for (const row of data) {
    let score = 0;
    for (const w of words(row.kysimus)) if (query.has(w)) score++;
    if (score > bestScore) {
      best = row;
      bestScore = score;
    }
  }
  return best && bestScore >= 2 ? best.vastus : FALLBACK_ANSWER;
}

export async function sendMessage(
  text: string,
  _model: string,
  _settings: { temperature: number; topP: number; systemPrompt?: string | null },
): Promise<string> {
  await new Promise((r) => setTimeout(r, 1500));
  return findAnswer(text);
}
