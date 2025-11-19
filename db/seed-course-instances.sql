-- Seed subject areas, subjects, and course instances for timetable testing
DO $$
DECLARE
  target_year_name text := '2024-2025';
  target_year_start date := DATE '2024-08-15';
  target_year_end date := DATE '2025-06-15';
  year_id bigint;
  grade smallint;
  subject_area_id bigint;
  seeded_subject_id bigint;
  seeded_subject_name text;
  course_subject_code text;
  course_weekly_hours integer;
  course_code text;
  subject_seed RECORD;
  course_plan RECORD;
BEGIN
  INSERT INTO school_years (name, year_start, year_end, is_active)
  VALUES (target_year_name, target_year_start, target_year_end, TRUE)
  ON CONFLICT (name) DO UPDATE
    SET year_start = EXCLUDED.year_start,
        year_end = EXCLUDED.year_end,
        is_active = EXCLUDED.is_active
  RETURNING school_year_id INTO year_id;

  IF year_id IS NULL THEN
    SELECT school_year_id INTO year_id FROM school_years WHERE name = target_year_name;
  END IF;

  IF year_id IS NULL THEN
    RAISE EXCEPTION 'School year % not found and could not be created', target_year_name;
  END IF;

  FOR subject_seed IN
    SELECT * FROM (VALUES
      ('LANG-PRI', 'Language Arts', 'CORE-PRI', 'Primary Core'),
      ('MATH-PRI', 'Mathematics Fundamentals', 'CORE-PRI', 'Primary Core'),
      ('SCI-PRI', 'Natural Sciences', 'SCI-CORE', 'Sciences'),
      ('SOC-PRI', 'Social Studies', 'SOC-CORE', 'Social Sciences'),
      ('ART-GEN', 'Creative Arts', 'ARTS', 'Arts & Culture'),
      ('PE-GEN', 'Physical Education', 'PE', 'Physical Education'),
      ('ENG-PRI', 'English Foundations', 'LANG', 'Languages'),
      ('ICT-PRI', 'Computer Discovery', 'TECH', 'Technology'),
      ('LANG-SEC', 'Spanish Literature', 'LANG', 'Languages'),
      ('MATH-SEC', 'Integrated Mathematics', 'CORE-SEC', 'Secondary Core'),
      ('SCI-BIO', 'Biology', 'SCI-CORE', 'Sciences'),
      ('SCI-CHEM', 'Chemistry', 'SCI-CORE', 'Sciences'),
      ('SCI-PHY', 'Physics', 'SCI-CORE', 'Sciences'),
      ('HIST-SEC', 'History & Geography', 'SOC-CORE', 'Social Sciences'),
      ('ENG-SEC', 'English Communication', 'LANG', 'Languages'),
      ('ICT-SEC', 'Technology Lab', 'TECH', 'Technology'),
      ('MATH-ADV', 'Advanced Mathematics', 'CORE-SEC', 'Secondary Core'),
      ('PHYS-ADV', 'Applied Physics', 'SCI-CORE', 'Sciences'),
      ('CHEM-ADV', 'Applied Chemistry', 'SCI-CORE', 'Sciences'),
      ('BIO-ADV', 'Applied Biology', 'SCI-CORE', 'Sciences'),
      ('PHIL-SEC', 'Philosophy & Ethics', 'SOC-CORE', 'Social Sciences'),
      ('ECON-SEC', 'Economics & Entrepreneurship', 'SOC-CORE', 'Social Sciences'),
      ('ICT-ADV', 'Software Development', 'TECH', 'Technology')
    ) AS s(subject_code, subject_name, area_code, area_name)
  LOOP
    INSERT INTO subject_areas (name, code)
    VALUES (subject_seed.area_name, subject_seed.area_code)
    ON CONFLICT (code) DO UPDATE
      SET name = EXCLUDED.name
    RETURNING area_id INTO subject_area_id;

    INSERT INTO subjects (subject_code, name, area_id)
    VALUES (subject_seed.subject_code, subject_seed.subject_name, subject_area_id)
    ON CONFLICT (subject_code) DO UPDATE
      SET name = EXCLUDED.name,
          area_id = EXCLUDED.area_id
    RETURNING subject_id INTO seeded_subject_id;
  END LOOP;

  FOR grade IN 1..11 LOOP
    IF grade BETWEEN 1 AND 3 THEN
      FOR course_plan IN
        SELECT * FROM (VALUES
          ('LANG-PRI', 5),
          ('MATH-PRI', 5),
          ('SCI-PRI', 3),
          ('SOC-PRI', 3),
          ('ART-GEN', 2),
          ('PE-GEN', 2)
        ) AS cp(subject_code, weekly_hours)
      LOOP
        course_subject_code := course_plan.subject_code;
        course_weekly_hours := course_plan.weekly_hours;
        SELECT subject_id, name
          INTO seeded_subject_id, seeded_subject_name
        FROM subjects
        WHERE subject_code = course_subject_code
        LIMIT 1;
        IF seeded_subject_id IS NULL THEN
          RAISE EXCEPTION 'Subject % not found', course_subject_code;
        END IF;
        course_code := FORMAT('G%02s-%s', grade, course_subject_code);
        INSERT INTO course_instances (
          subject_id,
          grade_level,
          school_year_id,
          weekly_hours,
          course_code,
          course_name,
          description,
          is_active
        )
        VALUES (
          seeded_subject_id,
          grade,
          year_id,
          course_weekly_hours,
          course_code,
          FORMAT('Grade %s %s', grade, seeded_subject_name),
          'Auto-generated for timetable tests',
          TRUE
        )
        ON CONFLICT (subject_id, grade_level, school_year_id) DO UPDATE
          SET weekly_hours = EXCLUDED.weekly_hours,
              course_name = EXCLUDED.course_name,
              description = EXCLUDED.description,
              is_active = TRUE;
      END LOOP;
    ELSIF grade BETWEEN 4 AND 5 THEN
      FOR course_plan IN
        SELECT * FROM (VALUES
          ('LANG-PRI', 5),
          ('MATH-PRI', 5),
          ('SCI-PRI', 3),
          ('SOC-PRI', 3),
          ('ENG-PRI', 3),
          ('ICT-PRI', 2),
          ('ART-GEN', 2),
          ('PE-GEN', 2)
        ) AS cp(subject_code, weekly_hours)
      LOOP
        course_subject_code := course_plan.subject_code;
        course_weekly_hours := course_plan.weekly_hours;
        SELECT subject_id, name
          INTO seeded_subject_id, seeded_subject_name
        FROM subjects
        WHERE subject_code = course_subject_code
        LIMIT 1;
        IF seeded_subject_id IS NULL THEN
          RAISE EXCEPTION 'Subject % not found', course_subject_code;
        END IF;
        course_code := FORMAT('G%02s-%s', grade, course_subject_code);
        INSERT INTO course_instances (
          subject_id,
          grade_level,
          school_year_id,
          weekly_hours,
          course_code,
          course_name,
          description,
          is_active
        )
        VALUES (
          seeded_subject_id,
          grade,
          year_id,
          course_weekly_hours,
          course_code,
          FORMAT('Grade %s %s', grade, seeded_subject_name),
          'Auto-generated for timetable tests',
          TRUE
        )
        ON CONFLICT (subject_id, grade_level, school_year_id) DO UPDATE
          SET weekly_hours = EXCLUDED.weekly_hours,
              course_name = EXCLUDED.course_name,
              description = EXCLUDED.description,
              is_active = TRUE;
      END LOOP;
    ELSIF grade BETWEEN 6 AND 8 THEN
      FOR course_plan IN
        SELECT * FROM (VALUES
          ('LANG-SEC', 4),
          ('MATH-SEC', 4),
          ('SCI-BIO', 3),
          ('SCI-CHEM', 2),
          ('SCI-PHY', 2),
          ('HIST-SEC', 3),
          ('ENG-SEC', 4),
          ('ICT-SEC', 2),
          ('ART-GEN', 2),
          ('PE-GEN', 2)
        ) AS cp(subject_code, weekly_hours)
      LOOP
        course_subject_code := course_plan.subject_code;
        course_weekly_hours := course_plan.weekly_hours;
        SELECT subject_id, name
          INTO seeded_subject_id, seeded_subject_name
        FROM subjects
        WHERE subject_code = course_subject_code
        LIMIT 1;
        IF seeded_subject_id IS NULL THEN
          RAISE EXCEPTION 'Subject % not found', course_subject_code;
        END IF;
        course_code := FORMAT('G%02s-%s', grade, course_subject_code);
        INSERT INTO course_instances (
          subject_id,
          grade_level,
          school_year_id,
          weekly_hours,
          course_code,
          course_name,
          description,
          is_active
        )
        VALUES (
          seeded_subject_id,
          grade,
          year_id,
          course_weekly_hours,
          course_code,
          FORMAT('Grade %s %s', grade, seeded_subject_name),
          'Auto-generated for timetable tests',
          TRUE
        )
        ON CONFLICT (subject_id, grade_level, school_year_id) DO UPDATE
          SET weekly_hours = EXCLUDED.weekly_hours,
              course_name = EXCLUDED.course_name,
              description = EXCLUDED.description,
              is_active = TRUE;
      END LOOP;
    ELSE
      FOR course_plan IN
        SELECT * FROM (VALUES
          ('MATH-ADV', 4),
          ('PHYS-ADV', 3),
          ('CHEM-ADV', 3),
          ('BIO-ADV', 3),
          ('HIST-SEC', 2),
          ('PHIL-SEC', 2),
          ('ECON-SEC', 2),
          ('ENG-SEC', 4),
          ('ICT-ADV', 3),
          ('PE-GEN', 2)
        ) AS cp(subject_code, weekly_hours)
      LOOP
        course_subject_code := course_plan.subject_code;
        course_weekly_hours := course_plan.weekly_hours;
        SELECT subject_id, name
          INTO seeded_subject_id, seeded_subject_name
        FROM subjects
        WHERE subject_code = course_subject_code
        LIMIT 1;
        IF seeded_subject_id IS NULL THEN
          RAISE EXCEPTION 'Subject % not found', course_subject_code;
        END IF;
        course_code := FORMAT('G%02s-%s', grade, course_subject_code);
        INSERT INTO course_instances (
          subject_id,
          grade_level,
          school_year_id,
          weekly_hours,
          course_code,
          course_name,
          description,
          is_active
        )
        VALUES (
          seeded_subject_id,
          grade,
          year_id,
          course_weekly_hours,
          course_code,
          FORMAT('Grade %s %s', grade, seeded_subject_name),
          'Auto-generated for timetable tests',
          TRUE
        )
        ON CONFLICT (subject_id, grade_level, school_year_id) DO UPDATE
          SET weekly_hours = EXCLUDED.weekly_hours,
              course_name = EXCLUDED.course_name,
              description = EXCLUDED.description,
              is_active = TRUE;
      END LOOP;
    END IF;
  END LOOP;
END $$;
