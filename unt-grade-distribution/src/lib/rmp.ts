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

// ---------- Name-cleaning helpers ----------

/** Common nickname → formal name mappings (bidirectional lookup) */
const NICKNAME_MAP: Record<string, string[]> = {
  bill: ["william"],
  will: ["william"],
  william: ["bill", "will", "willy"],
  bob: ["robert"],
  rob: ["robert"],
  robert: ["bob", "rob", "bobby", "robbie"],
  jim: ["james"],
  jimmy: ["james"],
  james: ["jim", "jimmy", "jamie"],
  mike: ["michael"],
  michael: ["mike", "mikey"],
  dick: ["richard"],
  rick: ["richard"],
  rich: ["richard"],
  richard: ["dick", "rick", "rich"],
  joe: ["joseph"],
  joseph: ["joe", "joey"],
  tom: ["thomas"],
  thomas: ["tom", "tommy"],
  dan: ["daniel"],
  daniel: ["dan", "danny"],
  dave: ["david"],
  david: ["dave"],
  steve: ["stephen", "steven"],
  stephen: ["steve"],
  steven: ["steve"],
  ed: ["edward", "edwin"],
  edward: ["ed", "eddie", "ted"],
  ted: ["edward", "theodore"],
  theodore: ["ted", "teddy"],
  tony: ["anthony"],
  anthony: ["tony"],
  chris: ["christopher", "christian"],
  christopher: ["chris"],
  christian: ["chris"],
  pat: ["patrick", "patricia"],
  patrick: ["pat"],
  patricia: ["pat", "patty", "trish"],
  alex: ["alexander", "alexandra"],
  alexander: ["alex"],
  alexandra: ["alex"],
  sam: ["samuel", "samantha"],
  samuel: ["sam"],
  samantha: ["sam"],
  liz: ["elizabeth"],
  beth: ["elizabeth"],
  elizabeth: ["liz", "beth", "betty"],
  kate: ["katherine", "catherine"],
  katherine: ["kate", "kathy", "katie"],
  catherine: ["kate", "cathy", "katie"],
  jen: ["jennifer"],
  jennifer: ["jen", "jenny"],
  sue: ["susan"],
  susan: ["sue", "susie"],
  nick: ["nicholas"],
  nicholas: ["nick"],
  matt: ["matthew"],
  matthew: ["matt"],
  greg: ["gregory"],
  gregory: ["greg"],
  jeff: ["jeffrey"],
  jeffrey: ["jeff"],
  larry: ["lawrence"],
  lawrence: ["larry"],
  charlie: ["charles"],
  charles: ["charlie", "chuck"],
  chuck: ["charles"],
  al: ["albert", "alan", "allen"],
  albert: ["al"],
  alan: ["al"],
  allen: ["al"],
  don: ["donald"],
  donald: ["don", "donny"],
  ron: ["ronald"],
  ronald: ["ron", "ronnie"],
  jon: ["jonathan"],
  jonathan: ["jon"],
  ben: ["benjamin"],
  benjamin: ["ben"],
  ken: ["kenneth"],
  kenneth: ["ken", "kenny"],
  ray: ["raymond"],
  raymond: ["ray"],
  fred: ["frederick"],
  frederick: ["fred", "freddy"],
  jerry: ["gerald", "jerome"],
  gerald: ["jerry"],
  jerome: ["jerry"],
  tim: ["timothy"],
  timothy: ["tim", "timmy"],
  phil: ["phillip", "philip"],
  phillip: ["phil"],
  philip: ["phil"],
  andy: ["andrew"],
  andrew: ["andy", "drew"],
  drew: ["andrew"],
  doug: ["douglas"],
  douglas: ["doug"],
  walt: ["walter"],
  walter: ["walt"],
  hank: ["henry"],
  henry: ["hank", "harry"],
  harry: ["henry", "harold"],
  harold: ["harry", "hal"],
  peggy: ["margaret"],
  maggie: ["margaret"],
  margaret: ["peggy", "maggie", "meg"],
};

/** Suffixes to strip from names */
const NAME_SUFFIXES = /\b(jr\.?|sr\.?|ii|iii|iv|v|vi|ph\.?d\.?|m\.?d\.?|esq\.?)\b/gi;

/** Strip suffixes, extra whitespace, and non-alpha noise from a name part */
function cleanName(name: string): string {
  return name
    .replace(NAME_SUFFIXES, "")
    .replace(/[^a-zA-Z\s-]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

/** Get the primary token of a (possibly multi-word) first name */
function primaryFirst(first: string): string {
  return cleanName(first).split(/\s+/)[0] ?? "";
}

/** Check whether two first names are compatible (exact, prefix, or nickname) */
function firstNamesMatch(a: string, b: string): boolean {
  const pa = primaryFirst(a);
  const pb = primaryFirst(b);
  if (!pa || !pb) return false;

  // Exact match
  if (pa === pb) return true;

  // One is a prefix of the other (e.g. "alex" vs "alexander")
  if (pa.startsWith(pb) || pb.startsWith(pa)) return true;

  // Nickname lookup
  const aliasesA = NICKNAME_MAP[pa] ?? [];
  if (aliasesA.includes(pb)) return true;
  const aliasesB = NICKNAME_MAP[pb] ?? [];
  if (aliasesB.includes(pa)) return true;

  return false;
}

/** Check whether two last names are compatible after cleaning */
function lastNamesMatch(a: string, b: string): boolean {
  const ca = cleanName(a);
  const cb = cleanName(b);
  if (ca === cb) return true;
  // Handle hyphenated / multi-word last names — match if one contains the other
  if (ca.includes(cb) || cb.includes(ca)) return true;
  return false;
}

// ---------- RMP search ----------

/** Build an RMPProfessor from a GraphQL node */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function nodeToProf(node: any): RMPProfessor {
  return {
    id: node.id,
    legacyId: node.legacyId,
    firstName: node.firstName,
    lastName: node.lastName,
    avgRating: Math.min(5, node.avgRating),
    avgDifficulty: Math.min(5, node.avgDifficulty),
    numRatings: node.numRatings,
    wouldTakeAgainPercent: Math.min(
      100,
      Math.round(node.wouldTakeAgainPercent)
    ),
    department: node.department,
    tags: node.teacherRatingTags ?? [],
  };
}

/** Fire a single GraphQL search and return the edges array (or []) */
async function rmpSearch(text: string): Promise<any[]> {
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
            text,
            schoolID: UNT_SCHOOL_ID,
          },
        },
      }),
    });

    if (!response.ok) {
      console.error("RMP API error:", response.status);
      return [];
    }

    const data = await response.json();
    return data?.data?.newSearch?.teachers?.edges ?? [];
  } catch (err) {
    console.error("RMP fetch error:", err);
    return [];
  }
}

/** Pick the best match from a set of edges given the expected first/last name */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function bestMatch(
  edges: any[],
  expectedFirst: string,
  expectedLast: string
): RMPProfessor | null {
  if (!edges || edges.length === 0) return null;

  // Pass 1 — both first + last match (with nickname / prefix tolerance)
  for (const edge of edges) {
    const prof = edge.node;
    if (
      lastNamesMatch(prof.lastName, expectedLast) &&
      firstNamesMatch(prof.firstName, expectedFirst)
    ) {
      return nodeToProf(prof);
    }
  }

  // Pass 2 — last name matches, accept any first name (RMP might list a
  // completely different first name variant we don't have in the alias table)
  for (const edge of edges) {
    const prof = edge.node;
    if (lastNamesMatch(prof.lastName, expectedLast)) {
      return nodeToProf(prof);
    }
  }

  return null;
}

/**
 * Search for a professor by name at UNT.
 *
 * Tries multiple search strategies to handle mismatches between the grade-data
 * name and the name used on RateMyProfessors (e.g. "Bill Eugene Acree Jr."
 * in grade data vs "William Acree" on RMP).
 *
 * Strategy order:
 *  1. Full cleaned name  ("bill acree")
 *  2. Nickname expanded   ("william acree")
 *  3. Last name only      ("acree")
 */
export async function searchProfessor(
  firstName: string,
  lastName: string
): Promise<RMPProfessor | null> {
  const cleanFirst = primaryFirst(firstName);
  const cleanLast = cleanName(lastName);

  if (!cleanLast) return null;

  // Strategy 1: search with cleaned first + last
  const searchText = cleanFirst ? `${cleanFirst} ${cleanLast}` : cleanLast;
  const edges1 = await rmpSearch(searchText);
  const match1 = bestMatch(edges1, firstName, lastName);
  if (match1) return match1;

  // Strategy 2: try nickname-expanded searches
  if (cleanFirst) {
    const nicknames = NICKNAME_MAP[cleanFirst] ?? [];
    for (const nick of nicknames) {
      const edges2 = await rmpSearch(`${nick} ${cleanLast}`);
      const match2 = bestMatch(edges2, firstName, lastName);
      if (match2) return match2;
    }
  }

  // Strategy 3: search by last name only (wide net, stricter match)
  const edges3 = await rmpSearch(cleanLast);
  const match3 = bestMatch(edges3, firstName, lastName);
  if (match3) return match3;

  return null;
}

/**
 * Get the RMP profile URL for a professor
 */
export function getRMPProfileUrl(legacyId: number): string {
  return `https://www.ratemyprofessors.com/professor/${legacyId}`;
}
