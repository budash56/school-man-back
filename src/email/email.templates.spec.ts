import { buildMeetingNotificationEmail, buildWelcomeEmail } from './email.templates';

describe('Email templates', () => {
  it('builds welcome email with nationalId and temp password', () => {
    const result = buildWelcomeEmail({
      recipientEmail: 'prof1@example.com',
      recipientName: 'Ana Gomez',
      nationalId: '950001',
      temporaryPassword: 'Temp#1234',
      coordinatorName: 'Coord. Maria',
      schoolName: 'Colegio Central',
    });

    expect(result.subject).toBe('Your account has been created');
    expect(result.text).toContain('Ana Gomez');
    expect(result.text).toContain('950001');
    expect(result.text).toContain('Temp#1234');
    expect(result.text).toContain('Coord. Maria');
    expect(result.text).toContain('Colegio Central');
    expect(result.html).toContain('950001');
    expect(result.html).toContain('Temp#1234');
  });

  it('builds meeting notification with optional date', () => {
    const result = buildMeetingNotificationEmail({
      recipientEmails: ['prof1@example.com'],
      subject: 'Reunion general',
      message: 'Reunion el viernes a las 3pm',
      meetingDate: '2026-03-20 15:00',
      coordinatorName: 'Coord. Juan',
      schoolName: 'Colegio Central',
    });

    expect(result.subject).toBe('Reunion general');
    expect(result.text).toContain('Reunion el viernes a las 3pm');
    expect(result.text).toContain('Fecha: 2026-03-20 15:00');
    expect(result.text).toContain('Coord. Juan');
    expect(result.text).toContain('Colegio Central');
    expect(result.html).toContain('Fecha:');
  });
});
