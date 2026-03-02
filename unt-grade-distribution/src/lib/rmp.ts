/**
 * RateMyProfessors API integration
 * Based on proven scraping approach: search page HTML → legacyId → GraphQL details → ratings tags
 */

const RMP_GRAPHQL_URL = "https://www.ratemyprofessors.com/graphql";
const UNT_SCHOOL_ID = "1271";
const RMP_SEARCH_URL = "https://www.ratemyprofessors.com/search/professors";

export interface RMPProfessor {
  id: string;
  legacyId: number;
  firstName: string;
  lastName: string;
  avgRating: number;
  avgDifficulty: number;
  numRatings: number;
  wouldTakeAgainPercent: number;
  department: string;
  tags: string[];
}

// --- GraphQL queries matching the Go implementation ---

function getHeaderQuery(professorID: string): string {
  return JSON.stringify([
    {
      query: `query RatingsListQuery($id: ID!) { node(id: $id) { ... on Teacher { legacyId } } }`,
      variables: { id: btoa(`Teacher-${professorID}`) },
    },
  ]);
}

function getProfessorQuery(professorID: string): string {
  return JSON.stringify({
    query: `query TeacherRatingsPageQuery($id: ID!) {
      node(id: $id) {
        ... on Teacher {
          id
          legacyId
          firstName
          lastName
          department
          school { id name }
          numRatings
          avgDifficulty
          avgRating
          wouldTakeAgainPercent
        }
      }
    }`,
    variables: { id: btoa(`Teacher-${professorID}`) },
  });
}

function getRatingsQuery(professorID: string, numRatings: number): string {
  return JSON.stringify({
    query: `query TeacherRatingsPageQuery($id: ID!, $count: Int!) {
      node(id: $id) {
        ... on Teacher {
          ratings(first: $count) {
            edges {
              node {
                ratingTags
              }
            }
          }
        }
      }
    }`,
    variables: {
      id: btoa(`Teacher-${professorID}`),
      count: numRatings,
    },
  });
}

/**
 * Scrape the RMP search page to extract the legacyId.
 */
async function scrapeSearchPage(query: string): Promise<string | null> {
  try {
    const searchUrl = `${RMP_SEARCH_URL}/${UNT_SCHOOL_ID}?q=${encodeURIComponent(query)}`;

    const resp = await fetch(searchUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
    });

    if (!resp.ok) {
      return null;
    }

    const body = await resp.text();
    const match = body.match(/"legacyId":(\d+)/);

    if (!match || !match[1] || match[1] === UNT_SCHOOL_ID) {
      return null;
    }

    return match[1];
  } catch {
    return null;
  }
}

/**
 * Step 1: Get professor ID by trying multiple search strategies.
 * RMP's search is unreliable with full names — searching "Brian Prascher"
 * may not return Prascher at all. So we try last name first (most reliable),
 * then full name as fallback.
 */
async function getProfessorID(
  firstName: string,
  lastName: string
): Promise<string | null> {
  // Strategy 1: Search by last name only (most reliable)
  const idByLastName = await scrapeSearchPage(lastName);
  if (idByLastName) {
    // Verify this is actually the right person
    const details = await quickVerify(idByLastName, firstName, lastName);
    if (details) return idByLastName;
  }

  // Strategy 2: Search by full name
  const idByFullName = await scrapeSearchPage(`${firstName} ${lastName}`);
  if (idByFullName) {
    const details = await quickVerify(idByFullName, firstName, lastName);
    if (details) return idByFullName;
  }

  // Strategy 3: Return last name result even without name verification
  // (the professor may have a different first name on RMP)
  if (idByLastName) return idByLastName;

  return null;
}

/**
 * Quick GraphQL check to verify a professor ID matches the expected name.
 */
async function quickVerify(
  professorID: string,
  expectedFirst: string,
  expectedLast: string
): Promise<boolean> {
  try {
    const resp = await fetch(RMP_GRAPHQL_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Basic dGVzdDp0ZXN0",
      },
      body: JSON.stringify({
        query: `query { node(id: "${btoa(`Teacher-${professorID}`)}") { ... on Teacher { firstName lastName } } }`,
      }),
    });

    if (!resp.ok) return false;

    const result = await resp.json();
    const node = result?.data?.node;
    if (!node) return false;

    const normFirst = expectedFirst.toLowerCase().split(" ")[0].replace(/[^a-z]/g, "");
    const normLast = expectedLast.toLowerCase().replace(/[^a-z]/g, "");
    const profFirst = node.firstName.toLowerCase().split(" ")[0].replace(/[^a-z]/g, "");
    const profLast = node.lastName.toLowerCase().replace(/[^a-z]/g, "");

    return (
      profLast === normLast &&
      (profFirst === normFirst ||
        profFirst.startsWith(normFirst) ||
        normFirst.startsWith(profFirst))
    );
  } catch {
    return false;
  }
}

/**
 * Step 2: Fetch professor details via GraphQL using the legacyId.
 */
async function fetchProfessorDetails(
  professorID: string
): Promise<Omit<RMPProfessor, "tags"> | null> {
  try {
    const resp = await fetch(RMP_GRAPHQL_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Basic dGVzdDp0ZXN0",
      },
      body: getProfessorQuery(professorID),
    });

    if (!resp.ok) {
      console.error("[RMP] GraphQL professor query error:", resp.status);
      return null;
    }

    const result = await resp.json();
    const node = result?.data?.node;

    if (!node) {
      return null;
    }

    return {
      id: professorID,
      legacyId: node.legacyId,
      firstName: node.firstName,
      lastName: node.lastName,
      avgRating: Math.min(5, node.avgRating),
      avgDifficulty: Math.min(5, node.avgDifficulty),
      numRatings: node.numRatings,
      wouldTakeAgainPercent: Math.min(100, Math.round(node.wouldTakeAgainPercent)),
      department: node.department,
    };
  } catch (error) {
    console.error("[RMP] Error fetching professor details:", error);
    return null;
  }
}

/**
 * Step 3: Fetch all ratings and extract tags (same approach as Go implementation).
 * Tags come as "--" separated strings in each rating's ratingTags field.
 */
async function fetchProfessorTags(
  professorID: string,
  numRatings: number
): Promise<string[]> {
  if (numRatings === 0) return [];

  try {
    const resp = await fetch(RMP_GRAPHQL_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Basic dGVzdDp0ZXN0",
      },
      body: getRatingsQuery(professorID, numRatings),
    });

    if (!resp.ok) {
      return [];
    }

    const result = await resp.json();
    const ratings = result?.data?.node?.ratings?.edges;

    if (!ratings || !Array.isArray(ratings)) {
      return [];
    }

    // Count tag frequency across all ratings
    const tagsFrequency: Record<string, number> = {};

    for (const rating of ratings) {
      const ratingTags = rating?.node?.ratingTags;
      if (typeof ratingTags === "string" && ratingTags.length > 0) {
        // Tags are "--" separated, title case them
        const tags = ratingTags.split("--").filter((t: string) => t.length > 0);
        for (const tag of tags) {
          // Title case the tag
          const titleTag = tag
            .toLowerCase()
            .replace(/\b\w/g, (c: string) => c.toUpperCase());
          tagsFrequency[titleTag] = (tagsFrequency[titleTag] || 0) + 1;
        }
      }
    }

    // Sort by frequency (descending), take top 5, then sort alphabetically
    const sortedTags = Object.entries(tagsFrequency)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([tag]) => tag)
      .sort();

    return sortedTags;
  } catch (error) {
    console.error("[RMP] Error fetching tags:", error);
    return [];
  }
}

/**
 * Main entry point: get full RMP info for a professor.
 * Follows the Go implementation's 3-step approach:
 *   1. Scrape search page → legacyId
 *   2. GraphQL → professor details
 *   3. GraphQL → ratings → tags
 */
export async function searchProfessor(
  firstName: string,
  lastName: string
): Promise<RMPProfessor | null> {
  try {
    // Step 1: Get professor ID from search page (tries last name, then full name)
    const professorID = await getProfessorID(firstName, lastName);
    if (!professorID) {
      return null;
    }

    // Step 2: Get professor details via GraphQL
    const professor = await fetchProfessorDetails(professorID);
    if (!professor) {
      return null;
    }

    // Step 3: Get tags from individual ratings
    const tags = await fetchProfessorTags(professorID, professor.numRatings);

    return {
      ...professor,
      tags,
    };
  } catch (error) {
    console.error("[RMP] Error:", error);
    return null;
  }
}

/**
 * Get the RMP profile URL for a professor
 */
export function getRMPProfileUrl(legacyId: number): string {
  return `https://www.ratemyprofessors.com/professor/${legacyId}`;
}
