// Generic localStorage-backed diagram store. Each app instantiates
// its own store with a unique key + record type.
//
// On disk:
//   {
//     "version": 1,
//     "diagrams": { "<name>": <TDiagram> }
//   }

interface StoredEnvelope<TDiagram> {
  version: 1;
  diagrams: Record<string, TDiagram>;
}

export interface DiagramStore<TDiagram> {
  save: (name: string, diagram: TDiagram) => void;
  load: (name: string) => TDiagram | undefined;
  list: () => TDiagram[];
  delete: (name: string) => void;
}

export function createDiagramStore<TDiagram extends { savedAt?: number }>(
  storageKey: string,
): DiagramStore<TDiagram> {
  function readAll(): StoredEnvelope<TDiagram> {
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return { version: 1, diagrams: {} };
      const parsed = JSON.parse(raw) as StoredEnvelope<TDiagram>;
      if (parsed.version !== 1) return { version: 1, diagrams: {} };
      return parsed;
    } catch {
      return { version: 1, diagrams: {} };
    }
  }

  function writeAll(env: StoredEnvelope<TDiagram>): void {
    localStorage.setItem(storageKey, JSON.stringify(env));
  }

  return {
    save(name, diagram) {
      const env = readAll();
      env.diagrams[name] = diagram;
      writeAll(env);
    },
    load(name) {
      return readAll().diagrams[name];
    },
    list() {
      const list = Object.values(readAll().diagrams);
      list.sort((a, b) => (b.savedAt ?? 0) - (a.savedAt ?? 0));
      return list;
    },
    delete(name) {
      const env = readAll();
      delete env.diagrams[name];
      writeAll(env);
    },
  };
}
