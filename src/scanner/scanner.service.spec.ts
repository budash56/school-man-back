import {
  BadGatewayException,
  BadRequestException,
  ServiceUnavailableException,
  UnprocessableEntityException,
} from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import type { Express } from 'express';
import { ScannerService } from './scanner.service';

const createConfigService = (
  overrides: Partial<{
    'scanner.baseUrl': string | null;
    'scanner.timeoutMs': number;
  }> = {},
) =>
  ({
    get: jest.fn((key: string) => {
      if (key === 'scanner.baseUrl') {
        return 'scanner.baseUrl' in overrides
          ? overrides['scanner.baseUrl']
          : 'http://scanner:8010';
      }
      if (key === 'scanner.timeoutMs') {
        return 'scanner.timeoutMs' in overrides
          ? overrides['scanner.timeoutMs']
          : 120000;
      }
      return undefined;
    }),
  }) as unknown as ConfigService;

const createFile = (
  overrides: Partial<Express.Multer.File> = {},
): Express.Multer.File =>
  ({
    fieldname: 'file',
    originalname: 'scan.pdf',
    encoding: '7bit',
    mimetype: 'application/pdf',
    size: 4,
    destination: '',
    filename: 'scan.pdf',
    path: '',
    stream: undefined as unknown as NodeJS.ReadableStream,
    buffer: Buffer.from('test'),
    ...overrides,
  }) as Express.Multer.File;

describe('ScannerService', () => {
  let originalFetch: typeof global.fetch;

  beforeEach(() => {
    originalFetch = global.fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('throws BadRequestException when the upload is missing', async () => {
    const service = new ScannerService(createConfigService());

    await expect(service.scanPlanilla(undefined)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('throws ServiceUnavailableException when scanner base URL is not configured', async () => {
    const service = new ScannerService(
      createConfigService({ 'scanner.baseUrl': null }),
    );

    await expect(service.scanPlanilla(createFile())).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });

  it('forwards uploads to SchoolScanner and maps the response to camelCase', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: jest.fn().mockResolvedValue(
        JSON.stringify({
          status: 'stub',
          template_key: 'iedrc-secondary-v1',
          message: 'Scanner endpoint is wired.',
          uploaded_file: {
            filename: 'scan.pdf',
            content_type: 'application/pdf',
            size_bytes: 42,
          },
          metadata: {
            grade_level: 10,
            group_code: '1001',
            subject_name: 'Matematicas',
            teacher_name: 'Ana Perez',
          },
          rows: [
            {
              order: 1,
              student_name: 'Luisa Gomez',
              national_id: '123456789',
              cells: { cog_1: 'A' },
            },
          ],
          warnings: ['Review names for OCR typos.'],
        }),
      ),
    });
    global.fetch = fetchMock as typeof global.fetch;

    const service = new ScannerService(createConfigService());

    const result = await service.scanPlanilla(createFile());

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      'http://scanner:8010/scan/planilla',
      expect.objectContaining({
        method: 'POST',
        body: expect.any(FormData),
        signal: expect.any(AbortSignal),
      }),
    );

    const formData = fetchMock.mock.calls[0][1].body as FormData;
    expect(formData.get('file')).toBeInstanceOf(Blob);

    expect(result).toEqual({
      status: 'stub',
      templateKey: 'iedrc-secondary-v1',
      message: 'Scanner endpoint is wired.',
      uploadedFile: {
        filename: 'scan.pdf',
        contentType: 'application/pdf',
        sizeBytes: 42,
      },
      metadata: {
        gradeLevel: 10,
        groupCode: '1001',
        subjectName: 'Matematicas',
        teacherName: 'Ana Perez',
      },
      rows: [
        {
          order: 1,
          studentName: 'Luisa Gomez',
          nationalId: '123456789',
          cells: { cog_1: 'A' },
        },
      ],
      warnings: ['Review names for OCR typos.'],
    });
  });

  it('throws BadGatewayException when SchoolScanner returns an error response', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 400,
      text: jest
        .fn()
        .mockResolvedValue(JSON.stringify({ detail: 'File must be JPG, PNG, WEBP, or PDF.' })),
    }) as typeof global.fetch;

    const service = new ScannerService(createConfigService());

    await expect(service.scanPlanilla(createFile())).rejects.toEqual(
      expect.objectContaining({
        constructor: BadGatewayException,
        message: 'File must be JPG, PNG, WEBP, or PDF.',
      }),
    );
  });

  it('throws UnprocessableEntityException when SchoolScanner cannot parse the upload', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 422,
      text: jest
        .fn()
        .mockResolvedValue(JSON.stringify({ detail: 'OCR failed during model initialization.' })),
    }) as typeof global.fetch;

    const service = new ScannerService(createConfigService());

    await expect(service.scanPlanilla(createFile())).rejects.toEqual(
      expect.objectContaining({
        constructor: UnprocessableEntityException,
        message: 'OCR failed during model initialization.',
      }),
    );
  });
});
