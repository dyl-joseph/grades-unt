# UNT Schedule Builder — Technical Documentation

> A single-file static SPA for building conflict-free class schedules at the University of North Texas.

**Live URL:** [vsb.untgrades.app](https://vsb.untgrades.app)
**Repository:** [github.com/dyl-joseph/grades-unt](https://github.com/dyl-joseph/grades-unt)

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Tech Stack](#2-tech-stack)
3. [Project Structure](#3-project-structure)
4. [Data Pipeline](#4-data-pipeline)
5. [Core Application State](#5-core-application-state)
6. [Course Search](#6-course-search)
7. [Calendar Rendering](#7-calendar-rendering)
8. [Section Selection & Conflict Detection](#8-section-selection--conflict-detection)
9. [Recitation Handling](#9-recitation-handling)
10. [Auto-Generate Schedules](#10-auto-generate-schedules)
11. [Busy Times](#11-busy-times)
12. [Save & Load Schedules](#12-save--load-schedules)
13. [Auto-Save & Resume](#13-auto-save--resume)
14. [Theming](#14-theming)
15. [localStorage Keys](#15-localstorage-keys)
16. [Color System](#16-color-system)
17. [Deployment](#17-deployment)
18. [Data Update Workflow](#18-data-update-workflow)

---

## 1. Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│ Browser                                                 │
│                                                         │
│  ┌───────────────────────────────────────────────────┐  │
│  │ index.html (single file, ~3000 lines)             │  │
│  │                                                   │  │
│  │  <style>  ─ all CSS (light + dark theme)          │  │
│  │  <body>   ─ all HTML structure                    │  │
│  │  <script> ─ all JS logic + embedded course data   │  │
│  │                                                   │  │
│  │  const allCourses = [{...}, {...}, ...]           │  │
│  └───────────────────────────────────────────────────┘  │
│                                                         │
│  localStorage                                           │
│  ├── unt_vsb_theme    ─ "dark" | "light"                │
│  ├── unt_vsb_saved    ─ JSON array of saved schedules   │
│  └── unt_vsb_current  ─ auto-saved current selections   │
└─────────────────────────────────────────────────────────┘
```

The app is a **zero-dependency, zero-build-step static SPA**. Everything — HTML, CSS, JavaScript, and course data — lives in a single `index.html` file. There is no framework, no bundler, no server, and no database. All state is managed in-memory with `localStorage` for persistence.

---

## 2. Tech Stack

| Technology | Purpose |
|---|---|
| **Vanilla HTML5** | Page structure |
| **Vanilla CSS3** | Styling with CSS custom properties for theming |
| **Vanilla JavaScript** | All application logic (no framework) |
| **Google Fonts** | Albert Sans typeface (1 external dependency) |
| **GitHub Pages** | Static hosting via CNAME file |
| **Python 3** | `sql_to_html.py` data pipeline script |

No npm, no Node.js runtime, no build tools, no package.json.

---

## 3. Project Structure

```
/
├── index.html           The entire VSB app (single-file SPA, ~3000 lines)
├── sql_to_html.py       Data pipeline: extracts from SQL → rebuilds allCourses in index.html
├── unt_sections.json    Raw UNT course scheduling data (JSON, ~182K lines)
├── unt_sections.sql     Raw UNT course scheduling data (SQL INSERT format)
├── CNAME                GitHub Pages custom domain → vsb.untgrades.app
├── README.md            Project overview
├── DOCUMENTATION.md     This file
├── .gitignore           Git ignore rules
└── .github/
    └── FUNDING.yml      Ko-fi sponsorship link
```

---

## 4. Data Pipeline

Course data flows from raw SQL to embedded JavaScript:

```
unt_sections.sql ──→ sql_to_html.py ──→ index.html
                                         (const allCourses = [...])
```

### Source Data (`unt_sections.sql`)

A single SQL `INSERT` statement containing a JSON array in the `courses` column. The JSON array holds ~7700 course section objects with nested recitation data.

### Pipeline Script (`sql_to_html.py`)

Python script (159 lines) that:

1. **Extracts** the JSON array from the SQL file using regex to locate the `[` bracket after the `total_sections` number
2. **Flattens** each course object — strips `course_title` and `description` (unused by the app), keeps only operational fields (`subject`, `course_number`, `section`, `class_nbr`, `days`, `start_time`, `end_time`, `instructor`, `seats_open`, etc.)
3. **Transforms IDs** — removes the trailing positional index that the SQL format appends (e.g., `AARS_6810_001_13851_0` → `AARS_6810_001_13851`)
4. **Transforms recitation IDs** — converts `rec_CLASSNBR` format to `SEC_CLASSNBR` format
5. **Rebuilds** the `const allCourses = [...]` line in `index.html` with compact JSON (`separators=(",",":")`, no extra whitespace)

### Course Object Format (in `allCourses`)

Each course section in the embedded data:

```javascript
{
  id: "CSCE_2100_001_12345",
  subject: "CSCE",
  course_number: "2100",
  term: "Fall 2025",
  section: "001",
  class_nbr: 12345,       // CRN
  status: "Open",
  session: "Regular",
  meeting_dates: "08/25-12/10",
  days: "MWF",
  start_time: "10:00 AM",
  end_time: "10:50 AM",
  start_min: 600,         // minutes from midnight (computed)
  end_min: 650,
  room: "BLB 140",
  instructor: "Smith,John",
  seats_open: 5,
  seats_total: 40,
  recitations: [           // optional, for lecture sections with labs
    { id: "501_12346", section: "501", class_nbr: 12346, days: "R", ... }
  ]
}
```

---

## 5. Core Application State

All state lives in module-level variables inside the `<script>` tag:

| Variable | Type | Purpose |
|---|---|---|
| `allCourses` | `Array` | Embedded course data (~7700 sections) |
| `selected` | `Map<courseKey, section>` | Currently selected sections (key = `"SUBJ 1234"`) |
| `selectedRecitations` | `Map<courseKey, recitation>` | Paired recitation for each selected lecture |
| `lockedSections` | `Set<courseKey>` | Sections locked in place (survive auto-generate) |
| `courseColors` | `Map<courseKey, color>` | Color assignments per course |
| `sectionsCache` | `Map<courseKey, sections[]>` | Cached section lists per course (avoids re-filtering) |
| `busyTimes` | `Array` | User-blocked time slots |
| `savedSchedules` | `Array` | Saved schedule snapshots |
| `previewSecs` | `Array` | Ghost/preview sections shown on hover |
| `openCourseKey` | `string \| null` | Currently expanded course dropdown |
| `dataReady` | `boolean` | Whether allCourses has been parsed |
| `colorIdx` | `number` | Next color index from PALETTE |

The `courseKey` format is `"SUBJ 1234"` (e.g., `"CSCE 2100"`), combining subject prefix and course number.

---

## 6. Course Search

### `queryCourses(raw)` — Line 1945

Filters `allCourses` by user input:

1. **Parses input** — splits on spaces, identifies subject prefix (letters) and course number (digits)
2. **Prefix match** — `subject.startsWith(prefix)` for 1–4 letter prefixes
3. **Number match** — `course_number.startsWith(number)` for numeric portions
4. **Keyword match** — falls back to searching `instructor` and `room` fields for text queries
5. **Deduplicates** by course key — shows each course once with its section count

Results appear in the search sidebar as expandable cards. Each card shows the course prefix/number, title, available sections, and seat availability.

### `doSearch()` — Line 2036

Triggered on input in the search bar. Reads the query value, calls `queryCourses()`, and re-renders the sidebar.

### `buildCard(courseKey, row)` — Line 2054

Constructs the HTML for a single course card in the sidebar with a clickable header and a collapsible dropdown containing section rows.

### `toggleCard(courseKey, row, hdr, dd)` — Line 2074

Expands/collapses a course card. When expanded, builds section rows and caches them in `sectionsCache`.

---

## 7. Calendar Rendering

### `renderCalendar()` — Line 2752

The main render function. Rebuilds the entire weekly calendar grid:

1. **Collects events** — iterates `selected` map and `previewSecs` to gather all time blocks
2. **Groups by day** — sorts events into Mon–Fri columns
3. **Computes columns** — `computeColumns(events)` handles overlapping events using a greedy column-packing algorithm
4. **Renders blocks** — each event becomes a positioned `<div>` with:
   - Course color background (with tint for ghost/preview sections)
   - Course code, section, time, room, instructor
   - Lock icon for locked sections
5. **Scroll position** — scrolls to 6:00 AM on load

### `collectEvents(sec, color, ghost, hovered)` — Line 2793

Converts a section object into event objects for the calendar. Handles multi-day patterns (e.g., "MWF" → 3 events). Ghost sections get reduced opacity.

### `computeColumns(events)` — Line 2825

Greedy algorithm for placing overlapping events side-by-side:
1. Sort events by start time, then by duration (longest first)
2. For each event, find the first available column where it doesn't overlap
3. Track total columns per time group for width calculation

### `tintColor(hex, amount)` — Line 2766

Lightens a hex color by blending toward white (for ghost/preview sections).

### Time Grid

- **Days:** Monday–Friday (5 columns)
- **Hours:** 7:00 AM – 9:00 PM (configurable via `START_HOUR` / `END_HOUR`)
- **Slot height:** `SLOT` constant (pixels per hour)
- **Scroll:** vertical scroll container, auto-scrolls to 6 AM on load

---

## 8. Section Selection & Conflict Detection

### `toggleSection(courseKey, sec, color)` — Line 2213

Adds or removes a section from `selected`:
- **Adding:** Sets the section with its color, rebuilds ghosts, re-renders calendar and tray
- **Removing:** Deletes from `selected` and `selectedRecitations`, clears lock, re-renders

### `toggleLock(e, courseKey)` — Line 2233

Toggles a section's lock state. Locked sections (stored in `lockedSections`) persist through auto-generation — the generator treats them as fixed constraints.

### `checkConflict(sec, skipKey)` — Line 2297

Checks if a section overlaps with any currently selected section (optionally skipping one course key). Returns the conflicting course key or `null`.

### `overlaps(a, b)` — Line 2290

Returns `true` if two time blocks overlap on any shared day. Uses `start_min`/`end_min` for comparison.

### `rebuildGhosts(courseKey)` — Line 2089

When a section is hovered in the sidebar, creates ghost/preview events on the calendar so the user can see where it would land without committing. Clears when the hover ends.

### `highlightSidebarRow(courseKey, secId, on)` — Line 2925

Highlights the corresponding section row in the sidebar dropdown when hovering its calendar block.

---

## 9. Recitation Handling

Some lecture sections have associated recitations (labs/discussions). The app requires users to pick a recitation when they select a lecture that has them.

### Data Structure

Recitations are nested inside their parent lecture in `allCourses`:

```javascript
{
  subject: "CHEM", course_number: "1410", section: "001",
  recitations: [
    { id: "501_12924", section: "501", days: "R", start_time: "8:00 AM", ... }
  ]
}
```

### Selection Flow

1. User selects a lecture section → `toggleSection()` adds it to `selected`
2. `renderTray()` checks for `recitations` on the selected section
3. If recitations exist and none is selected → shows a "Pick a recitation" nudge (yellow)
4. User expands the section detail → `showSecDetail()` renders recitation sub-rows
5. User clicks a recitation → `toggleRecitation(courseKey, rec, color)` adds it to `selectedRecitations`
6. Calendar renders both the lecture and recitation blocks

### `removeRec(key)` — Line 2922

Removes the recitation for a course key without removing the lecture itself.

---

## 10. Auto-Generate Schedules

### `openAutoGenModal()` — Line 2379

Opens a modal with tabbed preference panels:

### Preference Tabs

| Tab | Options | Implementation |
|---|---|---|
| **Days** | No pref / Morning / Afternoon / Evening | `setDayPref(v)` — filters by `start_min` ranges |
| **Classes** | Range slider (min–max courses per schedule) | `toggleClassRange()` — limits course count |
| **Professors** | Prefer / Avoid / Neutral per instructor | `populateProfPrefs()` — scans instructors from selected courses, renders preference buttons |
| **Campus & Delivery** | Main campus / Discovery Park / Online / In-person | `renderCampusDelivPrefs()` — filters by `room` prefix or `days` field |

### `runAutoGenerate()` — Line 2482

Generates all valid schedule combinations:

1. **Collects unlocked sections** — locked sections are treated as fixed constraints
2. **Builds candidate lists** — for each course, gathers all available sections
3. **Applies preferences** — filters candidates by day/time, campus, delivery, professor preferences
4. **Cartesian product with conflict checking** — iterates all combinations, rejecting any with time overlaps or busy-time conflicts
5. **Limits results** — caps at a maximum count to prevent UI freeze
6. **Renders results** — `renderGeneratedResults()` shows mini calendar previews

### `buildMiniCalHtml(schedule)` — Line 2577

Renders a compact visual calendar for each generated schedule in the results list. Shows colored blocks for each section on a simplified time grid.

### `applyGenerated(idx, results)` — Line 2612

Replaces the current selections with a generated schedule. Locked sections are preserved.

### `saveGenerated(idx, results)` — Line 2625

Saves a generated schedule to the saved schedules list.

---

## 11. Busy Times

Users can block off time slots when they're unavailable (work, commute, etc.).

### `addBusyTime()` — Line 2339

Adds a blocked time slot from the busy-time modal form (day, start time, end time).

### `removeBusyTime(id)` — Line 2353

Removes a busy time entry by its ID.

### `checkBusyConflict(sec)` — Line 2303

Returns `true` if a section overlaps with any busy time entry. Used by the auto-generator and conflict checker.

### `renderBusyList()` — Line 2357

Renders the list of current busy times in the modal with remove buttons.

### `populateBusyTimeDropdowns()` — Line 2326

Populates the day and time select dropdowns in the busy-time modal on init.

---

## 12. Save & Load Schedules

### `doSaveSchedule()` — Line 2656

Saves the current schedule to `savedSchedules` array with a user-provided name, then persists to localStorage.

### `persistSaved()` — Line 2675

Writes `savedSchedules` to `localStorage.setItem('unt_vsb_saved', JSON.stringify(...))`.

### `loadSavedSchedule(id)` — Line 2687

Replaces current selections with a saved schedule's data. Re-matches sections by `class_nbr` with fallback to subject/number/section matching.

### `deleteSavedSchedule(id)` — Line 2676

Removes a saved schedule and re-renders the saved list.

### `makePrimary(id)` — Line 2683

Moves a saved schedule to the top of the list (primary position).

### `pushToCart(id)` — Line 2698

Generates a cart-compatible format from a saved schedule (for CRN copy/export).

### `renderSavedSchedules()` — Line 2707

Renders the saved schedules panel with schedule names, course lists, and action buttons.

---

## 13. Auto-Save & Resume

### `autoSave()` — Line 2934

Called after every selection change. Writes current selections to `unt_vsb_current` in localStorage with:
- `saved_at` — ISO timestamp
- `selections` — array of `{ courseKey, classNbr, section, subject, courseNumber, recitationId }`

### `loadAutoSaved()` — Line 2942

On page load, checks for `unt_vsb_current` in localStorage. If found, shows a resume banner.

### `showResumeBanner(saved, date)` — Line 2949

Displays a fixed banner at the bottom of the screen with:
- **Resume** — restores all selections from the saved data
- **Start Fresh** — clears the auto-save and starts empty

### `applyResume(saved)` — Line 2957

Async function that waits for `dataReady`, then matches each saved selection back to `allCourses` entries by `class_nbr` (primary) or subject/number/section (fallback).

---

## 14. Theming

### `toggleTheme()` — Line 2003

Switches between `light` and `dark` themes:
1. Reads current `data-theme` attribute on `<html>`
2. Toggles to the opposite
3. Sets `document.documentElement.setAttribute('data-theme', theme)`
4. Saves to `localStorage.setItem('unt_vsb_theme', theme)`
5. Updates the theme toggle icon

### Flash Prevention

An inline `<script>` in `<head>` (before any CSS) runs immediately:

```javascript
(function () {
  const savedTheme = localStorage.getItem('unt_vsb_theme');
  const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const theme = savedTheme || (systemDark ? 'dark' : 'light');
  document.documentElement.setAttribute('data-theme', theme);
})();
```

This prevents the flash of wrong-theme content on page load.

### `updateThemeIcon(theme)` — Line 2010

Updates the sun/moon icon in the header to match the current theme.

---

## 15. localStorage Keys

| Key | Format | Purpose |
|---|---|---|
| `unt_vsb_theme` | `"dark"` or `"light"` | Theme preference |
| `unt_vsb_saved` | JSON array of schedule objects | Saved schedule snapshots |
| `unt_vsb_current` | JSON object with `saved_at` and `selections` array | Auto-saved current state for resume |

---

## 16. Color System

### CSS Custom Properties

Defined in `:root` (light) and `[data-theme="dark"]` overrides:

| Variable | Light | Dark |
|---|---|---|
| `--bg` | `#FFFFFF` | `#0B1026` |
| `--surface` | `#FFFFFF` | `#1E2644` |
| `--bg-secondary` | `#F8F9FA` | `#0F1630` |
| `--text` | `#23282F` | `#E8E0D6` |
| `--green` | `#27815A` | `#27815A` |
| `--green-d` | `#1B5E3B` | `#1B5E3B` |
| `--gold` | `#B8763B` | `#D4975C` |
| `--border` | `#E2E5E9` | `rgba(255,255,255,0.08)` |

### Course Block Palette

8 rotating colors for course blocks on the calendar:

| Index | Color | Background |
|---|---|---|
| 1 | `#4F6AE8` (blue) | `#EEF1FD` |
| 2 | `#E05280` (pink) | `#FDEEF2` |
| 3 | `#2DA563` (green) | `#EEFAF3` |
| 4 | `#E8A84F` (amber) | `#FDF5EB` |
| 5 | `#8B5CF6` (purple) | `#F3EFFE` |
| 6 | `#06B6D4` (cyan) | `#ECFEFF` |
| 7 | `#F97316` (orange) | `#FFF7ED` |
| 8 | `#EC4899` (rose) | `#FDF2F8` |

In dark mode, backgrounds use 12% opacity variants. Colors are assigned in order via `colorIdx` and stored in `courseColors` map.

---

## 17. Deployment

### GitHub Pages

The site is deployed via GitHub Pages with a `CNAME` file containing `vsb.untgrades.app`.

- **Build step:** None — `index.html` is served as-is
- **Custom domain:** Configured via `CNAME` file in repo root
- **HTTPS:** Enforced by GitHub Pages
- **No server-side logic** — fully static

---

## 18. Data Update Workflow

To update course data for a new semester:

1. **Replace `unt_sections.sql`** with the new semester's data (same INSERT format)
2. **Optionally replace `unt_sections.json`** (for reference; not used at runtime)
3. **Run the pipeline:**
   ```bash
   python3 sql_to_html.py
   ```
4. **Verify** — open `index.html` in a browser and confirm courses appear
5. **Commit and push** — GitHub Pages will auto-deploy

The script reads from `unt_sections.sql`, flattens the data, and replaces the `const allCourses = [...]` line in `index.html`. The rest of the file is untouched.

---

*Last updated: May 2026*
