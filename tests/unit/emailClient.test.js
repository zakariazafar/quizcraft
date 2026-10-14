import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@emailjs/browser', () => ({
  default: { send: vi.fn(() => Promise.resolve({ status: 200, text: 'OK' })) },
}));

const emailjs = (await import('@emailjs/browser')).default;
const { emailjsResultSender } = await import('../../src/lib/emailClient.js');
const { readConfig } = await import('../../src/lib/config.js');

beforeEach(() => {
  vi.clearAllMocks();
});

describe('emailjsResultSender', () => {
  it('sends the template params through the configured EmailJS service and template', async () => {
    const send = emailjsResultSender(
      readConfig({
        VITE_EMAILJS_SERVICE_ID: 'service-1',
        VITE_EMAILJS_TEMPLATE_ID: 'template-1',
        VITE_EMAILJS_PUBLIC_KEY: 'public-key-1',
      }),
    );
    await send({ to_email: 'a@b.com', message: 'hi' });
    expect(emailjs.send).toHaveBeenCalledWith(
      'service-1',
      'template-1',
      { to_email: 'a@b.com', message: 'hi' },
      { publicKey: 'public-key-1' },
    );
  });

  it('propagates a send failure so the caller can show it failed', async () => {
    emailjs.send.mockRejectedValueOnce(new Error('network down'));
    const send = emailjsResultSender(
      readConfig({
        VITE_EMAILJS_SERVICE_ID: 's',
        VITE_EMAILJS_TEMPLATE_ID: 't',
        VITE_EMAILJS_PUBLIC_KEY: 'k',
      }),
    );
    await expect(send({})).rejects.toThrow('network down');
  });
});
