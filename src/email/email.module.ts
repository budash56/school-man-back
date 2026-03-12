import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EMAIL_TRANSPORT } from './email.constants';
import { EmailService } from './email.service';
import { SmtpEmailProvider } from './email.provider';
import { EmailController } from './email.controller';

@Module({
  imports: [ConfigModule],
  providers: [
    EmailService,
    SmtpEmailProvider,
    {
      provide: EMAIL_TRANSPORT,
      useExisting: SmtpEmailProvider,
    },
  ],
  controllers: [EmailController],
  exports: [EmailService],
})
export class EmailModule {}
