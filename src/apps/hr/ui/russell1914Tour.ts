import {
  RUSSELL_1914_FEATURED,
  buildRussell1914Background,
  russell1914StarRecord,
  type Russell1914Star,
} from "../data/russell1914";
import type { AxisConfig, PlottedStar, Star } from "../types";
import type { HrSkyAdapter } from "../sky/skyAdapter";

// Henry Norris Russell's 1914 first H-R diagram, recreated as a guided
// walkthrough that mirrors the Hubble1929Tour pattern.
//
// Sequence:
//   1. Three intro modals — Russell's question, his data sources
//      (Cannon's classifications + parallaxes + Hyades + Maury giants),
//      what the student is about to see.
//   2. ~22 featured stars, one per step. For each:
//        - Aladin animates a slow pan + zoom to the star (4 s for the
//          first transition, 2.4 s thereafter). Fire-and-forget so the
//          student can read the tooltip while the sky moves.
//        - Star is plotted on the H-R diagram via the existing
//          plotStar() helper (id prefixed `russell1914-` so cleanup is
//          a single-prefix filter).
//        - First main-sequence star, first giant, and first white
//          dwarf each get one explanatory sentence about why Russell
//          cared — subsequent stars in the same branch stay quiet.
//   3. Honest-disclosure modal: "Russell plotted ~200 stars; the paper
//      doesn't list them. We'll fill in 120 bright real stars
//      catalogued by 1914 to give the diagram its density."
//   4. Rapid-plot phase: ~10 stars/sec via setInterval, ~12 s total.
//      The sky viewer is left alone here (no per-dot animation) so the
//      student can watch the diagram fill in.
//   5. Closing split-canvas reveal: Russell's original figure on the
//      left, the live diagram on the right. Three narration panels:
//        - "That's it!" — what we just rebuilt.
//        - "What we now know" — main-sequence vs giants is stellar
//          evolution; white dwarfs are degenerate matter.
//        - Final hand-off: switch axes from Russell's
//          (absoluteMagnitude, spectralClass) to the modern
//          (luminosity, temperature) so the student sees the same plot
//          in the conventions used elsewhere in the app.

const FIRST_TRANSITION_MS = 4000;
const NEXT_TRANSITION_MS = 2400;
const BG_PER_STAR_MS = 100; // 10 stars/sec
const BG_FOV_DEG = 3;       // sky animation FoV when panning to a star

export interface Russell1914TourOptions {
  skyViewer: HrSkyAdapter;
  /** Add (or replace) one star on the H-R diagram. */
  plotStarRecord: (star: Star) => void;
  /** Drop every `russell1914-*` (and `russell1914-bg-*`) entry. */
  clearRussell1914: () => void;
  /** Save / restore axes around the tour. */
  getAxes: () => AxisConfig;
  setAxes: (axes: AxisConfig) => void;
  /** Read currently-plotted stars (used for any future analytics). */
  getPlotted: () => PlottedStar[];
  /** Called when the tour finishes or the user clicks Exit. */
  onClose: () => void;
}

export class Russell1914Tour {
  private opts: Russell1914TourOptions;
  private overlay?: HTMLElement;
  private modal?: HTMLElement;
  private splitImg?: HTMLElement;
  private cancelled = false;
  private savedAxes?: AxisConfig;
  // First-time-only branch commentary flags.
  private firstMainSequenceShown = false;
  private firstGiantShown = false;
  private firstWhiteDwarfShown = false;

  constructor(opts: Russell1914TourOptions) {
    this.opts = opts;
  }

  async start(): Promise<void> {
    this.cancelled = false;
    this.savedAxes = { ...this.opts.getAxes() };
    // Force axes to match Russell's original plot: absolute V magnitude
    // on the vertical, Cannon spectral class on the horizontal, both
    // linear. The diagram already supports these modes.
    this.opts.setAxes({
      ...this.savedAxes,
      yMode: "absoluteMagnitude",
      xMode: "spectralClass",
      yScale: "linear",
      xScale: "linear",
    });

    try {
      const intro1 = await this.showIntroPanel1();
      if (!intro1 || this.cancelled) return;
      const intro2 = await this.showIntroPanel2();
      if (!intro2 || this.cancelled) return;
      const intro3 = await this.showIntroPanel3();
      if (!intro3 || this.cancelled) return;

      for (let i = 0; i < RUSSELL_1914_FEATURED.length; i++) {
        if (this.cancelled) return;
        const cont = await this.runStarStep(i);
        if (!cont) return;
      }

      const fillCont = await this.showBackgroundDisclosurePanel();
      if (!fillCont || this.cancelled) return;
      const fillFinished = await this.runBackgroundFill();
      if (!fillFinished || this.cancelled) return;

      this.enterSplitCanvas();
      const cont1 = await this.showOriginalGraphPanel();
      if (!cont1 || this.cancelled) return;
      const cont2 = await this.showWhatWeKnowPanel();
      if (!cont2 || this.cancelled) return;
      await this.showFinalRevealPanel();
    } finally {
      this.cleanup();
    }
  }

  cancel(): void {
    this.cancelled = true;
    this.cleanup();
  }

  // -----------------------------------------------------------------
  //  Split-canvas mode — Russell's original figure on the left, live
  //  diagram on the right. Toggled via a body class so CSS handles
  //  the layout (see src/apps/hr/style.css).
  // -----------------------------------------------------------------

  private enterSplitCanvas(): void {
    const diagramPanel = document.getElementById("diagram-panel");
    if (!diagramPanel || this.splitImg) return;
    const wrap = document.createElement("figure");
    wrap.id = "r1914-split-image";
    wrap.innerHTML = `
      <img src="./data/russell1914-original.png"
           alt="Russell (1914), Figure 3 — absolute magnitude vs. spectral type for ~200 stars" />
      <figcaption>
        Russell (1914), Figure 3.
        <a href="https://ui.adsabs.harvard.edu/scan/manifest/1914PA.....22..331R"
           target="_blank" rel="noopener">ADS scan</a>
      </figcaption>
    `;
    diagramPanel.insertBefore(wrap, diagramPanel.firstChild);
    document.body.classList.add("r1914-split-canvas");
    this.splitImg = wrap;
  }

  private exitSplitCanvas(): void {
    document.body.classList.remove("r1914-split-canvas");
    this.splitImg?.remove();
    this.splitImg = undefined;
  }

  private cleanup(): void {
    this.overlay?.remove();
    this.overlay = undefined;
    this.modal?.remove();
    this.modal = undefined;
    this.exitSplitCanvas();
    if (this.savedAxes) {
      this.opts.setAxes(this.savedAxes);
      this.savedAxes = undefined;
    }
  }

  // -----------------------------------------------------------------
  //  Per-featured-star step.
  // -----------------------------------------------------------------

  private async runStarStep(idx: number): Promise<boolean> {
    const s = RUSSELL_1914_FEATURED[idx];
    const ms = idx === 0 ? FIRST_TRANSITION_MS : NEXT_TRANSITION_MS;

    // 1. Plot the star immediately.
    const record = russell1914StarRecord(s);
    if (record && record.teff != null) {
      this.opts.plotStarRecord(record);
    }

    // 2. Pop up the tooltip.
    const cont = this.showStarTooltip(s, idx);

    // 3. Animate the sky in the background — fire and forget so the
    //    student can read the tooltip while Aladin pans + zooms.
    if (record) {
      void this.opts.skyViewer
        .animateRaDecFov(record.ra, record.dec, BG_FOV_DEG, ms)
        .catch(() => {/* ignore */});
    }

    return cont;
  }

  /** Build + show the bottom-right tooltip; resolve on Next/Exit. */
  private showStarTooltip(
    s: Russell1914Star,
    idx: number,
  ): Promise<boolean> {
    return new Promise<boolean>((resolve) => {
      this.overlay?.remove();
      const overlay = document.createElement("div");
      overlay.className = "r1914-overlay";
      Object.assign(overlay.style, {
        position: "fixed",
        right: "16px",
        bottom: "16px",
        maxWidth: "440px",
        background: "var(--panel)",
        border: "1px solid var(--accent-coral)",
        borderRadius: "6px",
        padding: "12px 14px",
        color: "var(--fg)",
        fontSize: "13px",
        boxShadow: "0 4px 18px rgba(0,0,0,0.45)",
        zIndex: "2000",
      } as Partial<CSSStyleDeclaration>);

      const heading = document.createElement("div");
      heading.style.fontWeight = "600";
      heading.style.fontSize = "14px";
      heading.style.color = "var(--accent-coral)";
      heading.textContent = `Step ${idx + 1} / ${RUSSELL_1914_FEATURED.length}: ${s.displayName}`;
      overlay.appendChild(heading);

      const tip = document.createElement("p");
      tip.style.margin = "8px 0";
      tip.textContent = s.tooltip;
      overlay.appendChild(tip);

      // First-time-per-branch commentary.
      const explainer = this.firstTimeBranchHint(s.branch);
      if (explainer) {
        const note = document.createElement("p");
        note.className = "hint";
        note.style.margin = "0 0 10px";
        note.textContent = explainer;
        overlay.appendChild(note);
      }

      const buttons = document.createElement("div");
      buttons.style.display = "flex";
      buttons.style.gap = "6px";
      buttons.style.justifyContent = "space-between";
      const exit = document.createElement("button");
      exit.type = "button";
      exit.textContent = "Exit tour";
      exit.addEventListener("click", () => {
        this.cancelled = true;
        overlay.remove();
        if (this.overlay === overlay) this.overlay = undefined;
        this.opts.onClose();
        resolve(false);
      });
      const next = document.createElement("button");
      next.type = "button";
      next.className = "primary";
      next.textContent =
        idx === RUSSELL_1914_FEATURED.length - 1
          ? "Fill in the rest →"
          : "Next star →";
      next.addEventListener("click", () => {
        overlay.remove();
        if (this.overlay === overlay) this.overlay = undefined;
        resolve(true);
      });
      buttons.append(exit, next);
      overlay.appendChild(buttons);

      document.body.appendChild(overlay);
      this.overlay = overlay;
    });
  }

  private firstTimeBranchHint(branch: Russell1914Star["branch"]): string | null {
    if (branch === "main-sequence" && !this.firstMainSequenceShown) {
      this.firstMainSequenceShown = true;
      return "This is on what Russell called the 'dwarf' branch — the diagonal band running from hot blue stars down to cool red ones. Most stars Russell plotted ended up here.";
    }
    if (branch === "giant" && !this.firstGiantShown) {
      this.firstGiantShown = true;
      return "Above the main band sits a clump of luminous, cool stars — Russell's 'giant' branch. Hertzsprung had argued these were physically distinct giants, and Russell's parallaxes confirmed it.";
    }
    if (branch === "white-dwarf" && !this.firstWhiteDwarfShown) {
      this.firstWhiteDwarfShown = true;
      return "Russell knew about a few faint, dense companions like Sirius B and 40 Eri B. They were a puzzle in 1914 — far too underluminous for their colour. The physics of degenerate matter wouldn't be understood for another decade.";
    }
    return null;
  }

  // -----------------------------------------------------------------
  //  Background fill — rapid-plot phase.
  // -----------------------------------------------------------------

  private async runBackgroundFill(): Promise<boolean> {
    const pool = buildRussell1914Background();
    return new Promise<boolean>((resolve) => {
      let i = 0;
      let aborted = false;

      // Reuse the bottom-right overlay slot as a progress counter.
      this.overlay?.remove();
      const overlay = document.createElement("div");
      overlay.className = "r1914-overlay r1914-progress";
      Object.assign(overlay.style, {
        position: "fixed",
        right: "16px",
        bottom: "16px",
        maxWidth: "320px",
        background: "var(--panel)",
        border: "1px solid var(--accent-coral)",
        borderRadius: "6px",
        padding: "10px 12px",
        color: "var(--fg)",
        fontSize: "13px",
        zIndex: "2000",
      } as Partial<CSSStyleDeclaration>);
      const heading = document.createElement("div");
      heading.style.fontWeight = "600";
      heading.style.color = "var(--accent-coral)";
      heading.textContent = "Filling in Russell's diagram…";
      overlay.appendChild(heading);
      const progress = document.createElement("p");
      progress.style.margin = "6px 0 8px";
      progress.textContent = `0 / ${pool.length} stars plotted`;
      overlay.appendChild(progress);
      const skipBtn = document.createElement("button");
      skipBtn.type = "button";
      skipBtn.className = "primary";
      skipBtn.textContent = "Skip";
      skipBtn.addEventListener("click", () => {
        aborted = true;
      });
      overlay.appendChild(skipBtn);
      document.body.appendChild(overlay);
      this.overlay = overlay;

      const tick = () => {
        if (this.cancelled) {
          clearInterval(handle);
          overlay.remove();
          if (this.overlay === overlay) this.overlay = undefined;
          resolve(false);
          return;
        }
        if (aborted) {
          // Plot whatever's left in one shot, then move on.
          for (; i < pool.length; i++) this.opts.plotStarRecord(pool[i]);
          clearInterval(handle);
          overlay.remove();
          if (this.overlay === overlay) this.overlay = undefined;
          resolve(true);
          return;
        }
        if (i >= pool.length) {
          clearInterval(handle);
          overlay.remove();
          if (this.overlay === overlay) this.overlay = undefined;
          resolve(true);
          return;
        }
        this.opts.plotStarRecord(pool[i]);
        i++;
        progress.textContent = `${i} / ${pool.length} stars plotted`;
      };
      const handle = setInterval(tick, BG_PER_STAR_MS);
    });
  }

  // -----------------------------------------------------------------
  //  Modal panels (intro x3, disclosure, closing x3).
  // -----------------------------------------------------------------

  private showIntroPanel1(): Promise<boolean> {
    const html = `
      <p>In 1914, Henry Norris Russell published a paper called
        <em>"Relations Between the Spectra and Other Characteristics
        of the Stars"</em>
        (<a href="https://ui.adsabs.harvard.edu/scan/manifest/1914PA.....22..331R"
            target="_blank" rel="noopener">Popular Astronomy 22, 275–294
        and 331–351 — ADS scan</a>).</p>
      <p>It was the first time anyone had drawn what we now call the
        Hertzsprung–Russell diagram — the single most useful chart in
        all of stellar astrophysics. Russell plotted around 200 stars
        with their <em>spectral class</em> on the horizontal axis and
        their <em>absolute magnitude</em> on the vertical, and out
        popped a pattern that has guided stellar physics ever since.</p>
      <p>We're going to recreate that diagram, the way Russell drew it.</p>
    `;
    return this.showLargeModal(
      "Russell's 1914 graph (1 of 3)",
      html,
      [
        { label: "Continue →", primary: true, value: true },
        { label: "Cancel", value: false },
      ],
    );
  }

  private showIntroPanel2(): Promise<boolean> {
    const html = `
      <p>Russell didn't measure the data himself. He used data from other astronomers. Several data sources are cited in his paper:</p>
      <ul>
        <li><strong>Annie Jump Cannon</strong> at Harvard had
          classified hundreds of thousands of stars into the
          OBAFGKM sequence.</li>
        <li><strong>Trigonometric parallaxes</strong> of nearby bright
          stars, measured at observatories like Cambridge and Yerkes.</li>
        <li><strong>The Hyades open cluster</strong>, where the
         <i>"moving-cluster method"</i> gave a single distance for many stars
          at once.</li>
        <li><strong>Antonia Maury's "c-type" stars</strong> — narrow-
          lined cool stars that Hertzsprung had argued were giants.</li>
      </ul>
    `;
    return this.showLargeModal(
      "Russell's 1914 graph (2 of 3)",
      html,
      [
        { label: "Continue →", primary: true, value: true },
        { label: "Cancel", value: false },
      ],
    );
  }

  private showIntroPanel3(): Promise<boolean> {
    const html = `
      <p>We'll start by walking through ${RUSSELL_1914_FEATURED.length}
        of the stars Russell talks about by name in the paper, or that
        come from the four pools above.</p>
     
    `;
    return this.showLargeModal(
      "Russell's 1914 graph (3 of 3)",
      html,
      [
        { label: "Begin", primary: true, value: true },
        { label: "Cancel", value: false },
      ],
    );
  }

  private showBackgroundDisclosurePanel(): Promise<boolean> {
    const html = `
      <p>Russell's actual figure has around <strong>200 stars</strong> —
        many more than the ${RUSSELL_1914_FEATURED.length} we just
        plotted. The paper doesn't list which 200, just describes the
        pools they came from.</p>
      <p>To reproduce the visual density of his diagram, we'll fill in
        a representative pool now: ${buildRussell1914Background().length}
        bright real stars whose spectra Annie Jump Cannon had
        classified and whose parallaxes were within reach of 1914
        observatories. These are <em>the kind</em> of stars Russell
        would have drawn from — not necessarily the exact stars he did
        draw from.</p>
    `;
    return this.showLargeModal(
      "About to fill in the rest",
      html,
      [
        { label: "Watch them appear →", primary: true, value: true },
        { label: "Skip ahead", value: true },
      ],
    );
  }

  private showOriginalGraphPanel(): Promise<boolean> {
    const html = `
      <p>That's it! On the left you can see a recreation of Russell's
        original 1914 figure; on the right, the same diagram you've
        just built from his data sources.</p>
      <p>Russell noticed that two features were clear:</p>
      <ul>
        <li>A diagonal band, from hot, bright, blue stars at the top-left,
        down to cool, dim, red stars at the bottom-right.</li>
        <li>A separate <strong>giant branch</strong> — luminous, cool
          stars in the upper-right, vindicating Hertzsprung's c-type
          hypothesis.</li>
      </ul>
      <p> He also noticed some stragglers, some dim but hot stars, that didn't fit the other two patterns.</p>
      <p>Russell didn't yet know <em>why</em> these branches and existed.</p>
    `;
    return this.showSidePanel(
      "Russell's original 1914 graph",
      html,
      [
        { label: "Continue →", primary: true, value: true },
        { label: "Exit", value: false },
      ],
    );
  }

  private showWhatWeKnowPanel(): Promise<boolean> {
    const html = `
      <p>What Russell saw as two static groups, we now read as a
        <strong>life story</strong>.</p> 
        <p>Most stars exist on the <strong>main sequence</strong> band. 
        This is the main part of a star's life, fusing
        hydrogen into helium. When the hydrogen runs out, the core
        contracts and the outer layers expand and cool — the star
        crosses up onto the <strong>giant branch</strong>. After shedding most of its
        mass, the exposed core is left as a <strong>white dwarf</strong>:
        the dense, faint stragglers Russell couldn't explain.</p>
      <p>Russell's diagram, drawn in 1914, turned out to be a snapshot
        of stellar evolution.</p>
    `;
    return this.showSidePanel(
      "What we now know",
      html,
      [
        { label: "Continue →", primary: true, value: true },
        { label: "Exit", value: false },
      ],
    );
  }

  private showFinalRevealPanel(): Promise<boolean> {
    // Switch axes from Russell's (M_V vs spectral class) to the
    // modern (luminosity, temperature) so the student sees the same
    // plot in the conventions the rest of the app uses.
    if (this.savedAxes) {
      this.opts.setAxes({
        ...this.savedAxes,
        yMode: "luminosity",
        xMode: "temperature",
        yScale: "log",
        xScale: "log",
      });
    }
    const html = `
      <p>One last thing: the rest of this app plots stars in the modern
        convention — luminosity (in solar units) on a log vertical
        axis, temperature (in Kelvin) on a log horizontal axis.</p>
      <p>We've just flipped the diagram into that view. The shape is
        the same; only the axis labels have changed. Russell's two
        branches are still there.</p>
      <p>Now it's your turn. Add stars from the night sky, search Gaia
        for fainter ones, and see how your sample compares with
        Russell's.</p>
    `;
    return this.showSidePanel(
      "Russell's diagram, modern view",
      html,
      [{ label: "Done", primary: true, value: true }],
    );
  }

  // -----------------------------------------------------------------
  //  Side-panel helper — bottom-of-viewport narration. Used during
  //  the closing sequence alongside the split-canvas image.
  // -----------------------------------------------------------------

  private showSidePanel(
    title: string,
    bodyHtml: string,
    buttons: Array<{ label: string; primary?: boolean; value: boolean }>,
  ): Promise<boolean> {
    return new Promise<boolean>((resolve) => {
      this.modal?.remove();
      this.overlay?.remove();
      this.overlay = undefined;

      const panel = document.createElement("div");
      panel.className = "r1914-side-panel";

      const heading = document.createElement("h3");
      heading.textContent = title;
      panel.appendChild(heading);

      const body = document.createElement("div");
      body.className = "r1914-side-panel-body";
      body.innerHTML = bodyHtml;
      panel.appendChild(body);

      const btnRow = document.createElement("div");
      btnRow.className = "r1914-side-panel-buttons";
      for (const b of buttons) {
        const el = document.createElement("button");
        el.type = "button";
        el.textContent = b.label;
        if (b.primary) el.className = "primary";
        el.addEventListener("click", () => {
          panel.remove();
          if (this.modal === panel) this.modal = undefined;
          resolve(b.value);
        });
        btnRow.appendChild(el);
      }
      panel.appendChild(btnRow);

      document.body.appendChild(panel);
      this.modal = panel;
    });
  }

  // -----------------------------------------------------------------
  //  Generic large-modal helper. Resolves with the chosen button's value.
  // -----------------------------------------------------------------

  private showLargeModal(
    title: string,
    bodyHtml: string,
    buttons: Array<{ label: string; primary?: boolean; value: boolean }>,
  ): Promise<boolean> {
    return new Promise<boolean>((resolve) => {
      this.modal?.remove();
      this.overlay?.remove();
      this.overlay = undefined;

      const backdrop = document.createElement("div");
      backdrop.className = "r1914-modal-backdrop";
      Object.assign(backdrop.style, {
        position: "fixed",
        inset: "0",
        background: "rgba(11, 16, 32, 0.9)",
        zIndex: "3000",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1rem",
      } as Partial<CSSStyleDeclaration>);

      const modal = document.createElement("div");
      Object.assign(modal.style, {
        background: "var(--panel)",
        border: "1px solid var(--accent-coral)",
        borderRadius: "8px",
        padding: "1.5rem 1.75rem",
        maxWidth: "min(720px, 96vw)",
        maxHeight: "92vh",
        overflowY: "auto",
        color: "var(--fg)",
        boxShadow: "0 20px 50px rgba(0, 0, 0, 0.65)",
      } as Partial<CSSStyleDeclaration>);

      const heading = document.createElement("h3");
      heading.style.margin = "0 0 0.6rem";
      heading.style.color = "var(--accent-coral)";
      heading.style.fontSize = "1.25rem";
      heading.textContent = title;
      modal.appendChild(heading);

      const body = document.createElement("div");
      body.innerHTML = bodyHtml;
      body.style.lineHeight = "1.55";
      modal.appendChild(body);

      const btnRow = document.createElement("div");
      btnRow.style.display = "flex";
      btnRow.style.gap = "0.5rem";
      btnRow.style.justifyContent = "flex-end";
      btnRow.style.marginTop = "1rem";
      for (const b of buttons) {
        const el = document.createElement("button");
        el.type = "button";
        el.textContent = b.label;
        if (b.primary) el.className = "primary";
        el.addEventListener("click", () => {
          backdrop.remove();
          if (this.modal === backdrop) this.modal = undefined;
          resolve(b.value);
        });
        btnRow.appendChild(el);
      }
      modal.appendChild(btnRow);

      backdrop.appendChild(modal);
      document.body.appendChild(backdrop);
      this.modal = backdrop;
    });
  }
}

