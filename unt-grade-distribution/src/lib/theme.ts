/** How long page colors take to change when the theme switches. */
export const THEME_TRANSITION_MS = 500;

let clearTransition: number | undefined;

/**
 * Switches the theme with every page color changing together over the same
 * half second. The backgrounds hand over on their own timing: stars grow into
 * falling leaves, and leaves settle into stars (see FallingLeaves). People who
 * prefer reduced motion get an instant switch, because globals.css shortens
 * every transition for them.
 */
export function setDarkTheme(dark: boolean) {
  const root = document.documentElement;
  if (root.classList.contains("dark") === dark) return;

  root.classList.add("theme-switching");
  root.classList.toggle("dark", dark);
  window.clearTimeout(clearTransition);
  clearTransition = window.setTimeout(
    () => root.classList.remove("theme-switching"),
    THEME_TRANSITION_MS + 50,
  );
}
