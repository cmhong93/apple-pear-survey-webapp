import { createUnauthorizedResponse, getSessionUser } from "@/lib/auth";
import { geocodeAddress, hasKakaoRestApiKey } from "@/lib/kakaoLocal";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return createUnauthorizedResponse();

  const body = (await request.json().catch(() => undefined)) as
    | { field_address?: string; address?: string }
    | undefined;
  const address = body?.field_address || body?.address || "";

  if (!address || typeof address !== "string") {
    return Response.json({ error: "field_address or address is required." }, { status: 400 });
  }
  if (!hasKakaoRestApiKey()) {
    return Response.json({ error: "Kakao Local API is not configured." }, { status: 500 });
  }

  try {
    const candidates = await geocodeAddress(address);
    const primary = candidates[0];

    return Response.json({
      latitude: primary?.latitude ?? null,
      longitude: primary?.longitude ?? null,
      address_name: primary?.address_name ?? "",
      road_address: primary?.road_address ?? "",
      source: "kakao_local",
    });
  } catch {
    return Response.json({ error: "Kakao geocode request failed." }, { status: 502 });
  }
}
