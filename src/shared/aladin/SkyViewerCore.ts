import type {
  AladinCatalog,
  AladinGraphicOverlay,
  AladinInstance,
  AladinSource,
} from "./types";
import { waitForAladin } from "./waitForAladin";

export interface SkyViewerCoreOptions {
  container: HTMLElement;
  initialTarget?: string;
  initialSurvey?: string;
  initialFov?: number;
  onStatus?: (msg: string) => void;
}

// Defensive: clear Aladin's persistent selection cross after a click.
// Some Aladin Lite v3 builds keep drawing the highlight even when the
// catalog has `onClick: () => {}` set. Probe whichever deselect API the
// loaded build exposes.
function clearAladinSelection(aladin: AladinInstance): void {
  try {
    aladin.view?.unselectObjects?.();
  } catch {
    /* method may not exist on older builds */
  }
  try {
    aladin.selectObjects?.(null);
  } catch {
    /* same */
  }
}

export type ObjectClickHandler = (source: AladinSource) => void;

interface ConstellationConfig {
  // Lines + label data sourced from the H-R app's constellations.ts.
  lines: Array<{ id: string; segments: Array<Array<[number, number]>> }>;
  labels: Array<{ ra: number; dec: number; name: string }>;
  hideLabelsBelowFovDeg?: number;
}

export class SkyViewerCore {
  private aladin?: AladinInstance;
  readonly ready: Promise<void>;
  private readonly opts: SkyViewerCoreOptions;
  private readonly clickHandlers = new Set<ObjectClickHandler>();
  private constellationOverlay?: AladinGraphicOverlay;
  private constellationLabelCatalog?: AladinCatalog;
  private constellationsVisible = false;
  private constellationConfig?: ConstellationConfig;
  private static readonly DEFAULT_HIDE_LABELS_BELOW_FOV = 5;

  constructor(opts: SkyViewerCoreOptions) {
    this.opts = opts;
    this.ready = this.init();
  }

  private async init(): Promise<void> {
    const A = await waitForAladin();
    if (!A) {
      this.opts.onStatus?.(
        "Sky viewer failed to load. Check your internet connection.",
      );
      return;
    }
    await A.init;
    // Init Aladin with the projection / frame / location chrome
    // *enabled* so the elements exist in the DOM, then immediately
    // hide them via the body:not(.view-info-open) CSS rule. The
    // "Projection & coords" toggle in the sky controls flips the
    // body class to reveal them — no re-init required.
    this.aladin = A.aladin(this.opts.container, {
      survey: this.opts.initialSurvey ?? "P/DSS2/color",
      fov: this.opts.initialFov ?? 60,
      target: this.opts.initialTarget ?? "Pleiades",
      cooFrame: "ICRSd",
      showReticle: true,
      showZoomControl: true,
      showFullscreenControl: true,
      showLayersControl: false,
      showGotoControl: false,
      showShareControl: false,
      showCooGrid: false,
      showFrame: true,
      showProjectionControl: true,
    });

    this.aladin.on("objectClicked", (...args: unknown[]) => {
      const obj = args[0] as AladinSource | null;
      if (!obj) return;
      for (const fn of this.clickHandlers) fn(obj);
      requestAnimationFrame(() => {
        if (this.aladin) clearAladinSelection(this.aladin);
      });
    });

    const setFullscreen = (on: boolean) => {
      document.body.classList.toggle("aladin-fullscreen", on);
    };
    this.aladin.on("fullScreenToggled", (...args: unknown[]) => {
      setFullscreen(Boolean(args[0]));
    });
    document.addEventListener("fullscreenchange", () => {
      const fs = document.fullscreenElement;
      const inAladin =
        !!fs &&
        (fs === this.opts.container || this.opts.container.contains(fs));
      setFullscreen(inAladin);
    });
  }

  // ---- raw access -------------------------------------------------------

  getInstance(): AladinInstance | undefined {
    return this.aladin;
  }

  // ---- catalogs ---------------------------------------------------------

  addCatalog(opts: Record<string, unknown>): AladinCatalog | undefined {
    if (!this.aladin || !window.A) return undefined;
    const cat = window.A.catalog(opts);
    this.aladin.addCatalog(cat);
    return cat;
  }

  removeCatalog(cat: AladinCatalog): void {
    cat.removeAll();
    try {
      this.aladin?.removeCatalog?.(cat);
    } catch {
      /* fall back to the empty catalog still being attached */
    }
  }

  makeSource(
    ra: number,
    dec: number,
    data: Record<string, unknown>,
  ): AladinSource | undefined {
    return window.A?.source(ra, dec, data);
  }

  // ---- click dispatch ---------------------------------------------------

  onObjectClicked(handler: ObjectClickHandler): () => void {
    this.clickHandlers.add(handler);
    return () => this.clickHandlers.delete(handler);
  }

  // ---- navigation -------------------------------------------------------

  async getCenter(): Promise<[number, number] | null> {
    await this.ready;
    return this.aladin?.getRaDec() ?? null;
  }

  async getFov(): Promise<[number, number] | null> {
    await this.ready;
    return this.aladin?.getFov() ?? null;
  }

  async goto(target: string): Promise<void> {
    await this.ready;
    if (!this.aladin) return;
    return new Promise((resolve) => {
      this.aladin!.gotoObject(target, {
        success: () => {
          this.opts.onStatus?.(`Centred on ${target}.`);
          resolve();
        },
        error: () => {
          this.opts.onStatus?.(`Could not find "${target}".`);
          resolve();
        },
      });
    });
  }

  async gotoRaDec(ra: number, dec: number): Promise<void> {
    await this.ready;
    this.aladin?.gotoRaDec(ra, dec);
  }

  async gotoRaDecFov(ra: number, dec: number, fovDeg: number): Promise<void> {
    await this.ready;
    if (!this.aladin) return;
    this.aladin.gotoRaDec(ra, dec);
    if (this.aladin.setFov) this.aladin.setFov(fovDeg);
  }

  /**
   * Slowly pan + zoom-out + zoom-in to a target. Used by guided tours
   * (e.g. Hubble's-1929 walkthrough). Available to any app.
   */
  async animateRaDecFov(
    ra: number,
    dec: number,
    fovDeg: number,
    durationMs: number,
  ): Promise<void> {
    await this.ready;
    if (!this.aladin || !this.aladin.setFov) {
      this.aladin?.gotoRaDec(ra, dec);
      return;
    }
    const startCenter = this.aladin.getRaDec();
    const startFov = Math.max(0.1, this.aladin.getFov()[0] ?? 30);
    const endRa = ra;
    const endDec = dec;
    const endFov = Math.max(0.05, fovDeg);
    let raDelta = endRa - startCenter[0];
    if (raDelta > 180) raDelta -= 360;
    if (raDelta < -180) raDelta += 360;
    const wideFov = Math.min(60, Math.max(startFov, endFov) * 4);

    const start = performance.now();
    return new Promise<void>((resolve) => {
      const step = (now: number) => {
        const t = Math.min(1, (now - start) / durationMs);
        const eased = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
        const curRa = startCenter[0] + raDelta * eased;
        const curDec = startCenter[1] + (endDec - startCenter[1]) * eased;
        let fov: number;
        if (eased < 0.5) {
          const u = eased * 2;
          fov = startFov + (wideFov - startFov) * u;
        } else {
          const u = (eased - 0.5) * 2;
          fov = wideFov + (endFov - wideFov) * u;
        }
        this.aladin!.gotoRaDec(curRa, curDec);
        this.aladin!.setFov!(fov);
        if (t < 1) requestAnimationFrame(step);
        else resolve();
      };
      requestAnimationFrame(step);
    });
  }

  async setSurvey(survey: string): Promise<void> {
    await this.ready;
    this.aladin?.setImageSurvey(survey);
  }

  /**
   * Toggle a layered HST overlay on top of the base survey. Layers
   * Hubble Space Telescope imagery within its footprints while the
   * rest of the sky stays in the chosen base survey.
   */
  async setHstOverlayVisible(on: boolean): Promise<void> {
    await this.ready;
    if (!this.aladin) return;
    if (on && this.aladin.setOverlayImageLayer) {
      // Aladin Lite v3 builds since 2025 reject numeric opacity here
      // ("invalid type: floating point 0.7, expected a string"). The
      // optional second argument now sets a layer ID string, not
      // opacity — call with no second arg and let Aladin pick the
      // default. Layer opacity can still be tuned via
      // setOverlayOpacity if needed.
      this.aladin.setOverlayImageLayer("P/HST/EPO");
    } else if (this.aladin.removeOverlayImageLayer) {
      this.aladin.removeOverlayImageLayer();
    }
  }

  /**
   * Toggle Aladin's coordinate grid overlay. Used by the
   * "Projection & coords" checkbox.
   */
  async setCoordGridVisible(on: boolean): Promise<void> {
    await this.ready;
    if (!this.aladin) return;
    const a = this.aladin as unknown as {
      showCooGrid?: () => void;
      hideCooGrid?: () => void;
    };
    if (on) a.showCooGrid?.();
    else a.hideCooGrid?.();
  }

  // ---- constellations ---------------------------------------------------

  /**
   * One-time supply of constellation line + label data. Apps that want
   * the constellation toggle must call this once before
   * `setConstellationsVisible(true)`. The H-R app does so with its
   * bundled IAU stick-figure data; the Hubble app can pass the same
   * data to give students an orientation cue.
   */
  configureConstellations(config: ConstellationConfig): void {
    this.constellationConfig = config;
  }

  setConstellationsVisible(visible: boolean): void {
    this.constellationsVisible = visible;
    void this.ready.then(() => this.applyConstellationVisibility());
  }

  private applyConstellationVisibility(): void {
    if (!this.aladin || !window.A || !this.constellationConfig) return;
    if (this.constellationsVisible) {
      if (!this.constellationOverlay) {
        if (
          typeof window.A.graphicOverlay !== "function" ||
          typeof window.A.polyline !== "function"
        ) {
          this.opts.onStatus?.(
            "Constellation lines aren't available in this build of the sky viewer.",
          );
          return;
        }
        const overlay = window.A.graphicOverlay({
          color: "#4a5478",
          lineWidth: 0.8,
          name: "Constellations",
        });
        this.aladin.addOverlay(overlay);
        for (const c of this.constellationConfig.lines) {
          for (const segment of c.segments) {
            overlay.add(window.A.polyline(segment));
          }
        }
        this.constellationOverlay = overlay;

        const labelCat = window.A.catalog({
          name: "Constellation names",
          sourceSize: 0,
          color: "rgba(0,0,0,0)",
          shape: "circle",
          displayLabel: true,
          labelColumn: "name",
          labelColor: "#9aa6c2",
          labelFont: "italic 12px system-ui, sans-serif",
        });
        this.aladin.addCatalog(labelCat);
        const sources = this.constellationConfig.labels.map((l) =>
          window.A!.source(l.ra, l.dec, { name: l.name }),
        );
        labelCat.addSources(sources);
        this.constellationLabelCatalog = labelCat;
        this.aladin.on("zoomChanged", () =>
          this.refreshConstellationLabelVis(),
        );
        this.aladin.on("positionChanged", () =>
          this.refreshConstellationLabelVis(),
        );
      }
      this.constellationOverlay.show();
      this.refreshConstellationLabelVis();
    } else {
      this.constellationOverlay?.hide();
      this.constellationLabelCatalog?.hide();
    }
  }

  private refreshConstellationLabelVis(): void {
    if (!this.constellationLabelCatalog || !this.aladin) return;
    if (!this.constellationsVisible) {
      this.constellationLabelCatalog.hide();
      return;
    }
    const fov = this.aladin.getFov();
    const widest = Math.max(fov[0] ?? 0, fov[1] ?? 0);
    const threshold =
      this.constellationConfig?.hideLabelsBelowFovDeg ??
      SkyViewerCore.DEFAULT_HIDE_LABELS_BELOW_FOV;
    if (widest >= threshold) {
      this.constellationLabelCatalog.show();
    } else {
      this.constellationLabelCatalog.hide();
    }
  }
}
