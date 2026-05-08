export interface Star {
  id: string;
  name: string;
  // ICRS J2000.0 catalogue position, in decimal degrees.
  ra: number;
  dec: number;
  // Proper motion in mas/yr. The RA component is the conventional
  // mu_alpha * cos(delta) (matches Gaia DR3 / SIMBAD's ASCII output),
  // so it slots straight into propagateToEpoch() without further trig.
  // Used to drift the marker position to the active sky-survey's
  // representative epoch — a fast-moving star like Barnard's lands
  // on the photographed image rather than its J2000 catalogue spot.
  pmRaMasYr?: number;
  pmDecMasYr?: number;
  mV: number;
  distancePc: number;
  // Effective temperature in Kelvin. Optional: Gaia-discovered stars
  // without a published Teff and without BP−RP colour have no estimate
  // and cannot be placed on the H-R diagram.
  teff?: number;
  bv?: number;
  spectralType?: string;
  notes?: string;
  // Page slug on en.wikipedia.org. Set for named/curated stars; left
  // undefined for Gaia-discovered stars where there's no obvious page.
  wikipedia?: string;
  // Optional published bolometric luminosity in solar units. When set,
  // the diagram uses this directly instead of deriving from m_V + distance
  // + bolometric correction.
  luminosity?: number;
  // Provenance: where Teff and luminosity came from. "published" means
  // taken directly from the Gaia DR3 astrophysical-parameters table;
  // "derived" means computed locally from BP−RP / distance modulus.
  teffSource?: "published" | "derived";
  luminositySource?: "published" | "derived";
  // Set after a SIMBAD lookup returns a friendlier name for a Gaia
  // source. Drives the "See more data" link in the data panel.
  resolved?: boolean;
}

export interface PlottedStar extends Star {
  // PlottedStar is only created for stars with a known temperature, so
  // teff is required here even though it is optional on Star.
  teff: number;
  absMag: number;
  luminositySolar: number;
}

export type YAxisMode = "luminosity" | "absoluteMagnitude";
export type XAxisMode = "temperature" | "bv" | "spectralClass";
export type ScaleMode = "log" | "linear";
// Brightness-axis tick label style. Only meaningful in luminosity mode.
export type LumLabelFormat = "decimals" | "fractions" | "powers";
// Brightness-axis units. Only meaningful in luminosity mode.
export type LumUnit = "solar" | "watts";

export interface AxisConfig {
  yMode: YAxisMode;
  xMode: XAxisMode;
  yScale: ScaleMode;
  xScale: ScaleMode;
  yLabelFormat?: LumLabelFormat;
  yUnit?: LumUnit;
}

export interface SavedDiagram {
  name: string;
  savedAt: number;
  stars: Star[];
  axes: AxisConfig;
}
