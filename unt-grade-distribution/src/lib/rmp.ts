/**
 * RateMyProfessors API integration
 * Uses their GraphQL API to fetch professor ratings
 */

const RMP_GRAPHQL_URL = "https://www.ratemyprofessors.com/graphql";

// UNT School ID on RateMyProfessors
const UNT_SCHOOL_ID = "U2Nob29sLTEyNzE="; // Base64 encoded School-1271

export interface RMPTag {
  tagName: string;
  tagCount: number;
}

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
  tags: RMPTag[];
}

const SEARCH_QUERY = `
query TeacherSearchQuery($query: TeacherSearchQuery!) {
  newSearch {
    teachers(query: $query) {
      edges {
        node {
          id
          legacyId
          firstName
          lastName
          avgRating
          avgDifficulty
          numRatings
          wouldTakeAgainPercent
          department
          school {
            id
            name
          }
          teacherRatingTags {
            tagName
            tagCount
          }
        }
      }
    }
  }
}
`;

/**
 * Search for a professor by name at UNT
 */
export async function searchProfessor(
  firstName: string,
  lastName: string
): Promise<RMPProfessor | null> {
  try {
    // Search by last name only for better results
    const response = await fetch(RMP_GRAPHQL_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Basic dGVzdDp0ZXN0",
      },
      body: JSON.stringify({
        query: SEARCH_QUERY,
        variables: {
          query: {
            text: lastName,
            schoolID: UNT_SCHOOL_ID,
          },
        },
      }),
    });

    if (!response.ok) {
      console.error("[RMP] API error:", response.status);
      return null;
    }

    const data = await response.json();
    const edges = data?.data?.newSearch?.teachers?.edges;

    if (!edges || edges.length === 0) {
      return null;
    }

    // Normalize names for comparison
    const normalizedFirst = firstName.toLowerCase().split(" ")[0].replace(/[^a-z]/g, "");
    const normalizedLast = lastName.toLowerCase().replace(/[^a-z]/g, "");

    // First pass: exact last name + first name starts with
    for (const edge of edges) {
      const prof = edge.node;
      const profFirst = prof.firstName.toLowerCase().split(" ")[0].replace(/[^a-z]/g, "");
      const profLast = prof.lastName.toLowerCase().replace(/[^a-z]/g, "");

      if (profLast === normalizedLast && 
          (profFirst === normalizedFirst || 
           profFirst.startsWith(normalizedFirst) || 
           normalizedFirst.startsWith(profFirst))) {
        return mapProfessor(prof);
      }
    }

    // Second pass: just last name match
    for (const edge of edges) {
      const prof = edge.node;
      const profLast = prof.lastName.toLowerCase().replace(/[^a-z]/g, "");

      if (profLast === normalizedLast) {
        return mapProfessor(prof);
      }
    }

    return null;
  } catch (error) {
    console.error("[RMP] Error:", error);
    return null;
  }
}

function mapProfessor(prof: {
  id: string;
  legacyId: number;
  firstName: string;
  lastName: string;
  avgRating: number;
  avgDifficulty: number;
  numRatings: number;
  wouldTakeAgainPercent: number;
  department: string;
  teacherRatingTags?: { tagName: string; tagCount: number }[];
}): RMPProfessor {
  return {
    id: prof.id,
    legacyId: prof.legacyId,
    firstName: prof.firstName,
    lastName: prof.lastName,
    avgRating: prof.avgRating,
    avgDifficulty: prof.avgDifficulty,
    numRatings: prof.numRatings,
    wouldTakeAgainPercent: prof.wouldTakeAgainPercent,
    department: prof.department,
    tags: prof.teacherRatingTags || [],
  };
}

/**
 * Get the RMP profile URL for a professor
 */
export function getRMPProfileUrl(legacyId: number): string {
  return `https://www.ratemyprofessors.com/professor/${legacyId}`;
}
