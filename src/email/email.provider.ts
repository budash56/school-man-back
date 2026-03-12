import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer, { Transporter } from 'nodemailer';
import { AppConfig } from '../config/configuration';
import { EmailSendPayload, EmailTransport } from './email.types';

@Injectable()
export class SmtpEmailProvider implements EmailTransport {
  private transporter: Transporter | null = null;

  constructor(private readonly configService: ConfigService<AppConfig>) {}

  async send(payload: EmailSendPayload): Promise<void> {
    const transporter = this.getTransporter();
    await transporter.sendMail({
      from: payload.from,
      to: payload.to,
      bcc: payload.bcc,
      subject: payload.subject,
      text: payload.text,
      html: payload.html,
    });
  }

  async verify(): Promise<void> {
    const transporter = this.getTransporter();
    await transporter.verify();
  }

  private getTransporter(): Transporter {
    if (this.transporter) {
      return this.transporter;
    }

    const emailConfig = this.configService.get('email');
    if (!emailConfig) {
      throw new Error('Email config not available');
    }

    this.transporter = nodemailer.createTransport({
      host: emailConfig.host,
      port: emailConfig.port,
      secure: emailConfig.secure,
      auth: {
        user: emailConfig.user,
        pass: emailConfig.pass,
      },
    });

    return this.transporter;
  }
}
