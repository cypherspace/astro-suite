// Sky images, name lookups and the star/galaxy searches normally come from
// the Strasbourg Astronomical Data Centre (CDS). When CDS is down the app
// switches to backup copies where one exists (ESA for sky pictures, GAVO
// in Heidelberg for Gaia stars, Harvard for SIMBAD names). These messages
// explain what's happening in plain language.

export const CDS_NEWS_URL = "https://cds.unistra.fr/news/";

export const SKY_UNAVAILABLE_TITLE = "The sky map is unavailable right now";

export const SKY_UNAVAILABLE_TEXT =
  "The pictures of the night sky come from the Strasbourg Astronomical " +
  "Data Centre (CDS) in France, with a backup copy at the European Space " +
  "Agency. Neither is responding at the moment, so the sky can't be shown. " +
  "This is a problem at their end, not with your device, and it usually " +
  "clears up within a few hours. Everything else in the app still works.";

export const SKY_FALLBACK_NOTE =
  "The Strasbourg data centre (CDS) isn't responding, so the sky pictures " +
  "are coming from the European Space Agency's backup copy.";

export const OFFLINE_TITLE = "You appear to be offline";

export const OFFLINE_TEXT =
  "The sky map needs an internet connection to download pictures of the " +
  "night sky. Check your connection, then try again.";

export const STAR_SEARCH_UNAVAILABLE_TEXT =
  "Star search unavailable: the Strasbourg Astronomical Data Centre (CDS) " +
  "and our backup source (GAVO in Heidelberg) are both not responding " +
  "right now. This is a problem at their end and usually clears up within " +
  "a few hours.";

export const STAR_SEARCH_FALLBACK_NOTE =
  "from the GAVO backup in Heidelberg, as the Strasbourg data centre (CDS) " +
  "isn't responding";

export const GALAXY_SEARCH_UNAVAILABLE_TEXT =
  "Galaxy search unavailable: the galaxy catalogues come from the " +
  "Strasbourg Astronomical Data Centre (CDS), which isn't responding right " +
  "now, and there's no backup copy we can use. This is a problem at their " +
  "end and usually clears up within a few hours.";

// Aladin asks this MocServer endpoint where a survey's images live before
// it can draw anything, so it is the request that hangs during an outage.
const CDS_PROBE_URL =
  "https://alasky.unistra.fr/MocServer/query?get=record&fmt=json&ID=*P%2FDSS2%2Fcolor*";

// ESA ESASky hosts copies of some of the same image surveys (HiPS).
const ESASKY_BASE = "https://skies.esac.esa.int";
const ESASKY_PROBE_URL = `${ESASKY_BASE}/DSSColor/properties`;

// Survey IDs we offer, mapped to ESASky copies. Surveys ESASky doesn't
// host fall back to DSS2 colour.
const ESASKY_SURVEYS: Record<string, string> = {
  "P/DSS2/color": `${ESASKY_BASE}/DSSColor/`,
  "P/2MASS/color": `${ESASKY_BASE}/2MASSColor/`,
};

export function esaskySurveyFor(surveyId: string): string {
  return ESASKY_SURVEYS[surveyId] ?? ESASKY_SURVEYS["P/DSS2/color"];
}

async function isReachable(url: string, timeoutMs: number): Promise<boolean> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { cache: "no-store", signal: ctrl.signal });
    return res.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

export function isCdsReachable(timeoutMs = 10000): Promise<boolean> {
  return isReachable(CDS_PROBE_URL, timeoutMs);
}

export function isEsaskyReachable(timeoutMs = 10000): Promise<boolean> {
  return isReachable(ESASKY_PROBE_URL, timeoutMs);
}

// Combines a caller's AbortSignal with a timeout, so a CDS request that
// hangs (rather than erroring) is treated as "unavailable" and the caller
// can move on to a backup.
export function withTimeout(
  signal: AbortSignal | undefined,
  ms: number,
): { signal: AbortSignal; clear: () => void } {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  if (signal) {
    if (signal.aborted) ctrl.abort();
    else signal.addEventListener("abort", () => ctrl.abort(), { once: true });
  }
  return { signal: ctrl.signal, clear: () => clearTimeout(timer) };
}
