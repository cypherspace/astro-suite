import { afterEach, describe, expect, it, vi } from "vitest";
import { lookupSimbadName } from "./simbad";

const VEGA_ASCII = "Object * alf Lyr  ---  dS*  ---  OID=@2900336\n";

describe("lookupSimbadName fallback", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("falls back to the CfA mirror when CDS fails, then skips CDS", async () => {
    const calls: string[] = [];
    vi.stubGlobal("fetch", async (url: string) => {
      calls.push(new URL(url).host);
      if (url.includes("cds.unistra.fr")) throw new TypeError("Failed to fetch");
      return new Response(VEGA_ASCII, { status: 200 });
    });

    const first = await lookupSimbadName("123");
    expect(first?.raw).toBe("* alf Lyr");
    expect(calls).toEqual(["simbad.cds.unistra.fr", "simbad.cfa.harvard.edu"]);

    calls.length = 0;
    await lookupSimbadName("456");
    expect(calls).toEqual(["simbad.cfa.harvard.edu"]);
  });
});
