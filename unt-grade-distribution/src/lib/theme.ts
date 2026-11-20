/** How long page colors take to change when the theme switches. */
export const THEME_TRANSITION_MS = 500;

let clearTransition: number | undefined;

type ViewTransitionDocument = Document & {
  startViewTransition?: (update: () => Promise<void> | void) => unknown;
};

/**
 * Switches the theme with the whole page crossfading over half a second. The
 * backgrounds hand over on their own timing: stars grow into falling leaves,
 * and leaves settle into stars (see FallingLeaves). People who prefer reduced
 * motion get an instant switch.
 *
 * Where the browser supports view transitions, the page crossfades as one
 * snapshot on the GPU, so the cost doesn't grow with the page. Giving every
 * element its own color transition instead made the switch stutter on pages
 * with charts and long section lists, because hundreds of transitions had to
 * be restyled on every frame. That approach remains as the fallback.
 */
export function setDarkTheme(dark: boolean) {
  const root = document.documentElement;
  if (root.classList.contains("dark") === dark) return;

  const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  const doc = document as ViewTransitionDocument;

  if (!reduceMotion && typeof doc.startViewTransition === "function") {
    doc.startViewTransition(async () => {
      root.classList.toggle("dark", dark);
      // Let the components that read the theme (charts, the toggle icon)
      // re-render before the new page is captured, so they fade with it.
      await new Promise((resolve) => window.setTimeout(resolve, 0));
    });
    return;
  }

  root.classList.add("theme-switching");
  root.classList.toggle("dark", dark);
  window.clearTimeout(clearTransition);
  clearTransition = window.setTimeout(
    () => root.classList.remove("theme-switching"),
    THEME_TRANSITION_MS + 50,
  );
}
