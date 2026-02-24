-- Create one classroom per class group for TEST-2026 and link it
DO $$
DECLARE
  year_id bigint;
  cg RECORD;
  new_classroom_id bigint;
  room_name text;
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
    ORDER BY grade_level, section
  LOOP
    room_name := FORMAT('Room %s%s', cg.grade_level, cg.section);

    INSERT INTO classrooms (name, building, capacity)
    VALUES (room_name, 'Main Building', 30)
    ON CONFLICT (name) DO UPDATE
      SET building = EXCLUDED.building,
          capacity = EXCLUDED.capacity
    RETURNING classroom_id INTO new_classroom_id;

    IF new_classroom_id IS NULL THEN
      SELECT c.classroom_id INTO new_classroom_id
      FROM classrooms c
      WHERE c.name = room_name;
    END IF;

    UPDATE class_groups
    SET classroom_id = new_classroom_id
    WHERE class_group_id = cg.class_group_id;
  END LOOP;
END $$;
