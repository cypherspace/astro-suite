// Consolidated Aladin Lite v3 type surface used across all sky-using
// apps. Union of the methods both Hubble-diagram and h-r-diagram call.

declare global {
  interface Window {
    A?: AladinNamespace;
  }
}

export interface AladinSource {
  data: Record<string, unknown>;
  ra?: number;
  dec?: number;
}

export interface AladinCatalog {
  addSources: (sources: AladinSource[]) => void;
  removeAll: () => void;
  show: () => void;
  hide: () => void;
}

export interface AladinGraphicOverlay {
  show: () => void;
  hide: () => void;
  add: (footprint: unknown) => void;
  addFootprints: (footprints: unknown[]) => void;
  removeAll?: () => void;
}

export interface AladinInstance {
  setImageSurvey: (survey: string) => void;
  setOverlayImageLayer?: (
    survey: string | { id?: string; url?: string; name?: string } | null,
    opacity?: number,
  ) => void;
  removeOverlayImageLayer?: (id?: string) => void;
  gotoObject: (
    name: string,
    options?: {
      success?: () => void;
      error?: (err: unknown) => void;
    },
  ) => void;
  gotoRaDec: (ra: number, dec: number) => void;
  setFov?: (fovDeg: number) => void;
  getRaDec: () => [number, number];
  getFov: () => [number, number];
  addCatalog: (cat: AladinCatalog) => void;
  removeCatalog?: (cat: AladinCatalog) => void;
  addOverlay: (overlay: AladinGraphicOverlay) => void;
  on: (
    event: string,
    handler: (...args: unknown[]) => void,
  ) => void;
  view?: {
    unselectObjects?: () => void;
    closeContextMenu?: () => void;
    popoverDiv?: HTMLElement;
  };
  selectObjects?: (sources: AladinSource[] | null) => void;
}

export interface AladinNamespace {
  init: Promise<void>;
  aladin: (
    selector: string | HTMLElement,
    opts: Record<string, unknown>,
  ) => AladinInstance;
  catalog: (opts: Record<string, unknown>) => AladinCatalog;
  graphicOverlay?: (opts: Record<string, unknown>) => AladinGraphicOverlay;
  source: (
    ra: number,
    dec: number,
    data: Record<string, unknown>,
  ) => AladinSource;
  polyline?: (
    coords: Array<[number, number]>,
    opts?: Record<string, unknown>,
  ) => unknown;
}

export {};
