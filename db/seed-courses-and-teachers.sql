-- Reset teachers/course instances and seed complete course + teacher assignments
DO $$
DECLARE
  target_year_name text := '2024-2025';
  target_year_start date := DATE '2024-08-15';
  target_year_end date := DATE '2025-06-15';
  year_id bigint;
  grade smallint;
  class_group_ids bigint[];
  class_group_count int;
  subject_seed RECORD;
  subject_area_id bigint;
  current_course_instance bigint;
  current_subject_id bigint;
  current_subject_name text;
  teacher_needed int;
  teacher_idx int;
  teacher_id_var text;
  teacher_username text;
  teacher_ids text[];
  teacher_slot_capacity numeric := 22.0;
  class_group_index int;
  subject_plan RECORD;
  teacher_phone_format text;
  password_placeholder text := '$2a$10$seededteacherhashxxxxxDuMyQO';
  teacher_first_names text[] := ARRAY[
    'Isabella', 'Mateo', 'Sofia', 'Sebastian', 'Valentina',
    'Nicolas', 'Camila', 'Juan', 'Lucia', 'Gabriel',
    'Mariana', 'Fernando', 'Daniela', 'Andres', 'Laura',
    'Felipe', 'Sara', 'Miguel', 'Paula', 'Javier'
  ];
  teacher_last_names text[] := ARRAY[
    'Gomez', 'Rodriguez', 'Perez', 'Diaz', 'Martinez',
    'Castillo', 'Lopez', 'Ramirez', 'Torres', 'Vargas',
    'Hernandez', 'Morales', 'Navarro', 'Rios', 'Salazar',
    'Suarez', 'Velasquez', 'Bautista', 'Cordoba', 'Mendoza'
  ];
  first_names_count int;
  last_names_count int;
  teacher_first_name text;
  teacher_last_name text;
  teacher_seed int;
  first_name_idx int;
  last_name_idx int;
BEGIN
  first_names_count := COALESCE(array_length(teacher_first_names, 1), 0);
  last_names_count := COALESCE(array_length(teacher_last_names, 1), 0);

  IF first_names_count = 0 OR last_names_count = 0 THEN
    RAISE EXCEPTION 'Teacher name pools must not be empty';
  END IF;

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

  DELETE FROM course_instances
  WHERE school_year_id = year_id;

  DELETE FROM users
  WHERE role = 'teacher';

  FOR subject_seed IN
    SELECT * FROM (VALUES
      -- Primary curriculum
      ('PRI-LANG', 'Primary Language Arts', 'PRIMARY', 'Primary Curriculum'),
      ('PRI-MATH', 'Primary Mathematics', 'PRIMARY', 'Primary Curriculum'),
      ('PRI-SCI', 'Primary Science & Nature', 'PRIMARY', 'Primary Curriculum'),
      ('PRI-SOC', 'Primary Social Studies', 'PRIMARY', 'Primary Curriculum'),
      ('PRI-ARTPE', 'Primary Arts & Physical Education', 'PRIMARY', 'Primary Curriculum'),
      -- Secondary humanities
      ('SEC-LANGLIT', 'Language & Literature', 'SEC-HUM', 'Secondary Humanities & Civic Studies'),
      ('SEC-HIST', 'History & Geography', 'SEC-HUM', 'Secondary Humanities & Civic Studies'),
      ('SEC-CIVICS', 'Civics & Economics', 'SEC-HUM', 'Secondary Humanities & Civic Studies'),
      -- Secondary STEM
      ('SEC-MATH', 'Mathematics', 'SEC-STEM', 'Secondary STEM & Innovation'),
      ('SEC-SCI', 'Integrated Science', 'SEC-STEM', 'Secondary STEM & Innovation'),
      ('SEC-PHY', 'Physics', 'SEC-STEM', 'Secondary STEM & Innovation'),
      ('SEC-CHEM', 'Chemistry', 'SEC-STEM', 'Secondary STEM & Innovation'),
      -- Secondary languages & arts
      ('SEC-SECLANG', 'Second Language', 'SEC-LANG', 'Secondary Languages'),
      ('SEC-ARTPE', 'Arts & Physical Education', 'SEC-ART', 'Secondary Arts & Wellness')
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
    RETURNING subject_id INTO current_subject_id;
  END LOOP;

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

    teacher_phone_format :=
      CASE
        WHEN grade BETWEEN 1 AND 3 THEN '+57-300-%04s'
        WHEN grade BETWEEN 4 AND 5 THEN '+57-310-%04s'
        WHEN grade BETWEEN 6 AND 8 THEN '+57-320-%04s'
        ELSE '+57-330-%04s'
      END;

    IF grade BETWEEN 1 AND 5 THEN
      FOR subject_plan IN
        SELECT
          'PRIMARY'::text AS area_code,
          'Primary Curriculum'::text AS area_name,
          plan.subject_code,
          plan.course_title,
          plan.weekly_hours
        FROM (
          VALUES
            (1, 'PRI-LANG', 'Language Arts 1', 5),
            (1, 'PRI-MATH', 'Mathematics 1', 5),
            (1, 'PRI-SCI', 'Science & Nature 1', 3),
            (1, 'PRI-SOC', 'Social Studies 1', 3),
            (1, 'PRI-ARTPE', 'Arts & Physical Education 1', 4),
            (2, 'PRI-LANG', 'Language Arts 2', 5),
            (2, 'PRI-MATH', 'Mathematics 2', 5),
            (2, 'PRI-SCI', 'Science & Nature 2', 3),
            (2, 'PRI-SOC', 'Social Studies 2', 3),
            (2, 'PRI-ARTPE', 'Arts & Physical Education 2', 4),
            (3, 'PRI-LANG', 'Language Arts 3', 5),
            (3, 'PRI-MATH', 'Mathematics 3', 5),
            (3, 'PRI-SCI', 'Science & Nature 3', 4),
            (3, 'PRI-SOC', 'Social Studies 3', 4),
            (3, 'PRI-ARTPE', 'Arts & Physical Education 3', 4),
            (4, 'PRI-LANG', 'Language Arts 4', 5),
            (4, 'PRI-MATH', 'Mathematics 4', 5),
            (4, 'PRI-SCI', 'Science & Nature 4', 4),
            (4, 'PRI-SOC', 'Social Studies 4', 3),
            (4, 'PRI-ARTPE', 'Arts & Physical Education 4', 4),
            (5, 'PRI-LANG', 'Language Arts 5', 5),
            (5, 'PRI-MATH', 'Mathematics 5', 5),
            (5, 'PRI-SCI', 'Science & Nature 5', 4),
            (5, 'PRI-SOC', 'Social Studies 5', 4),
            (5, 'PRI-ARTPE', 'Arts & Physical Education 5', 4)
        ) AS plan(target_grade, subject_code, course_title, weekly_hours)
        WHERE plan.target_grade = grade
        ORDER BY plan.subject_code
      LOOP
        SELECT subject_id, name
        INTO current_subject_id, current_subject_name
        FROM subjects
        WHERE subject_code = subject_plan.subject_code
        LIMIT 1;

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
          current_subject_id,
          grade,
          year_id,
          subject_plan.weekly_hours,
          FORMAT('G%02s-%s', grade, subject_plan.subject_code),
          subject_plan.course_title,
          FORMAT('Seeded for testing (%s)', subject_plan.area_name),
          TRUE
        )
        ON CONFLICT (subject_id, grade_level, school_year_id) DO UPDATE
          SET weekly_hours = EXCLUDED.weekly_hours,
              course_name = EXCLUDED.course_name,
              description = EXCLUDED.description,
              is_active = TRUE
        RETURNING course_instance_id INTO current_course_instance;

        teacher_needed :=
          GREATEST(
            1,
            CEIL((class_group_count * subject_plan.weekly_hours)::numeric / teacher_slot_capacity)
          );
        teacher_ids := ARRAY[]::text[];

        FOR teacher_idx IN 1..teacher_needed LOOP
          teacher_id_var := FORMAT('T-%s-G%02s-%02s', subject_plan.subject_code, grade, teacher_idx);
          teacher_username := LOWER(REPLACE(teacher_id_var, '-', '_'));
          teacher_seed := grade * 1000 + teacher_idx + current_subject_id;
          first_name_idx := ((teacher_seed - 1) % first_names_count) + 1;
          last_name_idx := ((teacher_seed * 3 - 1) % last_names_count) + 1;
          teacher_first_name := teacher_first_names[first_name_idx];
          teacher_last_name := teacher_last_names[last_name_idx];
          INSERT INTO users (national_id, username, password_hash, role, first_name, last_name, email, phone)
          VALUES (
            teacher_id_var,
            teacher_username,
            password_placeholder,
            'teacher',
            teacher_first_name,
            teacher_last_name,
            FORMAT('%s@schoolman.test', teacher_username),
            FORMAT(teacher_phone_format, (grade * 100 + teacher_idx)::text)
          )
          ON CONFLICT (national_id) DO NOTHING;
          teacher_ids := array_append(teacher_ids, teacher_id_var);
        END LOOP;

        FOR class_group_index IN 1..class_group_count LOOP
          teacher_id_var := teacher_ids[((class_group_index - 1) % teacher_needed) + 1];
          INSERT INTO courses (course_instance_id, class_group_id, teacher_id)
          VALUES (current_course_instance, class_group_ids[class_group_index], teacher_id_var)
          ON CONFLICT (course_instance_id, class_group_id, teacher_id) DO NOTHING;
        END LOOP;
      END LOOP;
    ELSE
      FOR subject_plan IN
        SELECT
          plan.area_code,
          plan.area_name,
          plan.subject_code,
          plan.course_title,
          plan.weekly_hours
        FROM (
          VALUES
            -- Grade 6
            (6, 'SEC-HUM', 'Secondary Humanities & Civic Studies', 'SEC-LANGLIT', 'Language & Literature 6', 5),
            (6, 'SEC-STEM', 'Secondary STEM & Innovation', 'SEC-MATH', 'Mathematics 6', 5),
            (6, 'SEC-STEM', 'Secondary STEM & Innovation', 'SEC-SCI', 'Integrated Science 6', 4),
            (6, 'SEC-HUM', 'Secondary Humanities & Civic Studies', 'SEC-HIST', 'History & Geography 6', 4),
            (6, 'SEC-LANG', 'Secondary Languages', 'SEC-SECLANG', 'Second Language 6', 3),
            (6, 'SEC-ART', 'Secondary Arts & Wellness', 'SEC-ARTPE', 'Arts & Physical Education 6', 3),
            -- Grade 7
            (7, 'SEC-HUM', 'Secondary Humanities & Civic Studies', 'SEC-LANGLIT', 'Language & Literature 7', 5),
            (7, 'SEC-STEM', 'Secondary STEM & Innovation', 'SEC-MATH', 'Mathematics 7', 5),
            (7, 'SEC-STEM', 'Secondary STEM & Innovation', 'SEC-SCI', 'Integrated Science 7', 4),
            (7, 'SEC-HUM', 'Secondary Humanities & Civic Studies', 'SEC-HIST', 'History & Geography 7', 4),
            (7, 'SEC-LANG', 'Secondary Languages', 'SEC-SECLANG', 'Second Language 7', 4),
            (7, 'SEC-ART', 'Secondary Arts & Wellness', 'SEC-ARTPE', 'Arts & Physical Education 7', 3),
            -- Grade 8
            (8, 'SEC-HUM', 'Secondary Humanities & Civic Studies', 'SEC-LANGLIT', 'Language & Literature 8', 5),
            (8, 'SEC-STEM', 'Secondary STEM & Innovation', 'SEC-MATH', 'Mathematics 8', 5),
            (8, 'SEC-STEM', 'Secondary STEM & Innovation', 'SEC-SCI', 'Integrated Science 8', 5),
            (8, 'SEC-HUM', 'Secondary Humanities & Civic Studies', 'SEC-HIST', 'History & Geography 8', 4),
            (8, 'SEC-LANG', 'Secondary Languages', 'SEC-SECLANG', 'Second Language 8', 4),
            (8, 'SEC-ART', 'Secondary Arts & Wellness', 'SEC-ARTPE', 'Arts & Physical Education 8', 3),
            -- Grade 9
            (9, 'SEC-HUM', 'Secondary Humanities & Civic Studies', 'SEC-LANGLIT', 'Language & Literature 9', 5),
            (9, 'SEC-STEM', 'Secondary STEM & Innovation', 'SEC-MATH', 'Mathematics 9', 5),
            (9, 'SEC-STEM', 'Secondary STEM & Innovation', 'SEC-SCI', 'Integrated Science 9', 5),
            (9, 'SEC-HUM', 'Secondary Humanities & Civic Studies', 'SEC-HIST', 'History & Geography 9', 4),
            (9, 'SEC-LANG', 'Secondary Languages', 'SEC-SECLANG', 'Second Language 9', 4),
            (9, 'SEC-ART', 'Secondary Arts & Wellness', 'SEC-ARTPE', 'Arts & Physical Education 9', 4),
            -- Grade 10
            (10, 'SEC-HUM', 'Secondary Humanities & Civic Studies', 'SEC-LANGLIT', 'World Literature 10', 5),
            (10, 'SEC-STEM', 'Secondary STEM & Innovation', 'SEC-MATH', 'Advanced Mathematics 10', 6),
            (10, 'SEC-STEM', 'Secondary STEM & Innovation', 'SEC-PHY', 'Physics 10', 5),
            (10, 'SEC-STEM', 'Secondary STEM & Innovation', 'SEC-CHEM', 'Chemistry 10', 5),
            (10, 'SEC-LANG', 'Secondary Languages', 'SEC-SECLANG', 'Second Language 10', 4),
            (10, 'SEC-HUM', 'Secondary Humanities & Civic Studies', 'SEC-CIVICS', 'Civics & Economics 10', 4),
            -- Grade 11
            (11, 'SEC-HUM', 'Secondary Humanities & Civic Studies', 'SEC-LANGLIT', 'World Literature 11', 5),
            (11, 'SEC-STEM', 'Secondary STEM & Innovation', 'SEC-MATH', 'Advanced Mathematics 11', 6),
            (11, 'SEC-STEM', 'Secondary STEM & Innovation', 'SEC-PHY', 'Physics 11', 5),
            (11, 'SEC-STEM', 'Secondary STEM & Innovation', 'SEC-CHEM', 'Chemistry 11', 5),
            (11, 'SEC-LANG', 'Secondary Languages', 'SEC-SECLANG', 'Second Language 11', 5),
            (11, 'SEC-HUM', 'Secondary Humanities & Civic Studies', 'SEC-CIVICS', 'Civics & Economics 11', 4)
        ) AS plan(target_grade, area_code, area_name, subject_code, course_title, weekly_hours)
        WHERE plan.target_grade = grade
        ORDER BY plan.area_code, plan.subject_code
      LOOP
        SELECT subject_id, name
        INTO current_subject_id, current_subject_name
        FROM subjects
        WHERE subject_code = subject_plan.subject_code
        LIMIT 1;

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
          current_subject_id,
          grade,
          year_id,
          subject_plan.weekly_hours,
          FORMAT('G%02s-%s', grade, subject_plan.subject_code),
          subject_plan.course_title,
          FORMAT('Seeded for testing (%s)', subject_plan.area_name),
          TRUE
        )
        ON CONFLICT (subject_id, grade_level, school_year_id) DO UPDATE
          SET weekly_hours = EXCLUDED.weekly_hours,
              course_name = EXCLUDED.course_name,
              description = EXCLUDED.description,
              is_active = TRUE
        RETURNING course_instance_id INTO current_course_instance;

        teacher_needed :=
          GREATEST(
            1,
            CEIL((class_group_count * subject_plan.weekly_hours)::numeric / teacher_slot_capacity)
          );
        teacher_ids := ARRAY[]::text[];

        FOR teacher_idx IN 1..teacher_needed LOOP
          teacher_id_var := FORMAT('T-%s-G%02s-%02s', subject_plan.subject_code, grade, teacher_idx);
          teacher_username := LOWER(REPLACE(teacher_id_var, '-', '_'));
          teacher_seed := grade * 1000 + teacher_idx + current_subject_id;
          first_name_idx := ((teacher_seed - 1) % first_names_count) + 1;
          last_name_idx := ((teacher_seed * 3 - 1) % last_names_count) + 1;
          teacher_first_name := teacher_first_names[first_name_idx];
          teacher_last_name := teacher_last_names[last_name_idx];
          INSERT INTO users (national_id, username, password_hash, role, first_name, last_name, email, phone)
          VALUES (
            teacher_id_var,
            teacher_username,
            password_placeholder,
            'teacher',
            teacher_first_name,
            teacher_last_name,
            FORMAT('%s@schoolman.test', teacher_username),
            FORMAT(teacher_phone_format, (grade * 100 + teacher_idx)::text)
          )
          ON CONFLICT (national_id) DO NOTHING;
          teacher_ids := array_append(teacher_ids, teacher_id_var);
        END LOOP;

        FOR class_group_index IN 1..class_group_count LOOP
          teacher_id_var := teacher_ids[((class_group_index - 1) % teacher_needed) + 1];
          INSERT INTO courses (course_instance_id, class_group_id, teacher_id)
          VALUES (current_course_instance, class_group_ids[class_group_index], teacher_id_var)
          ON CONFLICT (course_instance_id, class_group_id, teacher_id) DO NOTHING;
        END LOOP;
      END LOOP;
    END IF;
  END LOOP;
END $$;
