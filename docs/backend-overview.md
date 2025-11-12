# SchoolMan Backend — Project Documentation

This document captures the current behaviour of the School Managament project backend codebase (`school-man-back`) as of the latest update.

## At a Glance
- **Stack:** [NestJS 11](https://docs.nestjs.com/) + TypeScript, [TypeORM](https://typeorm.io/) (PostgreSQL driver), [Jest](https://jestjs.io/) for tests, [Swagger](https://docs.nestjs.com/openapi/introduction) for API docs.
- **Entry point:** `src/main.ts` bootstraps `AppModule` with global validation (`ValidationPipe`), config-driven server URL injection, RBAC guards, and Swagger UI at `/api/docs`.
- **Configuration:** `ConfigModule` + `src/config/configuration.ts` expose typed `app`, `database`, and `jwt` settings (port, API base URL, `OPENAPI_EXPORT`, DSN, SSL, expiry). `buildDataSourceOptions` centralizes TypeORM defaults.
- **Domain scope:** Single-school administration for Colombian K–11. Beyond CRUD it now covers dashboards, printable certificates, audit logs, behaviour tracking, teacher workload insights, and grade-scheme catalogs in addition to school years, enrollments, attendance, grades, notifications, and timetable coordination.
- **Security:** JWT bearer authentication with role-based access control. Roles: `admin`, `coordinator`, `registrar`, `teacher`. Two global guards (`JwtAuthGuard`, `RolesGuard`) enforce authentication/authorization.
- **Persistence & tooling:** PostgreSQL via environment-configured connection, `SnakeNamingStrategy`, `migrationsRun: true`, and a `scripts/export-openapi.ts` helper that stubs TypeORM when `OPENAPI_EXPORT=1` to export Swagger without a live DB.

## Repository Layout

| Path | Description |
| ---- | ----------- |
| `src/main.ts` | Nest bootstrap, validation pipe, Swagger setup. |
| `src/app.module.ts` | Root module wiring guards, repositories, controllers, and feature services. |
| `src/config/` | Typed configuration (`configuration.ts`) plus schema-aware helpers consumed by `ConfigModule`. |
| `src/auth` | Authentication flow (login/signup/me), JWT strategy, decorators/guards, access helper. |
| `src/shared` | Cross-cutting utilities: pagination helpers, DB error mapper, shared module exports. |
| `src/repositories` | Providers exposing TypeORM repositories built on `BaseRepository`. |
| `src/{feature}` | Feature-specific folders, entity definitions, DTOs, repositories, controllers, services. |
| `src/dashboards` | Raw-SQL powered analytics endpoints (attendance trend, failing rate, discipline heatmap, teacher workload). |
| `src/reports` | Printable certificate + grade report endpoints, `PrintIdService`, DTOs. |
| `src/grade_schemes`, `src/grade_scheme_values` | Catalog of grading scales and letter mappings consumed by grades + reports. |
| `src/audit_logs`, `src/disciplinary_records`, `src/notifications` | Operational logging, student behaviour, and in-app notification workflows. |
| `src/database/base.repository.ts` | Generic repository wrapper that injects TypeORM `DataSource`. |
| `scripts/export-openapi.ts` | CLI script to export Swagger spec without touching a real DB. |
| `test/` | E2E test suite with realistic seeding around authz and school-year write locks. |

## Runtime Architecture

### Module Graph
- **AppModule:** Imports TypeORM (global connection or stubbed when `OPENAPI_EXPORT=1`), feature repositories (`RepositoriesModule`), authentication (`AuthModule`), and shared helpers (`SharedModule`). Declares every REST controller and service.
- **ConfigModule:** Loads `configuration.ts` once for the process; exposes `app.port`, `app.apiBaseUrl`, DB URL/SSL, and JWT secrets/expiry to both `main.ts` and the TypeORM factory.
- **RepositoriesModule:** Registers injectable repositories for each entity (e.g. `AttendanceRepository`). Each repository extends `BaseRepository` to reuse the TypeORM entity manager supplied by the injected `DataSource`.
- **SharedModule:** Exposes framework-neutral utilities (pagination, DB error mapping) for reuse.
- **ReportsModule:** Houses `/reports/grades/*` and `/reports/certificates/*` controllers plus `PrintIdService`; depends on course/student repositories and `AccessService`.
- **DashboardsService/Controller:** Registered directly in `AppModule`, runs raw SQL against `DataSource` for analytics endpoints; RBAC-restricted to `admin`/`coordinator`.

### Authentication & Authorization
- `AuthController` exposes:
  - `POST /auth/login` — Authenticates by `nationalId` + password, returns JWT + user.
  - `POST /auth/signup` — Creates a user; only admins can promote roles above teacher, but if the database has zero admins the first signup is promoted automatically (same flow the team uses to bootstrap new environments).
  - `GET /auth/me` — Returns the current user profile; requires authentication.
- JWT payload carries `sub` (national ID), `username`, `role`, optional `jti`. Tokens signed with `JWT_SECRET` (default `change-me`) and expire after one hour.
- Guards:
  - `JwtAuthGuard` honours the `@Public()` decorator to allow unauthenticated routes.
  - `RolesGuard` inspects `@Roles(...)` metadata; `admin` is implicitly whitelisted for any protected route.
  - `AccessService` centralizes teacher-permitted resource checks (courses, class groups).
- Default global role scopes (see `src/auth/roles.decorator.ts`):
  - **Read** (`READ_ROLES`): all roles.
  - **Write** (`WRITE_ROLES`): `admin`, `coordinator`.
  - Specialized constants restrict attendance/grade mutations.

### Core Feature Modules
The backend follows a consistent pattern: controller -> service -> repository/entity. Controllers are heavily annotated with Swagger metadata, request DTOs, and RBAC decorators.

- **School Years (`/school-years`)**
  - CRUD with optional filtering (by name or active flag).
  - `POST /school-years/rollover` — Admin-only transactional rollover that archives the current year and promotes the next active year while enforcing “exactly only one active year”.
  - `POST /school-years/:id/lock` — Admin-only lock (marks year inactive).
  - Services enforce chronological ordering and uniqueness; inactive years become read-only for dependent features via shared `assertYearWritable` guards.

- **Terms (`/terms`)**
  - CRUD constrained to existing school years; term names aligned with `TermName` enum (`P1`-`P4`, `Final`), with derived `sortOrder`.
  - Validates date ranges and overlap, ensuring term windows sit within the parent school year.

- **Subject Areas & Subjects (`/subject-areas`, `/subjects`)**
  - Manage taxonomy of curriculum areas and individual subjects.
  - Subject creation checks for area existence; updates manage associations and unique codes.

- **Course Instances & Courses (`/course-instances`, `/courses`)**
  - Course instances bind subject + grade + school year with metadata (weekly hours, names).
  - Courses link instances to class groups and teachers; services enforce:
    - Grade-level parity between course instance and class group.
    - Teacher role validation (`teacher` only).
    - Active-year write lock (no updates to archived years).
  - Teacher-scoped queries restrict results to assigned courses.

- **Class Groups & Classrooms (`/class-groups`, `/classrooms`)**
  - Class groups represent grade/section/year, optionally with a default classroom.
  - Unique composite `(school_year_id, grade_level, section)` constraint; `code` derived as `{grade}{section}`.
  - Services support pagination, keyword search, and default classroom validation.

- **Timetable (`/timetable-slots`, `/timetable-assignments`)**
  - Slots define weekly schedule positions (day-of-week, start/end) and persist `durationMinutes` so downstream scheduling aligns with bell times.
  - Timetable assignments bind courses to slots (and optional room overrides) with collision checks across class group, teacher, course, classroom, and teacher+class-group combinations; warnings surface when classroom capacity is exceeded.
  - Classroom/slot combinations are unique whenever a classroom is set, preventing double-booking shared rooms.
  - Write operations inherit school-year write locks through course associations, and teachers may only view assignments tied to their courses.

- **Students (`/students`)**
  - CRUD with guardian data requirements (`guardianPhone` non-null), soft constraints on uniqueness by `nationalId`.
  - Listing supports search keyword and filtering by school year (via enrollment existence).
  - Deletes deactivate the student only for the active school year (enrollments/grades/attendance for that year removed) while preserving history; `POST /students/:id/restore?year=` reactivates a specific year’s enrollment.
  - Attendance rosters (`/attendance/sheet`) reuse the class-group enrollment state to exclude inactive students automatically.

- **Enrollments (`/enrollments`)**
  - Manage student membership in class groups per school year.
  - Service validates student, class group, and school year alignment; ensures one active enrollment per `(student, year)`.
  - Teacher queries scoped to their class groups via `AccessService`.
  - Admins and coordinators can continue adjusting archived-year enrollments when business rules require corrections; other roles are blocked once a year is locked.
  - Database enforces the “single active enrollment” rule via a partial unique index (only `active = true` rows participate), allowing historical/inactive enrollments to coexist.
  - Includes `deactivate` logic (not exposed via controller yet) and delete endpoints.

- **Grades (`/grades`)**
  - CRUD for SABJ grading scale per `(student, course, term)`.
  - Teachers restricted to own courses; coordinators forbidden from write operations.
  - Validations include: student enrollment, course/term school-year alignment, archived-year lock, uniqueness detection via `DbErrorMapper`.

- **Attendance (`/attendance`)**
  - Track per student/course/date/slot with statuses `P` (present), `A` (absent), `AE` (excused); uniqueness enforced on both `(student, date, slot)` and the legacy `(student, course, date)` path when `slotId` is null.
  - Teacher-scoped reads (`scope=own|group`) and strict mutation checks ensuring teachers change only their courses.
  - Validates slot-day alignment, per-day uniqueness, and archived-year write protection.
  - `/attendance/sheet?classGroupId=&date=` generates the expected roster for a class group on a given day, respecting enrollment state.

- **Users (`/users`)**
  - Admin/coordinator-managed directory of system users.
  - Pagination with keyword search across username/national ID/name.
  - Repository-level uniqueness enforced for nationalId/username; service leverages `DbErrorMapper` to map DB conflicts to HTTP 409.

- **Grade Schemes & Scheme Values (`/grade-schemes`, `/grade-scheme-values`)**
  - Catalogs the SABJ letter system (or future grading variants) so admins can activate/deactivate entire schemes.
  - Scheme names are unique; scheme values are unique per `(scheme_id, code)` and expose label, order, and `isPassing`.
  - Controllers are repository-backed CRUD endpoints; writes require `WRITE_ROLES` so coordinators/admins gate configuration changes.

- **Reports (`/reports/grades/*`, `/reports/certificates/*`)**
  - Grade term/final reports return printable-friendly payloads plus a sequential `printId` generated via `PrintIdService` (`SELECT nextval('print_generation_seq')`—ensure that sequence exists in every environment).
  - Teachers calling grade reports are validated through `AccessService.isTeacherOfCourse`; admins/coordinators bypass.
  - Certificate endpoint (`POST /reports/certificates/active-student`) assembles student + school-year metadata and surfaces TODOs for the PDF layer.

- **Dashboards (`/dashboards`)**
  - Guarded to `admin`/`coordinator` and backed by raw SQL through the shared `DataSource`.
  - `GET /dashboards/attendance/weekly` buckets attendance statuses per ISO week (filterable by grade, default trailing 8 weeks).
  - `GET /dashboards/failing-rate` computes failing vs total grades for a resolved term (auto-detects latest active term if not provided).
  - `GET /dashboards/discipline/heatmap` aggregates disciplinary records per day/category across a sliding window.
  - `GET /dashboards/teacher-workload` summarizes weekly session counts per weekday for a given teacher (optionally offsetting the week).

- **Audit Logs (`/audit-logs`)**
  - Admin/coordinator endpoints to record and inspect domain changes; supports filtering by entity, action, performer, and date range with pagination.
  - `AuditLogsService` resolves `performedBy` to a `Users` entity, normalizes payload JSON, and exposes strongly typed DTOs.

- **Disciplinary Records (`/disciplinary-records`)**
  - Tracks behaviour incidents with category + description, linked to students and optionally courses/teachers.
  - Feeds the dashboards heatmap and coordinator workflows; controllers support CRUD with RBAC similar to notifications.

- **Notifications (`/notifications`)**
  - Web-only notification center (no outbound email/SMS yet).
  - Absence monitor (`/notifications/suggestions/absence/run`) scans attendance for three consecutive unexcused days and emits coordinator suggestions with category `attendance-absence-streak`.
  - Coordinators resolve/dismiss suggestions via `PATCH /notifications/:id/resolve`; teachers have read-only access.

### Cross-Cutting Behaviours
- **Pagination:** All list endpoints return `{ data, total, page, pageSize }` using `shared/pagination.ts`.
- **Error Mapping:** Unique constraint violations bubble up as `ConflictException` via `DbErrorMapper.throwConflict`.
- **School-Year Write Locks:** Attendance, grades, enrollments, timetable assignments, and courses consult `SchoolYearsRepository` to prevent writes to inactive years (teachers cannot override; admins can everywhere, coordinators only within enrollment workflows).
- **AccessService:** Instantiated per request in services needing scoped visibility; centralizes teacher-level lookups for allowed course/class group IDs.

## Data Model Overview

Entities are defined directly from the PostgreSQL schema under `src/{feature}/*.entity.ts`. Notable attributes:
- **Users:** `nationalId` (PK), `role`, `passwordHash`, contact info, `isActive`.
- **Students:** Guardian contact must be present; `deleted_at` column used for soft-delete semantics in queries.
- **SchoolYears:** `yearStart`, `yearEnd`, `isActive`; `rollover` ensures only one active record.
- **Terms:** Associated with school year; `sortOrder` derived from enum.
- **ClassGroups:** Unique per `(year, grade, section)`; relation to `Classrooms`.
- **CourseInstances:** Unique codes per `(subject, grade, year)`; attributes for weekly hours, descriptive name.
- **Courses:** Join table connecting course instances, class groups, teachers; cascaded relations used throughout access checks.
- **Enrollments:** Unique active enrollment per `(student, school_year)` matched by service logic and DB constraints.
- **Grades:** Records SABJ mark per `(student, course, term)`; optional comment.
- **Attendance:** Unique `(student, date, slot)`; includes `recordedBy`, `reasonNote`, `excusedAt`.
- **TimetableAssignments:** Connect courses to timetable slots with optional classroom override, plus redundant teacher/classGroup columns for querying.
- **GradeSchemes / GradeSchemeValues:** Define grading catalogs, including letter code, label, ordering, and `isPassing`, referenced by `grades.schemeValue`.
- **Notifications:** Persist notification category, target role, payload JSON, resolution metadata, and the author/suggester (absence monitor).
- **AuditLogs:** Capture `entity_name`, optional `entity_id`, action, JSON payload, and FK to the performing user for traceability.
- **DisciplinaryRecords:** Store incident category, description, `date_happened`, and optional course/teacher pointers surfaced in dashboards.

Refer to `openapi.json` (generated) or Swagger UI for full schema definitions of DTOs.

## Environment & Configuration

| Variable | Purpose | Default / Notes |
| --- | --- | --- |
| `PORT` | HTTP port | `3000` |
| `API_BASE_URL` | Swagger server URL + hyperlink base | `null` (falls back to `http://localhost:${PORT}`) |
| `DATABASE_URL` | Full Postgres DSN | Optional; overrides discrete DB vars |
| `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASS`, `DB_NAME` | Discrete Postgres connection info | Defaults to `localhost:5432`, user `postgres`, empty password, DB `schoolmg` |
| `DB_SSL` | Enables TLS | `false`; set to `'true'` when deploying outside the private network |
| `JWT_SECRET` | Symmetric signing key | `change-me` (override in any shared environment) |
| `JWT_EXPIRES_IN` | JWT lifetime (`1h`, `3600s`, etc.) | `1h` |
| `OPENAPI_EXPORT` | Stub TypeORM when exporting swagger | Set to `1` for `npm run openapi:export` |

**Current deployment:** everything runs inside the school’s private network on local Postgres instances. Future Docker packaging is under evaluation; for now each developer / operator installs Postgres locally and points the app at it via the vars above.

## Local Development Workflow

1. **Install dependencies**
   ```CLI
   npm install
   ```
2. **Configure environment**
   - Copy `.env.example` (not present yet) or export required DB/JWT variables manually.
   - Ensure a PostgreSQL instance is running and reachable with the configured credentials.
3. **Run database migrations**
   ```CLI
   npm run migration:run
   ```
   (Create the `print_generation_seq` sequence manually if migrations have not done so yet.)
4. **Run the API**
   ```CLI
   npm run start:dev
   ```
   Swagger UI will be available at `http://localhost:3000/api/docs` (Bearer auth).
5. **Build for production**
   ```CLI
   npm run build
   npm run start:prod
   ```
6. **Lint & formatting**
   ```CLI
   npm run lint
   npm run format
   ```
7. **Generate OpenAPI spec**
   ```CLI
   npm run openapi:export
   ```
   Produces `openapi.json` with endpoints; the script sets `OPENAPI_EXPORT=1` and monkeypatches TypeORM so no real DB connection is required.

## Testing

- **Unit tests:** `npm run test` (currently limited).
- **E2E tests:** `npm run test:e2e` uses `test/jest-e2e.json`.
  - `test/authz.e2e-spec.ts` ensures RBAC + guards behave as expected (401/403, teacher scoping).
  - `test/year-write-lock.e2e-spec.ts` verifies rollover and archived-year immutability.
  - `test/attendance-uniqueness.e2e-spec.ts`, `test/timetable-collisions.e2e-spec.ts`, `test/timetable-guards.e2e-spec.ts` cover invariants for scheduling.
  - `test/students-soft-delete.e2e-spec.ts`, `test/enrollments-*.e2e-spec.ts`, `test/student-roster.e2e-spec.ts` ensure student lifecycle + roster logic.
  - `test/notifications*.e2e-spec.ts` and `test/reports.e2e-spec.ts` guard the absence monitor and printable outputs.
  - Seeder utilities live inline within tests (`await repository.delete({})` resets tables).
- **Coverage:** `npm run test:cov`.

When running tests locally, ensure the configured database is disposable; tests truncate tables before seeding.

## API Documentation

- Swagger UI is hosted at `/api/docs` and includes all controllers, DTO schemas, request/response examples, and bearer auth configuration.
- `openapi.json` (checked into the repo) mirrors the current contract; regenerate after changing controllers/DTOs using `npm run openapi:export`.

## Operational Considerations

- **Authentication policy:** Passwords stored as bcrypt hashes (`AuthService` uses `bcrypt.hash` with cost 10). Signup flow ensures unique `nationalId` & `username`; first admin auto-promotion if no admins exist.
- **RBAC(Role-Based Acess Control):** Global guards ensure consistent enforcement; controllers annotate exceptions (e.g., `@Public()`, `@Roles('admin', …)`).
- **Error surfacing:** Services favour explicit `NotFoundException`, `ConflictException`, `ForbiddenException`, `BadRequestException` for predictable API error responses.
- **Database migrations:** Ensure migrations exist for any schema change; repository expects `migrationsRun: true` so production boots apply pending migrations automatically.
- **Printable IDs:** `/reports/*` endpoints call `PrintIdService.nextId()` which fetches `nextval('print_generation_seq')`; create that sequence (or equivalent) in every environment otherwise report generation will fail.
- **Timezones:** Dates stored as strings or timestamps; ensure clients honour UTC vs local conversions (e.g., attendance `date` expected as ISO string, weekly slot comparisons done in UTC). Consider standardizing timezone handling if needed.

## Deployment Notes

- **Target environment:** the service currently runs on hosts inside the school’s private network. A future Docker/Compose setup may be added, but for now every operator runs Node + Postgres natively.
- **Database lifecycle:** each developer uses a personal Postgres instance; migrations (`npm run migration:run`) are applied locally. If we containerize later we’ll add Compose instructions here.
- **First admin provisioning:** `POST /auth/signup` automatically grants the admin role when the database has zero admins, so new installations can bootstrap themselves securely without hard-coded credentials.
- **Notifications:** the `notifications` module surfaces updates inside the web UI only (no SMTP/SMS yet). The absence monitor can be invoked via `/notifications/suggestions/absence/run` to raise coordinator suggestions (`category = 'attendance-absence-streak'`) when students accumulate three consecutive unexcused days; coordinators resolve/dismiss via `PATCH /notifications/:id/resolve`.
