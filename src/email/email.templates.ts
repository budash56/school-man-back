import { MeetingNotificationInput, WelcomeEmailInput } from './email.types';

export const buildWelcomeEmail = (input: WelcomeEmailInput) => {
  const subject = 'Your account has been created';
  const text = [
    `Hola ${input.recipientName},`,
    '',
    `Tu cuenta ha sido creada en ${input.schoolName}.`,
    `Usuario: ${input.username}`,
    `Contraseña temporal: ${input.temporaryPassword}`,
    'Por favor cambia la contraseña en tu primer inicio de sesión.',
    '',
    `Coordinación: ${input.coordinatorName}`,
    `— ${input.schoolName}`,
  ].join('\n');

  const html = `
    <p>Hola ${input.recipientName},</p>
    <p>Tu cuenta ha sido creada en <strong>${input.schoolName}</strong>.</p>
    <p><strong>Usuario:</strong> ${input.username}<br/>
    <strong>Contraseña temporal:</strong> ${input.temporaryPassword}</p>
    <p>Por favor cambia la contraseña en tu primer inicio de sesión.</p>
    <p>Coordinación: ${input.coordinatorName}<br/>
    — ${input.schoolName}</p>
  `;

  return { subject, text, html };
};

export const buildMeetingNotificationEmail = (
  input: MeetingNotificationInput,
) => {
  const subject = input.subject;
  const dateLine = input.meetingDate ? `Fecha: ${input.meetingDate}` : null;
  const text = [
    'Hola,',
    '',
    input.message,
    dateLine,
    '',
    `Coordinación: ${input.coordinatorName}`,
    `— ${input.schoolName}`,
  ]
    .filter((line): line is string => Boolean(line))
    .join('\n');

  const htmlDate = input.meetingDate
    ? `<p><strong>Fecha:</strong> ${input.meetingDate}</p>`
    : '';
  const html = `
    <p>Hola,</p>
    <p>${input.message}</p>
    ${htmlDate}
    <p>Coordinación: ${input.coordinatorName}<br/>
    — ${input.schoolName}</p>
  `;

  return { subject, text, html };
};
