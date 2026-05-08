// Apply each star's catalogued proper motion to drift its J2000.0
// position to a different epoch. Used so curated markers land on the
// star's photographed position in the active sky survey, not its
// J2000 catalogue position. For high-proper-motion stars (Barnard's,
// Wolf 359, Proxima, 40 Eri B) the difference is visible at a glance
// — a couple of arcminutes between the J2000 marker and the actual
// blob of light on the DSS2 / PanSTARRS plate.
//
// Convention matches Gaia DR3 / SIMBAD ASCII:
//   pmRaMasYr  =  mu_alpha * cos(delta)   in mas/yr
//   pmDecMasYr =  mu_delta                in mas/yr
//
// The cos(delta) is *already* baked into the catalogued pmra value,
// so to recover the literal change in RA degrees we have to divide
// by cos(delta) again on the way out.

import type { Star } from "../types";

/** Representative epoch for each Aladin sky-survey HiPS, expressed
 *  as a decimal year. These are mid-points / typical observation
 *  dates — close enough for a teaching-grade visual alignment.
 *  - DSS2:        photographic plates, mostly 1980s–early 1990s
 *  - PanSTARRS:   3π survey 2010-04 to 2014-03
 *  - SDSS DR9:    main survey 2000-04 to 2008
 *  - 2MASS:       1997-06 to 2001-02
 */
export const SURVEY_EPOCH: Record<string, number> = {
  "P/DSS2/color": 1991.0,
  "P/PanSTARRS/DR1/color-z-zg-g": 2012.0,
  "P/SDSS9/color": 2003.0,
  "P/2MASS/color": 1999.0,
};

/** Default fallback epoch when the active survey isn't in the map
 *  above (e.g. a future-added HiPS). PanSTARRS-ish — recent enough
 *  to be useful, late enough to differ visibly from J2000 markers. */
export const DEFAULT_EPOCH = 2012.0;

export function epochFor(survey: string | undefined | null): number {
  if (!survey) return DEFAULT_EPOCH;
  return SURVEY_EPOCH[survey] ?? DEFAULT_EPOCH;
}

/** Propagate a star's J2000.0 ICRS position to the given decimal
 *  year using its catalogued proper motion. Returns the original
 *  ra/dec untouched if the star carries no proper motion (most
 *  catalogue stars in our sample list move sub-pixel in any direction
 *  relative to a 2 billion-point Aladin canvas, so it doesn't matter). */
export function propagateToEpoch(
  star: Star,
  epoch: number,
): { ra: number; dec: number } {
  const pmRa = star.pmRaMasYr ?? 0;
  const pmDec = star.pmDecMasYr ?? 0;
  if (pmRa === 0 && pmDec === 0) {
    return { ra: star.ra, dec: star.dec };
  }
  const dt = epoch - 2000.0; // J2000.0 reference
  const decRad = (star.dec * Math.PI) / 180;
  const cosDec = Math.cos(decRad);
  // Guard against the poles — divide-by-near-zero would amplify any
  // small pmRa into a huge RA shift. Polaris is at +89.26°, cosDec ~ 0.013.
  // A straight 1/cosDec would over-shift; clamp at 0.05 (≈ ±87°).
  const safeCos = Math.max(0.05, Math.abs(cosDec)) * Math.sign(cosDec || 1);
  const dRa = (pmRa * dt) / (3600 * 1000) / safeCos;
  const dDec = (pmDec * dt) / (3600 * 1000);
  return { ra: star.ra + dRa, dec: star.dec + dDec };
}
