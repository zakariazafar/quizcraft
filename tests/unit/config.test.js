import { describe, expect, it } from 'vitest';
import { EMULATOR_PROJECT_ID, readConfig } from '../../src/lib/config.js';

describe('readConfig', () => {
  it('reads a real Firebase project', () => {
    const c = readConfig({
      VITE_FIREBASE_API_KEY: ' key ',
      VITE_FIREBASE_AUTH_DOMAIN: 'p.firebaseapp.com',
      VITE_FIREBASE_PROJECT_ID: 'quizcraft-1',
      VITE_FIREBASE_APP_ID: '1:2:web:3',
      VITE_DASHBOARD_EMAIL: 'dashboard@quizcraft.local',
      VITE_SITE_URL: 'https://quiz.example.com/',
    });
    expect(c.configured).toBe(true);
    expect(c.useEmulators).toBe(false);
    expect(c.firebase).toEqual({
      apiKey: 'key',
      authDomain: 'p.firebaseapp.com',
      projectId: 'quizcraft-1',
      appId: '1:2:web:3',
    });
    expect(c.siteUrl).toBe('https://quiz.example.com');
    expect(c.dashboardEmail).toBe('dashboard@quizcraft.local');
  });

  it('is not configured without Firebase values', () => {
    const c = readConfig({});
    expect(c.configured).toBe(false);
    expect(c.siteUrl).toBe('');
    expect(c.emulatorHost).toBe('127.0.0.1');
  });

  it('fills demo values when using the emulators', () => {
    const c = readConfig({ VITE_USE_EMULATORS: 'true', VITE_EMULATOR_HOST: 'localhost' });
    expect(c.configured).toBe(true);
    expect(c.firebase.projectId).toBe(EMULATOR_PROJECT_ID);
    expect(c.emulatorHost).toBe('localhost');
  });

  it('ignores non-string values', () => {
    expect(readConfig({ VITE_USE_EMULATORS: true }).useEmulators).toBe(false);
  });

  it('is email-configured only once all three EmailJS values are set', () => {
    expect(readConfig({}).emailConfigured).toBe(false);
    expect(
      readConfig({ VITE_EMAILJS_SERVICE_ID: 's', VITE_EMAILJS_TEMPLATE_ID: 't' }).emailConfigured,
    ).toBe(false);
    const c = readConfig({
      VITE_EMAILJS_SERVICE_ID: 's',
      VITE_EMAILJS_TEMPLATE_ID: 't',
      VITE_EMAILJS_PUBLIC_KEY: 'k',
    });
    expect(c.emailConfigured).toBe(true);
    expect(c.emailjs).toEqual({ serviceId: 's', templateId: 't', publicKey: 'k' });
  });
});
