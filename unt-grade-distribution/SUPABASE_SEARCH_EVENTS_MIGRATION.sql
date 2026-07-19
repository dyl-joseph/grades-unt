-- Preserve detailed course-search analytics while making instructor searches
-- anonymous. Run this in the Supabase SQL editor before deploying the app.

ALTER TABLE public.search_events
  DROP COLUMN IF EXISTS instructor_first_name,
  DROP COLUMN IF EXISTS instructor_last_name;

ALTER TABLE public.search_events
  ALTER COLUMN raw_query DROP NOT NULL,
  ALTER COLUMN normalized_query DROP NOT NULL;

-- Remove instructor-identifying data that was logged before this change.
UPDATE public.search_events
SET
  raw_query = NULL,
  normalized_query = NULL,
  course_prefix = NULL,
  course_number = NULL,
  course_title = NULL
WHERE search_kind IN ('instructor', 'mixed', 'unknown');

ALTER TABLE public.search_events
  DROP CONSTRAINT IF EXISTS search_events_anonymous_instructor_check;

ALTER TABLE public.search_events
  ADD CONSTRAINT search_events_anonymous_instructor_check
  CHECK (
    search_kind = 'course'
    OR (
      raw_query IS NULL
      AND normalized_query IS NULL
      AND course_prefix IS NULL
      AND course_number IS NULL
      AND course_title IS NULL
    )
  );
