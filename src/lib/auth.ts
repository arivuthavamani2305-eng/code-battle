import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const COOKIE_NAME = "cb_session";
const SESSION_TTL_SECONDS = 60 * 60 * 6; // 6 hours, plenty for a contest day

function getSecret() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    // Fail loudly rather than silently signing with an empty/weak secret.
    throw new Error("AUTH_SECRET is not set. Refusing to start auth.");
  }
  return new TextEncoder().encode(secret);
}

export type SessionPayload = {
  sub: string; // participantId, or "admin"
  role: "participant" | "admin";
};

export async function createSessionCookie(payload: SessionPayload) {
  const token = await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(getSecret());

  cookies().set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export function clearSessionCookie() {
  cookies().delete(COOKIE_NAME);
}

export async function getSession(): Promise<SessionPayload | null> {
  const token = cookies().get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return payload as unknown as SessionPayload;
  } catch {
    // Expired or tampered token - treat as logged out, never trust it.
    return null;
  }
}

export async function requireParticipant() {
  const session = await getSession();
  if (!session || session.role !== "participant") return null;
  return session;
}

export async function requireAdmin() {
  const session = await getSession();
  if (!session || session.role !== "admin") return null;
  return session;
}
