import "./style.css";
import { TabBar } from "./tabBar";
import { APPS, type AppRegistration } from "./apps";
import type { AppModule, AppMountPoints } from "./shared/appTypes";

const titleEl = mustGet("app-title");
const subtitleEl = mustGet("app-subtitle");
const tabBarEl = mustGet("tab-bar");
const actionBarEl = mustGet("action-bar");
const mainEl = mustGet("app-main");
const fullscreenStripEl = mustGet("sky-fullscreen-strip");

const tabBar = new TabBar(tabBarEl);

interface ActiveApp {
  id: string;
  unmount: () => void;
}

let active: ActiveApp | null = null;
const moduleCache = new Map<string, AppModule>();

async function activate(id: string): Promise<void> {
  const reg = APPS.find((a) => a.id === id);
  if (!reg) return;

  // Tear down the current app before swapping in the next one. The
  // shell is responsible for the outer chrome (title block, action
  // buttons, main content, fullscreen overlay) — apps own everything
  // inside `mainEl`.
  if (active) {
    try {
      active.unmount();
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error("Unmount failed for", active.id, e);
    }
    active = null;
  }
  // Exit Aladin fullscreen if the previous app left us inside it.
  if (document.body.classList.contains("aladin-fullscreen")) {
    document.body.classList.remove("aladin-fullscreen");
    if (document.fullscreenElement) {
      try {
        await document.exitFullscreen();
      } catch {
        /* best effort */
      }
    }
  }
  mainEl.replaceChildren();
  actionBarEl.replaceChildren();
  fullscreenStripEl.replaceChildren();
  fullscreenStripEl.hidden = true;

  let mod = moduleCache.get(id);
  if (!mod) {
    mod = await reg.load();
    moduleCache.set(id, mod);
  }

  titleEl.textContent = mod.title;
  subtitleEl.textContent = mod.subtitle;
  document.title = mod.title;

  const points: AppMountPoints = {
    root: mainEl,
    headerButtonsEl: actionBarEl,
    setSubtitle: (text) => {
      subtitleEl.textContent = text;
    },
    fullscreenStripEl,
  };

  const unmount = await mod.mount(points);
  active = { id, unmount };
}

tabBar.onSelect((id) => {
  void activate(id);
});

void activate(tabBar.getActive());

function mustGet(id: string): HTMLElement {
  const el = document.getElementById(id);
  if (!el) throw new Error(`#${id} not found`);
  return el;
}

// Surface a brief tabBar reference for diagnostics so devtools can
// peek at the active id without digging through closures.
declare global {
  interface Window {
    __astroSuite?: { tabBar: TabBar; getActive(): string; activate(id: string): void };
  }
}
window.__astroSuite = {
  tabBar,
  getActive: () => tabBar.getActive(),
  activate: (id: string) => {
    tabBar.select(id);
  },
};

// Suppress unused-import warning when running TS in noUnusedLocals mode.
export type { AppRegistration };
