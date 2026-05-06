import { createUnauthorizedResponse, getSessionUser } from "@/lib/auth";
import { geocodeAddress, hasKakaoRestApiKey } from "@/lib/kakaoLocal";

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return createUnauthorizedResponse();

  const body = (await request.json().catch(() => undefined)) as
    | { address?: string }
    | undefined;
  const address = body?.address;

  if (!address || typeof address !== "string") {
    return Response.json({ error: "address is required." }, { status: 400 });
  }

  if (!hasKakaoRestApiKey()) {
    return Response.json(
      { error: "Kakao Local API is not configured." },
      { status: 500 }
    );
  }

  try {
    const candidates = await geocodeAddress(address);
    const primary = candidates[0];

    return Response.json({
      latitude: primary?.latitude ?? null,
      longitude: primary?.longitude ?? null,
      address_name: primary?.address_name ?? "",
      road_address: primary?.road_address ?? "",
      rawCandidates: candidates.map((candidate) => ({
        latitude: candidate.latitude,
        longitude: candidate.longitude,
        address_name: candidate.address_name,
        road_address: candidate.road_address,
        raw: candidate.raw,
      })),
    });
  } catch {
    return Response.json(
      { error: "Kakao address geocode request failed." },
      { status: 502 }
    );
  }
}
