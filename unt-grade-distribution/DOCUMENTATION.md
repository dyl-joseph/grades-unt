# UNT Grade Explorer — Technical Documentation

> A full-stack web application for exploring grade distributions across courses and instructors at the University of North Texas.

**Live URL:** Deployed on Vercel (auto-deploys on push to `main`)  
**Repository:** [github.com/dyl-joseph/grades-unt](https://github.com/dyl-joseph/grades-unt)

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Tech Stack](#2-tech-stack)
3. [Project Structure](#3-project-structure)
4. [Database Schema](#4-database-schema)
5. [Data Pipeline](#5-data-pipeline)
6. [Frontend — Pages & Routing](#6-frontend--pages--routing)
7. [Search System](#7-search-system)
8. [Shopping Cart & PDF Export](#8-shopping-cart--pdf-export)
9. [Theming & Visual Design](#9-theming--visual-design)
10. [Components Reference](#10-components-reference)
11. [Hooks & Utilities](#11-hooks--utilities)
12. [Configuration Files](#12-configuration-files)
13. [Deployment](#13-deployment)
14. [Development Guide](#14-development-guide)

---

## 1. Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                        Browser                          │
│  ┌──────────┐  ┌──────────────┐  ┌───────────────────┐ │
│  │ SearchBar│→ │ /api/search  │  │ Server Components │ │
│  │ (client) │  │ (API Route)  │  │ (course, instruc.)│ │
│  └──────────┘  └──────┬───────┘  └────────┬──────────┘ │
│                       │                    │            │
│  ┌────────────────────┴────────────────────┘            │
│  │           Prisma ORM (PrismaPg adapter)              │
│  └────────────────────┬─────────────────────            │
│                       │                                 │
│            ┌──────────▼──────────┐                      │
│            │  Supabase PostgreSQL │                     │
│            │  (PgBouncer pooler)  │                     │
│            └─────────────────────┘                      │
└─────────────────────────────────────────────────────────┘
```

The app follows a **hybrid rendering model**:

- **Server Components** (default): Course detail pages and instructor detail pages are rendered on the server. They call Prisma directly — no API route needed. This means the database query, data aggregation, and HTML generation all happen server-side before the page reaches the browser.
- **Client Components** (`"use client"`): Interactive elements like the search bar, theme toggle, cart, and charts are client-rendered. The search bar calls a Next.js API route (`/api/search`) which queries the database and returns JSON.
- **API Routes**: A single API route (`/api/search/route.ts`) handles autocomplete search queries.

---

## 2. Tech Stack

### Frontend

| Technology | Version | Purpose |
|---|---|---|
| **Next.js** | 16.1.6 | React framework with App Router, Server Components, file-based routing |
| **React** | 19.2.3 | UI library with React Compiler enabled |
| **TypeScript** | ^5 | Type safety across the entire codebase |
| **Tailwind CSS** | v4 | Utility-first CSS with `@variant dark` for class-based dark mode |
| **Recharts** | 3.7.0 | Responsive SVG bar charts for grade distributions |
| **jsPDF** | 4.2.0 | Client-side PDF generation |
| **jspdf-autotable** | 5.0.7 | Table layout plugin for jsPDF |

### Backend

| Technology | Version | Purpose |
|---|---|---|
| **Prisma ORM** | 7.4.2 | Type-safe database access with `@prisma/adapter-pg` driver adapter |
| **PostgreSQL** | — | Relational database hosted on Supabase |
| **pg (node-postgres)** | 8.19.0 | Low-level PostgreSQL driver (used by Prisma adapter and seed scripts) |
| **csv-parse** | 6.1.0 | CSV parsing for seed scripts |

### Infrastructure

| Technology | Purpose |
|---|---|
| **Vercel** | Hosting, serverless functions, auto-deploy on push |
| **Supabase** | Managed PostgreSQL with connection pooling (PgBouncer) |
| **ESLint** | v9 with `eslint-config-next` for code linting |
| **React Compiler** | `babel-plugin-react-compiler` 1.0.0 for automatic memoization |

---

## 3. Project Structure

```
unt-grade-distribution/
├── .env                          # Environment variables (not committed)
├── .env.example                  # Template for environment variables
├── next.config.ts                # Next.js configuration (React Compiler enabled)
├── postcss.config.mjs            # PostCSS with @tailwindcss/postcss
├── prisma.config.ts              # Prisma 7 configuration with defineConfig
├── tsconfig.json                 # TypeScript configuration
├── package.json                  # Dependencies and scripts
│
├── prisma/
│   ├── schema.prisma             # Database schema (3 models, 7 indexes)
│   ├── seed.ts                   # Seeding script (raw pg client)
│   ├── generate-sql.ts           # Offline SQL file generator for Supabase
│   ├── data/
│   │   └── grades.csv            # Source data (UNT grade distributions)
│   └── sql-chunks/               # Generated SQL files (for manual import)
│
├── public/                       # Static assets
│
└── src/
    ├── app/
    │   ├── globals.css            # Tailwind v4 theme, glass effects, sparkle animation
    │   ├── layout.tsx             # Root layout (fonts, Vines, Providers, Navbar)
    │   ├── page.tsx               # Home page (title + centered search)
    │   ├── not-found.tsx          # Custom 404 page
    │   ├── api/search/route.ts    # Search API endpoint
    │   ├── cart/page.tsx          # Shopping cart page
    │   ├── course/[prefix]/[number]/page.tsx   # Course detail page
    │   └── instructor/[id]/page.tsx            # Instructor detail page
    │
    ├── components/
    │   ├── SearchBar.tsx          # Autocomplete search with keyboard navigation
    │   ├── Navbar.tsx             # Sticky navigation bar
    │   ├── ThemeToggle.tsx        # Dark/light mode switch
    │   ├── Vines.tsx              # Decorative SVG vine overlays
    │   ├── GradeChart.tsx         # Recharts bar chart wrapper
    │   ├── SectionCard.tsx        # Individual section display card
    │   ├── GpaBadge.tsx           # Color-coded GPA pill badge
    │   ├── AddToCartButton.tsx    # Add/remove course from cart
    │   ├── CartIcon.tsx           # Navbar cart link with badge count
    │   ├── CourseCartButton.tsx   # Client wrapper for cart button on server page
    │   ├── ShareButton.tsx        # Copy-to-clipboard share link
    │   └── Providers.tsx          # Client-side context providers wrapper
    │
    ├── context/
    │   └── CartContext.tsx         # Shopping cart state (useReducer + localStorage)
    │
    ├── hooks/
    │   ├── useDebounce.ts         # Generic debounce hook
    │   └── useTheme.ts            # Dark mode detection via MutationObserver
    │
    └── lib/
        ├── prisma.ts              # Prisma client singleton with PgBouncer awareness
        ├── types.ts               # Shared TypeScript types
        ├── grades.ts              # GPA calculation, chart data, aggregation
        └── pdf.ts                 # PDF generation with jsPDF + autotable
```

---

## 4. Database Schema

The database uses **3 normalized tables** with a straightforward relational model:

```
┌──────────┐       ┌──────────────┐       ┌──────────────┐
│  Course   │──1:N──│   Section    │──N:1──│  Instructor  │
│           │       │              │       │              │
│ id (PK)   │       │ id (PK)      │       │ id (PK)      │
│ prefix    │       │ sectionNumber│       │ firstName    │
│ number    │       │ courseId (FK) │       │ lastName     │
│ title     │       │ instructorId │       │              │
│           │       │ gradeA..I    │       │              │
│           │       │ totalEnroll  │       │              │
└──────────┘       └──────────────┘       └──────────────┘
```

### Models

#### Course
- **Primary Key:** `id` (autoincrement)
- **Fields:** `prefix` (e.g., "ACCT"), `number` (e.g., "2010"), `title` (e.g., "PRINCIPLES OF ACCOUNTING")
- **Unique Constraint:** `(prefix, number)` — ensures no duplicate courses
- **Index:** `prefix` — speeds up prefix-based autocomplete searches

#### Instructor
- **Primary Key:** `id` (autoincrement)
- **Fields:** `firstName`, `lastName`
- **Unique Constraint:** `(firstName, lastName)` — ensures no duplicate instructors
- **Index:** `lastName` — speeds up name search lookups

#### Section
- **Primary Key:** `id` (autoincrement)
- **Fields:** `sectionNumber`, `courseId` (FK), `instructorId` (FK), plus 9 grade count columns (`gradeA` through `gradeI`) and `totalEnroll`
- **Unique Constraint:** `(courseId, sectionNumber)` — ensures no duplicate sections per course
- **Indexes:** `courseId`, `instructorId` — optimizes JOIN operations when loading course and instructor pages

### Grade Columns

Each section stores raw student counts for 9 grade categories:

| Column | Meaning |
|---|---|
| `gradeA` | Number of A grades |
| `gradeB` | Number of B grades |
| `gradeC` | Number of C grades |
| `gradeD` | Number of D grades |
| `gradeF` | Number of F grades |
| `gradeP` | Number of P (Pass) grades |
| `gradeNP` | Number of NP (No Pass) grades |
| `gradeW` | Number of W (Withdrawal) grades |
| `gradeI` | Number of I (Incomplete) grades |
| `totalEnroll` | Sum of all grade counts (computed during seeding) |

### Dataset Size

- **1,936 courses** (unique prefix + number combinations)
- **1,967 instructors**
- **4,305 sections** (each with full grade distribution data)

---

## 5. Data Pipeline

Grade data originates from a CSV file (`prisma/data/grades.csv`) that contains UNT grade distribution records. There are **two seeding methods**:

### Method 1: Direct Seed Script (`prisma/seed.ts`)

Connects directly to PostgreSQL and upserts data row by row:

1. **Parses the CSV** using `csv-parse/sync`
2. **Extracts course info** from the `COURSE NAME` column (format: `"AARS 6840 - ORG AGING & HEALTH"`)
   - Splits on `" - "` to separate prefix+number from title
   - Regex `^([A-Z]+)\s+(.+)$` extracts prefix and number
3. **Extracts instructor info** from `TEACHER NAME` column (format: `"Moore,Ami R"`)
   - Splits on first comma to separate last name from first name
4. **Parses grade counts** from columns A, B, C, D, F, P, NP, W, I
   - Rounds floats to integers
   - Computes `totalEnroll` as the sum of all grades
5. **Upserts courses and instructors** with `INSERT ... ON CONFLICT DO UPDATE`
   - Uses in-memory `Map` caches to avoid repeated DB lookups for the same course/instructor
6. **Upserts sections** with all grade data

```bash
npx prisma db seed   # or: npx tsx prisma/seed.ts
```

**Connection:** Uses `DIRECT_URL` (port 5432, no pooler) for reliability during bulk operations.

### Method 2: SQL File Generator (`prisma/generate-sql.ts`)

For environments where direct DB connections are restricted (e.g., Supabase free tier), generates SQL files that can be pasted into the Supabase SQL Editor:

1. Parses the same CSV offline
2. Generates `00-courses-instructors.sql` with `TRUNCATE` + bulk `INSERT` for courses and instructors
3. Generates chunked section files (`01-sections-1-500.sql`, `02-sections-501-1000.sql`, etc.) with 500 rows each
4. Section inserts use subqueries for FK resolution: `(SELECT id FROM courses WHERE prefix='...' AND number='...')`

```bash
npx tsx prisma/generate-sql.ts
```

Files are output to `prisma/sql-chunks/`.

### Why Two Methods?

The direct seed script is faster and simpler, but requires a direct PostgreSQL connection. Supabase's SQL Editor has statement size limits, so the SQL generator chunks the data into manageable files. Both methods produce identical results.

---

## 6. Frontend — Pages & Routing

The app uses Next.js App Router with file-based routing under `src/app/`.

### Home Page (`/`)

**File:** `src/app/page.tsx` (Client Component)

The landing page features:
- **Title Section:** "University of North Texas" subtitle + "Grade Explorer" main heading, both with a sparkle shimmer animation
- **Centered Search Bar:** Full-width (max 640px) glass-styled search with autofocus
- **Hint Text:** "Search by course (e.g., 'ACCT 2010') or professor name (e.g., 'Moore')"

The page is a client component because the `SearchBar` requires client-side state management.

### Course Detail Page (`/course/[prefix]/[number]`)

**File:** `src/app/course/[prefix]/[number]/page.tsx` (Server Component)

Displays complete grade distribution for a single course:

1. **Database Query:** `prisma.course.findUnique()` using the `(prefix, number)` compound unique constraint, with all sections and their instructors eager-loaded
2. **Aggregation:** Calls `aggregateGrades()` to sum all section grades into a combined distribution, then `calculateGPA()` for the overall GPA
3. **Rendered Content:**
   - Course title with prefix and number
   - Share button (copies URL to clipboard) and Add to Cart button
   - Overall GPA badge
   - Section count and total enrollment
   - Aggregate grade distribution bar chart
   - Individual section cards in a responsive grid

If the course is not found, calls `notFound()` which renders the custom 404 page.

### Instructor Detail Page (`/instructor/[id]`)

**File:** `src/app/instructor/[id]/page.tsx` (Server Component)

Displays all sections taught by a specific instructor, grouped by course:

1. **Database Query:** `prisma.instructor.findUnique()` by ID, with all sections and their courses eager-loaded, ordered by course prefix and number
2. **Grouping:** Uses a `Map<courseId, { course, sections[] }>` to group sections by course
3. **Rendered Content:**
   - Instructor name
   - Overall GPA badge, total section count, and unique course count
   - For each course group: course heading (linked) + section cards grid

### Cart Page (`/cart`)

**File:** `src/app/cart/page.tsx` (Client Component)

Shows all saved courses with their grade distributions:

- **Empty State:** Cart emoji + "Browse Courses" link
- **Populated State:** Header with count, combined GPA, Download PDF button, and Clear All button
- **Course Cards:** Grid of cards each showing course name, title, GPA badge, section count, enrollment, and a mini grade chart
- **PDF Download:** Calls `downloadCartPDF()` to generate and download a landscape PDF table

### Not Found Page (`/not-found`)

**File:** `src/app/not-found.tsx`

Custom 404 page with "Lost in the jungle... page not found 🌴" message and a link back to home.

### Root Layout (`/`)

**File:** `src/app/layout.tsx`

Wraps all pages with:
1. **Theme Flash Prevention:** Inline `<script>` checks `localStorage.getItem('theme')` and adds `dark` class before paint, preventing a flash of wrong theme on page load
2. **Font:** Inter via `next/font/google`
3. **Vines Component:** Fixed SVG vine decorations on both sides
4. **Dark Mode Gradient Overlay:** A fixed full-screen gradient (transparent in light mode, dark green-to-black in dark mode)
5. **Providers:** Wraps children in `CartProvider` for cart state
6. **Navbar:** Sticky navigation bar

---

## 7. Search System

The search system has three layers: the **SearchBar component** (UI), the **API route** (server logic), and the **database queries** (Prisma).

### SearchBar Component (`src/components/SearchBar.tsx`)

A client component with the following features:

- **Debounced Input:** Uses `useDebounce(query, 300)` — only fires a network request 300ms after the user stops typing
- **Abort Control:** Creates an `AbortController` for each fetch. When a new query fires, the previous in-flight request is cancelled via `controller.abort()`
- **Minimum Length:** Queries shorter than 2 characters return empty results immediately (both client and server)
- **Two Modes:**
  - **Default (home page):** Glass-styled with `glass-glossy` class, larger text, autofocused
  - **Compact (navbar):** Solid background (`bg-jungle-tan-light` / `bg-jungle-canopy`), smaller text
- **Keyboard Navigation:**
  - `ArrowDown` / `ArrowUp` — cycle through results
  - `Enter` — navigate to highlighted result (or first result if none highlighted)
  - `Escape` — close dropdown and blur input
- **Click-Outside Detection:** Uses `mousedown` event listener on `document` to close dropdown when clicking outside the container
- **Dropdown:** Shows categorized results (Courses / Instructors) with hover highlighting

### Search API Route (`src/app/api/search/route.ts`)

A Next.js Route Handler that processes search queries:

1. **Input Validation:** Trims query, rejects anything shorter than 2 characters
2. **Query Heuristic:** Regex `/^[A-Za-z]{1,4}\s?\d/` detects course-like queries (e.g., "CS 3" or "ACCT2"). This determines result prioritization:
   - **Course query:** 10 courses + 5 instructors
   - **Name query:** 5 courses + 10 instructors
3. **Course Search:** Uses Prisma `findMany` with `OR`:
   - **Pattern match:** `prefix.startsWith` + `number.startsWith` — catches queries like "CS 31" (prefix "CS", number starts with "31")
   - **Title search:** `title.contains` with case-insensitive mode — catches queries like "accounting"
4. **Instructor Search:** Uses Prisma `findMany` with `OR`:
   - `lastName.contains` OR `firstName.contains` — catches partial name matches
5. **Limits:** Both queries use `take: 10` to cap results
6. **Sequential Queries:** The two queries run one after the other (not in parallel). This avoids holding two database connections simultaneously, which matters for serverless deployments with connection pooling (PgBouncer).

### Database Indexes Used

| Query Pattern | SQL Generated | Index Used |
|---|---|---|
| `prefix.startsWith("CS")` | `WHERE prefix ILIKE 'CS%'` | `@@index([prefix])` — B-tree supports prefix matching |
| `number.startsWith("31")` | `AND number ILIKE '31%'` | No dedicated index (piggybacks on row filtering after prefix match) |
| `title.contains("accounting")` | `WHERE title ILIKE '%accounting%'` | No index — sequential scan (fine at ~2K rows) |
| `lastName.contains("moore")` | `WHERE last_name ILIKE '%moore%'` | `@@index([lastName])` cannot be used for `%prefix` — sequential scan |

At the current dataset size (~2K courses, ~2K instructors), these sequential scans complete in single-digit milliseconds. For significantly larger datasets, `pg_trgm` GIN indexes or PostgreSQL full-text search would be needed.

---

## 8. Shopping Cart & PDF Export

### Cart Architecture

The cart uses React Context with `useReducer` for state management and `localStorage` for persistence.

**State Shape:**
```typescript
interface CartState {
  items: CartItem[];
}
```

**Actions:**
- `ADD` — adds a `CartItem` (no-ops if `courseId` already exists)
- `REMOVE` — removes by `courseId`
- `CLEAR` — empties the cart
- `HYDRATE` — restores from localStorage on mount

**Persistence Lifecycle:**
1. On mount: reads `localStorage.getItem("unt-grades-cart")`, parses JSON, dispatches `HYDRATE`
2. On every state change: writes `localStorage.setItem("unt-grades-cart", JSON.stringify(items))`

**CartItem** contains pre-computed data (grade counts, GPA, section count) so the cart page doesn't need to re-query the database.

### Component Chain

1. **Course Detail Page** (Server Component) → computes aggregate grades, GPA, section count
2. **CourseCartButton** (Client Component) — thin wrapper that receives pre-computed `CartItem` as props
3. **AddToCartButton** — renders Add/Remove button based on `isInCart(courseId)`
4. **CartIcon** — navbar link showing badge with `items.length`
5. **Cart Page** — displays all cart items with charts and download button

### PDF Export (`src/lib/pdf.ts`)

Uses `jsPDF` (landscape orientation) with `jspdf-autotable` for table layout:

- **Header:** "UNT Grade Distribution — My Courses" in UNT green (#1B5E20)
- **Date:** "Generated {date}" subtitle
- **Table Columns:** Course, Title, GPA, Sections, Enrolled, %A, %B, %C, %D, %F, %W
- **Styling:** Green header row, alternating green-50 rows, bold course code column
- **Output:** Triggers browser download of `unt-grades-my-courses.pdf`

---

## 9. Theming & Visual Design

### Color System

Defined in `globals.css` using Tailwind CSS v4's `@theme` block:

```css
@theme {
  --color-primary: #1B5E20;         /* Deep forest green */
  --color-primary-light: #2E7D32;
  --color-primary-dark: #0D3B13;
  --color-accent: #A5D6A7;          /* Light green */
  --color-jungle-canopy: #0A2F11;   /* Very dark green (dark mode bg) */
  --color-jungle-leaf: #388E3C;
  --color-jungle-moss: #33691E;
  --color-jungle-vine: #558B2F;
  --color-jungle-tan: #D4C5A9;      /* Warm tan (light mode bg) */
  --color-jungle-tan-light: #E8DCC8;/* Card backgrounds */
  --color-jungle-tan-dark: #BBA882; /* Borders */
  --color-jungle-gold: #F9A825;     /* Cart badge */
  --color-jungle-bark: #4E342E;     /* Subtle text */
}
```

### Dark Mode

- **Toggle mechanism:** Class-based (`@variant dark (&:where(.dark, .dark *))`)
- **Storage:** `localStorage.getItem('theme')` — values `"dark"` or `"light"`
- **Default:** Light mode (the flash-prevention script only adds `dark` if explicitly saved as `"dark"`)
- **Detection:** `ThemeToggle` checks localStorage first, then falls back to `prefers-color-scheme: dark`
- **Chart awareness:** `useTheme` hook watches `document.documentElement.classList` via `MutationObserver` and provides theme-appropriate chart colors

**Light Mode Palette:**
- Background: `#D4C5A9` (warm tan)
- Cards: `#E8DCC8` (lighter tan)
- Text: gray-900

**Dark Mode Palette:**
- Background: black with a fixed gradient overlay (`rgba(10,47,17,0.6)` → `rgba(0,0,0,0.95)`)
- Cards: `#0A2F11` at 60% opacity (dark canopy)
- Text: green-100

### Glass Effects

Two CSS classes for frosted glass appearance:

- **`.glass-glossy`:** Used for the home page search bar and its dropdown. Uses `backdrop-filter: blur(24px) saturate(1.8)` with subtle white gradients. Dark mode variant reduces opacity.
- **`.glass-navbar-search`:** More opaque variant originally designed for the navbar search (currently unused — navbar search uses solid colors instead).

### Sparkle Shimmer Animation

The home page title text has an animated shimmer/sparkle effect:

**How it works:**
1. Text uses `background-clip: text` with `-webkit-text-fill-color: transparent` to make the text itself a mask over a gradient
2. A `linear-gradient` (105° angle) transitions from `currentColor` → highlight band → `currentColor`
3. `background-size: 200% 100%` makes the gradient twice the element width
4. `@keyframes sparkle-shift` animates `background-position` from `-200%` to `200%`, creating a sweeping sparkle effect
5. Animation runs on a 3-second `ease-in-out` infinite loop

**Light mode:** White/warm-white highlight band (45%–55% of gradient)  
**Dark mode:** Dark green band (43%–53%) — creates a subtle dark shimmer against green text

The `.sparkle-text-wide` variant has a slightly wider dark band (41%–55%), used on the "Grade Explorer" heading for a more pronounced effect.

### Vine Decorations

The `Vines` component renders hand-drawn SVG vine patterns fixed to both sides of the viewport:

- **Left vines:** 3 SVG groups (thick main vine, medium secondary, thin background), container width 160px (`w-40`), asymmetrically larger
- **Right vines:** 3 SVG groups (main with leaves, secondary thinner, short background), container width 80px (`w-20`), narrower
- **Randomization:** On mount, `pickRandom()` selects 1–3 vine groups per side, maintaining visual variety between page loads
- **Styling:** `opacity-75 brightness-75 saturate-150` in light mode, `opacity-65 brightness-180 saturate-150` in dark mode (brighter to compensate for dark background)
- **Positioning:** `position: fixed`, `z-index: 10`, `pointer-events: none` — decorative only, never blocks interaction

---

## 10. Components Reference

### `SearchBar`

| Prop | Type | Default | Description |
|---|---|---|---|
| `placeholder` | `string` | `"Search course or professor..."` | Input placeholder text |
| `autoFocus` | `boolean` | `false` | Auto-focus on mount |
| `compact` | `boolean` | `false` | Compact mode for navbar (solid bg, smaller text) |
| `onFocusChange` | `(focused: boolean) => void` | — | Callback when focus state changes |

### `Navbar`

Sticky navigation bar with:
- "UNT Grades" brand link (home)
- Search bar (hidden on home page, collapses on scroll past 40px)
- Cart icon with badge
- Theme toggle

The scroll-hide behavior uses `useState` + `scroll` event listener. The search bar transitions with `opacity-0 max-h-0 pointer-events-none` when `scrolled` is true.

### `ThemeToggle`

Renders a sun/moon icon button. Avoids hydration mismatch by rendering a placeholder div until `mounted` state is true. Uses `localStorage` for persistence and `document.documentElement.classList` for applying the dark class.

### `GradeChart`

| Prop | Type | Default | Description |
|---|---|---|---|
| `data` | `ChartDataPoint[]` | — | Array of `{ grade, count, percentage }` |
| `mode` | `"count" \| "percentage"` | `"count"` | Which value to plot on the Y axis |
| `height` | `number` | `300` | Chart height in pixels |

Wraps Recharts `BarChart` with theme-aware colors and a custom tooltip showing grade name, count, and percentage.

### `SectionCard`

Displays a single course section with:
- Section number and instructor name (linked)
- Share button (copies instructor page URL)
- GPA badge
- Grade distribution chart (200px height)
- Total enrollment count

### `GpaBadge`

A small pill badge showing GPA value, color-coded:
- ≥ 3.5: Green (`bg-green-500`)
- ≥ 2.5: Yellow (`bg-yellow-400`)
- ≥ 2.0: Orange (`bg-orange-500`)
- < 2.0: Red (`bg-red-600`)
- N/A: Gray (`bg-gray-400`)

### `ShareButton`

| Prop | Type | Default | Description |
|---|---|---|---|
| `url` | `string` | — | Relative URL path to share |
| `compact` | `boolean` | `false` | Smaller variant for inline use |

Copies the full URL (origin + path) to clipboard using `navigator.clipboard.writeText()` with a `document.execCommand("copy")` fallback for older browsers. Shows "Copied!" feedback for 2 seconds.

### `Vines`

Client component that renders randomized decorative SVG vines. Uses `useEffect` to pick random vine groups on mount (avoiding SSR/hydration mismatch). Returns `null` during SSR.

---

## 11. Hooks & Utilities

### `useDebounce<T>(value: T, delay?: number): T`

Generic debounce hook. Returns a value that only updates `delay` milliseconds after the last change to the input value. Default delay: 300ms. Used by `SearchBar` to throttle API calls.

### `useTheme(): { isDark: boolean, chartColors: {...} }`

Monitors the `dark` class on `<html>` using a `MutationObserver`. Returns:
- `isDark` — current theme state
- `chartColors` — theme-appropriate colors for Recharts (axis stroke, tooltip background/border/text, grid stroke)

### `calculateGPA(data: GradeData): number | null`

Computes weighted GPA from letter grades only (A=4, B=3, C=2, D=1, F=0). Excludes P, NP, W, I from the calculation. Returns `null` if no letter grades exist (e.g., a pure P/NP section).

### `toChartData(data: GradeData): ChartDataPoint[]`

Converts grade data into Recharts-ready format: `[{ grade: "A", count: 42, percentage: 34.5 }, ...]`. Follows the `GRADE_ORDER` constant for consistent display.

### `aggregateGrades(sections: GradeData[]): GradeData`

Sums multiple sections into a single combined distribution. Used on course pages (sum all sections) and instructor pages (sum all sections for a course group or overall).

### `gpaColor(gpa: number | null): string`

Returns a Tailwind class string for a color-coded GPA badge background.

### `downloadCartPDF(items: CartItem[]): void`

Generates a landscape PDF with a styled table of all cart items showing course code, title, GPA, section count, enrollment, and grade percentages. Triggers a browser download.

### Prisma Client (`src/lib/prisma.ts`)

Singleton pattern with PgBouncer awareness:
- **Production:** Uses `DATABASE_URL` (pooler connection, port 6543)
- **Development:** Prefers `DIRECT_URL` (direct connection, port 5432) for speed, falls back to `DATABASE_URL`
- **Global cache:** Stores client on `globalThis` to survive Next.js dev hot-reloads without leaking connections

---

## 12. Configuration Files

### `next.config.ts`

```typescript
const nextConfig: NextConfig = {
  reactCompiler: true,  // Enables React Compiler for automatic memoization
};
```

### `postcss.config.mjs`

Uses `@tailwindcss/postcss` plugin (Tailwind CSS v4's PostCSS integration). No separate `tailwind.config.ts` — Tailwind v4 reads configuration from the CSS file's `@theme` block.

### `prisma.config.ts`

Prisma 7's `defineConfig` format:
- Schema path: `prisma/schema.prisma`
- Migrations path: `prisma/migrations`
- Seed command: `tsx prisma/seed.ts`
- Datasource URL: from `DATABASE_URL` environment variable

### `tsconfig.json`

- **Target:** ES2017
- **Module:** ESNext with bundler resolution
- **Strict mode:** Enabled
- **Path alias:** `@/*` → `./src/*`
- **Plugins:** Next.js TypeScript plugin
- **JSX:** `react-jsx` (automatic runtime)

### `.env` Variables

```
DATABASE_URL=postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true
DIRECT_URL=postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres
```

- `DATABASE_URL` — Connection through Supabase's PgBouncer pooler (required for serverless/Vercel)
- `DIRECT_URL` — Direct connection bypassing pooler (used for seeding and development)

---

## 13. Deployment

### Vercel

The project auto-deploys on every push to the `main` branch:

1. **Build command** (`package.json`): `prisma generate && next build`
   - `prisma generate` creates the Prisma Client from the schema
   - `next build` compiles the Next.js application
2. **Postinstall hook:** `prisma generate` — ensures Prisma Client is generated after `npm install` in Vercel's build environment
3. **Environment variables:** `DATABASE_URL` and `DIRECT_URL` are configured in the Vercel dashboard (not committed to the repo)

### Supabase Database

- **Project:** Hosted PostgreSQL instance
- **Pooler:** PgBouncer on port 6543 — handles connection pooling for serverless functions
- **Direct:** Port 5432 — used for migrations and seeding
- **Schema management:** Tables are created via Prisma migrations or manual SQL execution via Supabase SQL Editor

---

## 14. Development Guide

### Prerequisites

- Node.js (LTS recommended)
- npm
- A Supabase account with a PostgreSQL database

### Setup

```bash
# Clone the repository
git clone https://github.com/dyl-joseph/grades-unt.git
cd grades-unt/unt-grade-distribution

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your Supabase connection strings

# Generate Prisma Client
npx prisma generate

# Seed the database (requires grades.csv in prisma/data/)
npx prisma db seed
# Or use the SQL generator for manual import:
# npx tsx prisma/generate-sql.ts

# Start the dev server
npm run dev
```

### Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Starts Next.js development server on port 3000 |
| `npm run build` | Generates Prisma Client and builds for production |
| `npm run start` | Starts production server |
| `npm run lint` | Runs ESLint |
| `npx prisma generate` | Regenerates Prisma Client after schema changes |
| `npx prisma db seed` | Seeds the database from CSV |
| `npx tsx prisma/generate-sql.ts` | Generates SQL files for manual import |

### Common Dev Issues

- **Port 3000 in use:** Kill existing processes with `lsof -ti:3000 | xargs kill -9`
- **Dev server lock file:** Delete `.next/dev/lock` if the dev server won't start
- **Prisma Client outdated:** Run `npx prisma generate` after schema changes
- **Connection pool exhaustion:** If queries hang, check that `DATABASE_URL` uses the pooler connection string (port 6543)

---

*Last updated: March 2026*
