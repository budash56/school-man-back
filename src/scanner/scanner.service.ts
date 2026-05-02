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
    const url = `${baseUrl.replace(/\/$/, '')}/scan/planilla`;
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

    return mapScannerResponse(body);
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
