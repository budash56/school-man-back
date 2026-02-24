-- Seed 5 students per class group for grades 6-11 in TEST-2026
DO $$
DECLARE
  year_id bigint;
  cg RECORD;
  i int;
  student_national_id text;
  student_first_name text;
  student_last_name text;
  new_student_id bigint;
BEGIN
  SELECT school_year_id INTO year_id
  FROM school_years
  WHERE name = 'TEST-2026';

  IF year_id IS NULL THEN
    RAISE EXCEPTION 'School year TEST-2026 not found. Run seed-curriculum-test.sql first.';
  END IF;

  FOR cg IN
    SELECT class_group_id, grade_level, section
    FROM class_groups
    WHERE school_year_id = year_id
      AND grade_level BETWEEN 6 AND 11
    ORDER BY grade_level, section
  LOOP
    FOR i IN 1..5 LOOP
      student_national_id := FORMAT('TEST-%s-%s-%s', cg.grade_level, cg.section, LPAD(i::text, 2, '0'));
      student_first_name := FORMAT('Student%s', LPAD(i::text, 2, '0'));
      student_last_name := FORMAT('G%s%s', cg.grade_level, cg.section);

      INSERT INTO students (
        national_id,
        first_name,
        last_name,
        dob,
        address,
        guardian_name,
        guardian_relationship,
        guardian_phone,
        is_active
      )
      VALUES (
        student_national_id,
        student_first_name,
        student_last_name,
        DATE '2010-01-01' + ((cg.grade_level - 6) * 365) + (i * 10),
        'Test Address',
        'Guardian',
        'Parent',
        '+57 3000000000',
        TRUE
      )
      ON CONFLICT (national_id) DO UPDATE
        SET first_name = EXCLUDED.first_name,
            last_name = EXCLUDED.last_name,
            is_active = TRUE
      RETURNING student_id INTO new_student_id;

      IF new_student_id IS NULL THEN
        SELECT s.student_id INTO new_student_id
        FROM students s
        WHERE s.national_id = student_national_id;
      END IF;

      INSERT INTO enrollments (
        student_id,
        class_group_id,
        school_year_id,
        active
      )
      VALUES (
        new_student_id,
        cg.class_group_id,
        year_id,
        TRUE
      )
      ON CONFLICT (student_id, class_group_id, school_year_id) DO NOTHING;
    END LOOP;
  END LOOP;
END $$;
