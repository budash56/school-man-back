import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppConfig } from '../config/configuration';
import { EMAIL_TRANSPORT } from './email.constants';
import {
  EmailSendPayload,
  EmailTransport,
  MeetingNotificationInput,
  MeetingNotificationResult,
  WelcomeEmailInput,
} from './email.types';
import {
  buildMeetingNotificationEmail,
  buildWelcomeEmail,
} from './email.templates';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly emailConfig: AppConfig['email'];

  constructor(
    private readonly configService: ConfigService<AppConfig>,
    @Inject(EMAIL_TRANSPORT) private readonly transport: EmailTransport,
  ) {
    this.emailConfig = this.configService.get('email') as AppConfig['email'];
    this.assertConfig(this.emailConfig);
  }

  async sendWelcomeEmail(input: WelcomeEmailInput): Promise<{ sent: boolean }> {
    const { subject, text, html } = buildWelcomeEmail(input);
    const payload: EmailSendPayload = {
      from: this.formatFrom(),
      to: input.recipientEmail,
      subject,
      text,
      html,
    };

    await this.sendOrPreview('welcome', payload, {
      subject,
      recipient: input.recipientEmail,
    });

    return { sent: this.emailConfig.enabled };
  }

  async sendMeetingNotification(
    input: MeetingNotificationInput,
  ): Promise<MeetingNotificationResult> {
    const uniqueRecipients = Array.from(
      new Set(input.recipientEmails.map((email) => email.trim()).filter(Boolean)),
    );
    const batchSize = Math.max(this.emailConfig.bulkBatchSize || 20, 1);
    const batches = this.splitIntoBatches(uniqueRecipients, batchSize);

    const result: MeetingNotificationResult = {
      totalRecipients: uniqueRecipients.length,
      totalBatches: batches.length,
      sentBatches: 0,
      failedBatches: 0,
      failures: [],
    };

    if (batches.length === 0) {
      return result;
    }

    for (let index = 0; index < batches.length; index += 1) {
      const batch = batches[index];
      const { subject, text, html } = buildMeetingNotificationEmail(input);
      const payload: EmailSendPayload = {
        from: this.formatFrom(),
        to: this.emailConfig.fromAddress,
        bcc: batch,
        subject,
        text,
        html,
      };

      try {
        await this.sendOrPreview('meeting', payload, {
          subject,
          batchIndex: index,
          bccCount: batch.length,
        });
        result.sentBatches += 1;
      } catch (error) {
        result.failedBatches += 1;
        result.failures.push({
          batchIndex: index,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        this.logger.error(
          `Email batch ${index + 1}/${batches.length} failed`,
          error instanceof Error ? error.stack : undefined,
        );
      }
    }

    return result;
  }

  getSchoolName(): string {
    return this.emailConfig.fromName || this.emailConfig.fromAddress;
  }

  private async sendOrPreview(
    type: 'welcome' | 'meeting',
    payload: EmailSendPayload,
    meta: Record<string, unknown>,
  ) {
    if (!this.emailConfig.enabled) {
      this.logPreview(type, payload);
      this.logger.log(
        `Email preview logged (${type}).`,
      );
      return;
    }

    await this.transport.send(payload);
    this.logger.log(`Email sent (${type}).`);
    this.logger.debug(meta);
  }

  private logPreview(type: string, payload: EmailSendPayload) {
    const preview = {
      type,
      from: payload.from,
      to: payload.to,
      bccCount: payload.bcc?.length ?? 0,
      subject: payload.subject,
      bodyPreview: payload.text.slice(0, 160),
    };
    this.logger.log(`EMAIL_PREVIEW ${JSON.stringify(preview)}`);
  }

  private splitIntoBatches(list: string[], size: number): string[][] {
    const batches: string[][] = [];
    for (let i = 0; i < list.length; i += size) {
      batches.push(list.slice(i, i + size));
    }
    return batches;
  }

  private formatFrom(): string {
    if (!this.emailConfig.fromName) {
      return this.emailConfig.fromAddress;
    }
    return `${this.emailConfig.fromName} <${this.emailConfig.fromAddress}>`;
  }

  private assertConfig(config: AppConfig['email']) {
    if (!config) {
      throw new Error('Email configuration is missing.');
    }

    if (!config.enabled) {
      return;
    }

    const required = [
      { key: 'provider', value: config.provider },
      { key: 'host', value: config.host },
      { key: 'port', value: config.port },
      { key: 'user', value: config.user },
      { key: 'pass', value: config.pass },
      { key: 'fromName', value: config.fromName },
      { key: 'fromAddress', value: config.fromAddress },
    ];

    const missing = required.filter((entry) => !entry.value);
    if (missing.length > 0) {
      throw new Error(
        `Email configuration missing: ${missing
          .map((entry) => entry.key)
          .join(', ')}`,
      );
    }

    if (config.provider !== 'smtp') {
      throw new Error(`Unsupported email provider: ${config.provider}`);
    }
  }
}
