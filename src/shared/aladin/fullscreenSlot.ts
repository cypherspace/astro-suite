// Slot-swap mechanism for the fullscreen sky-controls strip.
//
// On `body.aladin-fullscreen` toggle, moves the live controls element
// between its in-flow position and the fixed top strip. Same DOM
// nodes move both ways, so every event listener and form value stays
// attached. The "anchor" element captured at install time is the
// element that originally followed the controls — used to put the
// controls back in their *original* DOM position on restore (without
// it, appendChild would put them at the end of the parent, after the
// Aladin canvas).

export interface FullscreenSlotHandle {
  destroy(): void;
}

export function installFullscreenSlot(
  controlsEl: HTMLElement,
  stripEl: HTMLElement,
): FullscreenSlotHandle {
  const inFlowParent = controlsEl.parentElement;
  if (!inFlowParent) {
    return { destroy() {} };
  }
  // Capture original DOM position. `nextSibling` may be null if the
  // controls were the last child — `insertBefore(node, null)` is
  // equivalent to appendChild, so this still restores correctly.
  const anchor = controlsEl.nextSibling;

  const apply = () => {
    const inFs = document.body.classList.contains("aladin-fullscreen");
    const target = inFs ? stripEl : inFlowParent;
    if (controlsEl.parentElement !== target) {
      if (inFs) {
        target.appendChild(controlsEl);
      } else {
        inFlowParent.insertBefore(controlsEl, anchor);
      }
    }
    stripEl.hidden = !inFs;
  };
  apply();

  const observer = new MutationObserver(apply);
  observer.observe(document.body, {
    attributes: true,
    attributeFilter: ["class"],
  });

  return {
    destroy() {
      observer.disconnect();
      // Best-effort: return controls to their in-flow slot if we left
      // them in the strip during teardown (e.g. tab switch while in
      // fullscreen).
      if (controlsEl.parentElement !== inFlowParent) {
        inFlowParent.insertBefore(controlsEl, anchor);
      }
      stripEl.hidden = true;
    },
  };
}
