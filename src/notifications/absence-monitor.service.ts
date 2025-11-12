import { Injectable } from '@nestjs/common';
import { AttendanceRepository } from '../attendance/attendance.repository';
import { NotificationsService } from './notifications.service';

type AbsenceRow = {
  studentId: string;
  dayKey: string;
  absentSlots: string | number;
  excusedSlots: string | number;
  presentSlots: string | number;
  recordedSlots: string | number;
};

type DaySummary = {
  absentSlots: number;
  excusedSlots: number;
  presentSlots: number;
  recordedSlots: number;
};

@Injectable()
export class NotificationsAbsenceMonitorService {
  async run(date?: string): Promise<number> {
    const ref = date ? new Date(`${date}T12:00:00Z`) : new Date();
    const { created } = await this.evaluate(ref);
    return created;
  }
  private static readonly CATEGORY = 'attendance-absence-streak';

  constructor(
    private readonly attendanceRepository: AttendanceRepository,
    private readonly notificationsService: NotificationsService,
  ) {}

  async evaluate(referenceDate = new Date()): Promise<{ created: number }> {
    const targetDates = this.computeRecentSchoolDays(referenceDate, 3);
    if (targetDates.length < 3) {
      return { created: 0 };
    }
    this.debugLog('window', targetDates);

    const rows = await this.attendanceRepository
      .createQueryBuilder('attendance')
      .select('attendance.studentId', 'studentId')
      .addSelect(`attendance.date::text`, 'dayKey')
      .addSelect(
        `COUNT(*) FILTER (WHERE attendance.status = 'A')`,
        'absentSlots',
      )
      .addSelect(
        `COUNT(*) FILTER (WHERE attendance.status = 'AE')`,
        'excusedSlots',
      )
      .addSelect(
        `COUNT(*) FILTER (WHERE attendance.status = 'P')`,
        'presentSlots',
      )
      .addSelect(`COUNT(*)`, 'recordedSlots')
      .where('attendance.date IN (:...dates)', { dates: targetDates })
      .groupBy('attendance.studentId')
      .addGroupBy('attendance.date')
      .getRawMany<AbsenceRow>();

    const byStudent = new Map<number, Map<string, DaySummary>>();

    for (const row of rows) {
      const studentId = Number(row.studentId);
      if (!Number.isFinite(studentId)) {
        continue;
      }
      const map = byStudent.get(studentId) ?? new Map<string, DaySummary>();
      const summary: DaySummary = {
        absentSlots: Number(row.absentSlots) || 0,
        excusedSlots: Number(row.excusedSlots) || 0,
        presentSlots: Number(row.presentSlots) || 0,
        recordedSlots: Number(row.recordedSlots) || 0,
      };
      const dateKey = this.formatDate(row.dayKey);
      map.set(dateKey, summary);
      this.debugLog('raw-row', {
        studentId,
        rawDate: row.dayKey,
        type: typeof row.dayKey,
      });
      this.debugLog('day-summary', {
        studentId,
        day: dateKey,
        expectedSlots: summary.recordedSlots,
        absentSlots: summary.absentSlots,
        excusedSlots: summary.excusedSlots,
        presentSlots: summary.presentSlots,
      });
      byStudent.set(studentId, map);
    }

    let created = 0;
    for (const [studentId, dateMap] of byStudent.entries()) {
      const qualifies = targetDates.every((date) => {
        const summary = dateMap.get(date);
        if (!summary) {
          return false;
        }
        return summary.absentSlots > 0 && summary.excusedSlots === 0;
      });
      if (!qualifies) {
        continue;
      }

      const message = `Student ${studentId} has been absent without excuse on ${targetDates.join(
        ', ',
      )}.`;
      const inserted = await this.notificationsService.createStudentSuggestion({
        studentId,
        category: NotificationsAbsenceMonitorService.CATEGORY,
        title: 'Extended absence warning',
        message,
      });

      if (inserted) {
        created += 1;
      }
    }

    return { created };
  }

  private computeRecentSchoolDays(
    referenceDate: Date,
    required: number,
  ): string[] {
    const dates: string[] = [];
    let cursor = new Date(referenceDate);
    cursor.setDate(cursor.getDate() - 1);

    let iterations = 0;
    while (dates.length < required && iterations < 30) {
      if (!this.isWeekend(cursor)) {
        dates.unshift(this.formatDate(cursor));
      }
      cursor = new Date(cursor);
      cursor.setDate(cursor.getDate() - 1);
      iterations += 1;
    }

    return dates;
  }

  private isWeekend(date: Date): boolean {
    const day = date.getUTCDay();
    return day === 0 || day === 6;
  }

  private formatDate(date: Date | string): string {
    if (typeof date === 'string') {
      if (date.length >= 10) {
        return date.slice(0, 10);
      }
      return date;
    }
    if (Number.isNaN(date.getTime())) {
      return '';
    }
    const year = date.getUTCFullYear();
    const month = (date.getUTCMonth() + 1).toString().padStart(2, '0');
    const day = date.getUTCDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private debugLog(context: string, payload: unknown): void {
    if (process.env.NODE_ENV !== 'test') {
      return;
    }
    // Keep logging concise to help e2e debugging only.
    // eslint-disable-next-line no-console
    console.log(`[absence-monitor:${context}]`, payload);
  }
}
