// Hubble diagram persistence layer. Wraps the shared diagramStore
// with the Hubble-specific PlottedGalaxy + AxisConfig record shape
// in an isolated localStorage namespace.
//
// Storage key:  astro-suite.hubble.v1

import type { AxisConfig, PlottedGalaxy, SavedDiagram } from "./types";
import { createDiagramStore } from "../../shared/diagramStore";

const store = createDiagramStore<SavedDiagram>("astro-suite.hubble.v1");

export function listDiagrams(): SavedDiagram[] {
  return store.list();
}

export function saveDiagram(
  name: string,
  galaxies: PlottedGalaxy[],
  axes: AxisConfig,
): void {
  store.save(name, { name, savedAt: Date.now(), galaxies, axes });
}

export function loadDiagram(name: string): SavedDiagram | undefined {
  return store.load(name);
}

export function deleteDiagram(name: string): void {
  store.delete(name);
}
