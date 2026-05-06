// Russell 1914 guided-tour dataset.
//
// Henry Norris Russell's "Relations Between the Spectra and Other
// Characteristics of the Stars" (Popular Astronomy 22, 275–294 / 331–351,
// 1914) plotted around 200 stars on the diagram we now call the
// Hertzsprung–Russell diagram. The paper does not list which 200; the
// figure is a dense scatter of unlabelled points. Russell tells us in
// the prose that the data came from four named pools:
//
//   1. Annie Jump Cannon's Harvard spectral classifications (the
//      Henry Draper precursor work).
//   2. Trigonometric parallaxes of nearby bright stars.
//   3. Members of the Hyades open cluster, distances from the moving-
//      cluster method.
//   4. Maury's "c-type" giants, championed by Hertzsprung — Aldebaran,
//      Arcturus, Capella, Antares, Betelgeuse — plus a handful of dense
//      faint companions (Sirius B, 40 Eri B) that Russell flagged as a
//      puzzle.
//
// `RUSSELL_1914_FEATURED` curates ~22 stars from those four pools and
// is the list the tour walks through one-by-one. `RUSSELL_1914_BACKGROUND`
// fills the diagram with ~120 more bright real stars (V ≲ 4.5, drawn
// from Bayer-designated catalog stars) — _representative_ of the pool
// Cannon was classifying by 1914, even though we can't claim Russell
// plotted these specific 120. The tour shows a candid disclosure modal
// before the rapid-plot phase.
//
// All values are modern (Hipparcos / Gaia / Pecaut-Mamajek). For the
// bright stars in this dataset the modern numbers are within a few
// tenths of a magnitude of what Russell's parallaxes gave him in 1914,
// so this is a fair recreation of his plot.

import type { Star } from "../types";
import { findStarById } from "./sampleStars";
import { tempFromBV } from "./derive";

export type RussellBranch = "main-sequence" | "giant" | "white-dwarf";

export type RussellProvenance =
  | "named-in-paper"      // Russell mentions the star explicitly in prose
  | "hyades"              // Hyades cluster member
  | "parallax-bright"     // bright nearby parallax-measured star
  | "maury-giant"         // Hertzsprung-promoted Maury c-type giant
  | "white-dwarf-puzzle"; // dense faint companion Russell flagged

export interface Russell1914Star {
  /** Star id; matches `findStarById` in sampleStars where possible so
   *  we don't duplicate curated data. Stars with `inline` data set are
   *  defined here and not in sampleStars. */
  id: string;
  /** Display name shown in tour tooltips. */
  displayName: string;
  /** Why Russell would have included this star. */
  provenance: RussellProvenance;
  /** Branch on the H-R diagram. Drives the first-time-only commentary. */
  branch: RussellBranch;
  /** A sentence shown in the per-star tooltip. */
  tooltip: string;
  /** If the star isn't in sampleStars, supply full Star fields here. */
  inline?: Star;
}

export const RUSSELL_1914_FEATURED: Russell1914Star[] = [
  // --- 1. The Sun: anchor on the main sequence -------------------------
  {
    id: "sun",
    displayName: "The Sun",
    provenance: "parallax-bright",
    branch: "main-sequence",
    tooltip:
      "We start with the Sun — Russell's anchor point, by far the closest star and the one whose absolute magnitude we know most precisely.",
  },

  // --- 2-7. Maury / Hertzsprung c-type giants — the heart of his -------
  // 1914 thesis: there is a separate clump of luminous, cool stars.
  {
    id: "aldebaran",
    displayName: "Aldebaran (α Tauri)",
    provenance: "maury-giant",
    branch: "giant",
    tooltip:
      "A Maury 'c-type' star with narrow spectral lines. Hertzsprung argued these were giants; Russell put them on his diagram and the giant branch fell out.",
  },
  {
    id: "arcturus",
    displayName: "Arcturus (α Boötis)",
    provenance: "maury-giant",
    branch: "giant",
    tooltip:
      "Another Maury giant — bright, cool, far away. Russell's parallax placed it well above the main band.",
  },
  {
    id: "capella",
    displayName: "Capella (α Aurigae)",
    provenance: "maury-giant",
    branch: "giant",
    tooltip:
      "A pair of yellow giants. Russell knew it was bright and cool — exactly what Hertzsprung had predicted for c-type stars.",
  },
  {
    id: "antares",
    displayName: "Antares (α Scorpii)",
    provenance: "named-in-paper",
    branch: "giant",
    tooltip:
      "Russell calls Antares out by name as one of the most luminous cool stars. It pinned the upper-right corner of his giant branch.",
  },
  {
    id: "betelgeuse",
    displayName: "Betelgeuse (α Orionis)",
    provenance: "named-in-paper",
    branch: "giant",
    tooltip:
      "Cool, red, and absurdly luminous. Russell's parallax was uncertain but the spectral type and apparent brightness already forced it to the top-right.",
  },

  // --- 8-14. Bright parallax-measured main-sequence stars --------------
  {
    id: "sirius-a",
    displayName: "Sirius A (α Canis Majoris)",
    provenance: "parallax-bright",
    branch: "main-sequence",
    tooltip:
      "The brightest star in the night sky, with one of the best-measured parallaxes Russell had access to.",
  },
  {
    id: "vega",
    displayName: "Vega (α Lyrae)",
    provenance: "parallax-bright",
    branch: "main-sequence",
    tooltip:
      "An A-type main-sequence star, absolute magnitude well known to Russell.",
  },
  {
    id: "procyon-a",
    displayName: "Procyon A (α Canis Minoris)",
    provenance: "parallax-bright",
    branch: "main-sequence",
    tooltip:
      "Nearby F-type star — sits exactly where the main-sequence band goes.",
  },
  {
    id: "altair",
    displayName: "Altair (α Aquilae)",
    provenance: "parallax-bright",
    branch: "main-sequence",
    tooltip:
      "Another A-type main-sequence star, parallax measured by 1900.",
  },
  {
    id: "alpha-cen-a",
    displayName: "α Centauri A",
    provenance: "parallax-bright",
    branch: "main-sequence",
    tooltip:
      "A near-twin of the Sun and one of the closest stars known, anchoring the G-type part of Russell's main sequence.",
  },
  {
    id: "pollux",
    displayName: "Pollux (β Geminorum)",
    provenance: "parallax-bright",
    branch: "giant",
    tooltip:
      "A K-type giant, much closer than most giants, so its parallax was measurable and its position on the diagram robust.",
  },
  {
    id: "regulus",
    displayName: "Regulus (α Leonis)",
    provenance: "parallax-bright",
    branch: "main-sequence",
    tooltip:
      "A hot blue main-sequence star — together with Spica, anchored the upper-left of Russell's plot.",
  },

  // --- 15-17. Blue main-sequence anchors -------------------------------
  {
    id: "spica",
    displayName: "Spica (α Virginis)",
    provenance: "parallax-bright",
    branch: "main-sequence",
    tooltip:
      "A B-type star with a then-known parallax — the bluest, hottest end of the main-sequence band.",
  },
  {
    id: "rigel",
    displayName: "Rigel (β Orionis)",
    provenance: "parallax-bright",
    branch: "giant",
    tooltip:
      "A blue supergiant. Russell had only an upper limit on its parallax in 1914 but the implied luminosity already placed it far above the main sequence.",
  },

  // --- 18-21. The Hyades cluster — distance via the moving-group -------
  // method, a key data pool Russell credits in the paper.
  {
    id: "epsilon-tauri",
    displayName: "ε Tauri (Ain) — Hyades",
    provenance: "hyades",
    branch: "giant",
    tooltip:
      "A Hyades giant. The cluster's distance came from the moving-group method, giving Russell a coherent set of points sharing one parallax.",
    inline: {
      id: "epsilon-tauri",
      name: "ε Tauri (Ain)",
      ra: 67.154,
      dec: 19.180,
      mV: 3.53,
      distancePc: 45.0,
      teff: 4901,
      bv: 1.014,
      spectralType: "G9.5IIIab",
      luminosity: 97,
      wikipedia: "Epsilon_Tauri",
    },
  },
  {
    id: "theta1-tauri",
    displayName: "θ¹ Tauri — Hyades",
    provenance: "hyades",
    branch: "giant",
    tooltip:
      "Another Hyades giant. Plotted alongside ε Tauri it shares the same cluster distance — a tight knot in Russell's giant branch.",
    inline: {
      id: "theta1-tauri",
      name: "θ¹ Tauri",
      ra: 67.166,
      dec: 15.962,
      mV: 3.84,
      distancePc: 47.5,
      teff: 4980,
      bv: 0.95,
      spectralType: "K0III",
      luminosity: 60,
      wikipedia: "Theta1_Tauri",
    },
  },
  {
    id: "gamma-tauri",
    displayName: "γ Tauri (Prima Hyadum)",
    provenance: "hyades",
    branch: "giant",
    tooltip:
      "The brightest Hyades star at the cluster's apex, another moving-group calibrator.",
    inline: {
      id: "gamma-tauri",
      name: "γ Tauri",
      ra: 64.948,
      dec: 15.628,
      mV: 3.65,
      distancePc: 47.5,
      teff: 4844,
      bv: 0.985,
      spectralType: "G9.5III",
      luminosity: 85,
      wikipedia: "Gamma_Tauri",
    },
  },
  {
    id: "delta1-tauri",
    displayName: "δ¹ Tauri — Hyades",
    provenance: "hyades",
    branch: "giant",
    tooltip:
      "Another Hyades giant, same cluster distance — the cluster's tight knot was central to Russell's case.",
    inline: {
      id: "delta1-tauri",
      name: "δ¹ Tauri",
      ra: 65.733,
      dec: 17.542,
      mV: 3.76,
      distancePc: 47.0,
      teff: 4965,
      bv: 0.984,
      spectralType: "K0III",
      luminosity: 75,
      wikipedia: "Delta1_Tauri",
    },
  },

  // --- 22-23. The white-dwarf puzzle -----------------------------------
  // Faint, dense companions Russell knew about but couldn't fit into
  // his giant/dwarf scheme. The discovery of degenerate matter would
  // come a decade later.
  {
    id: "sirius-b",
    displayName: "Sirius B",
    provenance: "white-dwarf-puzzle",
    branch: "white-dwarf",
    tooltip:
      "Sirius's faint, dense companion. Tiny, hot, and ridiculously underluminous for its colour — Russell flagged stars like this as a puzzle.",
  },
  {
    id: "40-eri-b",
    displayName: "40 Eridani B",
    provenance: "white-dwarf-puzzle",
    branch: "white-dwarf",
    tooltip:
      "Another dense faint companion. Russell had its parallax (it shares 40 Eri A's distance) but its absolute magnitude made no sense in 1914 physics.",
  },
];

/**
 * Resolve a Russell1914Star to a full Star record (using sampleStars
 * data where the id matches a curated record, otherwise the inline
 * data on the entry itself).
 */
export function russell1914ResolveStar(s: Russell1914Star): Star | undefined {
  if (s.inline) return s.inline;
  return findStarById(s.id);
}

/**
 * Build a Star record for plotting onto the H-R diagram. The id is
 * prefixed `russell1914-` so the tour can clean up after itself
 * without disturbing any stars the user had on the chart already.
 */
export function russell1914StarRecord(s: Russell1914Star): Star | undefined {
  const base = russell1914ResolveStar(s);
  if (!base) return undefined;
  return { ...base, id: `russell1914-${s.id}`, name: s.displayName };
}

// =====================================================================
// Background pool — bright real stars (V ≲ 4.5) representative of the
// kind of catalog Cannon was classifying and observatories were
// parallax-measuring by 1914. ~120 stars, plotted rapidly during the
// "fill in the rest of Russell's diagram" phase. Values are modern
// (Hipparcos / Gaia / Pecaut-Mamajek) — for these bright stars they
// are within a few tenths of a magnitude of what Russell's parallaxes
// gave him in 1914.
// =====================================================================

interface BgRow {
  id: string;
  name: string;
  ra: number;
  dec: number;
  mV: number;
  distancePc: number;
  /** Effective temperature in K. Where unknown we derive from B-V. */
  teff?: number;
  bv: number;
  spectralType: string;
}

// All entries sorted roughly by RA. Distances from Hipparcos/Gaia
// parallaxes; spectral types from the Henry Draper / Bright Star
// catalogues. Where teff is null we let `tempFromBV` derive it at
// load time.
const BG_ROWS: BgRow[] = [
  { id: "alpha-and",  name: "Alpheratz (α And)",        ra: 2.097,   dec: 29.090,  mV: 2.06, distancePc: 29.74, bv: -0.11, spectralType: "B8IV" },
  { id: "beta-cas",   name: "Caph (β Cas)",             ra: 2.295,   dec: 59.150,  mV: 2.27, distancePc: 16.78, bv: 0.34,  spectralType: "F2III" },
  { id: "gamma-peg",  name: "Algenib (γ Peg)",          ra: 3.309,   dec: 15.184,  mV: 2.83, distancePc: 119.0, bv: -0.19, spectralType: "B2IV" },
  { id: "alpha-cas",  name: "Schedar (α Cas)",          ra: 10.127,  dec: 56.537,  mV: 2.23, distancePc: 70.0,  bv: 1.17,  spectralType: "K0II" },
  { id: "beta-and",   name: "Mirach (β And)",           ra: 17.433,  dec: 35.621,  mV: 2.06, distancePc: 60.0,  bv: 1.58,  spectralType: "M0III" },
  { id: "gamma-cas",  name: "Tsih (γ Cas)",             ra: 14.177,  dec: 60.717,  mV: 2.47, distancePc: 168.0, bv: -0.05, spectralType: "B0IVe" },
  { id: "delta-cas",  name: "Ruchbah (δ Cas)",          ra: 21.454,  dec: 60.235,  mV: 2.66, distancePc: 30.49, bv: 0.13,  spectralType: "A5III" },
  { id: "beta-cet",   name: "Diphda (β Cet)",           ra: 10.897,  dec: -17.987, mV: 2.04, distancePc: 29.5,  bv: 1.02,  spectralType: "K0III" },
  { id: "alpha-tri",  name: "Mothallah (α Tri)",        ra: 28.270,  dec: 29.579,  mV: 3.42, distancePc: 19.71, bv: 0.49,  spectralType: "F6IV" },
  { id: "alpha-ari",  name: "Hamal (α Ari)",            ra: 31.793,  dec: 23.462,  mV: 2.00, distancePc: 20.21, bv: 1.15,  spectralType: "K1IIIb" },
  { id: "beta-per",   name: "Algol (β Per)",            ra: 47.042,  dec: 40.956,  mV: 2.12, distancePc: 28.4,  bv: -0.05, spectralType: "B8V" },
  { id: "alpha-per",  name: "Mirfak (α Per)",           ra: 51.081,  dec: 49.861,  mV: 1.79, distancePc: 156.0, bv: 0.48,  spectralType: "F5Ib" },
  { id: "beta-tau",   name: "Elnath (β Tau)",           ra: 81.573,  dec: 28.608,  mV: 1.65, distancePc: 40.21, bv: -0.13, spectralType: "B7III" },
  { id: "epsilon-ori", name: "Alnilam (ε Ori)",         ra: 84.053,  dec: -1.202,  mV: 1.69, distancePc: 606.0, bv: -0.18, spectralType: "B0Ia" },
  { id: "kappa-ori",  name: "Saiph (κ Ori)",            ra: 86.939,  dec: -9.670,  mV: 2.06, distancePc: 198.0, bv: -0.17, spectralType: "B0.5Iab" },
  { id: "iota-ori",   name: "Hatysa (ι Ori)",           ra: 83.858,  dec: -5.910,  mV: 2.77, distancePc: 410.0, bv: -0.24, spectralType: "O9III" },
  { id: "alpha-lep",  name: "Arneb (α Lep)",            ra: 83.183,  dec: -17.822, mV: 2.58, distancePc: 670.0, bv: 0.21,  spectralType: "F0Ib" },
  { id: "beta-lep",   name: "Nihal (β Lep)",            ra: 82.062,  dec: -20.760, mV: 2.84, distancePc: 49.0,  bv: 0.82,  spectralType: "G5II" },
  { id: "alpha-col",  name: "Phact (α Col)",            ra: 84.912,  dec: -34.074, mV: 2.65, distancePc: 81.0,  bv: -0.12, spectralType: "B7IV" },
  { id: "beta-cma",   name: "Mirzam (β CMa)",           ra: 95.675,  dec: -17.956, mV: 1.98, distancePc: 151.0, bv: -0.24, spectralType: "B1II" },
  { id: "epsilon-cma", name: "Adhara (ε CMa)",          ra: 104.656, dec: -28.972, mV: 1.50, distancePc: 124.0, bv: -0.21, spectralType: "B2II" },
  { id: "delta-cma",  name: "Wezen (δ CMa)",            ra: 107.098, dec: -26.393, mV: 1.83, distancePc: 491.0, bv: 0.68,  spectralType: "F8Ia" },
  { id: "eta-cma",    name: "Aludra (η CMa)",           ra: 111.024, dec: -29.303, mV: 2.45, distancePc: 610.0, bv: -0.08, spectralType: "B5Ia" },
  { id: "zeta-pup",   name: "Naos (ζ Pup)",             ra: 120.896, dec: -40.003, mV: 2.21, distancePc: 332.0, bv: -0.27, spectralType: "O4I(n)f" },
  { id: "rho-pup",    name: "Tureis (ρ Pup)",           ra: 121.886, dec: -24.304, mV: 2.78, distancePc: 19.0,  bv: 0.43,  spectralType: "F2II" },
  { id: "gamma-vel",  name: "Suhail (γ² Vel)",          ra: 122.383, dec: -47.337, mV: 1.83, distancePc: 336.0, bv: -0.22, spectralType: "WC8+O7.5" },
  { id: "lambda-vel", name: "Suhail al Wazn (λ Vel)",   ra: 136.999, dec: -43.434, mV: 2.21, distancePc: 174.0, bv: 1.66,  spectralType: "K4Ib" },
  { id: "delta-vel",  name: "Alsephina (δ Vel)",        ra: 131.176, dec: -54.708, mV: 1.96, distancePc: 24.45, bv: 0.04,  spectralType: "A1V" },
  { id: "iota-car",   name: "Aspidiske (ι Car)",        ra: 139.272, dec: -59.275, mV: 2.21, distancePc: 213.0, bv: 0.18,  spectralType: "A8Ib" },
  { id: "epsilon-car", name: "Avior (ε Car)",           ra: 125.629, dec: -59.510, mV: 1.86, distancePc: 191.0, bv: 1.28,  spectralType: "K3III+B2V" },
  { id: "beta-car",   name: "Miaplacidus (β Car)",      ra: 138.300, dec: -69.717, mV: 1.68, distancePc: 34.07, bv: 0.07,  spectralType: "A2IV" },
  { id: "alpha-hya",  name: "Alphard (α Hya)",          ra: 141.897, dec: -8.659,  mV: 1.99, distancePc: 54.0,  bv: 1.44,  spectralType: "K3II-III" },
  { id: "gamma-leo",  name: "Algieba (γ Leo)",          ra: 154.993, dec: 19.842,  mV: 2.61, distancePc: 39.96, bv: 1.13,  spectralType: "K1III" },
  { id: "beta-leo",   name: "Denebola (β Leo)",         ra: 177.265, dec: 14.572,  mV: 2.14, distancePc: 11.0,  bv: 0.09,  spectralType: "A3V" },
  { id: "delta-leo",  name: "Zosma (δ Leo)",            ra: 168.527, dec: 20.524,  mV: 2.56, distancePc: 17.91, bv: 0.13,  spectralType: "A4V" },
  { id: "epsilon-leo", name: "Ras Elased (ε Leo)",      ra: 146.463, dec: 23.774,  mV: 2.98, distancePc: 75.7,  bv: 0.81,  spectralType: "G1II" },
  { id: "alpha-crv",  name: "Alchiba (α Crv)",          ra: 182.103, dec: -24.729, mV: 4.02, distancePc: 14.78, bv: 0.34,  spectralType: "F1V" },
  { id: "gamma-crv",  name: "Gienah (γ Crv)",           ra: 183.952, dec: -17.542, mV: 2.59, distancePc: 47.0,  bv: -0.11, spectralType: "B8III" },
  { id: "beta-crv",   name: "Kraz (β Crv)",             ra: 188.597, dec: -23.397, mV: 2.65, distancePc: 44.0,  bv: 0.89,  spectralType: "G5II" },
  { id: "alpha-dra",  name: "Thuban (α Dra)",           ra: 211.097, dec: 64.376,  mV: 3.65, distancePc: 92.94, bv: -0.05, spectralType: "A0III" },
  { id: "gamma-dra",  name: "Eltanin (γ Dra)",          ra: 269.152, dec: 51.489,  mV: 2.23, distancePc: 47.69, bv: 1.52,  spectralType: "K5III" },
  { id: "epsilon-boo", name: "Izar (ε Boo)",            ra: 221.247, dec: 27.074,  mV: 2.37, distancePc: 64.4,  bv: 0.97,  spectralType: "K0II-III" },
  { id: "eta-boo",    name: "Muphrid (η Boo)",          ra: 208.671, dec: 18.398,  mV: 2.68, distancePc: 11.41, bv: 0.58,  spectralType: "G0IV" },
  { id: "alpha-crb",  name: "Alphecca (α CrB)",         ra: 233.672, dec: 26.715,  mV: 2.23, distancePc: 22.91, bv: -0.02, spectralType: "A0V" },
  { id: "beta-cnc",   name: "Tarf (β Cnc)",             ra: 124.128, dec: 9.186,   mV: 3.52, distancePc: 89.93, bv: 1.48,  spectralType: "K4III" },
  { id: "alpha-uma",  name: "Dubhe (α UMa)",            ra: 165.932, dec: 61.751,  mV: 1.79, distancePc: 37.94, bv: 1.06,  spectralType: "K0III" },
  { id: "beta-uma",   name: "Merak (β UMa)",            ra: 165.460, dec: 56.382,  mV: 2.37, distancePc: 24.45, bv: 0.03,  spectralType: "A1V" },
  { id: "gamma-uma",  name: "Phecda (γ UMa)",           ra: 178.458, dec: 53.695,  mV: 2.44, distancePc: 25.6,  bv: 0.0,   spectralType: "A0V" },
  { id: "delta-uma",  name: "Megrez (δ UMa)",           ra: 183.857, dec: 57.033,  mV: 3.32, distancePc: 24.7,  bv: 0.08,  spectralType: "A3V" },
  { id: "epsilon-uma", name: "Alioth (ε UMa)",          ra: 193.507, dec: 55.960,  mV: 1.77, distancePc: 25.31, bv: -0.02, spectralType: "A0pCr" },
  { id: "zeta-uma",   name: "Mizar (ζ UMa)",            ra: 200.981, dec: 54.926,  mV: 2.27, distancePc: 25.6,  bv: 0.13,  spectralType: "A1V" },
  { id: "eta-uma",    name: "Alkaid (η UMa)",           ra: 206.886, dec: 49.313,  mV: 1.86, distancePc: 31.9,  bv: -0.10, spectralType: "B3V" },
  { id: "alpha-cvn",  name: "Cor Caroli (α² CVn)",      ra: 194.007, dec: 38.318,  mV: 2.89, distancePc: 34.6,  bv: -0.12, spectralType: "A0VpSiHg" },
  { id: "alpha-com",  name: "Diadem (α Com)",           ra: 197.401, dec: 17.530,  mV: 4.32, distancePc: 19.4,  bv: 0.45,  spectralType: "F5V" },
  { id: "epsilon-vir", name: "Vindemiatrix (ε Vir)",    ra: 195.544, dec: 10.959,  mV: 2.83, distancePc: 33.74, bv: 0.94,  spectralType: "G8III" },
  { id: "gamma-vir",  name: "Porrima (γ Vir)",          ra: 190.415, dec: -1.449,  mV: 2.74, distancePc: 11.62, bv: 0.36,  spectralType: "F0V" },
  { id: "beta-vir",   name: "Zavijava (β Vir)",         ra: 177.674, dec: 1.764,   mV: 3.59, distancePc: 10.9,  bv: 0.52,  spectralType: "F9V" },
  { id: "alpha-lib",  name: "Zubenelgenubi (α² Lib)",   ra: 222.720, dec: -16.042, mV: 2.75, distancePc: 23.0,  bv: 0.15,  spectralType: "A3IV" },
  { id: "beta-lib",   name: "Zubeneschamali (β Lib)",   ra: 229.252, dec: -9.383,  mV: 2.61, distancePc: 56.0,  bv: -0.07, spectralType: "B8V" },
  { id: "alpha-ser",  name: "Unukalhai (α Ser)",        ra: 236.067, dec: 6.426,   mV: 2.63, distancePc: 22.94, bv: 1.17,  spectralType: "K2III" },
  { id: "delta-sco",  name: "Dschubba (δ Sco)",         ra: 240.083, dec: -22.622, mV: 2.32, distancePc: 123.0, bv: -0.12, spectralType: "B0.3IV" },
  { id: "beta-sco",   name: "Acrab (β¹ Sco)",           ra: 241.359, dec: -19.806, mV: 2.62, distancePc: 122.0, bv: -0.07, spectralType: "B1V" },
  { id: "tau-sco",    name: "τ Sco",                    ra: 248.971, dec: -28.216, mV: 2.82, distancePc: 144.0, bv: -0.25, spectralType: "B0V" },
  { id: "epsilon-sco", name: "Larawag (ε Sco)",         ra: 252.541, dec: -34.293, mV: 2.29, distancePc: 19.5,  bv: 1.15,  spectralType: "K1IIIb" },
  { id: "lambda-sco", name: "Shaula (λ Sco)",           ra: 263.402, dec: -37.104, mV: 1.62, distancePc: 175.0, bv: -0.22, spectralType: "B1.5IV+B" },
  { id: "theta-sco",  name: "Sargas (θ Sco)",           ra: 264.330, dec: -42.998, mV: 1.86, distancePc: 91.0,  bv: 0.40,  spectralType: "F1II" },
  { id: "kappa-sco",  name: "Girtab (κ Sco)",           ra: 265.622, dec: -39.030, mV: 2.41, distancePc: 145.0, bv: -0.22, spectralType: "B1.5III" },
  { id: "alpha-oph",  name: "Rasalhague (α Oph)",       ra: 263.733, dec: 12.560,  mV: 2.07, distancePc: 14.93, bv: 0.15,  spectralType: "A5III" },
  { id: "eta-oph",    name: "Sabik (η Oph)",            ra: 257.594, dec: -15.725, mV: 2.43, distancePc: 26.1,  bv: 0.06,  spectralType: "A2V" },
  { id: "zeta-oph",   name: "ζ Oph",                    ra: 249.290, dec: -10.567, mV: 2.54, distancePc: 112.0, bv: 0.02,  spectralType: "O9.2IV" },
  { id: "alpha-sgr",  name: "Rukbat (α Sgr)",           ra: 287.441, dec: -40.616, mV: 3.97, distancePc: 51.0,  bv: -0.10, spectralType: "B8V" },
  { id: "epsilon-sgr", name: "Kaus Australis (ε Sgr)",  ra: 276.043, dec: -34.385, mV: 1.85, distancePc: 44.05, bv: -0.03, spectralType: "B9.5III" },
  { id: "delta-sgr",  name: "Kaus Media (δ Sgr)",       ra: 275.249, dec: -29.828, mV: 2.72, distancePc: 92.6,  bv: 1.38,  spectralType: "K3III" },
  { id: "lambda-sgr", name: "Kaus Borealis (λ Sgr)",    ra: 276.993, dec: -25.422, mV: 2.82, distancePc: 23.0,  bv: 1.04,  spectralType: "K1III" },
  { id: "sigma-sgr",  name: "Nunki (σ Sgr)",            ra: 283.816, dec: -26.297, mV: 2.05, distancePc: 69.0,  bv: -0.13, spectralType: "B2.5V" },
  { id: "zeta-sgr",   name: "Ascella (ζ Sgr)",          ra: 285.653, dec: -29.880, mV: 2.59, distancePc: 26.6,  bv: 0.06,  spectralType: "A2.5Va" },
  { id: "alpha-cap",  name: "Algedi (α² Cap)",          ra: 304.514, dec: -12.545, mV: 3.57, distancePc: 32.6,  bv: 0.91,  spectralType: "G3Ib" },
  { id: "beta-cap",   name: "Dabih (β Cap)",            ra: 305.253, dec: -14.781, mV: 3.05, distancePc: 100.0, bv: 0.79,  spectralType: "K0II" },
  { id: "delta-cap",  name: "Deneb Algedi (δ Cap)",     ra: 326.760, dec: -16.127, mV: 2.85, distancePc: 11.84, bv: 0.18,  spectralType: "A7III" },
  { id: "alpha-aqr",  name: "Sadalmelik (α Aqr)",       ra: 331.446, dec: -0.319,  mV: 2.95, distancePc: 159.6, bv: 0.97,  spectralType: "G2Ib" },
  { id: "beta-aqr",   name: "Sadalsuud (β Aqr)",        ra: 322.890, dec: -5.571,  mV: 2.91, distancePc: 165.0, bv: 0.83,  spectralType: "G0Ib" },
  { id: "alpha-psa",  name: "Fomalhaut (α PsA)",        ra: 344.413, dec: -29.622, mV: 1.16, distancePc: 7.70,  bv: 0.09,  spectralType: "A4V" },
  { id: "alpha-cep",  name: "Alderamin (α Cep)",        ra: 319.645, dec: 62.585,  mV: 2.45, distancePc: 14.96, bv: 0.26,  spectralType: "A8V" },
  { id: "beta-cep",   name: "Alfirk (β Cep)",           ra: 322.165, dec: 70.561,  mV: 3.23, distancePc: 210.0, bv: -0.22, spectralType: "B2III" },
  { id: "gamma-cep",  name: "Errai (γ Cep)",            ra: 354.836, dec: 77.632,  mV: 3.21, distancePc: 13.54, bv: 1.03,  spectralType: "K1III-IV" },
  { id: "alpha-peg",  name: "Markab (α Peg)",           ra: 346.190, dec: 15.205,  mV: 2.49, distancePc: 41.04, bv: -0.04, spectralType: "B9V" },
  { id: "beta-peg",   name: "Scheat (β Peg)",           ra: 345.944, dec: 28.083,  mV: 2.42, distancePc: 60.7,  bv: 1.66,  spectralType: "M2.5II-III" },
  { id: "epsilon-peg", name: "Enif (ε Peg)",            ra: 326.046, dec: 9.875,   mV: 2.39, distancePc: 211.0, bv: 1.52,  spectralType: "K2Ib" },
  { id: "gamma-cyg",  name: "Sadr (γ Cyg)",             ra: 305.557, dec: 40.257,  mV: 2.23, distancePc: 560.0, bv: 0.67,  spectralType: "F8Ib" },
  { id: "epsilon-cyg", name: "Aljanah (ε Cyg)",         ra: 311.553, dec: 33.971,  mV: 2.48, distancePc: 22.2,  bv: 1.03,  spectralType: "K0III" },
  { id: "delta-cyg",  name: "Fawaris (δ Cyg)",          ra: 296.244, dec: 45.131,  mV: 2.87, distancePc: 50.6,  bv: -0.03, spectralType: "B9.5III" },
  { id: "beta-cyg",   name: "Albireo (β Cyg)",          ra: 292.680, dec: 27.960,  mV: 3.18, distancePc: 133.0, bv: 1.13,  spectralType: "K3II+B0V" },
  { id: "alpha-aql",  name: "Tarazed (γ Aql)",          ra: 296.565, dec: 10.613,  mV: 2.72, distancePc: 110.6, bv: 1.50,  spectralType: "K3II" },
  { id: "zeta-aql",   name: "ζ Aql",                    ra: 286.353, dec: 13.863,  mV: 2.99, distancePc: 25.5,  bv: 0.01,  spectralType: "A0Vn" },
  { id: "lambda-aql", name: "λ Aql",                    ra: 286.561, dec: -4.882,  mV: 3.43, distancePc: 38.4,  bv: -0.09, spectralType: "B9V" },
  { id: "alpha-her",  name: "Rasalgethi (α¹ Her)",      ra: 258.662, dec: 14.390,  mV: 3.48, distancePc: 110.0, bv: 1.45,  spectralType: "M5Ib-II" },
  { id: "beta-her",   name: "Kornephoros (β Her)",      ra: 247.555, dec: 21.490,  mV: 2.78, distancePc: 42.4,  bv: 0.94,  spectralType: "G7IIIa" },
  { id: "zeta-her",   name: "ζ Her",                    ra: 250.323, dec: 31.602,  mV: 2.81, distancePc: 10.7,  bv: 0.65,  spectralType: "G0IV" },
  { id: "delta-her",  name: "Sarin (δ Her)",            ra: 258.762, dec: 24.839,  mV: 3.12, distancePc: 24.2,  bv: 0.08,  spectralType: "A3IV" },
  { id: "alpha-lyr-2", name: "Sheliak (β Lyr)",         ra: 282.520, dec: 33.363,  mV: 3.52, distancePc: 295.0, bv: 0.00,  spectralType: "B7Ve+A8p" },
  { id: "gamma-lyr",  name: "Sulafat (γ Lyr)",          ra: 284.736, dec: 32.690,  mV: 3.25, distancePc: 192.0, bv: -0.05, spectralType: "B9III" },
  { id: "alpha-cen-b", name: "α Centauri B",            ra: 219.916, dec: -60.838, mV: 1.33, distancePc: 1.34,  bv: 0.90,  spectralType: "K1V" },
  { id: "beta-cen",   name: "Hadar (β Cen)",            ra: 210.956, dec: -60.373, mV: 0.61, distancePc: 119.0, bv: -0.23, spectralType: "B1III" },
  { id: "alpha-cru",  name: "Acrux (α¹ Cru)",           ra: 186.650, dec: -63.099, mV: 1.40, distancePc: 99.0,  bv: -0.24, spectralType: "B0.5IV" },
  { id: "beta-cru",   name: "Mimosa (β Cru)",           ra: 191.930, dec: -59.689, mV: 1.25, distancePc: 85.0,  bv: -0.23, spectralType: "B0.5III" },
  { id: "gamma-cru",  name: "Gacrux (γ Cru)",           ra: 187.791, dec: -57.113, mV: 1.63, distancePc: 27.16, bv: 1.59,  spectralType: "M3.5III" },
  { id: "delta-cru",  name: "Imai (δ Cru)",             ra: 183.786, dec: -58.749, mV: 2.79, distancePc: 110.0, bv: -0.23, spectralType: "B2IV" },
  { id: "alpha-cen-prox-skip", name: "γ Centauri",      ra: 190.380, dec: -48.960, mV: 2.17, distancePc: 39.0,  bv: -0.01, spectralType: "A1IV" },
  { id: "epsilon-cen", name: "ε Cen",                   ra: 204.972, dec: -53.466, mV: 2.30, distancePc: 116.0, bv: -0.22, spectralType: "B1III" },
  { id: "theta-cen",  name: "Menkent (θ Cen)",          ra: 211.671, dec: -36.370, mV: 2.06, distancePc: 18.7,  bv: 1.01,  spectralType: "K0III" },
  { id: "iota-cen",   name: "ι Cen",                    ra: 200.149, dec: -36.712, mV: 2.75, distancePc: 18.05, bv: 0.04,  spectralType: "A2V" },
  { id: "alpha-tra",  name: "Atria (α TrA)",            ra: 252.166, dec: -69.028, mV: 1.91, distancePc: 124.0, bv: 1.44,  spectralType: "K2II-III" },
  { id: "alpha-pav",  name: "Peacock (α Pav)",          ra: 306.412, dec: -56.735, mV: 1.94, distancePc: 54.5,  bv: -0.20, spectralType: "B2IV" },
  { id: "alpha-gru",  name: "Alnair (α Gru)",           ra: 332.058, dec: -46.961, mV: 1.74, distancePc: 31.1,  bv: -0.13, spectralType: "B6V" },
  { id: "beta-gru",   name: "Tiaki (β Gru)",            ra: 340.667, dec: -46.885, mV: 2.07, distancePc: 53.0,  bv: 1.62,  spectralType: "M5III" },
  { id: "gamma-gru",  name: "Aldhanab (γ Gru)",         ra: 328.482, dec: -37.365, mV: 3.00, distancePc: 64.0,  bv: -0.11, spectralType: "B8III" },
  { id: "alpha-phe",  name: "Ankaa (α Phe)",            ra: 6.571,   dec: -42.306, mV: 2.40, distancePc: 25.7,  bv: 1.09,  spectralType: "K0III" },
  { id: "alpha-tuc",  name: "α Tuc",                    ra: 334.626, dec: -60.260, mV: 2.86, distancePc: 60.0,  bv: 1.39,  spectralType: "K3III" },
  { id: "alpha-hyi",  name: "α Hyi",                    ra: 29.692,  dec: -61.570, mV: 2.86, distancePc: 21.9,  bv: 0.28,  spectralType: "F0V" },
  { id: "alpha-pic",  name: "α Pic",                    ra: 101.287, dec: -61.941, mV: 3.27, distancePc: 30.0,  bv: 0.22,  spectralType: "A8VnkA6" },
  { id: "alpha-ret",  name: "α Ret",                    ra: 63.606,  dec: -62.474, mV: 3.33, distancePc: 50.6,  bv: 0.91,  spectralType: "G8II-III" },
  { id: "alpha-dor",  name: "α Dor",                    ra: 68.499,  dec: -55.045, mV: 3.27, distancePc: 53.4,  bv: -0.08, spectralType: "A0III" },
  { id: "alpha-eri-2", name: "θ Eri",                   ra: 44.566,  dec: -40.305, mV: 2.88, distancePc: 49.0,  bv: 0.13,  spectralType: "A4III" },
  { id: "gamma-eri",  name: "Zaurak (γ Eri)",           ra: 59.508,  dec: -13.509, mV: 2.97, distancePc: 67.0,  bv: 1.59,  spectralType: "M0.5III" },
  { id: "epsilon-eri-bg", name: "ε Eri (background)",   ra: 53.233,  dec: -9.458,  mV: 3.73, distancePc: 3.22,  bv: 0.88,  spectralType: "K2V" },
  { id: "omicron-eri", name: "40 Eri A (omicron² Eri)", ra: 63.818,  dec: -7.652,  mV: 4.43, distancePc: 4.98,  bv: 0.82,  spectralType: "K0V" },
  { id: "tau-cet-bg", name: "τ Cet (background)",       ra: 26.017,  dec: -15.937, mV: 3.50, distancePc: 3.65,  bv: 0.72,  spectralType: "G8V" },
  { id: "61-cyg-a",   name: "61 Cygni A",               ra: 316.725, dec: 38.749,  mV: 5.20, distancePc: 3.50,  bv: 1.18,  spectralType: "K5V" },
  { id: "61-cyg-b",   name: "61 Cygni B",               ra: 316.730, dec: 38.745,  mV: 6.05, distancePc: 3.50,  bv: 1.37,  spectralType: "K7V" },
  { id: "groombridge-1830", name: "Groombridge 1830",   ra: 178.230, dec: 37.719,  mV: 6.42, distancePc: 9.16,  bv: 0.75,  spectralType: "G8V" },
];

/**
 * Build the background star pool. Each row is converted to a Star with
 * id prefixed `russell1914-bg-` so the tour can clean up after itself.
 * `tempFromBV` is used to fill in `teff` when a row didn't supply one.
 */
export function buildRussell1914Background(): Star[] {
  return BG_ROWS.map((row): Star => {
    const teff = row.teff ?? Math.round(tempFromBV(row.bv));
    return {
      id: `russell1914-bg-${row.id}`,
      name: row.name,
      ra: row.ra,
      dec: row.dec,
      mV: row.mV,
      distancePc: row.distancePc,
      teff,
      bv: row.bv,
      spectralType: row.spectralType,
    };
  });
}
