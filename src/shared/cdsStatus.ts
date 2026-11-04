// Sky images, name lookups and the star/galaxy searches all come from the
// Strasbourg Astronomical Data Centre (CDS). When CDS is down, Aladin and
// the searches hang or return 503s with no useful explanation, so these
// messages say what is actually going on in plain language.

export const SKY_UNAVAILABLE_TITLE = "The sky map is unavailable right now";

export const SKY_UNAVAILABLE_TEXT =
  "The pictures of the night sky come from the Strasbourg Astronomical " +
  "Data Centre (CDS) in France, and their servers aren't responding at the " +
  "moment. The star and galaxy searches use the same servers, so they " +
  "won't work either. This is a problem at their end, not with your " +
  "device, and it usually clears up within a few hours. Everything else " +
  "in the app still works.";

export const OFFLINE_TITLE = "You appear to be offline";

export const OFFLINE_TEXT =
  "The sky map needs an internet connection to download pictures of the " +
  "night sky. Check your connection, then try again.";

export const SEARCH_UNAVAILABLE_TEXT =
  "Search unavailable: the Strasbourg Astronomical Data Centre (CDS), " +
  "where the data comes from, isn't responding right now. This is a " +
  "problem at their end and usually clears up within a few hours.";

// Aladin asks this MocServer endpoint where a survey's images live before
// it can draw anything, so it is the request that hangs during an outage.
const PROBE_URL =
  "https://alasky.unistra.fr/MocServer/query?get=record&fmt=json&ID=*P%2FDSS2%2Fcolor*";

export async function isCdsReachable(timeoutMs = 10000): Promise<boolean> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(PROBE_URL, { cache: "no-store", signal: ctrl.signal });
    return res.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}
