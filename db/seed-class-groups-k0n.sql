-- Seed mock data for SchoolMan using numeric section naming (01, 02, ...)
DO $$
DECLARE
  target_year_name text := '2024-2025';
  target_year_start date := DATE '2024-08-15';
  target_year_end date := DATE '2025-06-15';
  year_id bigint;
  grade smallint;
  group_count int;
  group_num int;
  section_name text;
  class_id bigint;
  student_idx int;
  new_student_id bigint;
  first_names text[] := ARRAY[
    'Liam','Emma','Noah','Olivia','Ava','Ethan','Mia','Lucas','Isabella','Mason',
    'Sophia','Logan','Charlotte','James','Amelia','Benjamin','Harper','Elijah','Evelyn','Henry'
  ];
  last_names text[] := ARRAY[
    'Johnson','Smith','Martinez','Brown','Garcia','Lee','Wilson','Clark','Rodriguez','Walker',
    'Lewis','Young','Allen','King','Wright','Scott','Green','Hill','Baker','Nelson'
  ];
  first_name_count int := array_length(first_names, 1);
  last_name_count int := array_length(last_names, 1);
  first_name text;
  last_name text;
  student_national_id text;
  guardian_phone text;
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

  FOR grade IN 1..11 LOOP
    INSERT INTO audit_logs (entity_name, entity_id, action, payload)
    VALUES (
      'class_groups',
      NULL,
      'seed-grade',
      jsonb_build_object('grade_level', grade, 'school_year_id', year_id)
    );

    group_count := CASE WHEN grade % 2 = 1 THEN 5 ELSE 4 END;

    FOR group_num IN 1..group_count LOOP
      section_name := LPAD(group_num::text, 2, '0'); -- use 01/02/etc instead of A/B/C

      INSERT INTO class_groups (school_year_id, grade_level, section)
      VALUES (year_id, grade, section_name)
      ON CONFLICT (school_year_id, grade_level, section) DO UPDATE
        SET section = EXCLUDED.section
      RETURNING class_group_id INTO class_id;

      FOR student_idx IN 1..5 LOOP
        first_name := first_names[((grade + group_num + student_idx - 1) % first_name_count) + 1];
        last_name := last_names[((grade * 5 + group_num + student_idx - 1) % last_name_count) + 1];
        student_national_id := LPAD((600000000 + grade * 10000 + group_num * 100 + student_idx)::text, 10, '0');
        guardian_phone := FORMAT('555-%02s-%02s', grade, group_num);

        INSERT INTO students (national_id, first_name, last_name, guardian_phone)
        VALUES (student_national_id, first_name, last_name, guardian_phone)
        ON CONFLICT (national_id) DO UPDATE
          SET first_name = EXCLUDED.first_name,
              last_name = EXCLUDED.last_name,
              guardian_phone = EXCLUDED.guardian_phone,
              updated_at = now()
        RETURNING student_id INTO new_student_id;

        INSERT INTO enrollments (student_id, class_group_id, school_year_id)
        VALUES (new_student_id, class_id, year_id)
        ON CONFLICT (student_id, class_group_id, school_year_id) DO NOTHING;
      END LOOP;
    END LOOP;
  END LOOP;
END $$;
