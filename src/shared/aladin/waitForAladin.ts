import type { AladinNamespace } from "./types";

// Aladin Lite (~2.6 MB with inlined WASM) is loaded on demand from the
// aladin-lite npm package the first time a sky viewer is constructed,
// so pages that never show the sky don't pay for it. The package is a
// pure ES module, so we assign window.A ourselves for the code that
// still reads the global (e.g. the Cepheid mini-viewer).
let loading: Promise<AladinNamespace | null> | null = null;

function loadAladin(): Promise<AladinNamespace | null> {
  if (window.A) return Promise.resolve(window.A);
  loading ??= import("aladin-lite")
    .then((mod) => {
      const A = mod.default as unknown as AladinNamespace;
      window.A = A;
      return A;
    })
    .catch((e) => {
      console.error("[aladin] failed to load aladin-lite chunk:", e);
      loading = null; // allow a retry on the next viewer mount
      return null;
    });
  return loading;
}

export async function waitForAladin(
  timeoutMs = 20000,
): Promise<AladinNamespace | null> {
  return Promise.race([
    loadAladin(),
    new Promise<null>((r) => setTimeout(() => r(null), timeoutMs)),
  ]);
}
