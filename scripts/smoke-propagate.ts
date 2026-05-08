// Smoke test: how far do high-proper-motion stars drift between
// the J2000 catalogue position and each survey's representative
// epoch? Helps sanity-check the propagateToEpoch wiring before a
// visual on-Aladin verification.

import { SAMPLE_STARS } from "../src/apps/hr/data/sampleStars";
import { propagateToEpoch, epochFor } from "../src/apps/hr/data/propagate";

const ids = [
  "barnards-star",
  "wolf-359",
  "proxima-cen",
  "40-eri-b",
  "sirius-a",
  "vega",
];
const surveys = ["P/DSS2/color", "P/PanSTARRS/DR1/color-z-zg-g"];

for (const id of ids) {
  const s = SAMPLE_STARS.find((x) => x.id === id);
  if (!s) {
    console.log(id, "NOT FOUND");
    continue;
  }
  for (const survey of surveys) {
    const epoch = epochFor(survey);
    const p = propagateToEpoch(s, epoch);
    const dRaArcmin = (p.ra - s.ra) * 60 * Math.cos((s.dec * Math.PI) / 180);
    const dDecArcmin = (p.dec - s.dec) * 60;
    const dSky = Math.hypot(dRaArcmin, dDecArcmin);
    console.log(
      `${s.id.padEnd(15)} ${survey.padEnd(34)} epoch=${epoch}  shift=${dSky.toFixed(
        2,
      )}'`,
    );
  }
}
