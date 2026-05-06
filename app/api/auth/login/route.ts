import { authenticateUser, setSessionUser } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    userId?: string;
    password?: string;
  };
  const user = authenticateUser(body.userId ?? "", body.password ?? "");

  if (!user) {
    return Response.json(
      { error: "아이디 또는 비밀번호가 올바르지 않습니다." },
      { status: 401 }
    );
  }

  await setSessionUser(user);

  return Response.json({ user });
}
