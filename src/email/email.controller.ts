import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiForbiddenResponse, ApiTags } from '@nestjs/swagger';
import { Roles } from '../auth/roles.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { SanitizedUser } from '../auth/auth.types';
import { EmailService } from './email.service';
import { SendMeetingNotificationDto } from './dto/send-meeting-notification.dto';

@ApiTags('emails')
@Roles('admin', 'coordinator')
@ApiBearerAuth('bearer')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('emails')
export class EmailController {
  constructor(private readonly emailService: EmailService) {}

  @Post('meeting')
  @ApiForbiddenResponse({
    description: 'Forbidden: requires role admin, coordinator',
  })
  sendMeeting(
    @Body() dto: SendMeetingNotificationDto,
    @CurrentUser() user: SanitizedUser,
  ) {
    const coordinatorName = this.formatCoordinatorName(user);
    return this.emailService.sendMeetingNotification({
      recipientEmails: dto.recipientEmails,
      subject: dto.subject,
      message: dto.message,
      meetingDate: dto.meetingDate,
      coordinatorName,
      schoolName: this.emailService.getSchoolName(),
    });
  }

  private formatCoordinatorName(user: SanitizedUser): string {
    const name = [user.firstName, user.lastName].filter(Boolean).join(' ').trim();
    return name || user.username;
  }
}
