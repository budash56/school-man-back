export type WelcomeEmailInput = {
  recipientEmail: string;
  recipientName: string;
  username: string;
  temporaryPassword: string;
  coordinatorName: string;
  schoolName: string;
};

export type MeetingNotificationInput = {
  recipientEmails: string[];
  subject: string;
  message: string;
  meetingDate?: string;
  coordinatorName: string;
  schoolName: string;
};

export type MeetingNotificationResult = {
  totalRecipients: number;
  totalBatches: number;
  sentBatches: number;
  failedBatches: number;
  failures: { batchIndex: number; error: string }[];
};

export type EmailSendPayload = {
  from: string;
  to: string;
  bcc?: string[];
  subject: string;
  text: string;
  html: string;
};

export interface EmailTransport {
  send(payload: EmailSendPayload): Promise<void>;
  verify(): Promise<void>;
}
