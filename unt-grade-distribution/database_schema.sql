-- Create courses table
CREATE TABLE courses (
    id SERIAL PRIMARY KEY,
    prefix VARCHAR(255) NOT NULL,
    number VARCHAR(255) NOT NULL,
    title VARCHAR(255) NOT NULL,
    UNIQUE(prefix, number)
);

CREATE INDEX courses_prefix_idx ON courses(prefix);

-- Create instructors table
CREATE TABLE instructors (
    id SERIAL PRIMARY KEY,
    first_name VARCHAR(255) NOT NULL,
    last_name VARCHAR(255) NOT NULL,
    UNIQUE(first_name, last_name)
);

CREATE INDEX instructors_last_name_idx ON instructors(last_name);

-- Create sections table
CREATE TABLE sections (
    id SERIAL PRIMARY KEY,
    section_number VARCHAR(255) NOT NULL,
    course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    instructor_id INTEGER NOT NULL REFERENCES instructors(id) ON DELETE CASCADE,
    grade_a INTEGER NOT NULL DEFAULT 0,
    grade_b INTEGER NOT NULL DEFAULT 0,
    grade_c INTEGER NOT NULL DEFAULT 0,
    grade_d INTEGER NOT NULL DEFAULT 0,
    grade_f INTEGER NOT NULL DEFAULT 0,
    grade_p INTEGER NOT NULL DEFAULT 0,
    grade_np INTEGER NOT NULL DEFAULT 0,
    grade_w INTEGER NOT NULL DEFAULT 0,
    grade_i INTEGER NOT NULL DEFAULT 0,
    total_enroll INTEGER NOT NULL DEFAULT 0,
    UNIQUE(course_id, section_number)
);

CREATE INDEX sections_course_id_idx ON sections(course_id);
CREATE INDEX sections_instructor_id_idx ON sections(instructor_id);
