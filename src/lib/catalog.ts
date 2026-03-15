/**
 * Fetch course descriptions from the UNT catalog (catalog.unt.edu).
 *
 * Strategy:
 *  1. Search the catalog for the course prefix + number.
 *  2. Extract the course's `coid` from the search results HTML.
 *  3. Fetch the individual course page and extract the description text.
 *  4. Cache results in-memory so we don't re-fetch during the same server lifecycle.
 */

const CATALOG_ID = "46"; // current UNT catalog id — update if catalog year changes
const BASE_URL = "https://catalog.unt.edu";

// In-memory cache to avoid redundant fetches within the same server lifecycle
const descriptionCache = new Map<string, string | null>();

/**
 * Fetch the course description from UNT's online catalog.
 * Returns the description string, or null if not found.
 */
export async function fetchCourseDescription(
  prefix: string,
  number: string
): Promise<string | null> {
  const cacheKey = `${prefix}|${number}`;

  if (descriptionCache.has(cacheKey)) {
    return descriptionCache.get(cacheKey) ?? null;
  }

  try {
    // Step 1: Search the catalog for this course
    const searchUrl = new URL(`${BASE_URL}/search_advanced.php`);
    searchUrl.searchParams.set("cur_cat_oid", CATALOG_ID);
    searchUrl.searchParams.set("search_database", "Search");
    searchUrl.searchParams.set("search_db", "Search");
    searchUrl.searchParams.set("act", "search");
    searchUrl.searchParams.set("search_database_type", "title");
    searchUrl.searchParams.set("subject", prefix.toUpperCase());
    searchUrl.searchParams.set("catalog_number", number);

    const searchRes = await fetch(searchUrl.toString(), {
      signal: AbortSignal.timeout(8000),
    });

    if (!searchRes.ok) {
      descriptionCache.set(cacheKey, null);
      return null;
    }

    const searchHtml = await searchRes.text();

    // Step 2: Extract the coid from the search results
    // Links look like: preview_course_nopop.php?catoid=46&coid=XXXXX
    const coidMatch = searchHtml.match(
      /preview_course_nopop\.php\?catoid=\d+&(?:amp;)?coid=(\d+)/
    );

    if (!coidMatch) {
      descriptionCache.set(cacheKey, null);
      return null;
    }

    const coid = coidMatch[1];

    // Step 3: Fetch the individual course page
    const courseUrl = `${BASE_URL}/preview_course_nopop.php?catoid=${CATALOG_ID}&coid=${coid}`;
    const courseRes = await fetch(courseUrl, {
      signal: AbortSignal.timeout(8000),
    });

    if (!courseRes.ok) {
      descriptionCache.set(cacheKey, null);
      return null;
    }

    const courseHtml = await courseRes.text();

    // Step 4: Extract the description text
    // The course page puts the description inside a <td class="block_content"> element.
    // The description text typically follows the course title heading.
    const description = extractDescription(courseHtml);

    descriptionCache.set(cacheKey, description);
    return description;
  } catch (error) {
    // Network timeout or other error — fail silently
    console.error(
      `Failed to fetch description for ${prefix} ${number}:`,
      error instanceof Error ? error.message : error
    );
    descriptionCache.set(cacheKey, null);
    return null;
  }
}

/**
 * Extract course description text from UNT catalog course HTML page.
 */
function extractDescription(html: string): string | null {
  // The description is typically inside the block_content td,
  // after the <h3> title and before the "Hours of Credit" or other metadata.
  // We'll look for the content between the course title and the first <br> or metadata.

  // Strategy: find the block_content section
  const blockMatch = html.match(
    /class="block_content"[^>]*>([\s\S]*?)<\/td>/i
  );
  if (!blockMatch) return null;

  let content = blockMatch[1];

  // Remove the course title heading (h1, h2, h3, etc.)
  content = content.replace(/<h[1-6][^>]*>[\s\S]*?<\/h[1-6]>/gi, "");

  // Remove script tags and their contents
  content = content.replace(/<script[\s\S]*?<\/script>/gi, "");

  // Remove style tags
  content = content.replace(/<style[\s\S]*?<\/style>/gi, "");

  // Remove all HTML tags
  content = content.replace(/<[^>]+>/g, " ");

  // Decode HTML entities
  content = content
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");

  // Clean up whitespace
  content = content.replace(/\s+/g, " ").trim();

  // The description is usually the first substantial paragraph of text.
  // Remove common prefixes like course hours info.
  // Try to extract just the description portion (usually between credit hours and prerequisites)

  // Remove leading/trailing metadata lines like "3 hours." or "Prerequisite(s):..."
  // The description is the meaty text — usually the longest sentence block.
  const lines = content
    .split(/\.\s+/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  // Find description-like content (skip short metadata lines at the start)
  const descriptionLines: string[] = [];
  let started = false;

  for (const line of lines) {
    // Skip credit hour lines like "3 hours"
    if (!started && /^\d+\s+hours?$/i.test(line)) continue;
    // Skip empty or very short metadata
    if (!started && line.length < 15) continue;

    // Stop at prerequisite/corequisite lines
    if (/^Prerequisite/i.test(line)) break;
    if (/^Corequisite/i.test(line)) break;
    if (/^Note/i.test(line)) break;
    if (/^Offered/i.test(line)) break;
    if (/^May be repeated/i.test(line)) break;

    started = true;
    descriptionLines.push(line);
  }

  if (descriptionLines.length === 0) return null;

  let description = descriptionLines.join(". ").trim();
  // Ensure it ends with a period
  if (description && !description.endsWith(".")) {
    description += ".";
  }

  return description || null;
}
