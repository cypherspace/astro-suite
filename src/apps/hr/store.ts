// H-R diagram persistence layer. Wraps the shared diagramStore with
// the H-R-specific Star + AxisConfig record shape and an isolated
// localStorage namespace so it can't collide with other apps.
//
// Storage key:  astro-suite.hr.v1

import type { AxisConfig, SavedDiagram, Star } from "./types";
import { createDiagramStore } from "../../shared/diagramStore";

const store = createDiagramStore<SavedDiagram>("astro-suite.hr.v1");

export function listDiagrams(): SavedDiagram[] {
  return store.list();
}

export function saveDiagram(
  name: string,
  stars: Star[],
  axes: AxisConfig,
): SavedDiagram {
  const diagram: SavedDiagram = {
    name,
    savedAt: Date.now(),
    stars,
    axes,
  };
  store.save(name, diagram);
  return diagram;
}

export function loadDiagram(name: string): SavedDiagram | undefined {
  return store.load(name);
}

export function deleteDiagram(name: string): void {
  store.delete(name);
}
