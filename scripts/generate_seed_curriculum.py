import json
import math
import re
import unicodedata
from pathlib import Path

SCHOOL_YEAR = "TEST-2026"
TEACHER_WEEKLY_CAP = 18
PASSWORD_HASH = "$2b$10$rAd8VdgZ5muGm.nwCD9sJeEuy7yHCtC6X/Up2oKCtvJ5.y0FXbD5q"

AREA_CODES = {
    "Ciencias Naturales y Educación Ambiental": "CIENCIAS_NATURALES",
    "Ciencias Sociales": "CIENCIAS_SOCIALES",
    "Educación Artística": "EDUCACION_ARTISTICA",
    "Educación Ética y en Valores Humanos": "EDUCACION_ETICA_VALORES",
    "Educación Física, Recreación y Deportes": "EDUCACION_FISICA",
    "Educación Religiosa": "EDUCACION_RELIGIOSA",
    "Humanidades, Lengua Castellana e Idiomas Extranjeros": "HUMANIDADES_IDIOMAS",
    "Matemáticas": "MATEMATICAS",
    "Tecnología e Informática": "TECNOLOGIA_INFORMATICA",
    "specialization001": "SPECIALIZATION001",
    "specialization002": "SPECIALIZATION002",
    "specialization004": "SPECIALIZATION004",
}

SUBJECT_AREA = {
    "Artes": "Educación Artística",
    "Música": "Educación Artística",
    "Ed Física": "Educación Física, Recreación y Deportes",
    "Cul. Deportiva": "specialization001",
    "Cul. Recreativa": "specialization001",
    "Cul Recreativa Pre": "specialization001",
    "Prác Deportiva": "specialization001",
    "Ed Religiosa": "Educación Religiosa",
    "Español": "Humanidades, Lengua Castellana e Idiomas Extranjeros",
    "Inglés": "Humanidades, Lengua Castellana e Idiomas Extranjeros",
    "Lec Comp": "Humanidades, Lengua Castellana e Idiomas Extranjeros",
    "Lec. Crítica": "Humanidades, Lengua Castellana e Idiomas Extranjeros",
    "Etica": "Educación Ética y en Valores Humanos",
    "Ética": "Educación Ética y en Valores Humanos",
    "Filosofía": "Educación Ética y en Valores Humanos",
    "Dllo Humano": "specialization001",
    "Fun. Pedagógica": "specialization001",
    "Metodología": "Educación Ética y en Valores Humanos",
    "Sociales": "Ciencias Sociales",
    "Emprend.": "Ciencias Sociales",
    "Economía": "Ciencias Sociales",
    "Ciencias Políticas": "Ciencias Sociales",
    "Legislación": "specialization004",
    "Publicidad y": "specialization004",
    "SyGestión": "specialization001",
    "Naturales": "Ciencias Naturales y Educación Ambiental",
    "Física": "Ciencias Naturales y Educación Ambiental",
    "Química": "Ciencias Naturales y Educación Ambiental",
    "Matemáticas": "Matemáticas",
    "Geometría": "Matemáticas",
    "Estadística": "Matemáticas",
    "MaT. Financiera": "specialization004",
    "Contabilidad": "specialization004",
    "Paquete Contable": "Matemáticas",
    "Tecnología": "Tecnología e Informática",
    "Informática": "Tecnología e Informática",
    "Program.": "specialization002",
    "Microcontroladores": "specialization002",
    "Procesos": "specialization002",
    "Diseño Industrial": "specialization002",
    "Electrónica": "specialization002",
    "PLC": "specialization002",
    "Control Analógico": "Tecnología e Informática",
    "Neumática": "Tecnología e Informática",
    "SENA": "Tecnología e Informática",
}

CLASS_GROUPS = {
    6: ["01", "02", "03", "04", "05", "06", "07"],
    7: ["01", "02", "03", "04", "05", "06"],
    8: ["01", "02", "03", "04", "05"],
    9: ["01", "02", "03", "04"],
    10: ["01", "02", "03", "04"],
    11: ["01", "02", "03", "04"],
}

ADJUSTMENTS_6_9 = {
    "6": {"Artes": -1, "Ed Física": -1, "Ed Religiosa": -1, "Etica": -1, "Música": -1},
    "7": {"Español": 1},
    "9": {"Ed Física": 0.5, "Emprend.": 0.5, "Español": 1, "Inglés": 0.5, "Matemáticas": 1, "Naturales": 1},
}

SKIP_SUBJECTS = set()


def slugify(value: str) -> str:
    value = unicodedata.normalize("NFKD", value)
    value = value.encode("ascii", "ignore").decode("ascii")
    value = re.sub(r"[^A-Za-z0-9]+", "_", value)
    value = re.sub(r"_+", "_", value).strip("_")
    return value.upper()


def sql_str(value: str) -> str:
    return "'" + value.replace("'", "''") + "'"


def format_num(value: float) -> str:
    if abs(value - int(value)) < 1e-9:
        return str(int(value))
    return str(value)


def main() -> None:
    data = json.load(open("Curriculum_Names/CurriculumTemp.json"))
    curriculum = data["curriculum"]

    grades_6_9 = {}
    for grade, payload in curriculum["grades_6_to_9"].items():
        subjects = {k: v["lessons_per_week"] for k, v in payload["subjects"].items()}
        adjustments = ADJUSTMENTS_6_9.get(grade, {})
        for subj, delta in adjustments.items():
            if subj in subjects:
                subjects[subj] = subjects[subj] + delta
        grades_6_9[int(grade)] = subjects

    # validate totals for 6-9
    totals = {}
    for grade, subjects in grades_6_9.items():
        total = sum(subjects.values())
        totals[grade] = total
        if abs(total - 30.0) > 1e-6:
            raise SystemExit(f"Grade {grade} total {total} != 30")

    # Build course data for grades 10/11
    grades_10_11 = {10: {}, 11: {}}
    pair_map = curriculum["grades_10_11_shared_by_pair"]
    for pair, info in pair_map.items():
        course10, course11 = pair.split("-")
        for subject, values in info.get("shared", {}).items():
            if values.get("10", 0) > 0:
                grades_10_11[10].setdefault(course10, {})[subject] = values["10"]
            if values.get("11", 0) > 0:
                grades_10_11[11].setdefault(course11, {})[subject] = values["11"]
        for subject, values in info.get("exclusive_10", {}).items():
            if values.get("10", 0) > 0:
                grades_10_11[10].setdefault(course10, {})[subject] = values["10"]
        for subject, values in info.get("exclusive_11", {}).items():
            if values.get("11", 0) > 0:
                grades_10_11[11].setdefault(course11, {})[subject] = values["11"]

    # Collect subject definitions
    subjects = {}

    def add_subject(subject_name: str, subject_code: str) -> None:
        area = SUBJECT_AREA.get(subject_name)
        if not area:
            raise SystemExit(f"Missing area mapping for subject: {subject_name}")
        subjects[subject_code] = {"name": subject_name, "area": area}

    # grade 6-9 subjects
    for grade, subject_map in grades_6_9.items():
        for subject_name, hours in subject_map.items():
            if subject_name in SKIP_SUBJECTS:
                continue
            if hours <= 0:
                continue
            subject_code = slugify(subject_name)
            add_subject(subject_name, subject_code)

    # grade 10/11 subjects
    for grade, courses in grades_10_11.items():
        for course_code, subject_map in courses.items():
            for subject_name, hours in subject_map.items():
                if subject_name in SKIP_SUBJECTS:
                    continue
                if hours <= 0:
                    continue
                subject_code = f"{slugify(subject_name)}_{course_code}"
                add_subject(subject_name, subject_code)

    # course_instances
    course_instances = []
    for grade, subject_map in grades_6_9.items():
        for subject_name, hours in subject_map.items():
            if subject_name in SKIP_SUBJECTS or hours <= 0:
                continue
            subject_code = slugify(subject_name)
            course_instances.append(
                {
                    "subject_code": subject_code,
                    "grade": grade,
                    "weekly_hours": hours,
                    "course_code": f"G{grade}_{subject_code}",
                    "course_name": f"Grade {grade} {subject_name}",
                    "subject_name": subject_name,
                }
            )

    for grade, courses in grades_10_11.items():
        for course_code, subject_map in courses.items():
            for subject_name, hours in subject_map.items():
                if subject_name in SKIP_SUBJECTS or hours <= 0:
                    continue
                subject_code = f"{slugify(subject_name)}_{course_code}"
                course_instances.append(
                    {
                        "subject_code": subject_code,
                        "grade": grade,
                        "weekly_hours": hours,
                        "course_code": f"G{grade}_{subject_code}",
                        "course_name": f"Grade {grade} {subject_name} {course_code}",
                        "subject_name": subject_name,
                    }
                )

    # teacher pools by grade + subject name
    teacher_pools = {}
    teacher_users = []
    teacher_idx = 1

    def get_section_for_course(course_code: str) -> str:
        return course_code[-2:]

    # Build subject usage per grade
    subject_usage = {}
    for grade, subject_map in grades_6_9.items():
        for subject_name, hours in subject_map.items():
            if subject_name in SKIP_SUBJECTS or hours <= 0:
                continue
            total = hours * len(CLASS_GROUPS[grade])
            subject_usage.setdefault((grade, subject_name), 0)
            subject_usage[(grade, subject_name)] += total

    for grade, courses in grades_10_11.items():
        for course_code, subject_map in courses.items():
            for subject_name, hours in subject_map.items():
                if subject_name in SKIP_SUBJECTS or hours <= 0:
                    continue
                subject_usage.setdefault((grade, subject_name), 0)
                subject_usage[(grade, subject_name)] += hours

    for (grade, subject_name), total_hours in sorted(subject_usage.items()):
        if total_hours <= 0:
            continue
        required = max(1, math.ceil(total_hours / TEACHER_WEEKLY_CAP))
        teachers = []
        slug = slugify(subject_name)
        for i in range(required):
            teacher_id = f"T-G{grade:02d}-{slug}-{i+1:02d}"
            teachers.append(teacher_id)
            username = f"t_g{grade}_{slug.lower()}_{i+1:02d}"
            first_name = f"Grade{grade}"
            last_name = f"{subject_name} {i+1:02d}"
            email = f"{username}@schoolman.test"
            teacher_users.append(
                {
                    "national_id": teacher_id,
                    "username": username,
                    "password_hash": PASSWORD_HASH,
                    "role": "teacher",
                    "first_name": first_name,
                    "last_name": last_name,
                    "email": email,
                    "phone": None,
                }
            )
        teacher_pools[(grade, subject_name)] = teachers

    # Assign courses
    pool_counters = {k: 0 for k in teacher_pools}
    courses = []

    # grade 6-9: same curriculum for all sections
    for grade, subject_map in grades_6_9.items():
        for section in CLASS_GROUPS[grade]:
            for subject_name, hours in subject_map.items():
                if subject_name in SKIP_SUBJECTS or hours <= 0:
                    continue
                subject_code = slugify(subject_name)
                course_code = f"G{grade}_{subject_code}"
                pool_key = (grade, subject_name)
                teachers = teacher_pools[pool_key]
                idx = pool_counters[pool_key]
                teacher_id = teachers[idx % len(teachers)]
                pool_counters[pool_key] = idx + 1
                courses.append(
                    {
                        "course_code": course_code,
                        "grade": grade,
                        "section": section,
                        "teacher_id": teacher_id,
                    }
                )

    # grade 10/11: per course code
    for grade, courses_map in grades_10_11.items():
        for course_code, subject_map in courses_map.items():
            section = get_section_for_course(course_code)
            for subject_name, hours in subject_map.items():
                if subject_name in SKIP_SUBJECTS or hours <= 0:
                    continue
                subject_code = f"{slugify(subject_name)}_{course_code}"
                course_code_full = f"G{grade}_{subject_code}"
                pool_key = (grade, subject_name)
                teachers = teacher_pools[pool_key]
                idx = pool_counters[pool_key]
                teacher_id = teachers[idx % len(teachers)]
                pool_counters[pool_key] = idx + 1
                courses.append(
                    {
                        "course_code": course_code_full,
                        "grade": grade,
                        "section": section,
                        "teacher_id": teacher_id,
                    }
                )

    # Begin SQL
    lines = []
    lines.append("-- Auto-generated seed from Curriculum_Names/CurriculumTemp.json")
    lines.append(f"-- School year: {SCHOOL_YEAR}")
    lines.append("-- Grades 6-9 normalized to 30 hours/week")
    for grade, total in sorted(totals.items()):
        lines.append(f"-- Grade {grade} total hours: {format_num(total)}")
    lines.append(f"-- Teacher weekly cap used for minimum staffing: {TEACHER_WEEKLY_CAP}")
    lines.append("BEGIN;\n")

    # school_year
    lines.append(
        "INSERT INTO school_years (name, year_start, year_end, is_active) VALUES "
        f"({sql_str(SCHOOL_YEAR)}, DATE '2026-01-01', DATE '2026-12-31', TRUE) "
        "ON CONFLICT (name) DO UPDATE SET year_start = EXCLUDED.year_start, year_end = EXCLUDED.year_end, is_active = EXCLUDED.is_active;\n"
    )

    # subject_areas
    area_values = ",\n  ".join(
        f"({sql_str(name)}, {sql_str(code)})"
        for name, code in AREA_CODES.items()
    )
    lines.append("INSERT INTO subject_areas (name, code) VALUES\n  " + area_values + "\nON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name;\n")

    # subjects
    subject_rows = []
    for subject_code, info in sorted(subjects.items()):
        area_code = AREA_CODES[info["area"]]
        subject_rows.append(
            f"((SELECT area_id FROM subject_areas WHERE code = {sql_str(area_code)}), {sql_str(subject_code)}, {sql_str(info['name'])})"
        )
    lines.append(
        "INSERT INTO subjects (area_id, subject_code, name) VALUES\n  "
        + ",\n  ".join(subject_rows)
        + "\nON CONFLICT (subject_code) DO UPDATE SET name = EXCLUDED.name, area_id = EXCLUDED.area_id;\n"
    )

    # class_groups
    class_rows = []
    for grade in sorted(CLASS_GROUPS.keys()):
        for section in CLASS_GROUPS[grade]:
            class_rows.append(
                f"((SELECT school_year_id FROM school_years WHERE name = {sql_str(SCHOOL_YEAR)}), {grade}, {sql_str(section)}, NULL)"
            )
    lines.append(
        "INSERT INTO class_groups (school_year_id, grade_level, section, classroom_id) VALUES\n  "
        + ",\n  ".join(class_rows)
        + "\nON CONFLICT (school_year_id, grade_level, section) DO NOTHING;\n"
    )

    # users (teachers)
    user_rows = []
    for user in teacher_users:
        user_rows.append(
            "(" + ", ".join(
                [
                    sql_str(user["national_id"]),
                    sql_str(user["username"]),
                    sql_str(user["password_hash"]),
                    sql_str(user["role"]),
                    sql_str(user["first_name"]),
                    sql_str(user["last_name"]),
                    sql_str(user["email"]),
                    "NULL" if user["phone"] is None else sql_str(user["phone"]),
                ]
            ) + ")"
        )
    lines.append(
        "INSERT INTO users (national_id, username, password_hash, role, first_name, last_name, email, phone) VALUES\n  "
        + ",\n  ".join(user_rows)
        + "\nON CONFLICT (national_id) DO UPDATE SET username = EXCLUDED.username, password_hash = EXCLUDED.password_hash, role = EXCLUDED.role, first_name = EXCLUDED.first_name, last_name = EXCLUDED.last_name, email = EXCLUDED.email, phone = EXCLUDED.phone;\n"
    )

    # course_instances
    instance_rows = []
    for instance in sorted(course_instances, key=lambda x: (x["grade"], x["course_code"])):
        instance_rows.append(
            f"((SELECT subject_id FROM subjects WHERE subject_code = {sql_str(instance['subject_code'])}), {instance['grade']}, (SELECT school_year_id FROM school_years WHERE name = {sql_str(SCHOOL_YEAR)}), {format_num(instance['weekly_hours'])}, {sql_str(instance['course_code'])}, {sql_str(instance['course_name'])}, NULL, TRUE)"
        )
    lines.append(
        "INSERT INTO course_instances (subject_id, grade_level, school_year_id, weekly_hours, course_code, course_name, description, is_active) VALUES\n  "
        + ",\n  ".join(instance_rows)
        + "\nON CONFLICT (subject_id, grade_level, school_year_id) DO UPDATE SET weekly_hours = EXCLUDED.weekly_hours, course_code = EXCLUDED.course_code, course_name = EXCLUDED.course_name, is_active = EXCLUDED.is_active;\n"
    )

    # courses
    course_rows = []
    for course in courses:
        course_rows.append(
            f"((SELECT course_instance_id FROM course_instances WHERE school_year_id = (SELECT school_year_id FROM school_years WHERE name = {sql_str(SCHOOL_YEAR)}) AND grade_level = {course['grade']} AND course_code = {sql_str(course['course_code'])}), (SELECT class_group_id FROM class_groups WHERE school_year_id = (SELECT school_year_id FROM school_years WHERE name = {sql_str(SCHOOL_YEAR)}) AND grade_level = {course['grade']} AND section = {sql_str(course['section'])}), {sql_str(course['teacher_id'])})"
        )
    lines.append(
        "INSERT INTO courses (course_instance_id, class_group_id, teacher_id) VALUES\n  "
        + ",\n  ".join(course_rows)
        + "\nON CONFLICT (course_instance_id, class_group_id, teacher_id) DO NOTHING;\n"
    )

    lines.append("END;\n")

    Path("db/seed-curriculum-test.sql").write_text("\n".join(lines), encoding="utf-8")


if __name__ == "__main__":
    main()
