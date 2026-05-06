// RA/Dec formatting helpers shared between sky-using apps. Both
// h-r-diagram and Hubble-diagram format equatorial coordinates the
// same way; promote here to avoid drift.

export function formatRa(raDeg: number): string {
  // Convert to hours-minutes-seconds.
  const ra = ((raDeg % 360) + 360) % 360;
  const totalSec = (ra / 15) * 3600;
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec - h * 3600) / 60);
  const s = totalSec - h * 3600 - m * 60;
  return `${pad2(h)}h ${pad2(m)}m ${s.toFixed(1).padStart(4, "0")}s`;
}

export function formatDec(decDeg: number): string {
  const sign = decDeg < 0 ? "-" : "+";
  const abs = Math.abs(decDeg);
  const d = Math.floor(abs);
  const m = Math.floor((abs - d) * 60);
  const s = (abs - d - m / 60) * 3600;
  return `${sign}${pad2(d)}° ${pad2(m)}′ ${s.toFixed(1).padStart(4, "0")}″`;
}

function pad2(n: number): string {
  return n.toString().padStart(2, "0");
}
