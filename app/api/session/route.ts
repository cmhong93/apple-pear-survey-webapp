import { createUnauthorizedResponse, getSessionUser } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return createUnauthorizedResponse();

  return Response.json({ user });
}
