# SchoolMan Backend

SchoolMan Backend is the API and business-rule layer for the SchoolMan school management system. It is built for day-to-day administration of a Colombian K-11 institution: students, enrollments, class groups, teachers, attendance, grades, planillas, reports, calendars, and operational records.

The backend is the source of truth for SchoolMan. The frontend, scanner, and deployment repositories all depend on it for authentication, permissions, persistence, and academic workflows.

## What It Does

SchoolMan Backend manages the operational data that a school office and teaching staff need every day:

- Keeps student, guardian, user, teacher, subject, course, classroom, and class-group records organized.
- Handles school years, terms, enrollments, promotions, and year locks.
- Supports attendance, grades, discipline, notifications, audit logs, and dashboards.
- Imports institutional planillas from spreadsheets and stores them as editable gradebook records.
- Connects with the scanner service so photographed planillas can become reviewable draft data.
- Generates report-ready data for certificates, student records, promotion checks, and graduation checks.
- Enforces role-based access for admins, coordinators, registrars, and teachers.

## How It Fits In The System

SchoolMan is split into four repositories:

- `school-man-back`: NestJS API, database model, permissions, and business workflows.
- `school-man-front`: React dashboard used by staff.
- `school-man-scanner`: OCR service for reading photographed planillas.
- `school-man-deploy`: Docker Compose deployment wrapper.

The backend talks to PostgreSQL for storage and to SchoolScanner when a user uploads an image/PDF for planilla scanning. The frontend talks to this backend through the `/api` route.

## Main User Workflows

Typical workflows supported by this service include:

- A coordinator creates or imports students and enrolls them into class groups.
- Teachers view assigned planillas and record grades.
- Staff record attendance and follow up on absence patterns.
- Coordinators manage calendars, classrooms, subjects, courses, and workload.
- Administrators import planillas, resolve missing student IDs, and finalize academic data.
- Registrars generate printable student records and promotion/graduation eligibility reports.
- The scanner service returns OCR drafts that the backend normalizes for review.

## Technology

- NestJS and TypeScript
- PostgreSQL with TypeORM
- JWT authentication
- Role-based guards
- Swagger/OpenAPI documentation
- Jest tests

## Running Locally

Install dependencies:

```bash
npm install
```

Create an environment file with database, JWT, email, and scanner settings. For local development the scanner usually runs at:

```dotenv
SCANNER_BASE_URL=http://localhost:8010
SCANNER_TIMEOUT_MS=120000
```

Start the API:

```bash
npm run start:dev
```

Swagger is available at:

```text
http://localhost:3000/api/docs
```

## Validation

Useful checks:

```bash
npm test
npm run lint
npm run build
```

Focused scanner/config tests can be run with:

```bash
npm test -- scanner.service.spec.ts configuration.spec.ts --runInBand
```

## Notes For Contributors

- Keep academic rules in the backend, not in the frontend or scanner.
- Treat scanner output as a draft that must be reviewed before final persistence.
- Keep role checks enforced server-side even when the frontend hides actions.
- Prefer small, workflow-focused changes over broad refactors.
