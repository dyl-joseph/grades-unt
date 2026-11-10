type ViewTransitionDocument = Document & {
  startViewTransition?: (update: () => void) => unknown;
};

/**
 * Switches the theme as one cross-fade of the whole page, so surfaces, text,
 * the light-mode leaves and the dark-mode stars all change together instead of
 * each element on its own timing. Browsers without view transitions, and
 * people who prefer reduced motion, get an instant switch.
 */
export function setDarkTheme(dark: boolean) {
  const root = document.documentElement;
  if (root.classList.contains("dark") === dark) return;

  const apply = () => root.classList.toggle("dark", dark);
  const doc = document as ViewTransitionDocument;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (doc.startViewTransition && !reduceMotion) {
    doc.startViewTransition(apply);
  } else {
    apply();
  }
}
