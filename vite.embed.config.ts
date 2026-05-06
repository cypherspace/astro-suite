import { defineConfig } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";

// Single-file embed build. Set EMBED_APP=hr|hubble to bundle a single
// app's chunk inline; default builds the full multi-app shell as one
// HTML file. The shell still contains the tab bar but with only the
// requested app registered when EMBED_APP is set.
const embedApp = process.env.EMBED_APP ?? "all";

export default defineConfig({
  base: "./",
  define: {
    __EMBED_APP__: JSON.stringify(embedApp),
  },
  build: {
    target: "es2022",
    outDir: `dist-embed-${embedApp}`,
    sourcemap: false,
    cssCodeSplit: false,
    assetsInlineLimit: 100_000_000,
    rollupOptions: {
      output: {
        inlineDynamicImports: true,
      },
    },
  },
  plugins: [viteSingleFile()],
});
