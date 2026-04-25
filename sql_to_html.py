#!/usr/bin/env python3
"""
Extract course data from unt_sections.sql and rebuild the allCourses line in index.html.

The SQL file contains a single INSERT with a JSON array in the 'courses' column.
This script:
  1. Extracts the JSON array from the SQL
  2. Flattens each course into the compact format used by index.html
  3. Replaces the `const allCourses = [...]` line in index.html
"""

import json
import re
import sys
import os

SQL_FILE = os.path.join(os.path.dirname(__file__), "unt_sections.sql")
HTML_FILE = os.path.join(os.path.dirname(__file__), "index.html")


def extract_courses_from_sql(sql_path):
    """Read the SQL file and extract the JSON courses array."""
    with open(sql_path, "r", encoding="utf-8") as f:
        content = f.read()

    # The courses column value is a JSON array wrapped in single quotes.
    # Find the opening '[' after 'courses) VALUES' and the matching ']'
    # The structure is: ..., 7700, '\n[\n    {...}, ...\n]\n');\n
    
    # Find the start of the JSON array - it starts with '[\n after the total_sections number
    # Let's find the pattern: a number followed by comma, then the single-quoted JSON
    match = re.search(r"\d+,\s*'\s*\[", content)
    if not match:
        print("ERROR: Could not find the courses JSON array in SQL file")
        sys.exit(1)
    
    # Find the position of '[' 
    bracket_start = content.index('[', match.start())
    
    # Find the matching ']' - the JSON array ends with ']' then a single quote
    # We need to find the last ']' before the closing ');'
    # Search for the pattern ]\n' or ]'\n
    bracket_end = content.rindex("]")
    
    json_str = content[bracket_start:bracket_end + 1]
    
    courses = json.loads(json_str)
    print(f"Extracted {len(courses)} courses from SQL")
    return courses


def flatten_course(course):
    """
    Convert a course from the SQL/JSON format to the compact format used in index.html.
    The SQL format has nested course_title, description, etc.
    The HTML format strips course_title & description (they are not used by the app) 
    and keeps only the operational fields.
    """
    # Build the compact course object, matching the existing format in index.html
    compact = {}
    
    # Build a clean ID without the trailing _index that SQL format has
    # SQL format id: "AARS_6810_001_13851_0" (has trailing index)
    # HTML format id: "AARS_6810_001_13851" (no trailing index)
    raw_id = course.get("id", "")
    # Remove trailing _N index if present
    parts = raw_id.rsplit("_", 1)
    if len(parts) == 2 and parts[1].isdigit():
        # Check if this is the positional index (the SQL format adds _0, _1, _2 etc)
        # But some IDs legitimately end in numbers (class_nbr). 
        # The SQL format appends an index that matches the array position.
        # We can tell by checking if removing it gives us SUBJ_NUM_SEC_CLASSNBR format
        potential_id = parts[0]
        id_parts = potential_id.split("_")
        if len(id_parts) >= 4:
            compact["id"] = potential_id
        else:
            compact["id"] = raw_id
    else:
        compact["id"] = raw_id
    
    # Core fields
    for key in ["subject", "course_number", "term", "section", "class_nbr", 
                "status", "session", "meeting_dates", "days",
                "start_time", "end_time", "start_min", "end_min",
                "room", "instructor", "seats_open", "seats_total"]:
        if key in course:
            compact[key] = course[key]
    
    # Skip description and course_title - not used by the schedule builder app
    
    # Handle recitations
    if "recitations" in course and course["recitations"]:
        recs = []
        for rec in course["recitations"]:
            compact_rec = {}
            # Recitation IDs in SQL format: "rec_12924", in HTML format: "501_12924"
            rec_id = rec.get("id", "")
            if rec_id.startswith("rec_"):
                # Convert rec_CLASSNBR to SEC_CLASSNBR format
                class_nbr = rec_id.replace("rec_", "")
                sec = rec.get("section", "")
                compact_rec["id"] = f"{sec}_{class_nbr}"
            else:
                compact_rec["id"] = rec_id
            
            for key in ["section", "class_nbr", "status", "session", "meeting_dates",
                        "days", "start_time", "end_time", "start_min", "end_min",
                        "room", "instructor", "seats_open", "seats_total"]:
                if key in rec:
                    compact_rec[key] = rec[key]
            recs.append(compact_rec)
        if recs:
            compact["recitations"] = recs
    
    return compact


def build_allcourses_line(courses):
    """Build the compact JSON string for the allCourses line."""
    compacted = [flatten_course(c) for c in courses]
    # Serialize to compact JSON (no extra whitespace)
    json_str = json.dumps(compacted, separators=(",", ":"), ensure_ascii=False)
    return f"    const allCourses = {json_str};\n"


def update_html(html_path, new_line):
    """Replace the allCourses line in index.html."""
    with open(html_path, "r", encoding="utf-8") as f:
        lines = f.readlines()
    
    found = False
    for i, line in enumerate(lines):
        if "const allCourses = [" in line or "const allCourses=[" in line:
            print(f"Found allCourses on line {i + 1}")
            lines[i] = new_line
            found = True
            break
    
    if not found:
        print("ERROR: Could not find 'const allCourses' line in index.html")
        sys.exit(1)
    
    with open(html_path, "w", encoding="utf-8") as f:
        f.writelines(lines)
    
    print(f"Updated {html_path}")
    print(f"New allCourses line length: {len(new_line)} chars")


def main():
    courses = extract_courses_from_sql(SQL_FILE)
    new_line = build_allcourses_line(courses)
    update_html(HTML_FILE, new_line)
    print("Done!")


if __name__ == "__main__":
    main()
