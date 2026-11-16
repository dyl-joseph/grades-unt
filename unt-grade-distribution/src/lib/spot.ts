/**
 * SPOT (Student Perceptions of Teaching) is UNT's end-of-course evaluation.
 * Values come from the section-level report and are attached to graded
 * sections by tools/encrypt-data.js.
 */
export type SpotSummary = {
  /** Overall Summative Rating: median of the four summative items, 0 (very poor) to 5 (excellent). */
  rating: number;
  /** Challenge and Engagement Index, 1 (much lower than other courses) to 7 (much higher). */
  cei: number | null;
  /** Completed questionnaires behind the rating. */
  responses: number;
  /** Students invited to respond; cross-listed sections share one evaluation. */
  enrolled: number;
};

export const SPOT_RATING_MAX = 5;
export const SPOT_CEI_MAX = 7;

export type SpotAggregate = {
  rating: number;
  cei: number | null;
  responses: number;
  sections: number;
};

/**
 * Combine section ratings into one figure, weighting each section by its
 * number of responses. The source only publishes per-section medians, so this
 * is an average of medians, not a median of the underlying answers.
 */
export function aggregateSpot(items: Array<{ spot?: SpotSummary | null }>): SpotAggregate | null {
  let responses = 0;
  let ratingTotal = 0;
  let ceiResponses = 0;
  let ceiTotal = 0;
  let sections = 0;

  for (const { spot } of items) {
    if (!spot || !(spot.responses > 0) || !Number.isFinite(spot.rating)) continue;
    sections++;
    responses += spot.responses;
    ratingTotal += spot.rating * spot.responses;
    if (spot.cei !== null && Number.isFinite(spot.cei)) {
      ceiResponses += spot.responses;
      ceiTotal += spot.cei * spot.responses;
    }
  }

  if (responses === 0) return null;
  return {
    rating: Math.round((ratingTotal / responses) * 10) / 10,
    cei: ceiResponses > 0 ? Math.round((ceiTotal / ceiResponses) * 10) / 10 : null,
    responses,
    sections,
  };
}

export function spotDescription(spot: { rating: number; cei: number | null; responses: number }) {
  const parts = [
    `Student Perceptions of Teaching (SPOT) overall rating ${spot.rating.toFixed(1)} out of ${SPOT_RATING_MAX}`,
    `${spot.responses.toLocaleString()} response${spot.responses !== 1 ? "s" : ""}`,
  ];
  if (spot.cei !== null) {
    parts.push(`challenge and engagement ${spot.cei.toFixed(1)} out of ${SPOT_CEI_MAX}`);
  }
  return parts.join(", ");
}
