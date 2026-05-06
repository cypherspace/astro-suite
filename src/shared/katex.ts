// Thin wrapper around KaTeX so apps can render a math expression with
// one call. Side-effect import pulls in the KaTeX stylesheet on first
// use; cached afterwards.

import katex from "katex";
import "katex/dist/katex.min.css";

export interface RenderTexOptions {
  displayMode?: boolean;
  throwOnError?: boolean;
}

export function renderTex(
  el: HTMLElement,
  expression: string,
  options: RenderTexOptions = {},
): void {
  katex.render(expression, el, {
    displayMode: options.displayMode ?? false,
    throwOnError: options.throwOnError ?? false,
    output: "html",
  });
}

export function texSpan(
  expression: string,
  options: RenderTexOptions = {},
): HTMLSpanElement {
  const span = document.createElement("span");
  renderTex(span, expression, options);
  return span;
}
