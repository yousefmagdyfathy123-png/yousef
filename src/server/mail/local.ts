import type { MailMessage, MailTransport } from './transport';

export function createLocalMailTransport(
  environment: string | undefined = process.env.NODE_ENV,
): MailTransport & { messages: readonly MailMessage[] } {
  if (process.env.NODE_ENV === 'production' || !['development', 'test'].includes(environment ?? '')) {
    throw new Error('Local mail capture is available only in development and test');
  }
  const messages: MailMessage[] = [];
  return {
    get messages() {
      return messages.map(message => ({ ...message }));
    },
    async send(message) {
      messages.push({ ...message });
    },
  };
}
