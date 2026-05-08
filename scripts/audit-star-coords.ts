// scripts/audit-star-coords.ts
//
// Hits SIMBAD's sim-id endpoint for every entry in
// src/apps/hr/data/sampleStars.ts and prints a diff against the
// curated RA/Dec. Run locally:
//
//   npx tsx scripts/audit-star-coords.ts
//
// Skips the Sun (dummy 0,0). Rate-limits to ~5 req/s out of
// politeness to CDS Strasbourg.

import { SAMPLE_STARS } from "../src/apps/hr/data/sampleStars";

// Curated names that aren't SIMBAD-friendly as-is. Anything not in
// this map is sent straight through; SIMBAD's name parser is
// forgiving. If you see a "could not resolve" line below, add the
// star here with a known-good identifier and re-run.
const NAME_OVERRIDES: Record<string, string> = {
  "Sun": "",                            // skip — dummy 0,0
  "Mu Cephei (Garnet Star)": "mu Cep",
  "40 Eridani B": "40 Eri B",
  // SIMBAD's "Van Maanen's Star" entry isn't reliably parsed; "GJ 35"
  // (the Gliese-Jahreiss catalog ID) is the canonical resolver.
  "Van Maanen 2": "GJ 35",
  "LP 145-141": "Gliese 440",
};

const RA_TOL_DEG = 0.05;   // ~3 arcmin — flag anything bigger
const DEC_TOL_DEG = 0.05;
const POLITE_GAP_MS = 200; // 5 req/s

interface Coord { raDeg: number; decDeg: number; }

function hmsToDeg(h: number, m: number, sec: number): number {
  return (h + m / 60 + sec / 3600) * 15;
}
function dmsToDeg(sign: number, d: number, m: number, sec: number): number {
  return sign * (d + m / 60 + sec / 3600);
}

async function fetchSimbad(name: string): Promise<Coord | null> {
  const url =
    "https://simbad.cds.unistra.fr/simbad/sim-id?Ident=" +
    encodeURIComponent(name) + "&output.format=ASCII";
  let res: Response;
  try {
    res = await fetch(url, {
      headers: { "User-Agent": "astro-suite-audit/0.1 (local dev)" },
    });
  } catch (e) {
    console.error(`  network error for "${name}":`, (e as Error).message);
    return null;
  }
  if (!res.ok) {
    console.error(`  HTTP ${res.status} for "${name}"`);
    return null;
  }
  const text = await res.text();
  // "Coordinates(ICRS,ep=J2000,eq=2000): 18 36 56.33635 +38 47 01.2802 ..."
  const m = text.match(
    /Coordinates\(ICRS[^)]*\):\s*(\d{1,2})\s+(\d{1,2})\s+([\d.]+)\s+([+-]?)(\d{1,2})\s+(\d{1,2})\s+([\d.]+)/,
  );
  if (!m) return null;
  return {
    raDeg: hmsToDeg(+m[1], +m[2], +m[3]),
    decDeg: dmsToDeg(m[4] === "-" ? -1 : 1, +m[5], +m[6], +m[7]),
  };
}

(async () => {
  console.log("Auditing curated star coords against SIMBAD ICRS J2000…\n");
  let ok = 0, bad = 0, unresolved = 0, skipped = 0;
  for (const s of SAMPLE_STARS) {
    const lookup = NAME_OVERRIDES[s.name] ?? s.name;
    if (!lookup) {
      console.log(`SKIP      ${s.id.padEnd(22)} (${s.name})`);
      skipped++;
      continue;
    }
    process.stdout.write(`${s.id.padEnd(22)} ${s.name.padEnd(28)} `);
    const coord = await fetchSimbad(lookup);
    if (!coord) {
      console.log("UNRESOLVED");
      unresolved++;
      continue;
    }
    const dRa = coord.raDeg - s.ra;
    const dDec = coord.decDeg - s.dec;
    const dSky = Math.hypot(
      dRa * Math.cos((coord.decDeg * Math.PI) / 180),
      dDec,
    );
    if (Math.abs(dRa) > RA_TOL_DEG || Math.abs(dDec) > DEC_TOL_DEG) {
      console.log(
        `MISMATCH  curated=(${s.ra}, ${s.dec})  simbad=(${
          coord.raDeg.toFixed(4)}, ${coord.decDeg.toFixed(4)
        })  ΔRA=${dRa.toFixed(3)}°  ΔDec=${dDec.toFixed(3)}°  Δsky=${dSky.toFixed(3)}°`,
      );
      bad++;
    } else {
      console.log(`ok  Δsky=${(dSky * 60).toFixed(2)}'`);
      ok++;
    }
    await new Promise((r) => setTimeout(r, POLITE_GAP_MS));
  }
  console.log(
    `\nSummary: ${ok} ok, ${bad} mismatches, ${unresolved} unresolved, ${skipped} skipped.`,
  );
})().catch((e) => { console.error(e); process.exit(1); });