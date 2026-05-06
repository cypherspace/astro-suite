import type { AladinNamespace } from "./types";

export async function waitForAladin(
  timeoutMs = 8000,
): Promise<AladinNamespace | null> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (window.A) return window.A;
    await new Promise((r) => setTimeout(r, 100));
  }
  return null;
}
