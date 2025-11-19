import { DashboardsService } from './dashboards.service';
import { DataSource } from 'typeorm';

describe('DashboardsService', () => {
  let dataSource: jest.Mocked<Pick<DataSource, 'query'>>;
  let service: DashboardsService;

  beforeEach(() => {
    dataSource = { query: jest.fn() } as jest.Mocked<Pick<
      DataSource,
      'query'
    >>;
    service = new DashboardsService(dataSource as unknown as DataSource);
  });

  it('computes weekly attendance with grade filter', async () => {
    dataSource.query.mockResolvedValueOnce([
      { bucket: '2025-08', present_count: '10', absent_count: '2', excused_count: '1' },
    ]);

    const result = await service.getWeeklyAttendance({
      grade: 5,
      referenceDate: new Date('2025-03-01'),
    });

    expect(dataSource.query).toHaveBeenCalledWith(
      expect.stringContaining('attendance'),
      ['2025-01-04', '2025-03-01', 5],
    );
    expect(result).toEqual([
      { bucket: '2025-08', present: 10, absent: 2, excused: 1 },
    ]);
  });

  it('calculates failing rate using default term resolution', async () => {
    dataSource.query
      .mockResolvedValueOnce([{ term_id: '4', school_year_id: '2' }])
      .mockResolvedValueOnce([{ total: '20', failing: '4' }]);

    const result = await service.getFailingRate({ subjectId: 7, referenceDate: new Date('2025-02-10') });

    expect(dataSource.query).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('FROM grades'),
      [4, 7],
    );
    expect(result).toEqual({
      termId: 4,
      schoolYearId: 2,
      total: 20,
      failing: 4,
      failingRate: 0.2,
    });
  });

  it('builds discipline heatmap for last 30 days by default', async () => {
    dataSource.query.mockResolvedValueOnce([
      { date: '2025-02-01', category: 'red', total: '2' },
    ]);

    const result = await service.getDisciplineHeatmap({
      referenceDate: new Date('2025-03-01'),
    });

    expect(dataSource.query).toHaveBeenCalledWith(
      expect.stringContaining('disciplinary_records'),
      ['2025-01-30', '2025-03-01'],
    );
    expect(result).toEqual([
      { date: '2025-02-01', category: 'red', total: 2 },
    ]);
  });

  it('returns teacher workload with default week window', async () => {
    dataSource.query.mockResolvedValueOnce([
      { day: '1', sessions: '3' },
      { day: '3', sessions: '2' },
    ]);

    const result = await service.getTeacherWorkload({
      teacherId: '800001',
      referenceDate: new Date('2025-03-05'), // Wednesday
    });

    expect(dataSource.query).toHaveBeenCalledWith(
      expect.stringContaining('timetable_assignments'),
      ['800001'],
    );
    expect(result).toEqual({
      weekStart: '2025-03-03',
      weekEnd: '2025-03-07',
      days: [
        { dayOfWeek: 1, sessions: 3 },
        { dayOfWeek: 3, sessions: 2 },
      ],
    });
  });
});
