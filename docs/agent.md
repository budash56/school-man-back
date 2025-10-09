
---

# docs/agent.md
```md
# SchoolMg Agent — v1 (Product & Build Playbook)

> Purpose: be the **single source of truth** for the domain, invariants, flows, and API design so AI codegen (Codex/Copilot) can produce consistent, safe code and migrations.

## 0) Scope (v1)
- Single-school (Colombia), grades **1–11**
- Academic year with **4 terms (P1–P4) + Final** (Final is **manual entry**)
- Grading: **S/A/B/J** (J = fail)
- Attendance: per-course-per-slot; statuses **P / A / AE**
- Behavior: **green / yellow / red / last_notice** (description only in v1)
- Roles: **admin, coordinator, registrar, teacher** (login: national_id + password)
- Reports: “grades by academic year” (no fancy formatting v1)

## 1) Non-negotiable invariants (DB + Backend)
- **I1**: One **active** enrollment per `(student_id, school_year_id)`
- **I2**: `course_instance.grade_level == class_group.grade_level`
- **I3**: Grades allowed only if student is actively **enrolled** in that course’s class group & year
- **I4**: Timetable: no double-booking for `(teacher, slot)` nor `(class_group, slot)`
- **I5**: Rooms not double-booked (consider slot overrides vs class group default)
- **I6**: Attendance: `(student, date, slot)` unique; date’s weekday equals slot’s weekday
- **I7**: Class-group code unique per year: `(school_year_id, grade_level || section)`; `section` matches `^[0-9]{2}$`
- **I8**: Guardian phone is **required**
- **Policy v1**: Only the recording teacher may change `A` → `AE`

> DB guardrails exist (constraints/triggers); backend must validate for UX and clearer errors.

## 2) Entities (essentials)
- `school_years` (name, start/end, active)
- `terms` (P1–P4, Final), dates must lie within the school year
- `subject_areas` → `subjects`
- `course_instances` (subject × grade × year)  
  **Unique**: (subject_id, grade_level, school_year_id) and (course_code, school_year_id)
- `class_groups` (school_year, grade_level, section, default classroom)  
  **Unique**: (school_year_id, grade_level, section), section `^[0-9]{2}$`
- `courses` (course_instance ↔ class_group ↔ teacher)  
  **Unique**: (course_instance_id, class_group_id, teacher_id)
- `timetable_slots` (day_of_week, start_time, end_time)  
  **Unique**: (day_of_week, start_time, end_time)
- `timetable_assignments` (course_id ↔ slot_id, optional classroom override)
- `students` (national_id, guardian_* required)
- `enrollments` (student → class_group per year; one active)
- `grades` (student, course, term, SABJ)
- `attendance` (student, course, date, slot, status, recorded_by)
- `disciplinary_records` (student, category, description)

## 3) API (REST, `/api/v1`)
**Core resources (v1):**
- `/school-years`, `/terms`
- `/subject-areas`, `/subjects`, `/course-instances`
- `/class-groups`, `/courses`, `/timetable-slots`, `/timetable-assignments`
- `/students`, `/enrollments`
- `/grades`, `/attendance`
- `/discipline`, `/notifications`
- `/auth/login`

**Conventions**
- Pagination: `{ data, total, page, pageSize }`
- Filters via query (`?schoolYear=2025&grade=5&section=01`)
- Consistent errors: 400/401/403/404/409

## 4) Acceptance criteria (selected flows)

### F1. Create school year & terms
- Validates term dates within year; P1–P4 + Final present
- `201 Created` and retrievable via list

### F2. Create class groups (5-01, 5-02)
- Section `^[0-9]{2}$`, unique `(year, grade, section)`
- Default classroom assigned

### F3. Map subjects → course instances (grade 5, 2025)
- Unique `(subject, grade, year)`; names/codes generated

### F4. Create courses (bind each group & teacher)
- Grade compatibility check (I2)
- Teacher exists and has role `teacher`

### F5. Timetable
- Create slots with composite unique (day, start, end)
- Assign courses to slots; reject double-bookings (I4) and room conflicts (I5)

### F6. Enrollment
- One active enrollment per `(student, year)` (I1); soft-delete allowed later
- Capacity warning vs classroom capacity

### F7. Grades
- Only for enrolled students (I3)
- SABJ values only; uniqueness `(student, course, term)`

### F8. Attendance
- Unique `(student, date, slot)` (I6)
- Weekday matches slot’s weekday
- A→AE only by `recorded_by` (policy v1)

### F9. Reports
- “Grades by academic year” per student: subjects, P1–P4, Final

## 5) TypeORM rules (to steer codegen)
- **No auto-sync**: `synchronize: false`, `migrationsRun: true`
- **SnakeNamingStrategy** (entities ↔ DB)
- **Composite uniques only** (never single-column when domain says otherwise)
- **Entity examples**:

```ts
// TimetableSlot
@Entity('timetable_slots')
@Unique('uniq_timetable_slot', ['dayOfWeek', 'startTime', 'endTime'])
@Check('chk_slot_time', '"start_time" < "end_time"')
export class TimetableSlot {
  @PrimaryGeneratedColumn({ name: 'slot_id' }) slotId: number;
  @Column({ type: 'smallint', name: 'day_of_week' }) dayOfWeek: number; // 1..7
  @Column({ type: 'time', name: 'start_time' }) startTime: string;
  @Column({ type: 'time', name: 'end_time' }) endTime: string;
}
