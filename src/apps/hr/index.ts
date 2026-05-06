import "./style.css";
import type { AppModule, AppMountPoints } from "../../shared/appTypes";
import { SkyViewerCore } from "../../shared/aladin/SkyViewerCore";
import {
  installFullscreenSlot,
  type FullscreenSlotHandle,
} from "../../shared/aladin/fullscreenSlot";
import { Walkthrough } from "./ui/walkthrough";
import { STAR_SETS, findStarById, type StarSet } from "./data/sampleStars";
import { plotStar } from "./data/derive";
import {
  GaiaError,
  gaiaRowToStar,
  queryConeSearch,
  type GaiaSortBy,
} from "./data/gaia";
import { lookupSimbadName } from "../../shared/simbad";
import { HRDiagram } from "./ui/hrDiagram";
import { DataPanel } from "./ui/dataPanel";
import { Controls } from "./ui/controls";
import { HrSkyAdapter, type CandidateStar } from "./sky/skyAdapter";
import { HowItWorks } from "./ui/howItWorks";
import { HowWeKnow } from "./ui/howWeKnow";
import { DiagramGuide } from "./ui/diagramGuide";
import { deleteDiagram, loadDiagram, saveDiagram } from "./store";
import type { AxisConfig, PlottedStar, Star } from "./types";

const MAX_PLOTTED = 5000;
const DEFAULT_DOT_SIZE = 5;

const defaultAxes: AxisConfig = {
  yMode: "luminosity",
  xMode: "temperature",
  yScale: "log",
  xScale: "log",
  yLabelFormat: "decimals",
  yUnit: "solar",
};

const SCAFFOLD_HTML = `
<section id="sky-panel" aria-label="Night sky viewer">
  <div id="sky-controls">
    <div class="control-group">
      <span class="control-group-heading">Find</span>
      <input id="goto-input" type="text" placeholder="e.g. M45, Sirius" />
      <button id="goto-btn">Go</button>
    </div>
    <div class="control-group">
      <span class="control-group-heading">Sky picture</span>
      <select id="survey-select">
        <option value="P/DSS2/color">DSS2 (colour)</option>
        <option value="P/PanSTARRS/DR1/color-z-zg-g">PanSTARRS</option>
        <option value="P/SDSS9/color">SDSS</option>
        <option value="P/2MASS/color">2MASS (infrared)</option>
      </select>
      <label class="control-pair" title="Layer Hubble Space Telescope imagery on top of the base survey, where it's available">
        <input type="checkbox" id="opt-hst-overlay" />
        HST overlay
      </label>
    </div>
    <div class="control-group">
      <span class="control-group-heading">Jump to</span>
      <button id="goto-pleiades-btn" title="Jump to the Pleiades (M45) — the closest big open cluster of young blue stars">Pleiades</button>
      <button id="goto-hyades-btn" title="Jump to the Hyades — the closest open cluster, in Taurus">Hyades</button>
      <button id="goto-orion-btn" title="Jump to the Orion Nebula (M42) — an active stellar nursery">Orion Nebula</button>
      <button id="goto-ring-btn" title="Jump to the Ring Nebula (M57) — a planetary nebula in Lyra">Ring Nebula</button>
    </div>
    <div class="control-group">
      <span class="control-group-heading">Search</span>
      <button id="search-btn" class="primary" title="Look up real stars in the visible part of the sky (doesn't add them yet)">
        Search Stars
      </button>
      <span class="control-divider" aria-hidden="true"></span>
      <button id="add-all-btn" title="Add every search result to the chart">Add all</button>
      <button id="clear-candidates-btn" title="Clear search-result markers from the sky">Clear results</button>
      <label class="control-pair">
        <span>sort</span>
        <select id="sort-select" title="How to pick which stars come back from the search">
          <option value="closest">Closest</option>
          <option value="brightest">Brightest</option>
          <option value="random">Random</option>
        </select>
      </label>
      <label class="control-pair">
        <span>limit</span>
        <input id="region-limit" type="number" min="1" max="500" value="50" />
      </label>
    </div>
    <div class="control-group">
      <span class="control-group-heading">Map options</span>
      <label class="control-pair">
        <input type="checkbox" id="opt-show-markers" checked />
        Named markers
      </label>
      <label class="control-pair">
        <input type="checkbox" id="opt-show-constellations" />
        Constellations
      </label>
      <label class="control-pair">
        <input type="checkbox" id="opt-show-mapinfo" />
        Projection &amp; coords
      </label>
    </div>
    <span class="hint" id="sky-status">Loading sky…</span>
  </div>
  <div id="aladin-lite-div"></div>
</section>

<section id="diagram-panel" aria-label="H-R diagram">
  <div id="diagram"></div>
  <details id="graph-options" open>
    <summary>Graph options</summary>
    <div id="diagram-controls"></div>
  </details>
</section>

<aside id="info-panel" aria-label="Selected star">
  <h2>Selected star</h2>
  <div id="data-panel">
    <p class="hint">Click a star marker on the sky or a dot on the chart.</p>
  </div>
  <div id="star-sets"></div>
</aside>
`;

class HrApp {
  private axes: AxisConfig = defaultAxes;
  private dotSize = DEFAULT_DOT_SIZE;
  private plotted = new Map<string, PlottedStar>();
  private selectedId: string | null = null;
  private diagram: HRDiagram;
  private dataPanel: DataPanel;
  private controls: Controls;
  private sky: SkyViewerCore;
  private skyAdapter: HrSkyAdapter;
  private starSetsContainer: HTMLElement;
  private skyStatusEl: HTMLElement;
  private skyControlsEl: HTMLElement;
  private aladinEl: HTMLElement;
  private inflightGaia: AbortController | null = null;
  private simbadCache = new Map<string, string>();
  private searchSortBy: GaiaSortBy = "closest";
  private cleanups: Array<() => void> = [];
  private headerButtonsEl: HTMLElement;
  private guideBtnRef: HTMLButtonElement | null = null;
  private fullscreenStripEl: HTMLElement;
  private fullscreenSlot?: FullscreenSlotHandle;

  constructor(root: HTMLElement, points: AppMountPoints) {
    root.innerHTML = SCAFFOLD_HTML;
    this.headerButtonsEl = points.headerButtonsEl;
    this.fullscreenStripEl = points.fullscreenStripEl;

    const diagramEl = required(root, "diagram");
    const controlsEl = required(root, "diagram-controls");
    const dataEl = required(root, "data-panel");
    this.aladinEl = required(root, "aladin-lite-div");
    this.skyStatusEl = required(root, "sky-status");
    this.starSetsContainer = required(root, "star-sets");
    this.skyControlsEl = required(root, "sky-controls");

    this.dataPanel = new DataPanel(dataEl);
    this.dataPanel.showEmpty();

    this.diagram = new HRDiagram({
      container: diagramEl,
      axes: this.axes,
      dotSize: this.dotSize,
      onPointClick: (s) => {
        this.select(s.id);
        void this.skyAdapter.gotoRaDec(s.ra, s.dec);
      },
    });

    this.controls = new Controls(controlsEl, this.axes, this.dotSize, {
      onAxesChange: (axes) => {
        this.axes = axes;
        this.diagram.setAxes(axes);
      },
      onClearAll: () => this.clearAll(),
      onClearSelected: () => this.clearSelected(),
      onSave: (name) => this.save(name),
      onLoad: (name) => this.load(name),
      onDelete: (name) => deleteDiagram(name),
      onDotSizeChange: (n) => {
        this.dotSize = n;
        this.diagram.setDotSize(n);
      },
      onZoomIn: () => this.diagram.zoomIn(),
      onZoomOut: () => this.diagram.zoomOut(),
      onZoomReset: () => this.diagram.resetZoom(),
    });

    this.sky = new SkyViewerCore({
      container: this.aladinEl,
      initialTarget: "Pleiades",
      initialSurvey: "P/DSS2/color",
      initialFov: 60,
      onStatus: (msg) => {
        this.skyStatusEl.textContent = msg;
      },
    });
    this.skyAdapter = new HrSkyAdapter(this.sky, {
      onSampleClick: (star) => this.toggleStar(star),
      onCandidateClick: (star) => this.commitCandidate(star),
    });
    void this.skyAdapter.registerSets(STAR_SETS);

    this.wireSkyControls(root);
    this.renderStarSets();
    this.renderHeaderButtons();
    this.installFullscreenOverlaySwap();
    this.refresh();
    points.setSubtitle(
      "Pick stars from the night sky and watch the Hertzsprung–Russell diagram come together.",
    );
  }

  private wireSkyControls(root: HTMLElement): void {
    const gotoInput = required(root, "goto-input") as HTMLInputElement;
    const gotoBtn = required(root, "goto-btn") as HTMLButtonElement;
    const surveySelect = required(root, "survey-select") as HTMLSelectElement;
    const searchBtn = required(root, "search-btn") as HTMLButtonElement;
    const addAllBtn = required(root, "add-all-btn") as HTMLButtonElement;
    const clearCandidatesBtn = required(root, "clear-candidates-btn") as HTMLButtonElement;
    const regionLimit = required(root, "region-limit") as HTMLInputElement;
    const sortSelect = required(root, "sort-select") as HTMLSelectElement;
    try {
      const saved = localStorage.getItem("astro-suite.hr.search-order");
      if (saved === "closest" || saved === "brightest" || saved === "random") {
        sortSelect.value = saved;
        this.searchSortBy = saved;
      }
    } catch {
      /* ignore */
    }
    sortSelect.addEventListener("change", () => {
      const v = sortSelect.value as GaiaSortBy;
      this.searchSortBy = v;
      try {
        localStorage.setItem("astro-suite.hr.search-order", v);
      } catch {
        /* ignore */
      }
    });
    const showConstellations = required(root, "opt-show-constellations") as HTMLInputElement;
    const showMarkers = required(root, "opt-show-markers") as HTMLInputElement;
    const showMapInfo = required(root, "opt-show-mapinfo") as HTMLInputElement;

    const fire = () => {
      const target = gotoInput.value.trim();
      if (target) void this.skyAdapter.goto(target);
    };
    gotoBtn.addEventListener("click", fire);
    gotoInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") fire();
      // Defensive: ensure no global handler swallows space/typing
      // characters from this field. (The walkthrough's window-level
      // key listener already excludes inputs, but other apps in the
      // shell may add their own listeners later.)
      else e.stopPropagation();
    });
    surveySelect.addEventListener("change", () => {
      void this.skyAdapter.setSurvey(surveySelect.value);
    });
    const hstOverlay = root.querySelector<HTMLInputElement>("#opt-hst-overlay");
    hstOverlay?.addEventListener("change", () => {
      void this.sky.setHstOverlayVisible(hstOverlay.checked);
    });
    searchBtn.addEventListener("click", () => {
      const limit = clamp(parseInt(regionLimit.value, 10) || 50, 1, 500);
      void this.searchVisibleRegion(limit);
    });
    addAllBtn.addEventListener("click", () => this.addAllCandidates());
    clearCandidatesBtn.addEventListener("click", () => {
      this.skyAdapter.clearCandidates();
      this.skyStatusEl.textContent = "Search results cleared.";
    });
    showConstellations.addEventListener("change", () => {
      this.skyAdapter.setConstellationsVisible(showConstellations.checked);
    });
    showMarkers.addEventListener("change", () => {
      this.skyAdapter.setAllMarkersVisible(showMarkers.checked);
    });
    showMapInfo.addEventListener("change", () => {
      document.body.classList.toggle("view-info-open", showMapInfo.checked);
      void this.sky.setCoordGridVisible(showMapInfo.checked);
    });

    // Jump-to presets — clusters + nebulae (per-app to fit the audience).
    // FoVs picked to give pedagogically useful framing.
    const presets: Array<[string, number, number, number, string]> = [
      ["goto-pleiades-btn", 56.75, 24.117, 3, "Pleiades (M45)"],
      ["goto-hyades-btn", 66.75, 15.867, 6, "Hyades open cluster"],
      ["goto-orion-btn", 83.822, -5.391, 1.5, "Orion Nebula (M42)"],
      ["goto-ring-btn", 283.396, 33.029, 0.5, "Ring Nebula (M57)"],
    ];
    for (const [id, ra, dec, fov, name] of presets) {
      const btn = root.querySelector<HTMLButtonElement>(`#${id}`);
      btn?.addEventListener("click", () => {
        void this.sky.gotoRaDecFov(ra, dec, fov);
        this.skyStatusEl.textContent = `Centred on ${name}.`;
      });
    }
  }

  private renderHeaderButtons(): void {
    const buttons: Array<[string, string, string, () => void]> = [
      ["how-btn", "How it works", "A short walk-through of how the app works", () => new HowItWorks().open()],
      ["how-we-know-btn", "How we know", "The physics behind each calculated value", () => new HowWeKnow().open()],
      ["diagram-guide-btn", "Diagram guide", "Plot 200 stars on your diagram to unlock this guide.", () => {
        new DiagramGuide({
          onSetOverlay: (mode) => this.diagram.setOverlay(mode),
          getCurrentOverlay: () => this.diagram.getOverlay(),
        }).open();
      }],
      ["tour-btn", "Tour", "Replay the on-screen tour", () => {
        Walkthrough.reset();
        new Walkthrough().start();
      }],
    ];
    for (const [id, label, title, onClick] of buttons) {
      const btn = document.createElement("button");
      btn.id = id;
      btn.type = "button";
      btn.title = title;
      btn.textContent = label;
      if (id === "diagram-guide-btn") {
        btn.disabled = true;
        this.guideBtnRef = btn;
      }
      btn.addEventListener("click", () => {
        if (btn.disabled) return;
        onClick();
      });
      this.headerButtonsEl.appendChild(btn);
    }
  }

  private installFullscreenOverlaySwap(): void {
    this.fullscreenSlot = installFullscreenSlot(
      this.skyControlsEl,
      this.fullscreenStripEl,
    );
  }

  private renderStarSets(): void {
    this.starSetsContainer.replaceChildren();
    for (const set of STAR_SETS) {
      this.starSetsContainer.appendChild(this.renderStarSet(set));
    }
  }

  private renderStarSet(set: StarSet): HTMLElement {
    const details = document.createElement("details");
    details.className = "star-set";
    details.dataset.setId = set.id;

    const summary = document.createElement("summary");
    const swatch = document.createElement("span");
    swatch.className = "set-swatch";
    swatch.style.background = set.markerColor;
    summary.appendChild(swatch);
    const labelSpan = document.createElement("span");
    labelSpan.className = "set-label";
    labelSpan.textContent = set.label;
    summary.appendChild(labelSpan);
    const count = document.createElement("span");
    count.className = "set-count";
    count.textContent = `${set.stars.length}`;
    summary.appendChild(count);
    details.appendChild(summary);

    const desc = document.createElement("p");
    desc.className = "set-description";
    desc.textContent = set.description;
    details.appendChild(desc);

    const setActions = document.createElement("div");
    setActions.className = "set-actions";

    const addAllBtn = document.createElement("button");
    addAllBtn.type = "button";
    addAllBtn.textContent = "Add all to chart";
    addAllBtn.addEventListener("click", () => this.addSetToDiagram(set));
    setActions.appendChild(addAllBtn);

    const visToggle = document.createElement("label");
    visToggle.className = "set-vis";
    const visCb = document.createElement("input");
    visCb.type = "checkbox";
    visCb.checked = true;
    visCb.addEventListener("change", () => {
      this.skyAdapter.setSetVisibility(set.id, visCb.checked);
    });
    visToggle.appendChild(visCb);
    visToggle.appendChild(document.createTextNode(" Show on sky"));
    setActions.appendChild(visToggle);

    details.appendChild(setActions);

    const list = document.createElement("ul");
    list.className = "set-stars";
    for (const star of set.stars) {
      const li = document.createElement("li");
      li.dataset.id = star.id;
      const name = document.createElement("span");
      name.className = "star-name-cell";
      name.textContent = star.name;
      const meta = document.createElement("span");
      meta.className = "meta";
      meta.textContent = star.spectralType ?? "";
      li.append(name, meta);
      li.addEventListener("click", () => this.toggleStar(star));
      list.appendChild(li);
    }
    details.appendChild(list);

    return details;
  }

  private refreshSetStates(): void {
    for (const li of Array.from(
      this.starSetsContainer.querySelectorAll<HTMLLIElement>(".set-stars li"),
    )) {
      li.classList.toggle("added", this.plotted.has(li.dataset.id ?? ""));
    }
  }

  private addSetToDiagram(set: StarSet): void {
    let added = 0;
    for (const star of set.stars) {
      if (this.plotted.size >= MAX_PLOTTED) break;
      if (!this.plotted.has(star.id)) {
        this.plotted.set(star.id, plotStar(star));
        added++;
      }
    }
    this.refresh();
    this.skyStatusEl.textContent = `Added ${added} ${set.label.toLowerCase()} to the chart.`;
  }

  private toggleStar(star: Star): void {
    if (this.plotted.has(star.id)) {
      this.select(star.id);
      return;
    }
    this.plotted.set(star.id, plotStar(star));
    this.select(star.id);
    this.refresh();
  }

  private select(id: string | null, fallback?: Star): void {
    this.selectedId = id;
    this.diagram.setSelected(id);
    if (id) {
      const s = this.plotted.get(id) ?? findStarById(id) ?? fallback;
      if (s) {
        this.dataPanel.show(s);
        void this.maybeResolveGaiaName(s.id);
      }
    } else {
      this.dataPanel.showEmpty();
    }
  }

  private async maybeResolveGaiaName(id: string): Promise<void> {
    if (!id.startsWith("gaia-")) return;
    const sourceId = id.slice("gaia-".length);
    let resolved = this.simbadCache.get(sourceId);
    if (resolved == null) {
      const result = await lookupSimbadName(sourceId);
      resolved = result?.display ?? "";
      this.simbadCache.set(sourceId, resolved);
    }
    if (!resolved) return;
    const plotted = this.plotted.get(id);
    if (plotted) {
      if (plotted.name !== resolved) plotted.name = resolved;
      plotted.resolved = true;
    }
    if (this.selectedId === id) {
      const s = this.plotted.get(id) ?? findStarById(id);
      if (s) this.dataPanel.show({ ...s, name: resolved, resolved: true });
    }
  }

  private clearAll(): void {
    this.plotted.clear();
    this.selectedId = null;
    this.dataPanel.showEmpty();
    this.refresh();
  }

  private clearSelected(): void {
    if (!this.selectedId) return;
    this.plotted.delete(this.selectedId);
    this.selectedId = null;
    this.dataPanel.showEmpty();
    this.refresh();
  }

  private async searchVisibleRegion(limit: number): Promise<void> {
    const center = await this.skyAdapter.getCenter();
    const fov = await this.skyAdapter.getFov();
    if (!center || !fov) {
      this.skyStatusEl.textContent = "Sky viewer not ready.";
      return;
    }
    const [ra, dec] = center;
    const radius = Math.min(Math.max(fov[0], fov[1]) / 2, 1.5);
    this.inflightGaia?.abort();
    const ctrl = new AbortController();
    this.inflightGaia = ctrl;
    const sortLabel: Record<GaiaSortBy, string> = {
      closest: "closest to centre",
      brightest: "brightest",
      random: "random sample",
    };
    this.skyStatusEl.textContent = `Searching for stars (radius ${radius.toFixed(2)}°, top ${limit} ${sortLabel[this.searchSortBy]})…`;
    try {
      const rows = await queryConeSearch(ra, dec, radius, {
        topN: limit,
        sortBy: this.searchSortBy,
        signal: ctrl.signal,
      });
      if (ctrl.signal.aborted) return;
      const candidates: CandidateStar[] = [];
      for (const row of rows) {
        const star = gaiaRowToStar(row);
        if (!this.plotted.has(star.id)) candidates.push(star);
      }
      await this.skyAdapter.setCandidates(candidates);
      this.skyStatusEl.textContent =
        candidates.length > 0
          ? `Found ${candidates.length} stars with data. Click a marker to add one, or "Add all".`
          : "No new stars in that region.";
    } catch (e) {
      if (ctrl.signal.aborted) return;
      const msg =
        e instanceof GaiaError
          ? e.message
          : e instanceof Error
            ? e.message
            : String(e);
      this.skyStatusEl.textContent = `Search failed: ${msg}`;
    } finally {
      if (this.inflightGaia === ctrl) this.inflightGaia = null;
    }
  }

  private commitCandidate(star: CandidateStar): void {
    if (this.plotted.size >= MAX_PLOTTED) {
      this.skyStatusEl.textContent = `Chart already has ${MAX_PLOTTED} stars.`;
      return;
    }
    this.select(star.id, star);
    if (star.teff == null) {
      this.skyStatusEl.textContent = `${star.name}: temperature unknown — cannot place on the chart.`;
      return;
    }
    if (!this.plotted.has(star.id)) {
      this.plotted.set(star.id, plotStar(star));
    }
    this.skyAdapter.removeCandidate(star.id);
    this.refresh();
    this.skyStatusEl.textContent = `Added ${star.name}.`;
  }

  private addAllCandidates(): void {
    const candidates = this.skyAdapter.getCandidates();
    if (candidates.length === 0) {
      this.skyStatusEl.textContent = "No search results to add. Try Search first.";
      return;
    }
    let added = 0;
    let skipped = 0;
    for (const star of candidates) {
      if (this.plotted.size >= MAX_PLOTTED) break;
      if (star.teff == null) {
        skipped++;
        continue;
      }
      if (!this.plotted.has(star.id)) {
        this.plotted.set(star.id, plotStar(star));
        added++;
      }
    }
    this.skyAdapter.clearCandidates();
    this.refresh();
    this.skyStatusEl.textContent =
      skipped > 0
        ? `Added ${added} stars; skipped ${skipped} with unknown temperature.`
        : `Added ${added} stars from search results.`;
  }

  private save(name: string): void {
    const stars: Star[] = Array.from(this.plotted.values()).map((p) => ({
      id: p.id,
      name: p.name,
      ra: p.ra,
      dec: p.dec,
      mV: p.mV,
      distancePc: p.distancePc,
      teff: p.teff,
      bv: p.bv,
      spectralType: p.spectralType,
      notes: p.notes,
    }));
    saveDiagram(name, stars, this.axes);
  }

  private load(name: string): void {
    const saved = loadDiagram(name);
    if (!saved) return;
    this.plotted.clear();
    for (const star of saved.stars) {
      this.plotted.set(star.id, plotStar(star));
    }
    this.axes = saved.axes;
    this.controls.setAxes(saved.axes);
    this.diagram.setAxes(saved.axes);
    this.selectedId = null;
    this.dataPanel.showEmpty();
    this.refresh();
  }

  private refresh(): void {
    this.diagram.setStars(Array.from(this.plotted.values()));
    this.diagram.setSelected(this.selectedId);
    this.refreshSetStates();
    this.refreshGuideButton();
  }

  private static readonly GUIDE_THRESHOLD = 200;

  private refreshGuideButton(): void {
    const btn = this.guideBtnRef;
    if (!btn) return;
    const have = this.plotted.size;
    const need = HrApp.GUIDE_THRESHOLD;
    if (have >= need) {
      btn.disabled = false;
      btn.title = "A guide to the regions of the H-R diagram.";
    } else {
      btn.disabled = true;
      const remaining = need - have;
      btn.title = `Plot ${remaining} more star${remaining === 1 ? "" : "s"} to unlock this guide (${have} / ${need}).`;
    }
  }

  destroy(): void {
    for (const fn of this.cleanups) fn();
    this.cleanups.length = 0;
    this.fullscreenSlot?.destroy();
    this.skyAdapter.destroy();
    // The Aladin instance lives inside #aladin-lite-div which is part
    // of the scaffold being torn down by the shell — no explicit kill.
    this.headerButtonsEl.replaceChildren();
    this.fullscreenStripEl.hidden = true;
  }
}

function required(root: ParentNode, id: string): HTMLElement {
  const el = root.querySelector<HTMLElement>(`#${id}`);
  if (!el) throw new Error(`#${id} not found in scaffold`);
  return el;
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

const hrApp: AppModule = {
  id: "hr",
  tabLabel: "H-R diagram",
  tabSubtitle: "Hertzsprung–Russell diagram — stars",
  needsSky: true,
  title: "Interactive H-R Diagram",
  subtitle:
    "Pick stars from the night sky and watch the Hertzsprung–Russell diagram come together.",
  initialTarget: "Pleiades",
  initialFovDeg: 60,
  initialSurvey: "P/DSS2/color",
  async mount(points) {
    const app = new HrApp(points.root, points);
    if (!Walkthrough.hasBeenSeen()) {
      setTimeout(() => new Walkthrough().start(), 600);
    }
    return () => app.destroy();
  },
};

export default hrApp;
