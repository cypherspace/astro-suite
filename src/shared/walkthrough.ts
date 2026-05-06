// Generic step-tooltip walkthrough engine. Each step optionally
// targets a CSS selector; when omitted, the tooltip centers on screen
// for intro/outro steps. State is persisted to localStorage so the
// tour only auto-runs once per app.

export interface WalkthroughStep {
  selector?: string;
  title: string;
  body: string;
}

export interface WalkthroughSpec {
  storageKey: string;
  steps: WalkthroughStep[];
}

interface ActiveTour {
  index: number;
  cleanup: () => void;
}

let active: ActiveTour | null = null;

export function hasSeenWalkthrough(spec: WalkthroughSpec): boolean {
  try {
    return localStorage.getItem(spec.storageKey) === "1";
  } catch {
    return true;
  }
}

export function markWalkthroughSeen(spec: WalkthroughSpec): void {
  try {
    localStorage.setItem(spec.storageKey, "1");
  } catch {
    /* ignore */
  }
}

export function startWalkthrough(spec: WalkthroughSpec): void {
  if (active) active.cleanup();
  if (spec.steps.length === 0) return;

  const overlay = document.createElement("div");
  overlay.className = "tour-overlay";
  document.body.appendChild(overlay);

  const tooltip = document.createElement("div");
  tooltip.className = "tour-tooltip";
  document.body.appendChild(tooltip);

  const spotlight = document.createElement("div");
  spotlight.className = "tour-spotlight";
  document.body.appendChild(spotlight);

  let index = 0;

  const cleanup = () => {
    overlay.remove();
    tooltip.remove();
    spotlight.remove();
    active = null;
    markWalkthroughSeen(spec);
  };

  const renderStep = () => {
    const step = spec.steps[index];
    tooltip.innerHTML = "";
    const h = document.createElement("h4");
    h.textContent = step.title;
    tooltip.appendChild(h);
    const p = document.createElement("p");
    p.textContent = step.body;
    tooltip.appendChild(p);
    const buttons = document.createElement("div");
    buttons.className = "tour-buttons";
    const skip = document.createElement("button");
    skip.textContent = "Skip";
    skip.addEventListener("click", cleanup);
    const next = document.createElement("button");
    next.className = "primary";
    next.textContent = index === spec.steps.length - 1 ? "Done" : "Next";
    next.addEventListener("click", () => {
      if (index === spec.steps.length - 1) {
        cleanup();
      } else {
        index += 1;
        renderStep();
      }
    });
    buttons.appendChild(skip);
    buttons.appendChild(next);
    tooltip.appendChild(buttons);

    positionTooltip(step, tooltip, spotlight);
  };

  renderStep();
  active = { index, cleanup };
}

function positionTooltip(
  step: WalkthroughStep,
  tooltip: HTMLElement,
  spotlight: HTMLElement,
): void {
  if (!step.selector) {
    spotlight.style.display = "none";
    tooltip.style.left = "50%";
    tooltip.style.top = "50%";
    tooltip.style.transform = "translate(-50%, -50%)";
    return;
  }
  const el = document.querySelector<HTMLElement>(step.selector);
  if (!el) {
    spotlight.style.display = "none";
    tooltip.style.left = "50%";
    tooltip.style.top = "50%";
    tooltip.style.transform = "translate(-50%, -50%)";
    return;
  }
  const rect = el.getBoundingClientRect();
  spotlight.style.display = "block";
  spotlight.style.left = `${rect.left - 6}px`;
  spotlight.style.top = `${rect.top - 6}px`;
  spotlight.style.width = `${rect.width + 12}px`;
  spotlight.style.height = `${rect.height + 12}px`;

  const tooltipRect = tooltip.getBoundingClientRect();
  let left = rect.left + rect.width / 2 - tooltipRect.width / 2;
  let top = rect.bottom + 12;
  if (top + tooltipRect.height > window.innerHeight - 12) {
    top = rect.top - tooltipRect.height - 12;
  }
  if (left < 12) left = 12;
  if (left + tooltipRect.width > window.innerWidth - 12) {
    left = window.innerWidth - tooltipRect.width - 12;
  }
  tooltip.style.left = `${left}px`;
  tooltip.style.top = `${top}px`;
  tooltip.style.transform = "none";
}
