-- Add extra teachers for high-load secondary subjects and split course assignments
DO $$
DECLARE
  target_year_name text := '2024-2025';
  target_year_start date := DATE '2024-08-15';
  target_year_end date := DATE '2025-06-15';
  year_id bigint;
  subject_rec RECORD;
  course_ids bigint[];
  total_courses int;
  current_max_idx int;
  new_teacher_idx int;
  new_teacher_id text;
  start_reassign_idx int;
  assign_idx int;
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

  FOR subject_rec IN
    SELECT DISTINCT
      ci.grade_level,
      s.subject_code
    FROM course_instances ci
    JOIN subjects s ON s.subject_id = ci.subject_id
    WHERE ci.school_year_id = year_id
      AND (
        (s.subject_code = 'ENG-SEC' AND ci.grade_level BETWEEN 6 AND 11) OR
        (s.subject_code = 'ICT-SEC' AND ci.grade_level BETWEEN 6 AND 8) OR
        (s.subject_code = 'ICT-ADV' AND ci.grade_level BETWEEN 9 AND 11) OR
        (s.subject_code = 'PE-GEN' AND ci.grade_level BETWEEN 7 AND 11)
      )
  LOOP
    SELECT array_agg(c.course_id ORDER BY c.class_group_id),
           COUNT(*)
    INTO course_ids, total_courses
    FROM courses c
    JOIN course_instances ci2 ON ci2.course_instance_id = c.course_instance_id
    JOIN subjects s2 ON s2.subject_id = ci2.subject_id
    WHERE ci2.school_year_id = year_id
      AND ci2.grade_level = subject_rec.grade_level
      AND s2.subject_code = subject_rec.subject_code;

    IF total_courses IS NULL OR total_courses < 2 THEN
      CONTINUE;
    END IF;

    SELECT COALESCE(
      MAX(CAST(right(national_id, 2) AS int)),
      1
    )
    INTO current_max_idx
    FROM users
    WHERE national_id LIKE FORMAT('T-%s-G%02s-%%', subject_rec.subject_code, subject_rec.grade_level);

    new_teacher_idx := current_max_idx + 1;
    new_teacher_id := FORMAT('T-%s-G%02s-%02s', subject_rec.subject_code, subject_rec.grade_level, new_teacher_idx);

    INSERT INTO users (national_id, username, password_hash, role, first_name, last_name, email, phone)
    VALUES (
      new_teacher_id,
      LOWER(REPLACE(new_teacher_id, '-', '_')),
      '$2a$10$seededteacherhashxxxxxDuMyQO',
      'teacher',
      FORMAT('%s Extra', INITCAP(REPLACE(subject_rec.subject_code, '-', ' '))),
      FORMAT('Grade %s', subject_rec.grade_level),
      FORMAT('%s@schoolman.test', LOWER(REPLACE(new_teacher_id, '-', '_'))),
      FORMAT('+57-399-%04s', (subject_rec.grade_level * 100 + new_teacher_idx)::text)
    )
    ON CONFLICT (national_id) DO NOTHING;

    start_reassign_idx := FLOOR(total_courses / 2) + 1;

    FOR assign_idx IN start_reassign_idx..total_courses LOOP
      UPDATE courses
      SET teacher_id = new_teacher_id
      WHERE course_id = course_ids[assign_idx];
    END LOOP;
  END LOOP;
END $$;
