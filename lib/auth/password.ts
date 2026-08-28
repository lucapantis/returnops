import bcrypt from "bcryptjs";

// bcrypt work factor. 12 is a sensible 2020s default: ~250ms/hash on modern
// serverless hardware — costly enough to slow offline cracking, cheap enough
// for an interactive login.
const BCRYPT_ROUNDS = 12;

// A pre-computed hash of a random string. `verifyPassword` is run against this
// when the supplied email doesn't match a user, so a failed login takes the
// same time whether or not the account exists (mitigates user enumeration by
// timing).
export const DUMMY_HASH =
  "$2b$12$teopKiptFb3SgDo2zWnuTu.bpZqYIW4ZdIDiPt1ndnRe14q1SKQtC";

export function hashPassword(plaintext: string): Promise<string> {
  return bcrypt.hash(plaintext, BCRYPT_ROUNDS);
}

export function verifyPassword(
  plaintext: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(plaintext, hash);
}
