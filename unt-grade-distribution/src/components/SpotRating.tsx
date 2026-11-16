import { SPOT_CEI_MAX, SPOT_RATING_MAX, spotDescription } from "@/lib/spot";

interface SpotRatingProps {
  spot: { rating: number; cei: number | null; responses: number; sections?: number };
}

/** Compact SPOT rating with the response count that backs it. */
export default function SpotRating({ spot }: SpotRatingProps) {
  const basis = spot.sections !== undefined && spot.sections > 1
    ? `Response-weighted average of ${spot.sections} section ratings. `
    : "";

  return (
    <span
      className="spot-rating inline-flex flex-wrap items-center gap-x-1.5"
      title={`${basis}${spotDescription(spot)}.`}
    >
      <span className="font-semibold text-ui-text">
        SPOT {spot.rating.toFixed(1)}
        <span className="font-normal text-ui-muted">/{SPOT_RATING_MAX}</span>
      </span>
      {spot.cei !== null && (
        <span>
          <span aria-hidden="true">· </span>
          Challenge {spot.cei.toFixed(1)}/{SPOT_CEI_MAX}
        </span>
      )}
      <span>
        <span aria-hidden="true">· </span>
        {spot.responses.toLocaleString()} response{spot.responses !== 1 ? "s" : ""}
      </span>
    </span>
  );
}
