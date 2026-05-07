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
//  1. Cepheid period-luminosity relation (Leavitt's law)
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
//  2. Cepheid light curve — folded magnitude vs phase
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
//  3. Hubble's law — distance vs velocity, line through origin.
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
