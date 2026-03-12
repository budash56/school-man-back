import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import configuration from '../src/config/configuration';
import { EmailModule } from '../src/email/email.module';
import { EmailService } from '../src/email/email.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    EmailModule,
  ],
})
class EmailCliModule {}

const run = async () => {
  const recipient = process.argv[2];
  if (!recipient) {
    console.error('Usage: npm run email:test -- recipient@example.com');
    process.exit(1);
  }

  const app = await NestFactory.createApplicationContext(EmailCliModule, {
    logger: ['log', 'error', 'warn'],
  });

  try {
    const emailService = app.get(EmailService);
    await emailService.sendTestEmail(recipient);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(message);
    await app.close();
    process.exit(1);
  }

  await app.close();
};

run();
