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
    const response = await fetch(RMP_GRAPHQL_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Basic dGVzdDp0ZXN0",
      },
      body: JSON.stringify({
        query: SEARCH_QUERY,
        variables: {
          query: {
            text: `${firstName} ${lastName}`,
            schoolID: UNT_SCHOOL_ID,
          },
        },
      }),
    });

    if (!response.ok) {
      console.error("RMP API error:", response.status);
      return null;
    }

    const data = await response.json();
    const edges = data?.data?.newSearch?.teachers?.edges;

    if (!edges || edges.length === 0) {
      return null;
    }

    // Find the best match (exact or closest name match)
    const normalizedFirst = firstName.toLowerCase().split(" ")[0];
    const normalizedLast = lastName.toLowerCase();

    for (const edge of edges) {
      const prof = edge.node;
      const profFirst = prof.firstName.toLowerCase().split(" ")[0];
      const profLast = prof.lastName.toLowerCase();

      if (profFirst === normalizedFirst && profLast === normalizedLast) {
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
    }

    // If no exact match, return the first result if last name matches
    const firstResult = edges[0]?.node;
    if (firstResult?.lastName.toLowerCase() === normalizedLast) {
      return {
        id: firstResult.id,
        legacyId: firstResult.legacyId,
        firstName: firstResult.firstName,
        lastName: firstResult.lastName,
        avgRating: firstResult.avgRating,
        avgDifficulty: firstResult.avgDifficulty,
        numRatings: firstResult.numRatings,
        wouldTakeAgainPercent: firstResult.wouldTakeAgainPercent,
        department: firstResult.department,
        tags: firstResult.teacherRatingTags || [],
      };
    }

    return null;
  } catch (error) {
    console.error("Error fetching RMP data:", error);
    return null;
  }
}

/**
 * Get the RMP profile URL for a professor
 */
export function getRMPProfileUrl(legacyId: number): string {
  return `https://www.ratemyprofessors.com/professor/${legacyId}`;
}
