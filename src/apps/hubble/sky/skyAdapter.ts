// Hubble adapter on top of the shared SkyViewerCore. Owns the
// per-app pieces: distance-tagged candidate catalogs (direct vs
// extrapolated), galaxy marker sets with capability badges, and the
// click dispatcher.

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
import type { GalaxySet } from "../data/galaxies";
import type { DistanceTag, Galaxy } from "../types";

// Distance-tag colours, kept in sync with --accent-good / --accent-2
// in the shared style.css. Aladin's catalog options take a CSS colour
// string, not a custom var, so the literal hex is duplicated here.
const TAG_COLOR: Record<DistanceTag, string> = {
  direct: "#9be7c4",
  extrapolated: "#6cc4ff",
};

function buildBadgeText(galaxy: Galaxy): string {
  const parts: string[] = [];
  if (galaxy.capabilities.cepheidPL) parts.push("✦");
  if (galaxy.capabilities.sdssSpectrum) parts.push("λ");
  if (galaxy.isAnomaly) parts.push("⚠");
  return parts.join(" ");
}

export class HubbleSkyAdapter {
  private readonly core: SkyViewerCore;
  private readonly setCatalogs = new Map<string, AladinCatalog>();
  private candidateCatalogDirect?: AladinCatalog;
  private candidateCatalogExtrapolated?: AladinCatalog;
  private readonly candidatesById = new Map<string, Galaxy>();
  private readonly galaxiesById = new Map<string, Galaxy>();
  private masterMarkersVisible = true;
  private readonly unsubscribers: Array<() => void> = [];

  constructor(
    core: SkyViewerCore,
    callbacks: {
      onGalaxyClick: (galaxy: Galaxy) => void;
      onCandidateClick: (galaxy: Galaxy) => void;
    },
  ) {
    this.core = core;
    core.configureConstellations({
      lines: CONSTELLATIONS,
      labels: CONSTELLATION_LABELS,
      hideLabelsBelowFovDeg: SMALLEST_CONSTELLATION_DEG > 0
        ? Math.max(5, SMALLEST_CONSTELLATION_DEG)
        : 5,
    });

    void core.ready.then(() => {
      this.candidateCatalogDirect = core.addCatalog({
        name: "Search results — direct distance",
        sourceSize: 14,
        color: TAG_COLOR.direct,
        shape: "plus",
        onClick: () => {},
      });
      this.candidateCatalogExtrapolated = core.addCatalog({
        name: "Search results — extrapolated",
        sourceSize: 14,
        color: TAG_COLOR.extrapolated,
        shape: "plus",
        onClick: () => {},
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
      const galaxy = this.galaxiesById.get(id);
      if (galaxy) callbacks.onGalaxyClick(galaxy);
    });
    this.unsubscribers.push(unsub);
  }

  registerSets(sets: GalaxySet[], allGalaxies: Galaxy[]): Promise<void> {
    return this.core.ready.then(() => {
      for (const g of allGalaxies) this.galaxiesById.set(g.id, g);
      for (const set of sets) {
        if (this.setCatalogs.has(set.id)) continue;
        const cat = this.core.addCatalog({
          name: set.label,
          sourceSize: 16,
          color: set.markerColor,
          shape: set.markerShape,
          displayLabel: true,
          labelColumn: "label",
          labelColor: set.markerColor,
          labelFont: "11px system-ui, sans-serif",
          onClick: () => {},
        });
        if (!cat) continue;
        this.setCatalogs.set(set.id, cat);

        const sources: AladinSource[] = [];
        for (const id of set.galaxyIds) {
          const g = allGalaxies.find((x) => x.id === id);
          if (!g) continue;
          const badge = buildBadgeText(g);
          const labelText = badge ? `${g.name}  ${badge}` : g.name;
          const src = this.core.makeSource(g.ra, g.dec, {
            id: g.id,
            name: g.name,
            label: labelText,
            type: g.type,
          });
          if (src) sources.push(src);
        }
        if (sources.length > 0) cat.addSources(sources);
      }
    });
  }

  setAllMarkersVisible(visible: boolean): void {
    this.masterMarkersVisible = visible;
    for (const cat of this.setCatalogs.values()) {
      if (this.masterMarkersVisible) cat.show();
      else cat.hide();
    }
  }

  setSetVisibility(setId: string, visible: boolean): void {
    const cat = this.setCatalogs.get(setId);
    if (!cat) return;
    if (visible && this.masterMarkersVisible) cat.show();
    else cat.hide();
  }

  setConstellationsVisible(visible: boolean): void {
    this.core.setConstellationsVisible(visible);
  }

  async setCandidates(candidates: Galaxy[]): Promise<void> {
    await this.core.ready;
    if (
      !this.candidateCatalogDirect ||
      !this.candidateCatalogExtrapolated
    ) {
      return;
    }
    this.candidatesById.clear();
    const direct: AladinSource[] = [];
    const extrapolated: AladinSource[] = [];
    for (const g of candidates) {
      this.candidatesById.set(g.id, g);
      const src = this.core.makeSource(g.ra, g.dec, { id: g.id, name: g.name });
      if (!src) continue;
      (g.distanceTag === "direct" ? direct : extrapolated).push(src);
    }
    this.candidateCatalogDirect.removeAll();
    this.candidateCatalogExtrapolated.removeAll();
    if (direct.length > 0) this.candidateCatalogDirect.addSources(direct);
    if (extrapolated.length > 0) {
      this.candidateCatalogExtrapolated.addSources(extrapolated);
    }
  }

  removeCandidate(id: string): void {
    this.candidatesById.delete(id);
    void this.setCandidates(Array.from(this.candidatesById.values()));
  }

  clearCandidates(): void {
    this.candidatesById.clear();
    this.candidateCatalogDirect?.removeAll();
    this.candidateCatalogExtrapolated?.removeAll();
  }

  getCandidates(): Galaxy[] {
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
  gotoRaDecFov(ra: number, dec: number, fovDeg: number): Promise<void> {
    return this.core.gotoRaDecFov(ra, dec, fovDeg);
  }
  setSurvey(survey: string): Promise<void> {
    return this.core.setSurvey(survey);
  }
  setHstOverlayVisible(on: boolean): Promise<void> {
    return this.core.setHstOverlayVisible(on);
  }
  animateRaDecFov(
    ra: number,
    dec: number,
    fovDeg: number,
    durationMs: number,
  ): Promise<void> {
    return this.core.animateRaDecFov(ra, dec, fovDeg, durationMs);
  }

  destroy(): void {
    for (const fn of this.unsubscribers) fn();
    this.unsubscribers.length = 0;
    if (this.candidateCatalogDirect) {
      this.core.removeCatalog(this.candidateCatalogDirect);
    }
    if (this.candidateCatalogExtrapolated) {
      this.core.removeCatalog(this.candidateCatalogExtrapolated);
    }
    for (const cat of this.setCatalogs.values()) this.core.removeCatalog(cat);
    this.setCatalogs.clear();
    this.candidateCatalogDirect = undefined;
    this.candidateCatalogExtrapolated = undefined;
    this.galaxiesById.clear();
    this.candidatesById.clear();
  }
}
