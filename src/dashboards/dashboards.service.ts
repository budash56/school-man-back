import { Injectable, BadRequestException } from '@nestjs/common';
import { DataSource } from 'typeorm';

type SqlRow = Record<string, any>;

@Injectable()
export class DashboardsService {
  constructor(private readonly dataSource: DataSource) {}

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
