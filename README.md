# UNT Schedule Builder

## Choosing classes is a puzzle. Let's solve it.

Building a conflict-free schedule at UNT is tedious — cross-referencing section times, checking for overlaps, and juggling preferences. This tool automates all of it.

### **Link:** [vsb.untgrades.app](https://vsb.untgrades.app)

## Features

- **Course search** — filter by prefix, number, title, or instructor
- **Weekly calendar grid** — visual schedule with conflict detection
- **Section selection** — pick specific sections with ghost/hover previews
- **Recitation picking** — auto-pair lectures with their recitations/lab sections
- **Lock sections** — lock a section in place and regenerate around it
- **Busy times** — block off unavailable time slots
- **Auto-generate schedules** — generate all valid combinations with preferences (time of day, number of classes, professors, campus, delivery mode)
- **Save/load schedules** — persist schedules to localStorage, switch between saved builds
- **CRN display** — copy CRNs for registration
- **Dark/light theme** — toggle with auto-detect and persistence

## Technical Implementation

### Frontend:
- Vanilla HTML/CSS/JavaScript — single-file SPA (`index.html`), no framework, no build step
- No dependencies — zero npm packages, zero CDN links

### Data Pipeline:
- `unt_sections.sql` — raw UNT course scheduling data in SQL INSERT format
- `sql_to_html.py` — Python script that extracts from the SQL file and rebuilds the embedded `allCourses` data in `index.html`
- `unt_sections.json` — same data in JSON format

### Hosting:
- GitHub Pages via `CNAME` file pointing to `vsb.untgrades.app`

## File Structure:

```
index.html          — The entire VSB app (single-file SPA)
sql_to_html.py      — Data pipeline: SQL → embedded JS data in index.html
unt_sections.json   — Raw UNT course scheduling data (JSON)
unt_sections.sql    — Raw UNT course scheduling data (SQL INSERT format)
CNAME               — GitHub Pages custom domain (vsb.untgrades.app)
README.md           — This file
DOCUMENTATION.md    — Technical documentation
```

## Contributions

### Maintainers:

[Dylan Joseph](https://github.com/dyl-joseph)

[Akhil Tumati](https://github.com/YouSoMoose)