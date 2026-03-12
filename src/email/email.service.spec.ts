import { Logger } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import type { AppConfig } from '../config/configuration';
import { EMAIL_TRANSPORT } from './email.constants';
import { EmailService } from './email.service';
import type { EmailTransport } from './email.types';

const createEmailConfig = (
  overrides: Partial<AppConfig['email']> = {},
): AppConfig['email'] => ({
  enabled: true,
  provider: 'smtp',
  host: 'smtp.gmail.com',
  port: 465,
  secure: true,
  user: 'school@example.com',
  pass: 'app-pass',
  fromName: 'Colegio Central',
  fromAddress: 'school@example.com',
  bulkBatchSize: 20,
  ...overrides,
});

const buildService = async (overrides: Partial<AppConfig['email']> = {}) => {
  const emailConfig = createEmailConfig(overrides);
  const transport: EmailTransport = {
    send: jest.fn().mockResolvedValue(undefined),
    verify: jest.fn().mockResolvedValue(undefined),
  };

  const moduleRef = await Test.createTestingModule({
    imports: [
      ConfigModule.forRoot({
        ignoreEnvFile: true,
        load: [() => ({ email: emailConfig })],
      }),
    ],
    providers: [
      EmailService,
      {
        provide: EMAIL_TRANSPORT,
        useValue: transport,
      },
    ],
  }).compile();

  return {
    service: moduleRef.get(EmailService),
    transport,
    emailConfig,
    moduleRef,
  };
};

describe('EmailService', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('uses BCC for meeting notification and hides recipients', async () => {
    const { service, transport, emailConfig, moduleRef } = await buildService({
      bulkBatchSize: 10,
    });

    await service.sendMeetingNotification({
      recipientEmails: ['prof1@example.com', 'prof2@example.com'],
      subject: 'Reunion general',
      message: 'Reunion el viernes a las 3pm',
      meetingDate: '2026-03-20 15:00',
      coordinatorName: 'Coord. Juan',
      schoolName: emailConfig.fromName,
    });

    expect(transport.send).toHaveBeenCalledTimes(1);
    const payload = (transport.send as jest.Mock).mock.calls[0][0];
    expect(payload.to).toBe(emailConfig.fromAddress);
    expect(payload.bcc).toEqual(['prof1@example.com', 'prof2@example.com']);

    await moduleRef.close();
  });

  it('splits meeting notifications into batches', async () => {
    const { service, transport, emailConfig, moduleRef } = await buildService({
      bulkBatchSize: 2,
    });

    await service.sendMeetingNotification({
      recipientEmails: [
        'prof1@example.com',
        'prof2@example.com',
        'prof3@example.com',
        'prof4@example.com',
        'prof5@example.com',
      ],
      subject: 'Reunion general',
      message: 'Reunion el viernes a las 3pm',
      meetingDate: '2026-03-20 15:00',
      coordinatorName: 'Coord. Juan',
      schoolName: emailConfig.fromName,
    });

    expect(transport.send).toHaveBeenCalledTimes(3);
    const calls = (transport.send as jest.Mock).mock.calls.map(
      (call) => call[0].bcc,
    );
    expect(calls[0]).toHaveLength(2);
    expect(calls[1]).toHaveLength(2);
    expect(calls[2]).toHaveLength(1);

    await moduleRef.close();
  });

  it('logs preview and skips sending when disabled', async () => {
    const logSpy = jest
      .spyOn(Logger.prototype, 'log')
      .mockImplementation(() => undefined);
    const { service, transport, emailConfig, moduleRef } = await buildService({
      enabled: false,
    });

    await service.sendWelcomeEmail({
      recipientEmail: 'prof1@example.com',
      recipientName: 'Ana Gomez',
      nationalId: '950001',
      temporaryPassword: 'Temp#1234',
      coordinatorName: 'Coord. Maria',
      schoolName: emailConfig.fromName,
    });

    expect(transport.send).not.toHaveBeenCalled();
    expect(
      logSpy.mock.calls.some((call) => String(call[0]).includes('EMAIL_PREVIEW')),
    ).toBe(true);

    await moduleRef.close();
  });

  it('verifies SMTP connection through provider', async () => {
    const { service, transport, moduleRef } = await buildService();

    await service.verifyConnection();

    expect(transport.verify).toHaveBeenCalledTimes(1);

    await moduleRef.close();
  });

  it('sends test email when enabled', async () => {
    const { service, transport, moduleRef } = await buildService();

    await service.sendTestEmail('prof1@example.com');

    expect(transport.send).toHaveBeenCalledTimes(1);
    const payload = (transport.send as jest.Mock).mock.calls[0][0];
    expect(payload.to).toBe('prof1@example.com');
    expect(payload.subject).toBe('SMTP test from school system');

    await moduleRef.close();
  });

  it('previews test email when disabled', async () => {
    const logSpy = jest
      .spyOn(Logger.prototype, 'log')
      .mockImplementation(() => undefined);
    const { service, transport, moduleRef } = await buildService({
      enabled: false,
    });

    await service.sendTestEmail('prof1@example.com');

    expect(transport.send).not.toHaveBeenCalled();
    expect(
      logSpy.mock.calls.some((call) => String(call[0]).includes('EMAIL_PREVIEW')),
    ).toBe(true);

    await moduleRef.close();
  });

  it('reports failures when a batch send fails', async () => {
    const { service, transport, emailConfig, moduleRef } = await buildService({
      bulkBatchSize: 2,
    });

    (transport.send as jest.Mock)
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error('SMTP error'))
      .mockResolvedValueOnce(undefined);

    const result = await service.sendMeetingNotification({
      recipientEmails: [
        'prof1@example.com',
        'prof2@example.com',
        'prof3@example.com',
        'prof4@example.com',
        'prof5@example.com',
      ],
      subject: 'Reunion general',
      message: 'Reunion el viernes a las 3pm',
      meetingDate: '2026-03-20 15:00',
      coordinatorName: 'Coord. Juan',
      schoolName: emailConfig.fromName,
    });

    expect(result.totalBatches).toBe(3);
    expect(result.sentBatches).toBe(2);
    expect(result.failedBatches).toBe(1);
    expect(result.failures).toHaveLength(1);
    expect(result.failures[0].batchIndex).toBe(1);

    await moduleRef.close();
  });

  it('throws on startup when enabled and config is missing', async () => {
    await expect(
      buildService({
        enabled: true,
        pass: '',
      }),
    ).rejects.toThrow(/Email configuration missing/);
  });
});
