import "./style.css";
import type { AppModule, AppMountPoints } from "../../shared/appTypes";
import { SkyViewerCore } from "../../shared/aladin/SkyViewerCore";
import {
  installFullscreenSlot,
  type FullscreenSlotHandle,
} from "../../shared/aladin/fullscreenSlot";
import { CURATED_GALAXIES, GALAXY_SETS, findGalaxyById } from "./data/galaxies";
import { C_KM_S } from "./data/derive";
import {
  searchGalaxies,
  searchedGalaxyToGalaxy,
  type SearchedGalaxy,
} from "./data/galaxySearch";
import { VizierError } from "./data/vizier";
import { HubbleDiagram } from "./ui/hubbleDiagram";
import { Controls } from "./ui/controls";
import { DataPanel } from "./ui/dataPanel";
import { HubbleSkyAdapter } from "./sky/skyAdapter";
import { CepheidPanel } from "./ui/cepheidPanel";
import { LightCurvePanel } from "./ui/lightCurvePanel";
import { SpectrumPanel } from "./ui/spectrumPanel";
import { HowItWorks } from "./ui/howItWorks";
import { HowWeKnow } from "./ui/howWeKnow";
import { DiagramGuide } from "./ui/diagramGuide";
import { Walkthrough } from "./ui/walkthrough";
import { Hubble1929Tour } from "./ui/hubble1929Tour";
import { loadDiagram, saveDiagram } from "./store";
import type { AxisConfig, Galaxy, PlottedGalaxy } from "./types";

const defaultAxes: AxisConfig = {
  yMode: "velocity",
  range: "auto",
  showNegative: false,
};

const SCAFFOLD_HTML = `
<section id="sky-panel" aria-label="Night sky viewer">
  <div id="sky-controls">
    <div class="control-group">
      <span class="control-group-heading">Find</span>
      <input id="goto-input" type="text" placeholder="e.g. M31, NGC 5584" />
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
      <button id="goto-hdfn-btn" title="Go to the Hubble Deep Field North">HDF-N</button>
      <button id="goto-hudf-btn" title="Go to the Hubble Ultra Deep Field">HUDF</button>
      <button id="goto-coma-btn" title="Go to the Coma Cluster (rich SDSS region)">Coma</button>
      <button id="goto-virgo-btn" title="Go to the Virgo Cluster">Virgo</button>
    </div>
    <div class="control-group">
      <span class="control-group-heading">Search</span>
      <button id="search-btn" class="primary" title="Search Cosmicflows-3/4, SDSS and 2MRS for galaxies in the visible part of the sky (doesn't add them yet)">Search Galaxies</button>
      <span class="control-divider" aria-hidden="true"></span>
      <button id="add-all-btn" title="Add every search result to the chart">Add all</button>
      <button id="clear-candidates-btn" title="Clear search-result markers">Clear results</button>
      <label class="control-pair">
        <span>sort</span>
        <select id="sort-select" title="How to pick which galaxies come back from the search">
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

<section id="diagram-panel" aria-label="Hubble diagram">
  <div id="diagram"></div>
  <details id="graph-options" open>
    <summary>Graph options</summary>
    <div id="diagram-controls"></div>
  </details>
</section>

<aside id="info-panel" aria-label="Selected galaxy">
  <h2>Selected galaxy</h2>
  <div id="data-panel">
    <p class="hint">Click a galaxy marker on the sky.</p>
  </div>
  <div id="galaxy-sets"></div>
</aside>
`;

class HubbleApp {
  private axes: AxisConfig = defaultAxes;
  private plotted = new Map<string, PlottedGalaxy>();
  private selectedId: string | null = null;
  private diagram: HubbleDiagram;
  private dataPanel: DataPanel;
  private controls: Controls;
  private sky: SkyViewerCore;
  private skyAdapter: HubbleSkyAdapter;
  private galaxySetsContainer: HTMLElement;
  private skyStatusEl: HTMLElement;
  private skyControlsEl: HTMLElement;
  private aladinEl: HTMLElement;
  private searchResults = new Map<string, Galaxy>();
  private inflightSearch: AbortController | null = null;
  private searchSortBy: "closest" | "brightest" | "random" = "closest";
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
    this.galaxySetsContainer = required(root, "galaxy-sets");
    this.skyControlsEl = required(root, "sky-controls");

    this.dataPanel = new DataPanel(dataEl, {
      onAddToChart: (g) => this.addCurated(g),
      onDeriveDistance: (g) =>
        new CepheidPanel({
          galaxy: g,
          onAccept: (id, dMpc) =>
            this.acceptDerivedDistance(id, dMpc, "cepheid-pl"),
        }).open(),
      onDeriveLightCurveDistance: (g) =>
        new LightCurvePanel({
          galaxy: g,
          onAccept: (id, dMpc) =>
            this.acceptDerivedDistance(id, dMpc, "cepheid-lightcurve"),
        }).open(),
      onDeriveRedshift: (g) =>
        new SpectrumPanel({
          galaxy: g,
          onAccept: (id, vKmS) => this.acceptDerivedVelocity(id, vKmS),
        }).open(),
    });
    this.dataPanel.showEmpty();

    this.diagram = new HubbleDiagram({
      container: diagramEl,
      axes: this.axes,
      onPointClick: (g) => this.select(g.id),
    });

    this.controls = new Controls(controlsEl, this.axes, {
      onAxesChange: (axes) => {
        this.axes = axes;
        this.diagram.setAxes(axes);
      },
      onClearAll: () => this.clearAll(),
      onClearSelected: () => this.clearSelected(),
      onResetZoom: () => this.diagram.resetZoom(),
      onSave: (name) => this.save(name),
      onLoad: (name) => this.load(name),
    });

    this.sky = new SkyViewerCore({
      container: this.aladinEl,
      initialTarget: "Andromeda",
      initialSurvey: "P/DSS2/color",
      initialFov: 30,
      onStatus: (msg) => {
        this.skyStatusEl.textContent = msg;
      },
    });
    this.skyAdapter = new HubbleSkyAdapter(this.sky, {
      onGalaxyClick: (g) => this.select(g.id),
      onCandidateClick: (g) => this.commitCandidate(g),
    });
    void this.skyAdapter.registerSets(GALAXY_SETS, CURATED_GALAXIES);

    this.wireSkyControls(root);
    this.renderGalaxySets();
    this.renderHeaderButtons();
    this.installFullscreenOverlaySwap();
    this.refresh();
    points.setSubtitle(
      "Pick galaxies from the night sky. Measure distance from their Cepheid stars and redshift from their light. Watch Hubble's law emerge.",
    );

    if (Math.abs(C_KM_S * 0.001 - 299.79) > 0.5) {
      // eslint-disable-next-line no-console
      console.warn("c·z sanity check failed", C_KM_S);
    }
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
      const saved = localStorage.getItem("astro-suite.hubble.search-order");
      if (saved === "closest" || saved === "brightest" || saved === "random") {
        sortSelect.value = saved;
        this.searchSortBy = saved;
      }
    } catch {
      /* ignore */
    }
    sortSelect.addEventListener("change", () => {
      const v = sortSelect.value as "closest" | "brightest" | "random";
      this.searchSortBy = v;
      try {
        localStorage.setItem("astro-suite.hubble.search-order", v);
      } catch {
        /* ignore */
      }
    });
    const showMarkers = required(root, "opt-show-markers") as HTMLInputElement;
    const showConstellations = required(root, "opt-show-constellations") as HTMLInputElement;
    const showMapInfo = required(root, "opt-show-mapinfo") as HTMLInputElement;

    const fire = () => {
      const target = gotoInput.value.trim();
      if (target) void this.skyAdapter.goto(target);
    };
    gotoBtn.addEventListener("click", fire);
    gotoInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") fire();
      else e.stopPropagation();
    });
    try {
      const saved = localStorage.getItem("astro-suite.hubble.survey");
      if (saved) {
        const opt = surveySelect.querySelector(
          `option[value="${CSS.escape(saved)}"]`,
        );
        if (opt) {
          surveySelect.value = saved;
          void this.skyAdapter.setSurvey(saved);
        }
      }
    } catch {
      /* ignore */
    }
    surveySelect.addEventListener("change", () => {
      const v = surveySelect.value;
      void this.skyAdapter.setSurvey(v);
      try {
        localStorage.setItem("astro-suite.hubble.survey", v);
      } catch {
        /* ignore */
      }
    });
    searchBtn.addEventListener("click", () => {
      const limit = clamp(parseInt(regionLimit.value, 10) || 50, 1, 500);
      void this.searchVisibleRegion(limit);
    });
    addAllBtn.addEventListener("click", () => this.addAllCandidates());
    clearCandidatesBtn.addEventListener("click", () => {
      this.skyAdapter.clearCandidates();
      this.searchResults.clear();
      this.skyStatusEl.textContent = "Search results cleared.";
    });
    showMarkers.addEventListener("change", () => {
      this.skyAdapter.setAllMarkersVisible(showMarkers.checked);
    });
    showConstellations.addEventListener("change", () => {
      this.skyAdapter.setConstellationsVisible(showConstellations.checked);
    });
    showMapInfo.addEventListener("change", () => {
      document.body.classList.toggle("view-info-open", showMapInfo.checked);
      void this.sky.setCoordGridVisible(showMapInfo.checked);
    });

    const hstOverlay = root.querySelector<HTMLInputElement>("#opt-hst-overlay");
    hstOverlay?.addEventListener("change", () => {
      void this.skyAdapter.setHstOverlayVisible(hstOverlay.checked);
    });

    const presets: Array<[string, number, number, number, string]> = [
      ["goto-hdfn-btn", 189.21, 62.22, 0.1, "Hubble Deep Field North"],
      ["goto-hudf-btn", 53.16, -27.79, 0.1, "Hubble Ultra Deep Field"],
      ["goto-coma-btn", 194.94, 27.94, 1.5, "Coma Cluster"],
      ["goto-virgo-btn", 187.7, 12.39, 4.0, "Virgo Cluster"],
    ];
    for (const [id, ra, dec, fov, name] of presets) {
      const btn = root.querySelector<HTMLButtonElement>(`#${id}`);
      btn?.addEventListener("click", () => {
        void this.skyAdapter.gotoRaDecFov(ra, dec, fov);
        this.skyStatusEl.textContent = `Centred on ${name}.`;
      });
    }

  }

  private renderHeaderButtons(): void {
    const buttons: Array<[string, string, string, () => void]> = [
      ["how-btn", "How it works", "How the app works", () => new HowItWorks().open()],
      ["how-we-know-btn", "How we know", "The physics behind each calculated value", () => new HowWeKnow().open()],
      ["diagram-guide-btn", "Diagram guide", "Plot at least 8 galaxies on your diagram to unlock this guide.", () => new DiagramGuide().open()],
      ["tour-btn", "Tour", "Replay the on-screen tour", () => {
        Walkthrough.reset();
        new Walkthrough().start();
      }],
      ["hubble1929-btn", "Hubble's 1929 graph", "Step through Hubble's original 1929 graph, galaxy by galaxy", () => this.runHubble1929Tour()],
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

  private runHubble1929Tour(): void {
    const tour = new Hubble1929Tour({
      skyViewer: this.skyAdapter,
      plotGalaxy: (g) => {
        this.plotted.set(g.id, g);
        this.refresh();
      },
      clearHubble1929: () => {
        for (const id of Array.from(this.plotted.keys())) {
          if (id.startsWith("hubble1929-")) this.plotted.delete(id);
        }
        this.refresh();
      },
      getAxes: () => this.axes,
      setAxes: (axes) => {
        this.axes = axes;
        this.controls.setAxes(axes);
        this.diagram.setAxes(axes);
      },
      getPlotted: () => Array.from(this.plotted.values()),
      onClose: () => {
        this.skyStatusEl.textContent = "Hubble's 1929 tour finished.";
      },
    });
    void tour.start();
  }

  private renderGalaxySets(): void {
    this.galaxySetsContainer.replaceChildren();
    for (const set of GALAXY_SETS) {
      const details = document.createElement("details");
      details.className = "star-set";
      const summary = document.createElement("summary");
      const swatch = document.createElement("span");
      swatch.className = "set-swatch";
      swatch.style.background = set.markerColor;
      const label = document.createElement("span");
      label.className = "set-label";
      label.textContent = set.label;
      const count = document.createElement("span");
      count.className = "set-count";
      count.textContent = String(set.galaxyIds.length);
      summary.append(swatch, label, count);
      details.appendChild(summary);

      const desc = document.createElement("p");
      desc.className = "set-description";
      desc.textContent = set.description;
      details.appendChild(desc);

      const setActions = document.createElement("div");
      setActions.className = "set-actions";
      const addAll = document.createElement("button");
      addAll.type = "button";
      addAll.textContent = "Add all to chart";
      addAll.addEventListener("click", () => {
        for (const id of set.galaxyIds) {
          const g = findGalaxyById(id);
          if (g) this.addCurated(g);
        }
      });
      const visToggle = document.createElement("label");
      visToggle.className = "set-vis";
      const cb = document.createElement("input");
      cb.type = "checkbox";
      cb.checked = true;
      cb.addEventListener("change", () => {
        this.skyAdapter.setSetVisibility(set.id, cb.checked);
      });
      visToggle.append(cb, document.createTextNode(" Show on sky"));
      setActions.append(addAll, visToggle);
      details.appendChild(setActions);

      const list = document.createElement("ul");
      list.className = "set-stars";
      for (const id of set.galaxyIds) {
        const g = findGalaxyById(id);
        if (!g) continue;
        const li = document.createElement("li");
        li.dataset.id = id;
        const name = document.createElement("span");
        name.textContent = g.name;
        const meta = document.createElement("span");
        meta.className = "hint";
        meta.textContent = g.type;
        li.append(name, meta);
        li.addEventListener("click", () => this.select(g.id));
        list.appendChild(li);
      }
      details.appendChild(list);
      this.galaxySetsContainer.appendChild(details);
    }
  }

  private resolveGalaxy(id: string): Galaxy | undefined {
    return (
      findGalaxyById(id) ??
      this.searchResults.get(id) ??
      this.plotted.get(id)
    );
  }

  private select(id: string): void {
    this.selectedId = id;
    const g = this.resolveGalaxy(id);
    if (!g) return;
    const plotted = this.plotted.get(id) ?? null;
    this.dataPanel.show(g, plotted);
    this.diagram.setSelected(id);
    void this.skyAdapter.gotoRaDec(g.ra, g.dec);
  }

  private addCurated(galaxy: Galaxy): void {
    if (this.plotted.has(galaxy.id)) return;
    const plotted: PlottedGalaxy = {
      ...galaxy,
      plottedDistanceMpc: galaxy.distanceMpc,
      plottedVelocityKmS: galaxy.vRecKmS,
      distanceSource: "curated",
      velocitySource: "curated",
    };
    this.plotted.set(galaxy.id, plotted);
    this.refresh();
    this.skyStatusEl.textContent = `Added ${galaxy.name}.`;
  }

  private acceptDerivedDistance(
    galaxyId: string,
    distanceMpc: number,
    source: "cepheid-pl" | "cepheid-lightcurve",
  ): void {
    const g = this.resolveGalaxy(galaxyId);
    if (!g) return;
    const existing = this.plotted.get(galaxyId);
    const plotted: PlottedGalaxy = {
      ...g,
      plottedDistanceMpc: distanceMpc,
      plottedVelocityKmS: existing?.plottedVelocityKmS ?? g.vRecKmS,
      distanceSource: source,
      velocitySource: existing?.velocitySource ?? "curated",
      derivedAt: Date.now(),
    };
    this.plotted.set(galaxyId, plotted);
    this.select(galaxyId);
    this.refresh();
  }

  private acceptDerivedVelocity(galaxyId: string, vKmS: number): void {
    const g = this.resolveGalaxy(galaxyId);
    if (!g) return;
    const existing = this.plotted.get(galaxyId);
    const plotted: PlottedGalaxy = {
      ...g,
      plottedDistanceMpc: existing?.plottedDistanceMpc ?? g.distanceMpc,
      plottedVelocityKmS: vKmS,
      distanceSource: existing?.distanceSource ?? "curated",
      velocitySource: "spectrum",
      derivedAt: Date.now(),
    };
    this.plotted.set(galaxyId, plotted);
    this.select(galaxyId);
    this.refresh();
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
    this.inflightSearch?.abort();
    const ctrl = new AbortController();
    this.inflightSearch = ctrl;
    this.skyStatusEl.textContent = `Searching for galaxies (radius ${radius.toFixed(2)}°, top ${limit})…`;
    try {
      const result = await searchGalaxies(ra, dec, radius, {
        topN: limit,
        signal: ctrl.signal,
      });
      if (ctrl.signal.aborted) return;
      const rawCandidates = result.galaxies
        .map((row) => searchedGalaxyToGalaxy(row))
        .filter((g) => !this.plotted.has(g.id));
      const candidates = sortGalaxies(rawCandidates, this.searchSortBy, ra, dec);
      this.searchResults.clear();
      for (const g of candidates) this.searchResults.set(g.id, g);
      await this.skyAdapter.setCandidates(candidates);
      const sourcesLabel = formatSourceList(result.sourcesUsed);
      this.skyStatusEl.textContent =
        candidates.length > 0
          ? `Found ${candidates.length} galaxies ${sourcesLabel}. Click a marker to add one, or "Add all".`
          : "No galaxies found in that region. Try panning to a different patch.";

      if (result.cf4Pending) {
        void this.mergeCf4Background(result.cf4Pending, ctrl);
      }
    } catch (e) {
      if (ctrl.signal.aborted) return;
      const msg =
        e instanceof VizierError
          ? e.message
          : e instanceof Error
            ? e.message
            : String(e);
      this.skyStatusEl.textContent = `Search failed: ${msg}`;
    } finally {
      if (this.inflightSearch === ctrl) this.inflightSearch = null;
    }
  }

  private async mergeCf4Background(
    pending: Promise<SearchedGalaxy[]>,
    ctrl: AbortController,
  ): Promise<void> {
    this.skyStatusEl.textContent = `${this.skyStatusEl.textContent} (Looking for more direct distances in Cosmicflows-4…)`;
    let cf4Rows: SearchedGalaxy[];
    try {
      cf4Rows = await pending;
    } catch {
      return;
    }
    if (ctrl.signal.aborted) return;
    if (cf4Rows.length === 0) {
      this.skyStatusEl.textContent =
        this.skyStatusEl.textContent.replace(
          / \(Looking for more direct distances in Cosmicflows-4…\)$/,
          "",
        );
      return;
    }
    let added = 0;
    for (const row of cf4Rows) {
      const g = searchedGalaxyToGalaxy(row);
      if (this.plotted.has(g.id) || this.searchResults.has(g.id)) continue;
      const dup = Array.from(this.searchResults.values()).some(
        (existing) =>
          Math.abs(existing.ra - g.ra) < 1e-3 &&
          Math.abs(existing.dec - g.dec) < 1e-3,
      );
      if (dup) continue;
      this.searchResults.set(g.id, g);
      added++;
    }
    if (added > 0) {
      await this.skyAdapter.setCandidates(
        Array.from(this.searchResults.values()),
      );
      this.skyStatusEl.textContent = `Cosmicflows-4 added ${added} more direct distance${added === 1 ? "" : "s"}.`;
    } else {
      this.skyStatusEl.textContent =
        this.skyStatusEl.textContent.replace(
          / \(Looking for more direct distances in Cosmicflows-4…\)$/,
          "",
        );
    }
  }

  private commitCandidate(galaxy: Galaxy): void {
    if (!this.searchResults.has(galaxy.id)) {
      this.searchResults.set(galaxy.id, galaxy);
    }
    this.select(galaxy.id);
    if (!this.plotted.has(galaxy.id)) {
      this.addCurated(galaxy);
    }
    this.skyAdapter.removeCandidate(galaxy.id);
  }

  private addAllCandidates(): void {
    const candidates = this.skyAdapter.getCandidates();
    if (candidates.length === 0) {
      this.skyStatusEl.textContent = "No search results to add. Press Search catalogs first.";
      return;
    }
    let added = 0;
    for (const galaxy of candidates) {
      if (!this.plotted.has(galaxy.id)) {
        this.addCurated(galaxy);
        added++;
      }
    }
    this.skyAdapter.clearCandidates();
    this.skyStatusEl.textContent = `Added ${added} galaxies from search results.`;
  }

  private save(name: string): void {
    saveDiagram(name, Array.from(this.plotted.values()), this.axes);
    this.skyStatusEl.textContent = `Saved diagram "${name}".`;
  }

  private load(name: string): void {
    const saved = loadDiagram(name);
    if (!saved) return;
    this.plotted.clear();
    for (const p of saved.galaxies) this.plotted.set(p.id, p);
    this.axes = saved.axes;
    this.controls.setAxes(saved.axes);
    this.diagram.setAxes(saved.axes);
    this.refresh();
  }

  private refresh(): void {
    this.diagram.setGalaxies(Array.from(this.plotted.values()));
    this.diagram.setSelected(this.selectedId);
    this.refreshGalaxyListStates();
    this.refreshGuideButton();
  }

  private refreshGalaxyListStates(): void {
    for (const li of Array.from(
      this.galaxySetsContainer.querySelectorAll<HTMLLIElement>("li"),
    )) {
      li.classList.toggle("added", this.plotted.has(li.dataset.id ?? ""));
    }
  }

  private static readonly GUIDE_THRESHOLD = 8;

  private refreshGuideButton(): void {
    const btn = this.guideBtnRef;
    if (!btn) return;
    const have = this.plotted.size;
    const need = HubbleApp.GUIDE_THRESHOLD;
    if (have >= need) {
      btn.disabled = false;
      btn.title = "A guide to the regions of the Hubble diagram.";
    } else {
      btn.disabled = true;
      const remaining = need - have;
      btn.title = `Plot ${remaining} more galax${remaining === 1 ? "y" : "ies"} to unlock this guide (${have} / ${need}).`;
    }
  }

  destroy(): void {
    this.fullscreenSlot?.destroy();
    this.skyAdapter.destroy();
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

// Sort galaxy candidates client-side for the user-chosen ordering.
// "closest" — angular distance to the reticle on the sky.
// "brightest" — ascending plottedDistanceMpc as a proxy (galaxies
//   with shorter distances are usually the brightest in apparent terms;
//   actual catalog mag isn't always populated).
// "random" — Fisher-Yates shuffle.
function sortGalaxies(
  rows: Galaxy[],
  sortBy: "closest" | "brightest" | "random",
  centerRaDeg: number,
  centerDecDeg: number,
): Galaxy[] {
  if (sortBy === "random") {
    const out = rows.slice();
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
  }
  if (sortBy === "brightest") {
    return rows.slice().sort((a, b) => a.distanceMpc - b.distanceMpc);
  }
  const cRa = (centerRaDeg * Math.PI) / 180;
  const cDec = (centerDecDeg * Math.PI) / 180;
  const sinCDec = Math.sin(cDec);
  const cosCDec = Math.cos(cDec);
  return rows
    .slice()
    .map((g) => {
      const ra = (g.ra * Math.PI) / 180;
      const dec = (g.dec * Math.PI) / 180;
      const cosD = sinCDec * Math.sin(dec) + cosCDec * Math.cos(dec) * Math.cos(ra - cRa);
      const ang = Math.acos(Math.max(-1, Math.min(1, cosD)));
      return { g, ang };
    })
    .sort((a, b) => a.ang - b.ang)
    .map((x) => x.g);
}

function formatSourceList(sources: ("cf3" | "cf4" | "sdss" | "2mrs")[]): string {
  const labels: Record<string, string> = {
    cf3: "Cosmicflows-3",
    cf4: "Cosmicflows-4",
    sdss: "Sloan Digital Sky Survey",
    "2mrs": "2MASS Redshift Survey",
  };
  const names = sources.map((s) => labels[s]).filter(Boolean);
  if (names.length === 0) return "";
  if (names.length === 1) return `from ${names[0]}`;
  if (names.length === 2) return `from ${names[0]} + ${names[1]}`;
  return `from ${names.slice(0, -1).join(", ")} + ${names[names.length - 1]}`;
}

const hubbleApp: AppModule = {
  id: "hubble",
  tabLabel: "Hubble diagram",
  tabSubtitle: "Hubble diagram — galaxies",
  needsSky: true,
  title: "Interactive Hubble Diagram",
  subtitle:
    "Pick galaxies from the night sky. Measure distance from their Cepheid stars and redshift from their light. Watch Hubble's law emerge.",
  initialTarget: "Andromeda",
  initialFovDeg: 30,
  initialSurvey: "P/DSS2/color",
  async mount(points) {
    const app = new HubbleApp(points.root, points);
    if (!Walkthrough.hasBeenSeen()) {
      setTimeout(() => new Walkthrough().start(), 800);
    }
    return () => app.destroy();
  },
};

export default hubbleApp;
