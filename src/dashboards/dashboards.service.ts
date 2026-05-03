import { Injectable, BadRequestException } from '@nestjs/common';
import { DataSource } from 'typeorm';

type SqlRow = Record<string, any>;
type MetricsUser = { nationalId: string; role: string };

@Injectable()
export class DashboardsService {
  constructor(private readonly dataSource: DataSource) {}

  async getMetrics(
    query: {
      schoolYearId?: number;
      gradeLevel?: number;
      classGroupId?: number;
      courseId?: number;
    },
    user: MetricsUser,
  ) {
    const schoolYearId =
      query.schoolYearId ?? (await this.getActiveSchoolYearId());
    if (!schoolYearId) {
      return {
        schoolYearId: null,
        attendance: this.emptyAttendanceMetrics(),
        academic: this.emptyAcademicMetrics(),
        teacherCourses: [],
      };
    }

    const teacherCourses =
      user.role === 'teacher'
        ? await this.getTeacherCourses(user.nationalId, schoolYearId)
        : [];

    if (user.role === 'teacher' && teacherCourses.length === 0) {
      return {
        schoolYearId,
        attendance: this.emptyAttendanceMetrics(),
        academic: this.emptyAcademicMetrics(),
        teacherCourses,
      };
    }

    const [attendance, academic] = await Promise.all([
      user.role === 'teacher'
        ? this.getTeacherAttendanceMetrics(schoolYearId, user.nationalId, query)
        : this.getAdminAttendanceMetrics(schoolYearId, query),
      user.role === 'teacher'
        ? this.getTeacherAcademicMetrics(schoolYearId, user.nationalId, query)
        : this.getAdminAcademicMetrics(schoolYearId, query),
    ]);

    return {
      schoolYearId,
      attendance,
      academic,
      teacherCourses,
    };
  }

  async getWeeklyAttendance(query: {
    grade?: number;
    weeks?: number;
    referenceDate?: Date;
  }) {
    const weeks = query.weeks ?? 8;
    const referenceDate = query.referenceDate ?? new Date();
    const endDate = this.formatDate(referenceDate);
    const startDate = this.formatDate(this.subtractDays(referenceDate, weeks * 7));

    const params: (string | number)[] = [startDate, endDate];
    const clauses: string[] = [];

    if (query.grade !== undefined) {
      params.push(query.grade);
      clauses.push(`AND cg.grade_level = $${params.length}`);
    }

    const sql = `
      SELECT to_char(date_trunc('week', att.date), 'IYYY-IW') AS bucket,
             COUNT(*) FILTER (WHERE att.status = 'P')::int AS present_count,
             COUNT(*) FILTER (WHERE att.status = 'A')::int AS absent_count,
             COUNT(*) FILTER (WHERE att.status = 'AE')::int AS excused_count
      FROM attendance att
      JOIN courses c ON c.course_id = att.course_id
      JOIN class_groups cg ON cg.class_group_id = c.class_group_id
      WHERE att.date BETWEEN $1 AND $2
      ${clauses.join(' ')}
      GROUP BY bucket
      ORDER BY bucket
    `;

    const rows = await this.dataSource.query(sql, params);
    return rows.map((row: SqlRow) => ({
      bucket: row.bucket,
      present: Number(row.present_count ?? 0),
      absent: Number(row.absent_count ?? 0),
      excused: Number(row.excused_count ?? 0),
    }));
  }

  async getFailingRate(query: {
    subjectId?: number;
    termId?: number;
    schoolYearId?: number;
    referenceDate?: Date;
  }) {
    const context = await this.resolveTermContext(query);
    if (!context) {
      throw new BadRequestException('Unable to determine term context');
    }

    const params: (number | string)[] = [context.termId];
    const clauses: string[] = [];

    if (query.subjectId) {
      params.push(query.subjectId);
      clauses.push(`AND ci.subject_id = $${params.length}`);
    }

    const sql = `
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE grade.mark = 1)::int AS failing
      FROM grades grade
      JOIN terms term ON term.term_id = grade.term_id
      JOIN courses course ON course.course_id = grade.course_id
      JOIN course_instances ci ON ci.course_instance_id = course.course_instance_id
      WHERE term.term_id = $1
      ${clauses.join(' ')}
    `;

    const rows = await this.dataSource.query(sql, params);
    const row = rows[0] ?? { total: 0, failing: 0 };
    const total = Number(row.total ?? 0);
    const failing = Number(row.failing ?? 0);

    return {
      termId: context.termId,
      schoolYearId: context.schoolYearId,
      total,
      failing,
      failingRate: total === 0 ? 0 : failing / total,
    };
  }

  async getDisciplineHeatmap(query: {
    days?: number;
    referenceDate?: Date;
  }) {
    const days = query.days ?? 30;
    const referenceDate = query.referenceDate ?? new Date();
    const endDate = this.formatDate(referenceDate);
    const startDate = this.formatDate(this.subtractDays(referenceDate, days));

    const sql = `
      SELECT dr.date_happened AS date,
             dr.category,
             COUNT(*)::int AS total
      FROM disciplinary_records dr
      WHERE dr.date_happened BETWEEN $1 AND $2
      GROUP BY dr.date_happened, dr.category
      ORDER BY dr.date_happened ASC, dr.category
    `;

    const rows = await this.dataSource.query(sql, [startDate, endDate]);
    return rows.map((row: SqlRow) => ({
      date: this.formatDate(row.date),
      category: row.category,
      total: Number(row.total ?? 0),
    }));
  }

  async getTeacherWorkload(query: {
    teacherId: string;
    weekOffset?: number;
    referenceDate?: Date;
  }) {
    if (!query.teacherId) {
      throw new BadRequestException('teacherId is required');
    }
    const offset = query.weekOffset ?? 0;
    const referenceDate = query.referenceDate ?? new Date();
    const startWeek = this.startOfWeek(referenceDate);
    startWeek.setDate(startWeek.getDate() + offset * 7);
    const endWeek = this.addDays(startWeek, 4);

    const sql = `
      SELECT slot.day_of_week AS day,
             COUNT(*)::int AS sessions
      FROM timetable_assignments ta
      JOIN timetable_slots slot ON slot.slot_id = ta.slot_id
      WHERE ta.teacher_id = $1
      GROUP BY slot.day_of_week
      ORDER BY slot.day_of_week
    `;

    const rows = await this.dataSource.query(sql, [query.teacherId]);
    return {
      weekStart: this.formatDate(startWeek),
      weekEnd: this.formatDate(endWeek),
      days: rows.map((row: SqlRow) => ({
        dayOfWeek: Number(row.day ?? 0),
        sessions: Number(row.sessions ?? 0),
      })),
    };
  }

  private async resolveTermContext(query: {
    termId?: number;
    schoolYearId?: number;
    referenceDate?: Date;
  }) {
    if (query.termId && query.schoolYearId) {
      return {
        termId: query.termId,
        schoolYearId: query.schoolYearId,
      };
    }

    if (query.termId) {
      const rows = await this.dataSource.query(
        `SELECT term_id, school_year_id FROM terms WHERE term_id = $1`,
        [query.termId],
      );
      const row = rows[0];
      if (!row) {
        return null;
      }
      return {
        termId: Number(row.term_id),
        schoolYearId: Number(row.school_year_id),
      };
    }

    const referenceDate = query.referenceDate ?? new Date();
    const today = this.formatDate(referenceDate);
    const rows = await this.dataSource.query(
      `
        SELECT term_id, school_year_id
        FROM terms
        WHERE start_date <= $1
        ORDER BY start_date DESC
        LIMIT 1
      `,
      [today],
    );
    const row = rows[0];
    if (!row) {
      return null;
    }
    return {
      termId: Number(row.term_id),
      schoolYearId: Number(row.school_year_id),
    };
  }

  private async getActiveSchoolYearId(): Promise<number | null> {
    const rows = await this.dataSource.query(
      `SELECT school_year_id FROM school_years WHERE is_active = true ORDER BY year_start DESC LIMIT 1`,
    );
    const value = rows[0]?.school_year_id;
    return value === undefined ? null : Number(value);
  }

  private async getTeacherCourses(teacherId: string, schoolYearId: number) {
    const rows = await this.dataSource.query(
      `
        SELECT
          c.course_id,
          c.class_group_id,
          cg.grade_level,
          cg.section,
          s.name AS subject_name,
          s.subject_code
        FROM courses c
        JOIN course_instances ci ON ci.course_instance_id = c.course_instance_id
        JOIN subjects s ON s.subject_id = ci.subject_id
        JOIN class_groups cg ON cg.class_group_id = c.class_group_id
        WHERE c.teacher_id = $1
          AND ci.school_year_id = $2
        ORDER BY s.name, cg.grade_level, cg.section
      `,
      [teacherId, schoolYearId],
    );
    return rows.map((row: SqlRow) => ({
      courseId: Number(row.course_id),
      classGroupId: Number(row.class_group_id),
      gradeLevel: Number(row.grade_level),
      section: row.section,
      subjectCode: row.subject_code,
      subjectName: row.subject_name,
    }));
  }

  private async getAdminAttendanceMetrics(
    schoolYearId: number,
    query: { gradeLevel?: number; classGroupId?: number },
  ) {
    const params: Array<number | string> = [schoolYearId];
    const clauses = [`ci.school_year_id = $1`];
    if (query.gradeLevel) {
      params.push(query.gradeLevel);
      clauses.push(`cg.grade_level = $${params.length}`);
    }
    if (query.classGroupId) {
      params.push(query.classGroupId);
      clauses.push(`cg.class_group_id = $${params.length}`);
    }
    return this.getAttendanceMetrics(clauses, params);
  }

  private async getTeacherAttendanceMetrics(
    schoolYearId: number,
    teacherId: string,
    query: { gradeLevel?: number; classGroupId?: number; courseId?: number },
  ) {
    const params: Array<number | string> = [schoolYearId, teacherId];
    const clauses = [`ci.school_year_id = $1`, `c.teacher_id = $2`];
    if (query.gradeLevel) {
      params.push(query.gradeLevel);
      clauses.push(`cg.grade_level = $${params.length}`);
    }
    if (query.classGroupId) {
      params.push(query.classGroupId);
      clauses.push(`cg.class_group_id = $${params.length}`);
    }
    if (query.courseId) {
      params.push(query.courseId);
      clauses.push(`c.course_id = $${params.length}`);
    }
    return this.getAttendanceMetrics(clauses, params);
  }

  private async getAttendanceMetrics(
    clauses: string[],
    params: Array<number | string>,
  ) {
    const where = clauses.join(' AND ');
    const [summaryRows, groupRows] = await Promise.all([
      this.dataSource.query(
        `
          SELECT
            COUNT(*)::int AS total,
            COUNT(*) FILTER (WHERE att.status = 'P')::int AS present,
            COUNT(*) FILTER (WHERE att.status = 'A')::int AS absent,
            COUNT(*) FILTER (WHERE att.status = 'AE')::int AS excused
          FROM attendance att
          JOIN courses c ON c.course_id = att.course_id
          JOIN course_instances ci ON ci.course_instance_id = c.course_instance_id
          JOIN class_groups cg ON cg.class_group_id = c.class_group_id
          WHERE ${where}
        `,
        params,
      ),
      this.dataSource.query(
        `
          SELECT
            cg.class_group_id,
            cg.grade_level,
            cg.section,
            COUNT(*)::int AS total,
            COUNT(*) FILTER (WHERE att.status = 'P')::int AS present,
            COUNT(*) FILTER (WHERE att.status = 'A')::int AS absent,
            COUNT(*) FILTER (WHERE att.status = 'AE')::int AS excused
          FROM attendance att
          JOIN courses c ON c.course_id = att.course_id
          JOIN course_instances ci ON ci.course_instance_id = c.course_instance_id
          JOIN class_groups cg ON cg.class_group_id = c.class_group_id
          WHERE ${where}
          GROUP BY cg.class_group_id, cg.grade_level, cg.section
          ORDER BY cg.grade_level, cg.section
          LIMIT 8
        `,
        params,
      ),
    ]);
    const summary = this.toAttendanceSummary(summaryRows[0]);
    return {
      ...summary,
      byClassGroup: groupRows.map((row: SqlRow) => ({
        classGroupId: Number(row.class_group_id),
        label: `${row.grade_level}${row.section}`,
        ...this.toAttendanceSummary(row),
      })),
    };
  }

  private async getAdminAcademicMetrics(
    schoolYearId: number,
    query: { gradeLevel?: number; classGroupId?: number; courseId?: number },
  ) {
    const params: Array<number | string> = [schoolYearId];
    const clauses = [`ci.school_year_id = $1`];
    if (query.gradeLevel) {
      params.push(query.gradeLevel);
      clauses.push(`cg.grade_level = $${params.length}`);
    }
    if (query.classGroupId) {
      params.push(query.classGroupId);
      clauses.push(`cg.class_group_id = $${params.length}`);
    }
    if (query.courseId) {
      params.push(query.courseId);
      clauses.push(`c.course_id = $${params.length}`);
    }
    return this.getAcademicMetrics(clauses, params);
  }

  private async getTeacherAcademicMetrics(
    schoolYearId: number,
    teacherId: string,
    query: { gradeLevel?: number; classGroupId?: number; courseId?: number },
  ) {
    const params: Array<number | string> = [schoolYearId, teacherId];
    const clauses = [`ci.school_year_id = $1`, `c.teacher_id = $2`];
    if (query.gradeLevel) {
      params.push(query.gradeLevel);
      clauses.push(`cg.grade_level = $${params.length}`);
    }
    if (query.classGroupId) {
      params.push(query.classGroupId);
      clauses.push(`cg.class_group_id = $${params.length}`);
    }
    if (query.courseId) {
      params.push(query.courseId);
      clauses.push(`c.course_id = $${params.length}`);
    }
    return this.getAcademicMetrics(clauses, params);
  }

  private async getAcademicMetrics(
    clauses: string[],
    params: Array<number | string>,
  ) {
    const where = clauses.join(' AND ');
    const [summaryRows, courseRows, subjectRows, teacherRows] = await Promise.all([
      this.dataSource.query(
        `
          SELECT
            COUNT(*)::int AS total,
            AVG(grade.mark)::float AS average,
            COUNT(*) FILTER (WHERE grade.mark = 1)::int AS low,
            COUNT(DISTINCT grade.student_id)::int AS students
          FROM grades grade
          JOIN courses c ON c.course_id = grade.course_id
          JOIN course_instances ci ON ci.course_instance_id = c.course_instance_id
          JOIN class_groups cg ON cg.class_group_id = c.class_group_id
          WHERE ${where}
        `,
        params,
      ),
      this.dataSource.query(
        `
          SELECT
            c.course_id,
            cg.class_group_id,
            cg.grade_level,
            cg.section,
            s.name AS subject_name,
            COUNT(*)::int AS total,
            AVG(grade.mark)::float AS average,
            COUNT(*) FILTER (WHERE grade.mark = 1)::int AS low
          FROM grades grade
          JOIN courses c ON c.course_id = grade.course_id
          JOIN course_instances ci ON ci.course_instance_id = c.course_instance_id
          JOIN subjects s ON s.subject_id = ci.subject_id
          JOIN class_groups cg ON cg.class_group_id = c.class_group_id
          WHERE ${where}
          GROUP BY c.course_id, cg.class_group_id, cg.grade_level, cg.section, s.name
          ORDER BY low DESC, average ASC NULLS LAST, s.name
          LIMIT 8
        `,
        params,
      ),
      this.dataSource.query(
        `
          SELECT
            s.subject_code,
            s.name AS subject_name,
            COUNT(*)::int AS total,
            AVG(grade.mark)::float AS average,
            COUNT(*) FILTER (WHERE grade.mark = 1)::int AS low
          FROM grades grade
          JOIN courses c ON c.course_id = grade.course_id
          JOIN course_instances ci ON ci.course_instance_id = c.course_instance_id
          JOIN subjects s ON s.subject_id = ci.subject_id
          JOIN class_groups cg ON cg.class_group_id = c.class_group_id
          WHERE ${where}
          GROUP BY s.subject_code, s.name
          ORDER BY s.name
          LIMIT 8
        `,
        params,
      ),
      this.dataSource.query(
        `
          SELECT
            c.teacher_id,
            COALESCE(NULLIF(TRIM(CONCAT_WS(' ', teacher.first_name, teacher.last_name)), ''), teacher.username, c.teacher_id) AS teacher_name,
            COUNT(*)::int AS total,
            AVG(grade.mark)::float AS average,
            COUNT(*) FILTER (WHERE grade.mark = 1)::int AS low,
            COUNT(DISTINCT grade.student_id)::int AS students,
            COUNT(DISTINCT c.course_id)::int AS courses
          FROM grades grade
          JOIN courses c ON c.course_id = grade.course_id
          JOIN users teacher ON teacher.national_id = c.teacher_id
          JOIN course_instances ci ON ci.course_instance_id = c.course_instance_id
          JOIN class_groups cg ON cg.class_group_id = c.class_group_id
          WHERE ${where}
          GROUP BY c.teacher_id, teacher.first_name, teacher.last_name, teacher.username
          ORDER BY low DESC, average ASC NULLS LAST, teacher_name
          LIMIT 8
        `,
        params,
      ),
    ]);
    return {
      ...this.toAcademicSummary(summaryRows[0]),
      byCourse: courseRows.map((row: SqlRow) => ({
        courseId: Number(row.course_id),
        classGroupId: Number(row.class_group_id),
        label: `${row.subject_name} · ${row.grade_level}${row.section}`,
        ...this.toAcademicSummary(row),
      })),
      bySubject: subjectRows.map((row: SqlRow) => ({
        subjectCode: row.subject_code,
        label: row.subject_name,
        ...this.toAcademicSummary(row),
      })),
      byTeacher: teacherRows.map((row: SqlRow) => ({
        teacherId: row.teacher_id,
        label: row.teacher_name,
        courses: Number(row.courses ?? 0),
        ...this.toAcademicSummary(row),
      })),
    };
  }

  private emptyAttendanceMetrics() {
    return {
      total: 0,
      present: 0,
      absent: 0,
      excused: 0,
      absenceRate: 0,
      byClassGroup: [],
    };
  }

  private emptyAcademicMetrics() {
    return {
      total: 0,
      average: 0,
      low: 0,
      students: 0,
      lowRate: 0,
      byCourse: [],
      bySubject: [],
      byTeacher: [],
    };
  }

  private toAttendanceSummary(row: SqlRow = {}) {
    const total = Number(row.total ?? 0);
    const absent = Number(row.absent ?? 0);
    const excused = Number(row.excused ?? 0);
    return {
      total,
      present: Number(row.present ?? 0),
      absent,
      excused,
      absenceRate: total === 0 ? 0 : (absent + excused) / total,
    };
  }

  private toAcademicSummary(row: SqlRow = {}) {
    const total = Number(row.total ?? 0);
    const low = Number(row.low ?? 0);
    return {
      total,
      average: Number(row.average ?? 0),
      low,
      students: Number(row.students ?? 0),
      lowRate: total === 0 ? 0 : low / total,
    };
  }

  private subtractDays(date: Date, days: number): Date {
    const next = new Date(date);
    next.setDate(next.getDate() - days);
    return next;
  }

  private addDays(date: Date, days: number): Date {
    const next = new Date(date);
    next.setDate(next.getDate() + days);
    return next;
  }

  private startOfWeek(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    return this.addDays(d, diff);
  }

  private formatDate(value: Date | string): string {
    if (typeof value === 'string') {
      return value;
    }
    return value.toISOString().slice(0, 10);
  }
}
