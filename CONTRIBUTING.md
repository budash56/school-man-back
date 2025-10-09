
---

# CONTRIBUTING.md
```md
# Contributing to SchoolMg

This guide defines how we structure, build, test, and review changes.

## Project structure
- `src/main.ts` bootstraps Nest; `src/app.module.ts` wires TypeORM and modules
- Domain folders (e.g. `src/students`, `src/attendance`) follow Nest patterns:
  - `*.controller.ts`, `*.service.ts`, `*.entity.ts`, `dto/*.dto.ts`
- Shared utilities/providers: `src/shared`
- Tests:
  - unit specs co-located as `*.spec.ts`
  - e2e in `test/` with `jest-e2e.json`
- Build artifacts in `dist/`

## TypeORM & database (hard rules)
- `synchronize: false`, `migrationsRun: true` in all environments
- Use **SnakeNamingStrategy** so DB is `snake_case`
- Always ship entity changes with a **migration**
- Prefer **composite uniques** that mirror domain invariants, e.g.:
  - `timetable_slots`: (`day_of_week`, `start_time`, `end_time`)
  - `course_instances`: (`subject_id`, `grade_level`, `school_year_id`) and (`course_code`, `school_year_id`)
  - `class_groups`: (`school_year_id`, `grade_level`, `section`)
  - `courses`: (`course_instance_id`, `class_group_id`, `teacher_id`)
- Idempotent seeds (SQL) live in `scripts/` and use typed literals (`DATE`, `TIME`)

### Migration commands
```bash
pnpm typeorm migration:generate src/migrations/<Name> -d src/data-source.ts
pnpm typeorm migration:run -d src/data-source.ts
pnpm typeorm migration:revert -d src/data-source.ts
