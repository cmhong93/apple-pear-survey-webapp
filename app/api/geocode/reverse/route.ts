import { createUnauthorizedResponse, getSessionUser } from "@/lib/auth";
import { hasKakaoRestApiKey, reverseGeocode } from "@/lib/kakaoLocal";

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return createUnauthorizedResponse();

  const body = (await request.json().catch(() => undefined)) as
    | { latitude?: string | number; longitude?: string | number }
    | undefined;
  const latitude = Number(body?.latitude);
  const longitude = Number(body?.longitude);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return Response.json(
      { error: "latitude and longitude are required." },
      { status: 400 }
    );
  }

  if (!hasKakaoRestApiKey()) {
    return Response.json(
      { error: "Kakao Local API is not configured." },
      { status: 500 }
    );
  }

  try {
    const result = await reverseGeocode(latitude, longitude);

    return Response.json({
      address_name: result?.address_name ?? "",
      road_address: result?.road_address ?? "",
      region_1depth_name: result?.region_1depth_name ?? "",
      region_2depth_name: result?.region_2depth_name ?? "",
      region_3depth_name: result?.region_3depth_name ?? "",
    });
  } catch {
    return Response.json(
      { error: "Kakao reverse geocode request failed." },
      { status: 502 }
    );
  }
}
