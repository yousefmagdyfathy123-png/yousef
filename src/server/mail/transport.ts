export type MailMessage = { to: string; subject: string; text: string };

export interface MailTransport {
  send(input: MailMessage): Promise<void>;
}
