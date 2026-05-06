// SVG diagrams for the "How we know" panel. Each function returns a
// stand-alone SVGElement that can be appended into the modal. Kept
// in one file because they all share visual style (same palette,
// same sizing) and total ~200 lines.
//
// All diagrams are responsive (preserveAspectRatio="xMidYMid meet")
// so they scale cleanly with the modal width.

const SVG_NS = "http://www.w3.org/2000/svg";

function svg(viewBox: string): SVGSVGElement {
  const s = document.createElementNS(SVG_NS, "svg");
  s.setAttribute("viewBox", viewBox);
  s.setAttribute("preserveAspectRatio", "xMidYMid meet");
  s.setAttribute("width", "100%");
  s.setAttribute("style", "max-width: 540px; display: block;");
  return s;
}

function el(
  parent: SVGElement,
  tag: string,
  attrs: Record<string, string | number>,
): SVGElement {
  const node = document.createElementNS(SVG_NS, tag) as SVGElement;
  for (const [k, v] of Object.entries(attrs)) {
    node.setAttribute(k, String(v));
  }
  parent.appendChild(node);
  return node;
}

function text(
  parent: SVGElement,
  x: number,
  y: number,
  txt: string,
  attrs: Record<string, string | number> = {},
): SVGElement {
  const t = el(parent, "text", { x, y, fill: "#e6ecff", "font-size": 11, ...attrs });
  t.textContent = txt;
  return t;
}

// =============================================================
//  1. Doppler / ambulance siren
// =============================================================

export function buildDopplerDiagram(): SVGElement {
  const s = svg("0 0 540 200");
  // Subtle background tile.
  el(s, "rect", { x: 0, y: 0, width: 540, height: 200, fill: "transparent" });

  // Direction-of-travel arrow.
  el(s, "line", {
    x1: 30, y1: 100, x2: 510, y2: 100,
    stroke: "#3a456b", "stroke-width": 1, "stroke-dasharray": "3,3",
  });
  text(s, 270, 92, "→ direction of travel →", {
    "text-anchor": "middle", fill: "#8b95b8", "font-size": 10,
  });

  // Ambulance — a simple rounded rectangle with a flashing light.
  const carX = 270;
  el(s, "rect", {
    x: carX - 30, y: 110, width: 60, height: 30, rx: 5,
    fill: "#9bd3ff", stroke: "#1a2240",
  });
  el(s, "rect", { x: carX - 26, y: 116, width: 12, height: 8, fill: "#1a2240" });
  el(s, "rect", { x: carX + 14, y: 116, width: 12, height: 8, fill: "#1a2240" });
  el(s, "circle", { cx: carX, cy: 109, r: 3, fill: "#ff7b7b" });
  el(s, "circle", { cx: carX - 18, cy: 142, r: 4, fill: "#1a2240" });
  el(s, "circle", { cx: carX + 18, cy: 142, r: 4, fill: "#1a2240" });

  // Compressed waves AHEAD of the ambulance (right side, higher pitch).
  for (let i = 0; i < 5; i++) {
    const cx = carX + 50 + i * 22;
    el(s, "circle", {
      cx, cy: 125, r: 12 + i * 4,
      fill: "none", stroke: "#ffd166", "stroke-width": 1.2, opacity: 0.7,
    });
  }
  text(s, 480, 60, "higher pitch ↑", {
    "text-anchor": "end", fill: "#ffd166", "font-size": 12,
  });

  // Stretched waves BEHIND the ambulance (left side, lower pitch).
  for (let i = 0; i < 4; i++) {
    const cx = carX - 60 - i * 38;
    el(s, "circle", {
      cx, cy: 125, r: 18 + i * 9,
      fill: "none", stroke: "#6dd58c", "stroke-width": 1.2, opacity: 0.7,
    });
  }
  text(s, 60, 60, "lower pitch ↓", {
    "text-anchor": "start", fill: "#6dd58c", "font-size": 12,
  });

  text(s, 270, 190, "Sound waves bunch up in front, stretch out behind.", {
    "text-anchor": "middle", fill: "#8b95b8", "font-size": 10,
  });
  return s;
}

// =============================================================
//  2. Galaxy redshift — same idea, but for light
// =============================================================

export function buildGalaxyRedshiftDiagram(): SVGElement {
  const s = svg("0 0 540 200");
  // Two galaxy "rainbow strips": top = stationary, bottom = receding.
  const labels = ["At rest", "Moving away from us"];
  const ys = [40, 130];
  const shifts = [0, 22];
  for (let i = 0; i < 2; i++) {
    text(s, 30, ys[i] - 5, labels[i], { fill: "#8b95b8", "font-size": 10 });
    drawRainbow(s, 30 + shifts[i], ys[i], 480, 30);
    if (i === 1) {
      // Arrow showing the shift.
      el(s, "line", {
        x1: 30, y1: ys[i] + 50, x2: 30 + shifts[i] + 12, y2: ys[i] + 50,
        stroke: "#ff7b7b", "stroke-width": 1.5, "marker-end": "url(#arrow-rs)",
      });
      // Marker.
      const defs = el(s, "defs", {});
      const marker = el(defs, "marker", {
        id: "arrow-rs", viewBox: "0 0 10 10",
        refX: 8, refY: 5, markerWidth: 6, markerHeight: 6, orient: "auto",
      });
      el(marker, "path", { d: "M 0 0 L 10 5 L 0 10 z", fill: "#ff7b7b" });
      text(s, 30 + shifts[i] + 18, ys[i] + 53, "shifted toward red", {
        fill: "#ff7b7b", "font-size": 10,
      });
    }
  }
  return s;
}

function drawRainbow(parent: SVGElement, x: number, y: number, w: number, h: number): void {
  const grad = el(parent, "linearGradient", { id: `rainbow-${x}-${y}` });
  // Use SVG namespace ID — make unique by coords.
  grad.setAttribute("x1", "0%");
  grad.setAttribute("x2", "100%");
  const stops = [
    [0, "#5b3a8a"], [15, "#3a4cd4"], [30, "#3aa6d4"],
    [45, "#3ad48a"], [60, "#d4d43a"], [75, "#d48a3a"], [100, "#d43a3a"],
  ];
  for (const [pct, color] of stops) {
    el(grad, "stop", { offset: `${pct}%`, "stop-color": String(color) });
  }
  el(parent, "rect", { x, y, width: w, height: h, fill: `url(#rainbow-${x}-${y})` });
}

// =============================================================
//  3. Balmer series on the visible spectrum
// =============================================================

export function buildBalmerDiagram(): SVGElement {
  const s = svg("0 0 540 140");
  // Visible band 380-700 nm.
  const xMin = 380;
  const xMax = 700;
  const W = 480;
  const H = 50;
  const x0 = 30;
  const y0 = 30;
  const xOf = (nm: number): number => x0 + ((nm - xMin) / (xMax - xMin)) * W;

  drawRainbow(s, x0, y0, W, H);
  // Tick scale below the rainbow.
  for (let nm = 400; nm <= 700; nm += 50) {
    const x = xOf(nm);
    el(s, "line", { x1: x, y1: y0 + H, x2: x, y2: y0 + H + 5, stroke: "#8b95b8" });
    text(s, x, y0 + H + 18, `${nm}`, {
      "text-anchor": "middle", fill: "#8b95b8", "font-size": 10,
    });
  }
  text(s, x0 + W / 2, 130, "Wavelength (nm)", {
    "text-anchor": "middle", fill: "#8b95b8", "font-size": 11,
  });

  // Balmer series — Hα, Hβ, Hγ, Hδ (in nm).
  const lines = [
    { name: "Hα", nm: 656.3 },
    { name: "Hβ", nm: 486.1 },
    { name: "Hγ", nm: 434.0 },
    { name: "Hδ", nm: 410.2 },
  ];
  for (const ln of lines) {
    const x = xOf(ln.nm);
    el(s, "line", {
      x1: x, y1: y0 - 8, x2: x, y2: y0 + H + 8,
      stroke: "#ffffff", "stroke-width": 1.5, opacity: 0.85,
    });
    text(s, x, y0 - 12, ln.name, {
      "text-anchor": "middle", fill: "#ffffff", "font-size": 11,
      "font-weight": 600,
    });
  }
  return s;
}

// =============================================================
//  4. Lines shifting — rest above, redshifted below, arrows joining
// =============================================================

export function buildLineShiftDiagram(): SVGElement {
  // Redesigned Stage 12: a clear before/after of one prominent
  // hydrogen line (Hα at 656 nm) shifting to its observed position
  // for a galaxy with z = 0.05 (~15,000 km/s recession). Two stacked
  // rainbow strips with the SAME line picked out, the rest position
  // labelled in white, the shifted position in coral, and an arrow
  // explicitly showing the shift in nanometres.
  const s = svg("0 0 540 240");
  const xMin = 380;
  const xMax = 760;
  const W = 480;
  const H = 36;
  const x0 = 40;
  const xOf = (nm: number): number => x0 + ((nm - xMin) / (xMax - xMin)) * W;

  const yRest = 40;
  const yObs = 150;

  // Top rainbow: rest-frame.
  drawRainbow(s, x0, yRest, W, H);
  text(s, x0, yRest - 8, "Rest frame (lab on Earth)", {
    fill: "#e6ecff", "font-size": 11, "font-weight": 600,
  });
  // Bottom rainbow: redshifted.
  drawRainbow(s, x0, yObs, W, H);
  text(s, x0, yObs - 8, "Same gas, but in a galaxy moving away from us", {
    fill: "#ff8a5b", "font-size": 11, "font-weight": 600,
  });

  // Wavelength axis under the bottom rainbow.
  for (let nm = 400; nm <= 760; nm += 50) {
    const x = xOf(nm);
    el(s, "line", {
      x1: x, y1: yObs + H, x2: x, y2: yObs + H + 4, stroke: "#8b95b8",
    });
    text(s, x, yObs + H + 16, `${nm}`, {
      "text-anchor": "middle", fill: "#8b95b8", "font-size": 10,
    });
  }
  text(s, x0 + W / 2, yObs + H + 32, "Wavelength (nm)", {
    "text-anchor": "middle", fill: "#8b95b8", "font-size": 11,
  });

  // The Hα hydrogen line.
  const z = 0.05;
  const restNm = 656.3;
  const obsNm = restNm * (1 + z); // ≈ 689.1 nm
  const xRest = xOf(restNm);
  const xObs = xOf(obsNm);

  // Rest line drawn through the rest rainbow.
  el(s, "line", {
    x1: xRest, y1: yRest - 4, x2: xRest, y2: yRest + H + 4,
    stroke: "#ffffff", "stroke-width": 2.5,
  });
  text(s, xRest, yRest + H + 18, `Hα at ${restNm.toFixed(1)} nm`, {
    "text-anchor": "middle", fill: "#ffffff", "font-size": 11,
    "font-weight": 600,
  });

  // Observed (shifted) line.
  el(s, "line", {
    x1: xObs, y1: yObs - 4, x2: xObs, y2: yObs + H + 4,
    stroke: "#ff8a5b", "stroke-width": 2.5,
  });
  text(s, xObs, yObs - 18, `Now at ${obsNm.toFixed(1)} nm`, {
    "text-anchor": "middle", fill: "#ff8a5b", "font-size": 11,
    "font-weight": 600,
  });

  // Curved arrow showing the shift.
  const defs = el(s, "defs", {});
  const marker = el(defs, "marker", {
    id: "arrow-shift", viewBox: "0 0 10 10",
    refX: 8, refY: 5, markerWidth: 6, markerHeight: 6, orient: "auto",
  });
  el(marker, "path", { d: "M 0 0 L 10 5 L 0 10 z", fill: "#ff8a5b" });
  el(s, "path", {
    d: `M ${xRest} ${yRest + H + 22} Q ${(xRest + xObs) / 2} ${(yRest + yObs) / 2 + 18}, ${xObs} ${yObs - 6}`,
    fill: "none",
    stroke: "#ff8a5b",
    "stroke-width": 1.6,
    "stroke-dasharray": "4,3",
    "marker-end": "url(#arrow-shift)",
  });

  // Big legible caption with the actual numbers.
  text(s, x0 + W / 2, 230,
    `Shift = ${(obsNm - restNm).toFixed(1)} nm  →  z = (Δλ / λ_rest) = ${z.toFixed(3)}  →  v ≈ ${(z * 299792).toFixed(0)} km/s`,
    { "text-anchor": "middle", fill: "#e6ecff", "font-size": 11 },
  );

  return s;
}

// =============================================================
//  5. Cepheid period-luminosity relation (Leavitt's law)
// =============================================================

export function buildCepheidPLDiagram(): SVGElement {
  const s = svg("0 0 540 280");
  const x0 = 60, y0 = 30, W = 440, H = 200;

  el(s, "rect", {
    x: x0, y: y0, width: W, height: H,
    fill: "#0c1326", stroke: "#2a3357",
  });
  text(s, x0 + W / 2, y0 + H + 30, "Period (days, log scale)", {
    "text-anchor": "middle", fill: "#8b95b8", "font-size": 11,
  });
  el(s, "text", {
    x: 18, y: y0 + H / 2, fill: "#8b95b8", "font-size": 11,
    transform: `rotate(-90 18 ${y0 + H / 2})`, "text-anchor": "middle",
  }).textContent = "Absolute magnitude (brighter up)";

  const pMin = 1, pMax = 100;
  const mMin = -7, mMax = -2;
  const xOf = (p: number): number =>
    x0 + ((Math.log10(p) - Math.log10(pMin)) / (Math.log10(pMax) - Math.log10(pMin))) * W;
  const yOf = (m: number): number =>
    y0 + ((m - mMin) / (mMax - mMin)) * H;

  for (const p of [1, 3, 10, 30, 100]) {
    const x = xOf(p);
    el(s, "line", { x1: x, y1: y0 + H, x2: x, y2: y0 + H + 4, stroke: "#8b95b8" });
    text(s, x, y0 + H + 16, String(p), {
      "text-anchor": "middle", fill: "#8b95b8", "font-size": 10,
    });
  }
  for (const m of [-7, -6, -5, -4, -3, -2]) {
    const y = yOf(m);
    el(s, "line", { x1: x0 - 4, y1: y, x2: x0, y2: y, stroke: "#8b95b8" });
    text(s, x0 - 8, y + 3, String(m), {
      "text-anchor": "end", fill: "#8b95b8", "font-size": 10,
    });
  }

  const a = -2.43, b = -4.05;
  const ml = (p: number): number => a * (Math.log10(p) - 1) + b;
  el(s, "line", {
    x1: xOf(pMin), y1: yOf(ml(pMin)),
    x2: xOf(pMax), y2: yOf(ml(pMax)),
    stroke: "#6cc4ff", "stroke-width": 2,
  });

  const cepheids: Array<[number, number, string]> = [
    [3.97, ml(3.97) + 0.05, "Polaris"],
    [5.37, ml(5.37) - 0.25, "delta Cep"],
    [10.15, ml(10.15) + 0.18, "zeta Gem"],
    [16.4, ml(16.4) - 0.3, "RS Pup"],
    [35.5, ml(35.5) + 0.15, "S Vul"],
    [4.5, ml(4.5) + 0.12, ""],
    [7.0, ml(7.0) - 0.18, ""],
    [12.0, ml(12.0) + 0.22, ""],
    [22.0, ml(22.0) - 0.1, ""],
    [50.0, ml(50.0) + 0.05, ""],
    [2.5, ml(2.5) - 0.15, ""],
    [8.5, ml(8.5) + 0.05, ""],
  ];
  for (const [p, m, name] of cepheids) {
    el(s, "circle", {
      cx: xOf(p), cy: yOf(m), r: 3.5,
      fill: "#ffd166", stroke: "#0c1326", "stroke-width": 0.5,
    });
    if (name) {
      text(s, xOf(p) + 6, yOf(m) - 4, name, {
        fill: "#e6ecff", "font-size": 9,
      });
    }
  }
  text(s, x0 + W - 5, y0 + 14, "M = a (log P - 1) + b", {
    "text-anchor": "end", fill: "#6cc4ff", "font-size": 11, "font-style": "italic",
  });
  return s;
}

// =============================================================
//  6. Cepheid light curve — folded magnitude vs phase
// =============================================================

export function buildCepheidLightCurveDiagram(): SVGElement {
  const s = svg("0 0 540 240");
  const x0 = 60, y0 = 25, W = 440, H = 160;

  el(s, "rect", {
    x: x0, y: y0, width: W, height: H,
    fill: "#0c1326", stroke: "#2a3357",
  });
  text(s, x0 + W / 2, y0 + H + 30, "Phase (one full pulsation cycle)", {
    "text-anchor": "middle", fill: "#8b95b8", "font-size": 11,
  });
  el(s, "text", {
    x: 18, y: y0 + H / 2, fill: "#8b95b8", "font-size": 11,
    transform: `rotate(-90 18 ${y0 + H / 2})`, "text-anchor": "middle",
  }).textContent = "Magnitude (brighter up)";

  for (const ph of [0, 0.25, 0.5, 0.75, 1]) {
    const x = x0 + ph * W;
    el(s, "line", { x1: x, y1: y0 + H, x2: x, y2: y0 + H + 4, stroke: "#8b95b8" });
    text(s, x, y0 + H + 16, ph.toFixed(2), {
      "text-anchor": "middle", fill: "#8b95b8", "font-size": 10,
    });
  }

  const yOf = (m: number): number => y0 + m * H;
  const magAt = (phase: number): number => {
    const p = ((phase % 1) + 1) % 1;
    if (p < 0.15) return 0.85 - (p / 0.15) * 0.8;
    return 0.05 + ((p - 0.15) / 0.85) * 0.8;
  };

  let path = "";
  const N = 100;
  for (let i = 0; i <= N; i++) {
    const phase = i / N;
    const x = x0 + phase * W;
    const y = yOf(magAt(phase));
    path += (i === 0 ? "M " : " L ") + x.toFixed(2) + " " + y.toFixed(2);
  }
  el(s, "path", { d: path, fill: "none", stroke: "#ffd166", "stroke-width": 2 });

  for (let i = 0; i < 24; i++) {
    const ph = (i + 0.5) / 24 + (Math.sin(i * 7.3) * 0.02);
    const trueMag = magAt(ph);
    const noisy = trueMag + Math.sin(i * 4.1) * 0.04;
    el(s, "circle", {
      cx: x0 + ph * W, cy: yOf(noisy), r: 2.5,
      fill: "#9be7c4", "fill-opacity": 0.85,
    });
  }

  text(s, x0 + 0.075 * W, y0 + 12, "fast rise", {
    "text-anchor": "middle", fill: "#6cc4ff", "font-size": 10,
  });
  text(s, x0 + 0.55 * W, y0 + 12, "slow decline", {
    "text-anchor": "middle", fill: "#6cc4ff", "font-size": 10,
  });
  text(s, x0 + W / 2, y0 + H + 50, "Period = duration of one full cycle.", {
    "text-anchor": "middle", fill: "#8b95b8", "font-size": 10,
  });
  return s;
}

// =============================================================
//  7. Hubble's law — distance vs velocity, line through origin.
// =============================================================

export function buildHubbleLawDiagram(): SVGElement {
  const s = svg("0 0 540 260");
  const x0 = 60, y0 = 25, W = 440, H = 190;

  el(s, "rect", {
    x: x0, y: y0, width: W, height: H,
    fill: "#0c1326", stroke: "#2a3357",
  });
  text(s, x0 + W / 2, y0 + H + 30, "Distance (Mpc)", {
    "text-anchor": "middle", fill: "#8b95b8", "font-size": 11,
  });
  el(s, "text", {
    x: 18, y: y0 + H / 2, fill: "#8b95b8", "font-size": 11,
    transform: `rotate(-90 18 ${y0 + H / 2})`, "text-anchor": "middle",
  }).textContent = "Recession velocity (km/s)";

  const dMax = 200;
  const vMax = 14000;
  const xOf = (d: number): number => x0 + (d / dMax) * W;
  const yOf = (v: number): number => y0 + H - (v / vMax) * H;

  for (const d of [0, 50, 100, 150, 200]) {
    const x = xOf(d);
    el(s, "line", { x1: x, y1: y0 + H, x2: x, y2: y0 + H + 4, stroke: "#8b95b8" });
    text(s, x, y0 + H + 16, String(d), {
      "text-anchor": "middle", fill: "#8b95b8", "font-size": 10,
    });
  }
  for (const v of [0, 4000, 8000, 12000]) {
    const y = yOf(v);
    el(s, "line", { x1: x0 - 4, y1: y, x2: x0, y2: y, stroke: "#8b95b8" });
    text(s, x0 - 8, y + 3, v.toString().replace(/000$/, "k"), {
      "text-anchor": "end", fill: "#8b95b8", "font-size": 10,
    });
  }

  const H0 = 70;
  el(s, "line", {
    x1: xOf(0), y1: yOf(0),
    x2: xOf(dMax), y2: yOf(H0 * dMax),
    stroke: "#6cc4ff", "stroke-width": 2,
  });

  const galaxies: Array<[number, number]> = [
    [3.5, 200], [11, 800], [16, 1200], [22, 1600], [35, 2400],
    [48, 3500], [60, 4000], [72, 5400], [85, 5900], [100, 7200],
    [120, 8200], [140, 9700], [160, 11000], [180, 12700],
  ];
  for (const [d, v] of galaxies) {
    el(s, "circle", {
      cx: xOf(d), cy: yOf(v), r: 3,
      fill: "#9be7c4", stroke: "#0c1326", "stroke-width": 0.5,
    });
  }
  text(s, xOf(150), yOf(H0 * 150) - 8, "v = H0 x d", {
    "text-anchor": "middle", fill: "#6cc4ff", "font-size": 12,
    "font-style": "italic",
  });
  text(s, xOf(150), yOf(H0 * 150) + 18, "gradient = H0 ~ 70 km/s/Mpc", {
    "text-anchor": "middle", fill: "#8b95b8", "font-size": 10,
  });
  return s;
}
