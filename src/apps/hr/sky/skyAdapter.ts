// Thin H-R adapter on top of the shared SkyViewerCore. Owns the
// per-app pieces: registered marker sets for the named star groups,
// a single-coloured candidate catalog for Gaia search results, and
// the dispatch for "user clicked a sample vs a candidate".
//
// Constellation overlay lives in SkyViewerCore — we just hand it the
// IAU stick-figure data on construction.

import type {
  AladinCatalog,
  AladinSource,
} from "../../../shared/aladin/types";
import { SkyViewerCore } from "../../../shared/aladin/SkyViewerCore";
import {
  CONSTELLATIONS,
  CONSTELLATION_LABELS,
  SMALLEST_CONSTELLATION_DEG,
} from "../../../shared/aladin/constellations";
import type { MarkerShape, StarSet } from "../data/sampleStars";
import { epochFor, propagateToEpoch } from "../data/propagate";
import type { Star } from "../types";

export interface CandidateStar extends Star {}

export class HrSkyAdapter {
  private readonly core: SkyViewerCore;
  private readonly setCatalogs = new Map<string, AladinCatalog>();
  private candidateCatalog?: AladinCatalog;
  private readonly samplesById = new Map<string, Star>();
  private readonly candidatesById = new Map<string, CandidateStar>();
  private masterMarkersVisible = true;
  private readonly setVisibilityIntent = new Map<string, boolean>();
  private readonly unsubscribers: Array<() => void> = [];
  // Active marker sets, kept around so we can re-project them onto a
  // different epoch when the user switches sky-survey HiPS without
  // having to push the data back through registerSets() from above.
  private registeredSets: StarSet[] = [];
  private currentEpoch = epochFor(undefined);

  constructor(
    core: SkyViewerCore,
    callbacks: {
      onSampleClick: (star: Star) => void;
      onCandidateClick: (star: CandidateStar) => void;
      // The Aladin survey HiPS the parent app booted with — so the
      // very first marker layout matches the photograph the student
      // sees on screen, not the J2000 catalogue position.
      initialSurvey?: string;
    },
  ) {
    this.core = core;
    if (callbacks.initialSurvey) {
      this.currentEpoch = epochFor(callbacks.initialSurvey);
    }
    core.configureConstellations({
      lines: CONSTELLATIONS,
      labels: CONSTELLATION_LABELS,
      hideLabelsBelowFovDeg: SMALLEST_CONSTELLATION_DEG > 0
        ? Math.max(5, SMALLEST_CONSTELLATION_DEG)
        : 5,
    });

    void core.ready.then(() => {
      this.candidateCatalog = core.addCatalog({
        name: "Search results",
        sourceSize: 10,
        color: "#6cc4ff",
        shape: "plus",
      });
    });

    const unsub = core.onObjectClicked((obj) => {
      const id = obj.data?.id;
      if (typeof id !== "string") return;
      const candidate = this.candidatesById.get(id);
      if (candidate) {
        callbacks.onCandidateClick(candidate);
        return;
      }
      const sample = this.samplesById.get(id);
      if (sample) callbacks.onSampleClick(sample);
    });
    this.unsubscribers.push(unsub);
  }

  registerSets(sets: StarSet[]): Promise<void> {
    this.registeredSets = sets;
    return this.core.ready.then(() => this.rebuildSetCatalogs());
  }

  // (Re)build every star-set catalog using the marker positions
  // propagated to this.currentEpoch. Used at registration time and
  // again whenever the active survey changes.
  private rebuildSetCatalogs(): void {
    // Tear down any previous catalogs first — Aladin doesn't expose
    // a per-source "move" hook, so we just rebuild from scratch.
    for (const cat of this.setCatalogs.values()) this.core.removeCatalog(cat);
    this.setCatalogs.clear();
    this.samplesById.clear();

    for (const set of this.registeredSets) {
      const cat = this.core.addCatalog({
        name: set.label,
        sourceSize: 14,
        color: set.markerColor,
        shape: set.markerShape as MarkerShape,
      });
      if (!cat) continue;
      this.setCatalogs.set(set.id, cat);

      const sources: AladinSource[] = [];
      for (const s of set.stars) {
        // Cache the original (catalogue-J2000) star — clicks resolve
        // back through samplesById and we always want the canonical
        // metadata, not the projected one.
        this.samplesById.set(s.id, s);
        const { ra, dec } = propagateToEpoch(s, this.currentEpoch);
        const src = this.core.makeSource(ra, dec, {
          id: s.id,
          name: s.name,
          spectralType: s.spectralType ?? "",
        });
        if (src) sources.push(src);
      }
      if (sources.length > 0) cat.addSources(sources);
    }
    // Reapply the master + per-set visibility intent so a survey
    // change doesn't accidentally re-show a catalog the user hid.
    this.applyMarkerVisibility();
  }

  setSetVisibility(setId: string, visible: boolean): void {
    this.setVisibilityIntent.set(setId, visible);
    this.applyMarkerVisibility();
  }

  setAllMarkersVisible(visible: boolean): void {
    this.masterMarkersVisible = visible;
    this.applyMarkerVisibility();
  }

  setConstellationsVisible(visible: boolean): void {
    this.core.setConstellationsVisible(visible);
  }

  private applyMarkerVisibility(): void {
    for (const [id, cat] of this.setCatalogs) {
      const intent = this.setVisibilityIntent.get(id) ?? true;
      if (this.masterMarkersVisible && intent) cat.show();
      else cat.hide();
    }
  }

  async setCandidates(candidates: CandidateStar[]): Promise<void> {
    await this.core.ready;
    if (!this.candidateCatalog) return;
    this.candidatesById.clear();
    const sources: AladinSource[] = [];
    for (const s of candidates) {
      this.candidatesById.set(s.id, s);
      const src = this.core.makeSource(s.ra, s.dec, {
        id: s.id,
        name: s.name,
      });
      if (src) sources.push(src);
    }
    this.candidateCatalog.removeAll();
    if (sources.length > 0) this.candidateCatalog.addSources(sources);
  }

  removeCandidate(id: string): void {
    this.candidatesById.delete(id);
    void this.setCandidates(Array.from(this.candidatesById.values()));
  }

  clearCandidates(): void {
    this.candidatesById.clear();
    this.candidateCatalog?.removeAll();
  }

  getCandidates(): CandidateStar[] {
    return Array.from(this.candidatesById.values());
  }

  getCenter(): Promise<[number, number] | null> {
    return this.core.getCenter();
  }
  getFov(): Promise<[number, number] | null> {
    return this.core.getFov();
  }
  goto(target: string): Promise<void> {
    return this.core.goto(target);
  }
  gotoRaDec(ra: number, dec: number): Promise<void> {
    return this.core.gotoRaDec(ra, dec);
  }
  async setSurvey(survey: string): Promise<void> {
    // Re-project the marker positions so they land on the new
    // survey's actual photographed image, not the J2000 spot.
    const newEpoch = epochFor(survey);
    if (newEpoch !== this.currentEpoch && this.registeredSets.length > 0) {
      this.currentEpoch = newEpoch;
      await this.core.ready;
      this.rebuildSetCatalogs();
    }
    return this.core.setSurvey(survey);
  }
  animateRaDecFov(
    ra: number,
    dec: number,
    fovDeg: number,
    durationMs: number,
  ): Promise<void> {
    return this.core.animateRaDecFov(ra, dec, fovDeg, durationMs);
  }

  /**
   * Detach all per-app catalogs, click handlers, and overlays so the
   * shared core is clean for the next app to mount.
   */
  destroy(): void {
    for (const fn of this.unsubscribers) fn();
    this.unsubscribers.length = 0;
    if (this.candidateCatalog) this.core.removeCatalog(this.candidateCatalog);
    for (const cat of this.setCatalogs.values()) this.core.removeCatalog(cat);
    this.setCatalogs.clear();
    this.candidateCatalog = undefined;
    this.samplesById.clear();
    this.candidatesById.clear();
    this.core.setConstellationsVisible(false);
  }
}
