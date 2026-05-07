// Responsive layout audit. For each (scene × viewport width) it:
//   1. navigates / sets up the scene
//   2. captures a screenshot into tests/responsive/screenshots/
//   3. asserts that nothing overflows horizontally (outer page AND
//      inside each <iframe>)
//
// This is a scaffold, not a strict pass/fail gate — extend `scenes`
// as new modals get populated. The assertion uses a small tolerance
// (2px) to absorb sub-pixel rounding.
//
// Run with:  npm run test:responsive
import { test, expect, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

const SCREENSHOT_DIR = "tests/responsive/screenshots";
mkdirSync(SCREENSHOT_DIR, { recursive: true });

// Standard viewport widths: small phone, iPhone-class phone, large
// phone, tablet portrait, laptop, desktop. Heights are picked tall
// enough that long modals don't get clipped in the screenshot.
const VIEWPORTS: Array<{ w: number; h: number; label: string }> = [
  { w: 320, h: 1200, label: "320-small-phone" },
  { w: 375, h: 1200, label: "375-iphone" },
  { w: 414, h: 1200, label: "414-large-phone" },
  { w: 768, h: 1400, label: "768-tablet" },
  { w: 1024, h: 1400, label: "1024-laptop" },
  { w: 1440, h: 1400, label: "1440-desktop" },
];

type Scene = {
  name: string;
  // Called after page.goto("/"); should bring the page into the
  // state we want to audit (open modal, switch tab, etc.).
  setup: (page: Page) => Promise<void>;
};

// Add scenes here as modals get populated. Each scene runs at every
// viewport in VIEWPORTS, so keep the list curated.
const scenes: Scene[] = [
  {
    name: "shell-hr-default",
    setup: async () => {
      // HR is the default tab — nothing to do.
    },
  },
  {
    name: "shell-hubble-default",
    setup: async (page) => {
      await page.click('[data-tab-id="hubble"]');
      await page.waitForTimeout(300);
    },
  },
  {
    name: "hr-how-we-know",
    setup: async (page) => {
      await page.click("#how-we-know-btn");
      await page.waitForSelector(".how-modal", { state: "visible" });
      // Expand all <details> so collapsed content is also auditable.
      await page.evaluate(() => {
        document
          .querySelectorAll<HTMLDetailsElement>(".how-modal details")
          .forEach((d) => (d.open = true));
      });
    },
  },
  {
    name: "hubble-how-we-know",
    setup: async (page) => {
      await page.click('[data-tab-id="hubble"]');
      await page.waitForTimeout(300);
      await page.click("#how-we-know-btn");
      await page.waitForSelector(".how-modal", { state: "visible" });
      await page.evaluate(() => {
        document
          .querySelectorAll<HTMLDetailsElement>(".how-modal details")
          .forEach((d) => (d.open = true));
      });
      // Let any iframes inside the modal load before screenshotting.
      await page.waitForTimeout(500);
    },
  },
];

for (const scene of scenes) {
  for (const vp of VIEWPORTS) {
    test(`${scene.name} @ ${vp.label}`, async ({ page }) => {
      await page.setViewportSize({ width: vp.w, height: vp.h });
      await page.goto("/");
      await scene.setup(page);

      const screenshotPath = join(
        SCREENSHOT_DIR,
        `${scene.name}_${vp.label}.png`,
      );
      await page.screenshot({ path: screenshotPath, fullPage: true });

      // Outer page horizontal overflow.
      const outer = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      }));
      expect(
        outer.scrollWidth,
        `outer page scroll: ${outer.scrollWidth} > ${outer.clientWidth}`,
      ).toBeLessThanOrEqual(outer.clientWidth + 2);

      // Each iframe's inner document.
      const frames = page.frames().filter((f) => f !== page.mainFrame());
      for (const frame of frames) {
        const inner = await frame.evaluate(() => ({
          url: location.pathname,
          scrollWidth: document.documentElement.scrollWidth,
          clientWidth: document.documentElement.clientWidth,
        }));
        expect(
          inner.scrollWidth,
          `iframe ${inner.url}: ${inner.scrollWidth} > ${inner.clientWidth}`,
        ).toBeLessThanOrEqual(inner.clientWidth + 2);
      }
    });
  }
}
