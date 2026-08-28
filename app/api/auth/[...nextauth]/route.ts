// Auth.js credentials + session endpoints (sign-in callback, CSRF token,
// session, sign-out). Backed by the full configuration in `auth.ts`.
import { handlers } from "@/auth";

export const { GET, POST } = handlers;
