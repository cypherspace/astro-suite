// Chrome-style nested tab bar. Reads the APPS registry, renders one
// tab per registered app, exposes an `onSelect(handler)` for the shell
// to swap content when the user picks a different tab. Persists the
// active id so reloads return to the last-used tab.

import { APPS, type AppRegistration } from "./apps";

const ACTIVE_KEY = "astro-suite.activeTab";

export class TabBar {
  private readonly el: HTMLElement;
  private readonly tabs = new Map<string, HTMLButtonElement>();
  private activeId: string;
  private readonly listeners = new Set<(id: string) => void>();

  constructor(container: HTMLElement) {
    this.el = container;
    this.el.classList.add("tab-strip");

    const stored = readActiveId();
    this.activeId = stored && APPS.some((a) => a.id === stored)
      ? stored
      : APPS[0]?.id ?? "";

    for (const app of APPS) this.renderTab(app);
    this.applyActive();

    this.el.addEventListener("keydown", (e) => this.handleKeydown(e));
  }

  private renderTab(app: AppRegistration): void {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "tab";
    btn.dataset.tabId = app.id;
    btn.title = app.tabSubtitle ?? app.tabLabel;
    btn.setAttribute("role", "tab");
    btn.textContent = app.tabLabel;
    btn.addEventListener("click", () => this.select(app.id));
    this.el.appendChild(btn);
    this.tabs.set(app.id, btn);
  }

  private handleKeydown(e: KeyboardEvent): void {
    const ids = APPS.map((a) => a.id);
    if (ids.length === 0) return;
    let idx = ids.indexOf(this.activeId);
    if (e.key === "ArrowRight" || (e.ctrlKey && e.key === "Tab" && !e.shiftKey)) {
      idx = (idx + 1) % ids.length;
    } else if (
      e.key === "ArrowLeft" ||
      (e.ctrlKey && e.shiftKey && e.key === "Tab")
    ) {
      idx = (idx - 1 + ids.length) % ids.length;
    } else {
      return;
    }
    e.preventDefault();
    this.select(ids[idx]);
  }

  select(id: string): void {
    if (this.activeId === id) return;
    this.activeId = id;
    writeActiveId(id);
    this.applyActive();
    for (const fn of this.listeners) fn(id);
  }

  private applyActive(): void {
    for (const [id, btn] of this.tabs) {
      btn.classList.toggle("active", id === this.activeId);
      btn.setAttribute("aria-selected", id === this.activeId ? "true" : "false");
    }
  }

  getActive(): string {
    return this.activeId;
  }

  onSelect(handler: (id: string) => void): () => void {
    this.listeners.add(handler);
    return () => this.listeners.delete(handler);
  }
}

function readActiveId(): string | null {
  try {
    return localStorage.getItem(ACTIVE_KEY);
  } catch {
    return null;
  }
}

function writeActiveId(id: string): void {
  try {
    localStorage.setItem(ACTIVE_KEY, id);
  } catch {
    /* ignore */
  }
}
