// Serverless-safe brute-force protection.
//
// A serverless function can't keep an in-memory attempt counter between
// invocations, so failed logins are tracked on the `User` row itself. After
// `MAX_FAILED_ATTEMPTS` consecutive failures the account is locked for
// `LOCK_DURATION_MS`; a successful login clears both counters. The lock is
// per-account, which is the meaningful unit for a small fixed set of internal
// users (there is no public registration to enumerate).

export const MAX_FAILED_ATTEMPTS = 5;
export const LOCK_DURATION_MS = 15 * 60 * 1000; // 15 minutes

export interface LockoutState {
  failedLoginAttempts: number;
  lockedUntil: Date | null;
}

/** Is this account currently locked out? */
export function isLocked(
  user: LockoutState,
  now: Date = new Date()
): boolean {
  return user.lockedUntil != null && user.lockedUntil.getTime() > now.getTime();
}

/**
 * The counter update to persist after a *failed* login attempt. Once the
 * threshold is reached the account is locked and the counter resets, so the
 * next window starts clean after the lock expires.
 */
export function registerFailure(
  user: LockoutState,
  now: Date = new Date()
): LockoutState {
  const attempts = user.failedLoginAttempts + 1;
  if (attempts >= MAX_FAILED_ATTEMPTS) {
    return {
      failedLoginAttempts: 0,
      lockedUntil: new Date(now.getTime() + LOCK_DURATION_MS),
    };
  }
  return { failedLoginAttempts: attempts, lockedUntil: null };
}

/** The counter state to persist after a *successful* login. */
export function registerSuccess(): LockoutState {
  return { failedLoginAttempts: 0, lockedUntil: null };
}
