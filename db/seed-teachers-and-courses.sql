-- Seed teachers and create course assignments for every class group/course instance
DO $$
DECLARE
  target_year_name text := '2024-2025';
  target_year_start date := DATE '2024-08-15';
  target_year_end date := DATE '2025-06-15';
  year_id bigint;
  grade smallint;
  course_instance_id_var bigint;
  course_weekly_hours integer;
  subject_name text;
  class_group_ids bigint[];
  class_group_count int;
  course_subject_code text;
  teacher_slot_capacity integer;
  teacher_needed integer;
  teacher_idx integer;
  teacher_id_var text;
  teacher_username text;
  teacher_ids text[];
  class_group_index integer;
  assigned_teacher_index integer;
  subject_plan RECORD;
  password_placeholder text := '$2a$10$seededteacherhashxxxxxDuMyQO';
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

  DELETE FROM courses
  WHERE course_instance_id IN (
    SELECT course_instance_id
    FROM course_instances
    WHERE school_year_id = year_id
  );

  FOR grade IN 1..11 LOOP
    SELECT array_agg(class_group_id ORDER BY section),
           COUNT(*)
    INTO class_group_ids, class_group_count
    FROM class_groups
    WHERE school_year_id = year_id
      AND grade_level = grade;

    IF class_group_count IS NULL OR class_group_count = 0 THEN
      CONTINUE;
    END IF;

    IF grade BETWEEN 1 AND 3 THEN
      FOR subject_plan IN
        SELECT * FROM (VALUES
          ('LANG-PRI'),
          ('MATH-PRI'),
          ('SCI-PRI'),
          ('SOC-PRI'),
          ('ART-GEN'),
          ('PE-GEN')
        ) AS sp(subject_code)
      LOOP
        course_subject_code := subject_plan.subject_code;
        SELECT ci.course_instance_id,
               ci.weekly_hours,
               s.name
        INTO course_instance_id_var,
             course_weekly_hours,
             subject_name
        FROM course_instances ci
        JOIN subjects s ON s.subject_id = ci.subject_id
        WHERE ci.school_year_id = year_id
          AND ci.grade_level = grade
          AND s.subject_code = course_subject_code
        LIMIT 1;

        IF course_instance_id_var IS NULL THEN
          RAISE EXCEPTION 'Course instance missing for grade % and subject %', grade, course_subject_code;
        END IF;

        teacher_slot_capacity := GREATEST(1, FLOOR(22.0 / course_weekly_hours));
        teacher_needed := CEIL(class_group_count::numeric / teacher_slot_capacity::numeric);
        teacher_ids := ARRAY[]::text[];

        FOR teacher_idx IN 1..teacher_needed LOOP
          teacher_id_var := FORMAT('T-%s-G%02s-%02s', course_subject_code, grade, teacher_idx);
          teacher_username := LOWER(REPLACE(teacher_id_var, '-', '_'));

          INSERT INTO users (national_id, username, password_hash, role, first_name, last_name, email, phone)
          VALUES (
            teacher_id_var,
            teacher_username,
            password_placeholder,
            'teacher',
            INITCAP(REPLACE(course_subject_code, '-', ' ')),
            FORMAT('Grade %s #%s', grade, teacher_idx),
            FORMAT('%s@schoolman.test', teacher_username),
            FORMAT('+57-301-%04s', (grade * 100 + teacher_idx)::text)
          )
          ON CONFLICT (national_id) DO UPDATE
            SET first_name = EXCLUDED.first_name,
                last_name = EXCLUDED.last_name,
                email = EXCLUDED.email,
                phone = EXCLUDED.phone,
                updated_at = now();

          teacher_ids := array_append(teacher_ids, teacher_id_var);
        END LOOP;

        FOR class_group_index IN 1..class_group_count LOOP
          assigned_teacher_index :=
            LEAST(
              array_length(teacher_ids, 1),
              FLOOR((class_group_index - 1)::numeric / teacher_slot_capacity::numeric) + 1
            );
          teacher_id_var := teacher_ids[assigned_teacher_index];

          INSERT INTO courses (course_instance_id, class_group_id, teacher_id)
          VALUES (course_instance_id_var, class_group_ids[class_group_index], teacher_id_var)
          ON CONFLICT (course_instance_id, class_group_id, teacher_id) DO NOTHING;
        END LOOP;
      END LOOP;
    ELSIF grade BETWEEN 4 AND 5 THEN
      FOR subject_plan IN
        SELECT * FROM (VALUES
          ('LANG-PRI'),
          ('MATH-PRI'),
          ('SCI-PRI'),
          ('SOC-PRI'),
          ('ENG-PRI'),
          ('ICT-PRI'),
          ('ART-GEN'),
          ('PE-GEN')
        ) AS sp(subject_code)
      LOOP
        course_subject_code := subject_plan.subject_code;
        SELECT ci.course_instance_id,
               ci.weekly_hours,
               s.name
        INTO course_instance_id_var,
             course_weekly_hours,
             subject_name
        FROM course_instances ci
        JOIN subjects s ON s.subject_id = ci.subject_id
        WHERE ci.school_year_id = year_id
          AND ci.grade_level = grade
          AND s.subject_code = course_subject_code
        LIMIT 1;

        IF course_instance_id_var IS NULL THEN
          RAISE EXCEPTION 'Course instance missing for grade % and subject %', grade, course_subject_code;
        END IF;

        teacher_slot_capacity := GREATEST(1, FLOOR(22.0 / course_weekly_hours));
        teacher_needed := CEIL(class_group_count::numeric / teacher_slot_capacity::numeric);
        teacher_ids := ARRAY[]::text[];

        FOR teacher_idx IN 1..teacher_needed LOOP
          teacher_id_var := FORMAT('T-%s-G%02s-%02s', course_subject_code, grade, teacher_idx);
          teacher_username := LOWER(REPLACE(teacher_id_var, '-', '_'));

          INSERT INTO users (national_id, username, password_hash, role, first_name, last_name, email, phone)
          VALUES (
            teacher_id_var,
            teacher_username,
            password_placeholder,
            'teacher',
            INITCAP(REPLACE(course_subject_code, '-', ' ')),
            FORMAT('Grade %s #%s', grade, teacher_idx),
            FORMAT('%s@schoolman.test', teacher_username),
            FORMAT('+57-302-%04s', (grade * 100 + teacher_idx)::text)
          )
          ON CONFLICT (national_id) DO UPDATE
            SET first_name = EXCLUDED.first_name,
                last_name = EXCLUDED.last_name,
                email = EXCLUDED.email,
                phone = EXCLUDED.phone,
                updated_at = now();

          teacher_ids := array_append(teacher_ids, teacher_id_var);
        END LOOP;

        FOR class_group_index IN 1..class_group_count LOOP
          assigned_teacher_index :=
            LEAST(
              array_length(teacher_ids, 1),
              FLOOR((class_group_index - 1)::numeric / teacher_slot_capacity::numeric) + 1
            );
          teacher_id_var := teacher_ids[assigned_teacher_index];

          INSERT INTO courses (course_instance_id, class_group_id, teacher_id)
          VALUES (course_instance_id_var, class_group_ids[class_group_index], teacher_id_var)
          ON CONFLICT (course_instance_id, class_group_id, teacher_id) DO NOTHING;
        END LOOP;
      END LOOP;
    ELSIF grade BETWEEN 6 AND 8 THEN
      FOR subject_plan IN
        SELECT * FROM (VALUES
          ('LANG-SEC'),
          ('MATH-SEC'),
          ('SCI-BIO'),
          ('SCI-CHEM'),
          ('SCI-PHY'),
          ('HIST-SEC'),
          ('ENG-SEC'),
          ('ICT-SEC'),
          ('ART-GEN'),
          ('PE-GEN')
        ) AS sp(subject_code)
      LOOP
        course_subject_code := subject_plan.subject_code;
        SELECT ci.course_instance_id,
               ci.weekly_hours,
               s.name
        INTO course_instance_id_var,
             course_weekly_hours,
             subject_name
        FROM course_instances ci
        JOIN subjects s ON s.subject_id = ci.subject_id
        WHERE ci.school_year_id = year_id
          AND ci.grade_level = grade
          AND s.subject_code = course_subject_code
        LIMIT 1;

        IF course_instance_id_var IS NULL THEN
          RAISE EXCEPTION 'Course instance missing for grade % and subject %', grade, course_subject_code;
        END IF;

        teacher_slot_capacity := GREATEST(1, FLOOR(22.0 / course_weekly_hours));
        teacher_needed := CEIL(class_group_count::numeric / teacher_slot_capacity::numeric);
        teacher_ids := ARRAY[]::text[];

        FOR teacher_idx IN 1..teacher_needed LOOP
          teacher_id_var := FORMAT('T-%s-G%02s-%02s', course_subject_code, grade, teacher_idx);
          teacher_username := LOWER(REPLACE(teacher_id_var, '-', '_'));

          INSERT INTO users (national_id, username, password_hash, role, first_name, last_name, email, phone)
          VALUES (
            teacher_id_var,
            teacher_username,
            password_placeholder,
            'teacher',
            INITCAP(REPLACE(course_subject_code, '-', ' ')),
            FORMAT('Grade %s #%s', grade, teacher_idx),
            FORMAT('%s@schoolman.test', teacher_username),
            FORMAT('+57-303-%04s', (grade * 100 + teacher_idx)::text)
          )
          ON CONFLICT (national_id) DO UPDATE
            SET first_name = EXCLUDED.first_name,
                last_name = EXCLUDED.last_name,
                email = EXCLUDED.email,
                phone = EXCLUDED.phone,
                updated_at = now();

          teacher_ids := array_append(teacher_ids, teacher_id_var);
        END LOOP;

        FOR class_group_index IN 1..class_group_count LOOP
          assigned_teacher_index :=
            LEAST(
              array_length(teacher_ids, 1),
              FLOOR((class_group_index - 1)::numeric / teacher_slot_capacity::numeric) + 1
            );
          teacher_id_var := teacher_ids[assigned_teacher_index];

          INSERT INTO courses (course_instance_id, class_group_id, teacher_id)
          VALUES (course_instance_id_var, class_group_ids[class_group_index], teacher_id_var)
          ON CONFLICT (course_instance_id, class_group_id, teacher_id) DO NOTHING;
        END LOOP;
      END LOOP;
    ELSE
      FOR subject_plan IN
        SELECT * FROM (VALUES
          ('MATH-ADV'),
          ('PHYS-ADV'),
          ('CHEM-ADV'),
          ('BIO-ADV'),
          ('HIST-SEC'),
          ('PHIL-SEC'),
          ('ECON-SEC'),
          ('ENG-SEC'),
          ('ICT-ADV'),
          ('PE-GEN')
        ) AS sp(subject_code)
      LOOP
        course_subject_code := subject_plan.subject_code;
        SELECT ci.course_instance_id,
               ci.weekly_hours,
               s.name
        INTO course_instance_id_var,
             course_weekly_hours,
             subject_name
        FROM course_instances ci
        JOIN subjects s ON s.subject_id = ci.subject_id
        WHERE ci.school_year_id = year_id
          AND ci.grade_level = grade
          AND s.subject_code = course_subject_code
        LIMIT 1;

        IF course_instance_id_var IS NULL THEN
          RAISE EXCEPTION 'Course instance missing for grade % and subject %', grade, course_subject_code;
        END IF;

        teacher_slot_capacity := GREATEST(1, FLOOR(22.0 / course_weekly_hours));
        teacher_needed := CEIL(class_group_count::numeric / teacher_slot_capacity::numeric);
        teacher_ids := ARRAY[]::text[];

        FOR teacher_idx IN 1..teacher_needed LOOP
          teacher_id_var := FORMAT('T-%s-G%02s-%02s', course_subject_code, grade, teacher_idx);
          teacher_username := LOWER(REPLACE(teacher_id_var, '-', '_'));

          INSERT INTO users (national_id, username, password_hash, role, first_name, last_name, email, phone)
          VALUES (
            teacher_id_var,
            teacher_username,
            password_placeholder,
            'teacher',
            INITCAP(REPLACE(course_subject_code, '-', ' ')),
            FORMAT('Grade %s #%s', grade, teacher_idx),
            FORMAT('%s@schoolman.test', teacher_username),
            FORMAT('+57-304-%04s', (grade * 100 + teacher_idx)::text)
          )
          ON CONFLICT (national_id) DO UPDATE
            SET first_name = EXCLUDED.first_name,
                last_name = EXCLUDED.last_name,
                email = EXCLUDED.email,
                phone = EXCLUDED.phone,
                updated_at = now();

          teacher_ids := array_append(teacher_ids, teacher_id_var);
        END LOOP;

        FOR class_group_index IN 1..class_group_count LOOP
          assigned_teacher_index :=
            LEAST(
              array_length(teacher_ids, 1),
              FLOOR((class_group_index - 1)::numeric / teacher_slot_capacity::numeric) + 1
            );
          teacher_id_var := teacher_ids[assigned_teacher_index];

          INSERT INTO courses (course_instance_id, class_group_id, teacher_id)
          VALUES (course_instance_id_var, class_group_ids[class_group_index], teacher_id_var)
          ON CONFLICT (course_instance_id, class_group_id, teacher_id) DO NOTHING;
        END LOOP;
      END LOOP;
    END IF;
  END LOOP;
END $$;
