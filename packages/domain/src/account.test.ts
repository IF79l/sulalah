import { describe, expect, it } from 'vitest';
import { signedInWithin } from './account';

const now = 1_793_046_992;

describe('a fresh sign in before deleting an account', () => {
  it('counts a code entered a minute ago', () => {
    expect(signedInWithin([{ method: 'otp', timestamp: now - 60 }], now)).toBe(true);
  });

  it('refuses a sign in older than ten minutes', () => {
    expect(signedInWithin([{ method: 'otp', timestamp: now - 11 * 60 }], now)).toBe(false);
    expect(signedInWithin([{ method: 'otp', timestamp: now - 10 * 60 }], now)).toBe(true);
  });

  it('goes by the latest of several sign ins', () => {
    const amr = [
      { method: 'otp', timestamp: now - 86_400 },
      { method: 'otp', timestamp: now - 30 },
    ];
    expect(signedInWithin(amr, now)).toBe(true);
  });

  it('treats a token that cannot show its time as old', () => {
    expect(signedInWithin(undefined, now)).toBe(false);
    expect(signedInWithin([], now)).toBe(false);
    expect(signedInWithin(['otp'], now)).toBe(false);
    expect(signedInWithin([{ method: 'otp' }], now)).toBe(false);
  });

  it('refuses a time from the future', () => {
    expect(signedInWithin([{ method: 'otp', timestamp: now + 3600 }], now)).toBe(false);
  });
});
