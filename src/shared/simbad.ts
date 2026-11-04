// Async SIMBAD lookup for Gaia DR3 stars. SIMBAD (CDS Strasbourg) is the
// standard astronomy cross-identification database. For Gaia stars that
// correspond to a previously-named star, SIMBAD gives back its main
// identifier — typically the proper name ("Alnitak") or a Bayer
// designation ("* zet Ori A"). We fetch the plain-text "ASCII" output
// and parse the `Object` line.

import { withTimeout } from "./cdsStatus";

const GREEK_LETTERS: Record<string, string> = {
  alf: "α",
  bet: "β",
  gam: "γ",
  del: "δ",
  eps: "ε",
  zet: "ζ",
  eta: "η",
  the: "θ",
  iot: "ι",
  kap: "κ",
  lam: "λ",
  mu: "μ",
  nu: "ν",
  xi: "ξ",
  omi: "ο",
  pi: "π",
  rho: "ρ",
  sig: "σ",
  tau: "τ",
  ups: "υ",
  phi: "φ",
  chi: "χ",
  psi: "ψ",
  ome: "ω",
};

export interface SimbadIdentity {
  display: string;
  raw: string;
}

// CDS's own SIMBAD first, then the Harvard (CfA) mirror CDS recommends
// during outages. After CDS fails we go straight to the mirror for a while.
const SIMBAD_HOSTS = [
  "https://simbad.cds.unistra.fr",
  "https://simbad.cfa.harvard.edu",
];
const CDS_TIMEOUT_MS = 8000;
const CDS_DOWN_MEMO_MS = 5 * 60 * 1000;
let cdsDownUntil = 0;

export async function lookupSimbadName(
  gaiaSourceId: string,
  signal?: AbortSignal,
): Promise<SimbadIdentity | null> {
  const ident = encodeURIComponent(`Gaia DR3 ${gaiaSourceId}`);
  const path =
    `/simbad/sim-id?Ident=${ident}` +
    `&output.format=ASCII&obj.bibsel=off&obj.notesel=off&obj.mesdisp=N`;
  const hosts = Date.now() < cdsDownUntil ? SIMBAD_HOSTS.slice(1) : SIMBAD_HOSTS;
  for (const host of hosts) {
    const isCds = host === SIMBAD_HOSTS[0];
    const t = withTimeout(signal, isCds ? CDS_TIMEOUT_MS : 15000);
    try {
      const res = await fetch(host + path, { signal: t.signal });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const text = await res.text();
      // A successful response with no Object line means SIMBAD doesn't
      // know this star; the mirror won't either.
      const match = text.match(/^Object\s+(.+?)\s+---/m);
      if (!match) return null;
      const raw = match[1].trim();
      return { raw, display: prettify(raw) };
    } catch {
      if (signal?.aborted) return null;
      if (isCds) cdsDownUntil = Date.now() + CDS_DOWN_MEMO_MS;
    } finally {
      t.clear();
    }
  }
  return null;
}

export function prettify(simbadId: string): string {
  let s = simbadId.trim();
  s = s.replace(/^NAME\s+/, "");
  s = s.replace(/^V\*\s+/, "");
  s = s.replace(/^\*\*\s+/, "");
  s = s.replace(/^\*\s+/, "");

  const bayerRe = new RegExp(
    `^(${Object.keys(GREEK_LETTERS).join("|")})(\\d*)\\b`,
  );
  const m = s.match(bayerRe);
  if (m) {
    const greek = GREEK_LETTERS[m[1]];
    const sup = m[2] ? superscript(m[2]) : "";
    s = s.replace(bayerRe, `${greek}${sup}`);
  }
  return s;
}

function superscript(digits: string): string {
  const map: Record<string, string> = {
    "0": "⁰",
    "1": "¹",
    "2": "²",
    "3": "³",
    "4": "⁴",
    "5": "⁵",
    "6": "⁶",
    "7": "⁷",
    "8": "⁸",
    "9": "⁹",
  };
  return [...digits].map((d) => map[d] ?? d).join("");
}
