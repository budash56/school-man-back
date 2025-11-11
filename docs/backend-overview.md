# SchoolMan Backend — Project Documentation

This document captures the current behaviour of the School Managament project backend codebase (`school-man-back`) as of the latest update.

## At a Glance
- **Stack:** [NestJS 11](https://docs.nestjs.com/) + TypeScript, [TypeORM](https://typeorm.io/) (PostgreSQL driver), [Jest](https://jestjs.io/) for tests, [Swagger](https://docs.nestjs.com/openapi/introduction) for API docs.
- **Entry point:** `src/main.ts` bootstraps `AppModule` with global validation (`ValidationPipe`), RBAC guards, and Swagger UI at `/api/docs`.
- **Domain scope:** Single-school administration for Colombian K–11, covering school years, terms, subjects, classes, teachers, enrollments, attendance, grades, notifications, behaviour logs, and timetable coordination.
- **Security:** JWT bearer authentication with role-based access control. Roles: `admin`, `coordinator`, `registrar`, `teacher`. Two global guards (`JwtAuthGuard`, `RolesGuard`) enforce authentication/authorization.
- **Persistence:** PostgreSQL via environment-configured connection, migrations expected (no `synchronize`).

## Repository Layout

| Path | Description |
| ---- | ----------- |
| `src/main.ts` | Nest bootstrap, validation pipe, Swagger setup. |
| `src/app.module.ts` | Root module wiring guards, repositories, controllers, and feature services. |
| `src/auth` | Authentication flow (login/signup/me), JWT strategy, decorators/guards, access helper. |
| `src/shared` | Cross-cutting utilities: pagination helpers, DB error mapper, shared module exports. |
| `src/repositories` | Providers exposing TypeORM repositories built on `BaseRepository`. |
| `src/{feature}` | Feature-specific folders, entity definitions, DTOs, repositories, controllers, services. |
| `src/database/base.repository.ts` | Generic repository wrapper that injects TypeORM `DataSource`. |
| `scripts/export-openapi.ts` | CLI script to export Swagger spec without touching a real DB. |
| `test/` | E2E test suite with realistic seeding around authz and school-year write locks. |

## Runtime Architecture

### Module Graph
- **AppModule:** Imports TypeORM (global connection or stubbed when `OPENAPI_EXPORT=1`), feature repositories (`RepositoriesModule`), authentication (`AuthModule`), and shared helpers (`SharedModule`). Declares every REST controller and service.
- **RepositoriesModule:** Registers injectable repositories for each entity (e.g. `AttendanceRepository`). Each repository extends `BaseRepository` to reuse the TypeORM entity manager supplied by the injected `DataSource`.
- **SharedModule:** Exposes framework-neutral utilities (pagination, DB error mapping) for reuse.

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
  - Slots define weekly schedule positions (day-of-week, start/end).
  - Timetable assignments bind courses to slots (and optional room overrides) with teacher/class-group conflict checks delegated to database constraints and `AccessService` for teacher visibility.
  - Classroom/slot combinations are unique whenever a classroom is set, preventing double-booking shared rooms.
  - Write operations inherit school-year write locks through course associations.

- **Students (`/students`)**
  - CRUD with guardian data requirements (`guardianPhone` non-null), soft constraints on uniqueness by `nationalId`.
  - Listing supports search keyword and filtering by school year (via enrollment existence).
  - Deletes mark the record as inactive/soft-deleted so historical enrollments, attendance, and grades remain intact.
  - `PATCH /students/:id/restore` reactivates a previously deleted student (admin/coordinator only); restored records immediately become visible to GET endpoints.

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
  - Track per student/course/date/slot with statuses `P` (present), `A` (absent), `AE` (excused).
  - Teacher-scoped reads (`scope=own|group`) and strict mutation checks ensuring teachers change only their courses.
  - Validates slot-day alignment, per-day uniqueness, and archived-year write protection.

- **Users (`/users`)**
  - Admin/coordinator-managed directory of system users.
  - Pagination with keyword search across username/national ID/name.
  - Repository-level uniqueness enforced for nationalId/username; service leverages `DbErrorMapper` to map DB conflicts to HTTP 409.

- **Supporting Modules**
  - `audit_logs`, `disciplinary_records`, `notifications`, `grade_schemes`, `grade_scheme_values`, `attendance`, etc., follow the same controller/service/repository pattern with CRUD semantics and business rules aligned with the project design.

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


Refer to `openapi.json` (generated) or Swagger UI for full schema definitions of DTOs.

## Environment & Configuration

| Variable | Purpose | Default / Notes |
| --- | --- | --- |
| `PORT` | HTTP port | `3000` |
| `DATABASE_URL` | Full Postgres DSN | Optional; overrides discrete DB vars |
| `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASS`, `DB_NAME` | Discrete Postgres connection info | Defaults to `localhost:5432`, user `postgres`, empty password, DB `schoolmg` |
| `DB_SSL` | Enables TLS | `false`; set to `'true'` when deploying outside the private network |
| `JWT_SECRET` | Symmetric signing key | `change-me` (override in any shared environment) |
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
3. **Run the API**
   ```CLI
   npm run start:dev
   ```
   Swagger UI will be available at `http://localhost:3000/api/docs` (Bearer auth).
4. **Build for production**
   ```CLI
   npm run build
   npm run start:prod
   ```
5. **Lint & formatting**
   ```CLI
   npm run lint
   npm run format
   ```
6. **Generate OpenAPI spec**
   ```CLI
   npm run openapi:export
   ```
   Produces `openapi.json` with endpoints.

## Testing

- **Unit tests:** `npm run test` (currently limited).
- **E2E tests:** `npm run test:e2e` uses `test/jest-e2e.json`.
  - `test/authz.e2e-spec.ts` seeds users, course structures, and asserts role-based access enforcement (401/403 cases, teacher scoping).
  - `test/year-write-lock.e2e-spec.ts` verifies school-year rollover and archived-year immut ability for non-admin roles.
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
- **Timezones:** Dates stored as strings or timestamps; ensure clients honour UTC vs local conversions (e.g., attendance `date` expected as ISO string, weekly slot comparisons done in UTC). Consider standardizing timezone handling if needed.

## Deployment Notes

- **Target environment:** the service currently runs on hosts inside the school’s private network. A future Docker/Compose setup may be added, but for now every operator runs Node + Postgres natively.
- **Database lifecycle:** each developer uses a personal Postgres instance; migrations (`npm run migration:run`) are applied locally. If we containerize later we’ll add Compose instructions here.
- **First admin provisioning:** `POST /auth/signup` automatically grants the admin role when the database has zero admins, so new installations can bootstrap themselves securely without hard-coded credentials.
- **Notifications:** the `notifications` module surfaces updates inside the web UI only. No SMTP/SMS integrations are configured yet; hooking into email delivery will be a future enhancement.
