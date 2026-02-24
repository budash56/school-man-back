# TODO

- Add optional teacher skill constraints (teacher → allowed subjects). Enforce only when a teacher has declared skills; otherwise keep current open assignment behavior.
  - Proposed: new table `teacher_subjects` (teacher_id, subject_id), update course assignment validation to respect it.
  - Add admin endpoints to manage teacher skills.
  - Update timetable generator to prefer/require teachers whose skills match subject.
- When registering students, accept grade level input (not class group) and resolve to class group in the backend.
- Based on curriculum, fix weekly hours for grades 1-5 and 6-9. Grades 10-11 remain specialization-specific.
- Implement curriculum import pipeline supporting CSV, TXT, Excel (XLSX), PDF (text-based), and OCR for scanned PDFs/images. Include preview + validation step before persistence.
- Curriculum: separate per grade and expose curriculum details; include creation flow that links professors (teachers) to course instances.
- Define teacher area qualifications with a primary area and secondary areas (e.g., `teacher_areas` with `is_primary`).
  - Allow teachers to belong to multiple areas; only one marked primary.
  - Use these qualifications for filtering/assignment decisions (not necessarily hard enforcement).
- Capture teacher grade-band preferences (e.g., lower, middle, upper) to guide scheduling and assignments.
  - Store as optional preferences and use for suggestions rather than strict rules.
- Add a self-service professor registration flow:
  - Pre-register national IDs in the system (minimal user record).
  - On first login, if profile fields are missing, prompt a completion form (name, contact, areas/skills, primary area).
  - Admin can later review/approve and update qualifications.
