import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

export type UserRole = "admin" | "surveyor";

export type AuthUser = {
  userId: string;
  role: UserRole;
  surveyorId: string;
};

type LoginUser = AuthUser & {
  password: string;
};

const sessionCookieName = "survey-session";
const sessionSecret =
  process.env.SURVEY_SESSION_SECRET ?? "local-dev-survey-session-secret";

const loginUsers: Record<string, LoginUser> = {
  admin: {
    userId: "admin",
    password: "admin",
    role: "admin",
    surveyorId: "ADMIN",
  },
  S01: {
    userId: "S01",
    password: "S01",
    role: "surveyor",
    surveyorId: "S01",
  },
  S02: {
    userId: "S02",
    password: "S02",
    role: "surveyor",
    surveyorId: "S02",
  },
  TEST: {
    userId: "TEST",
    password: "TEST",
    role: "surveyor",
    surveyorId: "TEST",
  },
};

export function authenticateUser(userId: string, password: string) {
  const user = loginUsers[userId];
  if (!user || user.password !== password) return undefined;

  return {
    userId: user.userId,
    role: user.role,
    surveyorId: user.surveyorId,
  } satisfies AuthUser;
}

export async function getSessionUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(sessionCookieName)?.value;
  if (!token) return undefined;

  return verifySessionToken(token);
}

export async function setSessionUser(user: AuthUser) {
  const cookieStore = await cookies();
  cookieStore.set(sessionCookieName, createSessionToken(user), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 8,
  });
}

export async function clearSessionUser() {
  const cookieStore = await cookies();
  cookieStore.set(sessionCookieName, "", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

export function createUnauthorizedResponse() {
  return Response.json(
    { error: "로그인이 필요합니다." },
    { status: 401 }
  );
}

function createSessionToken(user: AuthUser) {
  const payload = Buffer.from(JSON.stringify(user), "utf8").toString("base64url");
  const signature = sign(payload);
  return `${payload}.${signature}`;
}

function verifySessionToken(token: string): AuthUser | undefined {
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return undefined;

  const expectedSignature = sign(payload);
  const incoming = Buffer.from(signature);
  const expected = Buffer.from(expectedSignature);
  if (
    incoming.length !== expected.length ||
    !timingSafeEqual(incoming, expected)
  ) {
    return undefined;
  }

  try {
    const user = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8")
    ) as AuthUser;
    if (user.role !== "admin" && user.role !== "surveyor") return undefined;
    if (!user.userId || !user.surveyorId) return undefined;
    return user;
  } catch {
    return undefined;
  }
}

function sign(payload: string) {
  return createHmac("sha256", sessionSecret)
    .update(payload)
    .digest("base64url");
}
