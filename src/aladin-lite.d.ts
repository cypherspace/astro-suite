// The aladin-lite npm package ships no TypeScript declarations.
// We only ever touch its default export in
// src/shared/aladin/waitForAladin.ts, where
// it's immediately cast to our own AladinNamespace type (defined in
// src/shared/aladin/types.ts). A lightweight `unknown` is all tsc
// needs to accept the import.
declare module "aladin-lite" {
  const A: unknown;
  export default A;
}
