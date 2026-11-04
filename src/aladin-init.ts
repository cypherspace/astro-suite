// Self-host Aladin Lite via its npm bundle, instead of loading it from
// the live CDS Strasbourg CDN as a <script src="...cds..."> tag. The
// CDN has been intermittently unavailable (observed twice in the last
// six months) and when it's down the sky viewer is completely dead —
// SkyViewerCore.ts prints "Sky viewer failed to load. Check your
// internet connection." and every app that uses the sky falls back to
// a blank state.
//
// The npm package ships one file: dist/aladin.js, with WASM inlined as
// a base64 data: URL and CSS self-injected into a <style> at runtime.
// So this import is self-contained — no runtime fetch from CDS to
// render the viewer itself. HiPS *tiles* still come from CDS's
// alasky server, which is a separate (and more reliable) service.
//
// The library doesn't auto-assign to window.A (it's a pure ES module),
// so we do it here. The rest of the code (SkyViewerCore, the various
// sky adapters) reads window.A exactly as it did when loaded by the
// <script> tag, so no other file needs to change.
import A from "aladin-lite";
import type { AladinNamespace } from "./shared/aladin/types";

(window as unknown as { A: AladinNamespace }).A =
  A as unknown as AladinNamespace;
