import { describe, expect, it } from "vitest";
import {
  RUSSELL_1914_FEATURED,
  buildRussell1914Background,
  russell1914ResolveStar,
  russell1914StarRecord,
} from "./russell1914";
import { plotStar } from "./derive";

describe("Russell 1914 dataset", () => {
  it("exports a non-trivial featured list", () => {
    expect(RUSSELL_1914_FEATURED.length).toBeGreaterThanOrEqual(15);
  });

  it("can resolve every featured star to a Star record", () => {
    for (const f of RUSSELL_1914_FEATURED) {
      const star = russell1914ResolveStar(f);
      expect(star, `missing data for ${f.id}`).toBeDefined();
      expect(star?.teff, `${f.id} has no teff`).toBeGreaterThan(0);
    }
  });

  it("prefixes the russell1914- id on Star records returned for the tour", () => {
    for (const f of RUSSELL_1914_FEATURED) {
      const rec = russell1914StarRecord(f);
      expect(rec).toBeDefined();
      expect(rec!.id.startsWith("russell1914-")).toBe(true);
    }
  });

  it("plotStar accepts every featured star without throwing", () => {
    for (const f of RUSSELL_1914_FEATURED) {
      const rec = russell1914StarRecord(f);
      expect(rec).toBeDefined();
      const plotted = plotStar(rec!);
      expect(Number.isFinite(plotted.absMag)).toBe(true);
      expect(Number.isFinite(plotted.luminositySolar)).toBe(true);
    }
  });

  it("background pool has plottable stars with derived teff", () => {
    const bg = buildRussell1914Background();
    expect(bg.length).toBeGreaterThanOrEqual(100);
    for (const s of bg) {
      expect(s.id.startsWith("russell1914-bg-")).toBe(true);
      expect(s.teff, `${s.id} has no teff`).toBeGreaterThan(0);
      const plotted = plotStar(s);
      expect(Number.isFinite(plotted.absMag)).toBe(true);
      expect(Number.isFinite(plotted.luminositySolar)).toBe(true);
    }
  });

  it("featured + background ids are unique within each pool", () => {
    const featuredIds = new Set(
      RUSSELL_1914_FEATURED.map((f) => `russell1914-${f.id}`),
    );
    expect(featuredIds.size).toBe(RUSSELL_1914_FEATURED.length);
    const bgIds = new Set(buildRussell1914Background().map((s) => s.id));
    expect(bgIds.size).toBe(buildRussell1914Background().length);
  });

  it("each branch is represented in the featured list", () => {
    const branches = new Set(RUSSELL_1914_FEATURED.map((f) => f.branch));
    expect(branches).toContain("main-sequence");
    expect(branches).toContain("giant");
    expect(branches).toContain("white-dwarf");
  });
});
