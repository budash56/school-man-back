import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Express } from 'express';
import type { ScannedPlanillaResponse, ScannedPlanillaRow } from './scanner.types';
import type {
  ScannedCurriculumScheduleCurriculum,
  ScannedCurriculumScheduleItem,
  ScannedCurriculumScheduleResponse,
  ScannedCurriculumScheduleSession,
  ScannedTimetableAssignment,
  ScannedTimetableClassGroup,
  ScannedTimetableResponse,
  ScannedTimetableSlot,
  ScannedTimetableSubject,
  ScannedTimetableTeacher,
} from './timetable-scanner.types';

type ScannerRawFile = {
  filename?: unknown;
  content_type?: unknown;
  size_bytes?: unknown;
};

type ScannerRawMetadata = {
  grade_level?: unknown;
  group_code?: unknown;
  subject_name?: unknown;
  teacher_name?: unknown;
};

type ScannerRawRow = {
  order?: unknown;
  student_name?: unknown;
  national_id?: unknown;
  cells?: unknown;
};

type ScannerRawResponse = {
  status?: unknown;
  template_key?: unknown;
  message?: unknown;
  uploaded_file?: unknown;
  metadata?: unknown;
  rows?: unknown;
  warnings?: unknown;
};

type ScannerRawTimetableTeacher = {
  teacher_id?: unknown;
  full_name?: unknown;
};

type ScannerRawTimetableClassGroup = {
  group_code?: unknown;
  grade_level?: unknown;
  section?: unknown;
};

type ScannerRawTimetableSubject = {
  subject_code?: unknown;
  name?: unknown;
};

type ScannerRawTimetableSlot = {
  period?: unknown;
  day_of_week?: unknown;
  start_time?: unknown;
  end_time?: unknown;
};

type ScannerRawTimetableAssignment = ScannerRawTimetableSlot &
  ScannerRawTimetableClassGroup &
  ScannerRawTimetableSubject &
  ScannerRawTimetableTeacher & {
    teacher_name?: unknown;
    subject_name?: unknown;
  };

type ScannerRawCurriculumScheduleItem = {
  subject_code?: unknown;
  subject_name?: unknown;
  weekly_hours?: unknown;
};

type ScannerRawCurriculumScheduleCurriculum = {
  grade_level?: unknown;
  track_name?: unknown;
  specialization_name?: unknown;
  group_codes?: unknown;
  weekly_hours?: unknown;
  items?: unknown;
};

type ScannerRawCurriculumScheduleSession = {
  group_code?: unknown;
  grade_level?: unknown;
  section?: unknown;
  subject_code?: unknown;
  subject_name?: unknown;
  period?: unknown;
  day_of_week?: unknown;
  is_continuation?: unknown;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const toStringValue = (value: unknown, fallback = ''): string => {
  if (typeof value === 'string') {
    return value;
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }
  return fallback;
};

const toNullableString = (value: unknown): string | null => {
  if (typeof value === 'string') {
    return value;
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }
  return null;
};

const toNullableNumber = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const toBooleanValue = (value: unknown): boolean => value === true;

const toStringMap = (value: unknown): Record<string, string> => {
  if (!isRecord(value)) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, entry]) => [key, toStringValue(entry)]),
  );
};

const extractMessage = (payload: unknown, fallback: string): string => {
  if (typeof payload === 'string' && payload.trim().length > 0) {
    return payload;
  }

  if (!isRecord(payload)) {
    return fallback;
  }

  if (typeof payload.detail === 'string' && payload.detail.trim().length > 0) {
    return payload.detail;
  }

  if (typeof payload.message === 'string' && payload.message.trim().length > 0) {
    return payload.message;
  }

  return fallback;
};

const mapRow = (value: unknown, index: number): ScannedPlanillaRow | null => {
  if (!isRecord(value)) {
    return null;
  }

  const row = value as ScannerRawRow;
  return {
    order: toNullableNumber(row.order) ?? index + 1,
    studentName: toNullableString(row.student_name),
    nationalId: toNullableString(row.national_id),
    cells: toStringMap(row.cells),
  };
};

const mapScannerResponse = (payload: unknown): ScannedPlanillaResponse => {
  if (!isRecord(payload)) {
    throw new BadGatewayException(
      'SchoolScanner returned an invalid response payload.',
    );
  }

  const response = payload as ScannerRawResponse;
  const uploadedFile = isRecord(response.uploaded_file)
    ? (response.uploaded_file as ScannerRawFile)
    : {};
  const metadata = isRecord(response.metadata)
    ? (response.metadata as ScannerRawMetadata)
    : {};
  const rowsSource = Array.isArray(response.rows) ? response.rows : [];

  return {
    status: toStringValue(response.status, 'unknown'),
    templateKey: toStringValue(response.template_key, 'iedrc-secondary-v1'),
    message: toStringValue(
      response.message,
      'Scanner response received without a message.',
    ),
    uploadedFile: {
      filename: toStringValue(uploadedFile.filename, 'unknown'),
      contentType: toStringValue(
        uploadedFile.content_type,
        'application/octet-stream',
      ),
      sizeBytes: toNullableNumber(uploadedFile.size_bytes) ?? 0,
    },
    metadata: {
      gradeLevel: toNullableNumber(metadata.grade_level),
      groupCode: toNullableString(metadata.group_code),
      subjectName: toNullableString(metadata.subject_name),
      teacherName: toNullableString(metadata.teacher_name),
    },
    rows: rowsSource
      .map((row, index) => mapRow(row, index))
      .filter((row): row is ScannedPlanillaRow => row !== null),
    warnings: Array.isArray(response.warnings)
      ? response.warnings.map((warning) => toStringValue(warning)).filter(Boolean)
      : [],
  };
};

const mapTimetableTeacher = (value: unknown): ScannedTimetableTeacher | null => {
  if (!isRecord(value)) {
    return null;
  }
  const teacher = value as ScannerRawTimetableTeacher;
  return {
    teacherId: toStringValue(teacher.teacher_id),
    fullName: toStringValue(teacher.full_name),
  };
};

const mapTimetableClassGroup = (
  value: unknown,
): ScannedTimetableClassGroup | null => {
  if (!isRecord(value)) {
    return null;
  }
  const group = value as ScannerRawTimetableClassGroup;
  return {
    groupCode: toStringValue(group.group_code),
    gradeLevel: toNullableNumber(group.grade_level) ?? 0,
    section: toStringValue(group.section),
  };
};

const mapTimetableSubject = (value: unknown): ScannedTimetableSubject | null => {
  if (!isRecord(value)) {
    return null;
  }
  const subject = value as ScannerRawTimetableSubject;
  return {
    subjectCode: toStringValue(subject.subject_code),
    name: toStringValue(subject.name),
  };
};

const mapTimetableSlot = (value: unknown): ScannedTimetableSlot | null => {
  if (!isRecord(value)) {
    return null;
  }
  const slot = value as ScannerRawTimetableSlot;
  return {
    period: toNullableNumber(slot.period) ?? 0,
    dayOfWeek: toNullableNumber(slot.day_of_week) ?? 0,
    startTime: toStringValue(slot.start_time),
    endTime: toStringValue(slot.end_time),
  };
};

const mapTimetableAssignment = (
  value: unknown,
): ScannedTimetableAssignment | null => {
  if (!isRecord(value)) {
    return null;
  }
  const assignment = value as ScannerRawTimetableAssignment;
  return {
    teacherId: toStringValue(assignment.teacher_id),
    teacherName: toStringValue(assignment.teacher_name),
    subjectCode: toStringValue(assignment.subject_code),
    subjectName: toStringValue(assignment.subject_name),
    groupCode: toStringValue(assignment.group_code),
    gradeLevel: toNullableNumber(assignment.grade_level) ?? 0,
    section: toStringValue(assignment.section),
    period: toNullableNumber(assignment.period) ?? 0,
    dayOfWeek: toNullableNumber(assignment.day_of_week) ?? 0,
    startTime: toStringValue(assignment.start_time),
    endTime: toStringValue(assignment.end_time),
  };
};

const mapTimetableScannerResponse = (
  payload: unknown,
): ScannedTimetableResponse => {
  if (!isRecord(payload)) {
    throw new BadGatewayException(
      'SchoolScanner returned an invalid response payload.',
    );
  }

  const response = payload as ScannerRawResponse & {
    teachers?: unknown;
    class_groups?: unknown;
    subjects?: unknown;
    slots?: unknown;
    assignments?: unknown;
  };
  const uploadedFile = isRecord(response.uploaded_file)
    ? (response.uploaded_file as ScannerRawFile)
    : {};

  return {
    status: toStringValue(response.status, 'unknown'),
    message: toStringValue(
      response.message,
      'Scanner response received without a message.',
    ),
    uploadedFile: {
      filename: toStringValue(uploadedFile.filename, 'unknown'),
      contentType: toStringValue(
        uploadedFile.content_type,
        'application/octet-stream',
      ),
      sizeBytes: toNullableNumber(uploadedFile.size_bytes) ?? 0,
    },
    teachers: Array.isArray(response.teachers)
      ? response.teachers
          .map(mapTimetableTeacher)
          .filter((item): item is ScannedTimetableTeacher => item !== null)
      : [],
    classGroups: Array.isArray(response.class_groups)
      ? response.class_groups
          .map(mapTimetableClassGroup)
          .filter((item): item is ScannedTimetableClassGroup => item !== null)
      : [],
    subjects: Array.isArray(response.subjects)
      ? response.subjects
          .map(mapTimetableSubject)
          .filter((item): item is ScannedTimetableSubject => item !== null)
      : [],
    slots: Array.isArray(response.slots)
      ? response.slots
          .map(mapTimetableSlot)
          .filter((item): item is ScannedTimetableSlot => item !== null)
      : [],
    assignments: Array.isArray(response.assignments)
      ? response.assignments
          .map(mapTimetableAssignment)
          .filter((item): item is ScannedTimetableAssignment => item !== null)
      : [],
    warnings: Array.isArray(response.warnings)
      ? response.warnings.map((warning) => toStringValue(warning)).filter(Boolean)
      : [],
  };
};

const mapCurriculumScheduleItem = (
  value: unknown,
): ScannedCurriculumScheduleItem | null => {
  if (!isRecord(value)) {
    return null;
  }
  const item = value as ScannerRawCurriculumScheduleItem;
  return {
    subjectCode: toStringValue(item.subject_code),
    subjectName: toStringValue(item.subject_name),
    weeklyHours: toNullableNumber(item.weekly_hours) ?? 0,
  };
};

const mapCurriculumScheduleCurriculum = (
  value: unknown,
): ScannedCurriculumScheduleCurriculum | null => {
  if (!isRecord(value)) {
    return null;
  }
  const curriculum = value as ScannerRawCurriculumScheduleCurriculum;
  return {
    gradeLevel: toNullableNumber(curriculum.grade_level) ?? 0,
    trackName: toNullableString(curriculum.track_name),
    specializationName: toNullableString(curriculum.specialization_name),
    groupCodes: Array.isArray(curriculum.group_codes)
      ? curriculum.group_codes.map((item) => toStringValue(item)).filter(Boolean)
      : [],
    weeklyHours: toNullableNumber(curriculum.weekly_hours) ?? 0,
    items: Array.isArray(curriculum.items)
      ? curriculum.items
          .map(mapCurriculumScheduleItem)
          .filter((item): item is ScannedCurriculumScheduleItem => item !== null)
      : [],
  };
};

const mapCurriculumScheduleSession = (
  value: unknown,
): ScannedCurriculumScheduleSession | null => {
  if (!isRecord(value)) {
    return null;
  }
  const session = value as ScannerRawCurriculumScheduleSession;
  return {
    groupCode: toStringValue(session.group_code),
    gradeLevel: toNullableNumber(session.grade_level) ?? 0,
    section: toStringValue(session.section),
    subjectCode: toStringValue(session.subject_code),
    subjectName: toStringValue(session.subject_name),
    period: toNullableNumber(session.period) ?? 0,
    dayOfWeek: toNullableNumber(session.day_of_week) ?? 0,
    isContinuation: toBooleanValue(session.is_continuation),
  };
};

const mapCurriculumScheduleScannerResponse = (
  payload: unknown,
): ScannedCurriculumScheduleResponse => {
  if (!isRecord(payload)) {
    throw new BadGatewayException(
      'SchoolScanner returned an invalid response payload.',
    );
  }

  const response = payload as ScannerRawResponse & {
    class_groups?: unknown;
    subjects?: unknown;
    curricula?: unknown;
    sessions?: unknown;
  };
  const uploadedFile = isRecord(response.uploaded_file)
    ? (response.uploaded_file as ScannerRawFile)
    : {};

  return {
    status: toStringValue(response.status, 'unknown'),
    message: toStringValue(
      response.message,
      'Scanner response received without a message.',
    ),
    uploadedFile: {
      filename: toStringValue(uploadedFile.filename, 'unknown'),
      contentType: toStringValue(
        uploadedFile.content_type,
        'application/octet-stream',
      ),
      sizeBytes: toNullableNumber(uploadedFile.size_bytes) ?? 0,
    },
    classGroups: Array.isArray(response.class_groups)
      ? response.class_groups
          .map(mapTimetableClassGroup)
          .filter((item): item is ScannedTimetableClassGroup => item !== null)
      : [],
    subjects: Array.isArray(response.subjects)
      ? response.subjects
          .map(mapTimetableSubject)
          .filter((item): item is ScannedTimetableSubject => item !== null)
      : [],
    curricula: Array.isArray(response.curricula)
      ? response.curricula
          .map(mapCurriculumScheduleCurriculum)
          .filter(
            (item): item is ScannedCurriculumScheduleCurriculum => item !== null,
          )
      : [],
    sessions: Array.isArray(response.sessions)
      ? response.sessions
          .map(mapCurriculumScheduleSession)
          .filter((item): item is ScannedCurriculumScheduleSession => item !== null)
      : [],
    warnings: Array.isArray(response.warnings)
      ? response.warnings.map((warning) => toStringValue(warning)).filter(Boolean)
      : [],
  };
};

@Injectable()
export class ScannerService {
  private readonly logger = new Logger(ScannerService.name);

  constructor(private readonly configService: ConfigService) {}

  async scanPlanilla(
    file: Express.Multer.File | undefined,
  ): Promise<ScannedPlanillaResponse> {
    if (!file) {
      throw new BadRequestException('A file upload is required.');
    }

    if (!file.buffer || file.buffer.length === 0) {
      throw new BadRequestException('Uploaded file is empty.');
    }

    const baseUrl = this.configService.get<string>('scanner.baseUrl')?.trim();
    if (!baseUrl) {
      throw new ServiceUnavailableException(
        'SchoolScanner is not configured for this environment.',
      );
    }

    const timeoutMs =
      this.configService.get<number>('scanner.timeoutMs') ?? 120000;
    const body = await this.postFileToScanner({
      baseUrl,
      timeoutMs,
      path: '/scan/planilla',
      file,
    });

    return mapScannerResponse(body);
  }

  async scanTimetable(
    file: Express.Multer.File | undefined,
  ): Promise<ScannedTimetableResponse> {
    if (!file) {
      throw new BadRequestException('A file upload is required.');
    }

    if (!file.buffer || file.buffer.length === 0) {
      throw new BadRequestException('Uploaded file is empty.');
    }

    const baseUrl = this.configService.get<string>('scanner.baseUrl')?.trim();
    if (!baseUrl) {
      throw new ServiceUnavailableException(
        'SchoolScanner is not configured for this environment.',
      );
    }

    const timeoutMs =
      this.configService.get<number>('scanner.timeoutMs') ?? 120000;
    const body = await this.postFileToScanner({
      baseUrl,
      timeoutMs,
      path: '/scan/timetable',
      file,
    });

    return mapTimetableScannerResponse(body);
  }

  async scanCurriculumSchedule(
    file: Express.Multer.File | undefined,
  ): Promise<ScannedCurriculumScheduleResponse> {
    if (!file) {
      throw new BadRequestException('A file upload is required.');
    }

    if (!file.buffer || file.buffer.length === 0) {
      throw new BadRequestException('Uploaded file is empty.');
    }

    const baseUrl = this.configService.get<string>('scanner.baseUrl')?.trim();
    if (!baseUrl) {
      throw new ServiceUnavailableException(
        'SchoolScanner is not configured for this environment.',
      );
    }

    const timeoutMs =
      this.configService.get<number>('scanner.timeoutMs') ?? 120000;
    const body = await this.postFileToScanner({
      baseUrl,
      timeoutMs,
      path: '/scan/curriculum-schedule',
      file,
    });

    return mapCurriculumScheduleScannerResponse(body);
  }

  private async postFileToScanner({
    baseUrl,
    timeoutMs,
    path,
    file,
  }: {
    baseUrl: string;
    timeoutMs: number;
    path: string;
    file: Express.Multer.File;
  }): Promise<unknown> {
    const url = `${baseUrl.replace(/\/$/, '')}${path}`;
    const formData = new FormData();
    const bytes = Uint8Array.from(file.buffer);
    const blob = new Blob([bytes], {
      type: file.mimetype || 'application/octet-stream',
    });

    formData.append('file', blob, file.originalname || 'upload');

    let response: Response;
    try {
      response = await fetch(url, {
        method: 'POST',
        body: formData,
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch (error) {
      this.logger.error('Failed to reach SchoolScanner', error);
      throw new ServiceUnavailableException(
        'SchoolScanner is unavailable right now.',
      );
    }

    const body = await this.parseResponse(response);

    if (!response.ok) {
      if (response.status === 422) {
        throw new UnprocessableEntityException(
          extractMessage(body, 'SchoolScanner could not parse the uploaded file.'),
        );
      }

      throw new BadGatewayException(
        extractMessage(
          body,
          `SchoolScanner request failed with status ${response.status}.`,
        ),
      );
    }

    return body;
  }

  private async parseResponse(response: Response): Promise<unknown> {
    const text = await response.text();
    if (!text) {
      return null;
    }

    try {
      return JSON.parse(text) as unknown;
    } catch {
      return text;
    }
  }
}
