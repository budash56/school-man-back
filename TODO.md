# TODO

**Docentes**
- Add optional teacher skill constraints (teacher → allowed subjects) and enforce only when skills exist.
- Add admin endpoints to manage teacher skills.
- Update timetable generator to prefer/require teachers whose skills match subject.
- Define teacher area qualifications with primary + secondary areas.
- Capture teacher grade-band preferences for scheduling suggestions.
- Add self-service professor registration flow with profile completion.

**Matrículas y Promoción**
- Allow enrollment by grade without section and assign sections at enrollment close.
- Auto-create sections based on capacity and available classrooms.
- Add method to distribute/assign students to sections by criteria (capacity, balance, performance, special needs).
- Add optional student gender field to support balanced section distribution.
- Apply academic criteria for promotion.

**Currículo**
- Curriculum import pipeline (CSV, TXT, XLSX, PDF text, OCR) with preview + validation.
- Link professors (teachers) to course instances during curriculum creation.


**Aulas y Edificios**
- Add buildings and classroom templates (name + capacity) to seed/validate classrooms.
- Provide building dropdowns in classroom creation/filtering.
- Keep capacity defaults per building where applicable.
- Support future class-group assignment to buildings without enforcing it yet.

**Creación Masiva de Usuarios**
- ~~Phase 1: bulk import teachers from CSV/XLSX (national_id, first_name, last_name, email) with temp passwords.~~
- ~~Phase 2: send emails with temp credentials to all imported users.~~
- Phase 3: first-login flow to force password change and capture teacher skill tree.
- ~~Phase 3a: force password change on first login.~~
- Phase 3b: capture teacher skill tree (subjects/grade bands/preferences).
- ~~Phase 2.1: configurable email system (SMTP/SendGrid) with templates and delivery logs.~~
- ~~Phase 2.2: bulk notifications to selected professors or all (events, announcements).~~
- Email queue: store outgoing messages if offline, send when internet returns.
- Health checks: add an “Email Status” indicator on the dashboard.
- Optional fallback: when offline, log “email not sent” in UI.

**Calendario**
- Add admin calendar for future events visible to all professors.
- Add personal calendar for professors (e.g., exams per grade/section).
- Event model: title, description, start/end, visibility (global/personal), audience (roles, grades, groups).

**Infra / Despliegue**
- Move intranet access from `localhost:8080` to a stable LAN hostname such as `schoolman`, `schoolman.lan`, or `schoolman.local`.
- Expose the frontend on port `80` so users can access a clean URL like `http://schoolman`.
- Decide the LAN name-resolution strategy: router/local DNS first, `hosts` fallback only if necessary.

**Backend Cleanup**
- Implement real "break at B" slot handling in timetable generator. `src/timetable_generator/timetable-generator.service.spec.ts:353`
- Balance class group sections by gender once student gender exists. `src/class_groups/class_groups.service.ts:283`
- Finish PDF layer for certificates endpoint. `docs/backend-overview.md:139`

**Frontend Cleanup**
- Handle pagination when timetable assignments exceed 100. `src/api/timetableAssignmentsApi.ts:12`
- Support multiple patterns/breaks per day in timetable generator. `src/features/timetable/TimetableGeneratorPage.tsx:635`
- Support multiple breaks and patterns per day in timetable generator. `src/features/timetable/TimetableGeneratorPage.tsx:888`
- Hide school year reset button when a year is active; re-enable when inactive. `src/features/schoolYears/SchoolYearsStaticPage.tsx:129`
- Wire awards endpoint in discipline view. `src/features/discipline/DisciplinePage.tsx:320`
- Add disciplinary record form (create). `src/features/discipline/DisciplinePage.tsx:328`
- Add disciplinary record form (edit). `src/features/discipline/DisciplinePage.tsx:336`
