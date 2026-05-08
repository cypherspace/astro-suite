// scripts/fetch-proper-motions.ts
//
// Hits SIMBAD's sim-id endpoint for every curated H-R star and emits
// a TypeScript snippet that maps star id → { pmRaMasYr, pmDecMasYr }.
// Paste the snippet into src/apps/hr/data/sampleStars.ts (or use the
// JSON output to drive a one-shot patch).
//
//   npx tsx scripts/fetch-proper-motions.ts > /tmp/pms.ts
//
// Skips the Sun. Rate-limits to ~5 req/s out of politeness to CDS.
//
// SIMBAD's "Proper motions" line in ASCII output looks like:
//   Proper motions:   -797.84 10277.32 [0.18 0.20 0]   2020yCat.1350....0G
// Numbers are mu_alpha*cos(delta) and mu_delta in mas/yr respectively
// (the same convention Gaia DR3 uses), so they slot straight into our
// propagateToEpoch() helper without further trig.

import { SAMPLE_STARS } from "../src/apps/hr/data/sampleStars";

const NAME_OVERRIDES: Record<string, string> = {
  "Sun": "",
  "Mu Cephei (Garnet Star)": "mu Cep",
  "40 Eridani B": "40 Eri B",
  "Van Maanen 2": "GJ 35",
  "LP 145-141": "Gliese 440",
};

const POLITE_GAP_MS = 200;

interface Pm { pmRaMasYr: number; pmDecMasYr: number; }

async function fetchPm(name: string): Promise<Pm | null> {
  const url =
    "https://simbad.cds.unistra.fr/simbad/sim-id?Ident=" +
    encodeURIComponent(name) + "&output.format=ASCII";
  let res: Response;
  try {
    res = await fetch(url, {
      headers: { "User-Agent": "astro-suite-pm-fetch/0.1 (local dev)" },
    });
  } catch {
    return null;
  }
  if (!res.ok) return null;
  const text = await res.text();
  const m = text.match(/Proper motions:\s*(-?[\d.]+)\s+(-?[\d.]+)/);
  if (!m) return null;
  return {
    pmRaMasYr: parseFloat(m[1]),
    pmDecMasYr: parseFloat(m[2]),
  };
}

(async () => {
  const out: Record<string, Pm> = {};
  for (const s of SAMPLE_STARS) {
    const lookup = NAME_OVERRIDES[s.name] ?? s.name;
    if (!lookup) {
      process.stderr.write(`SKIP   ${s.id}\n`);
      continue;
    }
    process.stderr.write(`fetch  ${s.id.padEnd(22)} ${s.name}…\n`);
    const pm = await fetchPm(lookup);
    if (!pm) {
      process.stderr.write(`  unresolved\n`);
      continue;
    }
    out[s.id] = pm;
    await new Promise((r) => setTimeout(r, POLITE_GAP_MS));
  }
  // Emit a JSON map to stdout — easy to paste, easy to grep.
  process.stdout.write(JSON.stringify(out, null, 2));
  process.stdout.write("\n");
  process.stderr.write(`\nDone. ${Object.keys(out).length} of ${SAMPLE_STARS.length} resolved.\n`);
})().catch((e) => { console.error(e); process.exit(1); });
