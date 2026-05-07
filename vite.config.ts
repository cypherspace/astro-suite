import { defineConfig } from "vite";

export default defineConfig({
  base: "./",
  build: {
    target: "es2022",
    outDir: "dist",
    sourcemap: false,
  },
  test: {
    globals: true,
    environment: "node",
    // tests/ holds the Playwright responsive-audit suite, which has
    // its own runner (npm run test:responsive). Keep Vitest scoped to
    // unit tests under src/.
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    exclude: ["node_modules", "dist", "tests/**"],
  },
});
