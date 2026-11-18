import { SPOT_CEI_MAX, SPOT_RATING_MAX, spotDescription } from "@/lib/spot";

interface SpotRatingProps {
  spot: { rating: number; cei: number | null; responses: number; sections?: number };
  /** "summary" is a standalone strip under a page header; "card" is a section card footer. */
  variant?: "summary" | "card";
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <span className="whitespace-nowrap">
      <span className="font-semibold text-ui-text">{value}</span> {label}
    </span>
  );
}

/** SPOT evaluation figures with the response count that backs them. */
export default function SpotRating({ spot, variant = "card" }: SpotRatingProps) {
  const averaged = spot.sections !== undefined && spot.sections > 1;
  const title = `${averaged ? `Response-weighted average of ${spot.sections} evaluations. ` : ""}${spotDescription(spot)}.`;
  const responses = `${spot.responses.toLocaleString()} response${spot.responses !== 1 ? "s" : ""}`;
  const stats = (
    <>
      <Stat value={`${spot.rating.toFixed(1)}/${SPOT_RATING_MAX}`} label="overall" />
      {spot.cei !== null && <Stat value={`${spot.cei.toFixed(1)}/${SPOT_CEI_MAX}`} label="challenge" />}
    </>
  );

  if (variant === "summary") {
    return (
      <div
        className="spot-rating mt-4 inline-flex max-w-full flex-wrap items-baseline gap-x-5 gap-y-1 rounded-lg border px-3 py-2 text-sm border-ui-border bg-ui-surface text-ui-muted"
        title={title}
      >
        <span className="w-full text-xs font-semibold uppercase tracking-[0.12em] sm:w-auto">Student evaluations</span>
        {stats}
        <span className="whitespace-nowrap">{responses}</span>
      </div>
    );
  }

  return (
    <div
      className="spot-rating mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-0.5 border-t pt-2 text-xs border-ui-border text-ui-muted"
      title={title}
    >
      <span className="font-semibold uppercase tracking-[0.12em]">Evals</span>
      {stats}
      <span className="whitespace-nowrap">{responses}</span>
    </div>
  );
}
