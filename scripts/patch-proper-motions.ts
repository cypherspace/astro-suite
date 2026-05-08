// scripts/patch-proper-motions.ts
//
// One-shot: reads /tmp/pms.json (output of fetch-proper-motions.ts)
// and inserts `pmRaMasYr` / `pmDecMasYr` fields into each matching
// star block in src/apps/hr/data/sampleStars.ts. Run once after
// fetching the proper motions; not part of the regular build.
//
//   npx tsx scripts/patch-proper-motions.ts /tmp/pms.json
//
// The match anchors on the line `id: "<id>",` and inserts the new
// fields directly after the `ra: ..., dec: ...,` line. Safe to re-run
// — already-patched entries are skipped.

import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const pmsPath = process.argv[2] ?? "/tmp/pms.json";
const targetPath = resolve(
  process.cwd(),
  "src/apps/hr/data/sampleStars.ts",
);

const pms = JSON.parse(readFileSync(pmsPath, "utf8")) as Record<
  string,
  { pmRaMasYr: number; pmDecMasYr: number }
>;

const src = readFileSync(targetPath, "utf8");
const lines = src.split(/\r?\n/);

let replaced = 0;
let skipped = 0;
for (const id of Object.keys(pms)) {
  // Locate the `id: "<id>",` line.
  const idLine = `id: "${id}",`;
  const idx = lines.findIndex((l) => l.trim() === idLine);
  if (idx === -1) {
    process.stderr.write(`MISS  ${id} (id line not found)\n`);
    continue;
  }
  // Look ahead up to 6 lines for the `ra: ..., dec: ...,` line.
  let raLineIdx = -1;
  for (let j = idx + 1; j < Math.min(idx + 8, lines.length); j++) {
    if (/^\s*ra:\s*[-\d.]+,\s*dec:\s*[-\d.]+,\s*$/.test(lines[j])) {
      raLineIdx = j;
      break;
    }
  }
  if (raLineIdx === -1) {
    process.stderr.write(`MISS  ${id} (ra/dec line not found)\n`);
    continue;
  }
  // Skip if already patched.
  if (
    raLineIdx + 1 < lines.length &&
    /pmRaMasYr/.test(lines[raLineIdx + 1])
  ) {
    skipped++;
    continue;
  }
  const indent = lines[raLineIdx].match(/^\s*/)?.[0] ?? "    ";
  const pm = pms[id];
  const newLine = `${indent}pmRaMasYr: ${pm.pmRaMasYr}, pmDecMasYr: ${pm.pmDecMasYr},`;
  lines.splice(raLineIdx + 1, 0, newLine);
  replaced++;
}

writeFileSync(targetPath, lines.join("\n"), "utf8");
process.stderr.write(
  `Patched ${replaced} stars in ${targetPath}, skipped ${skipped} already patched.\n`,
);
