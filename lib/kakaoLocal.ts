import "server-only";

export type KakaoAddressCandidate = {
  latitude: number;
  longitude: number;
  address_name: string;
  road_address: string;
  raw: unknown;
};

export type KakaoReverseAddress = {
  address_name: string;
  road_address: string;
  region_1depth_name: string;
  region_2depth_name: string;
  region_3depth_name: string;
  raw: unknown;
};

type KakaoAddressDocument = {
  address_name?: string;
  x?: string;
  y?: string;
  address?: {
    address_name?: string;
  } | null;
  road_address?: {
    address_name?: string;
  } | null;
};

type KakaoReverseDocument = {
  address?: {
    address_name?: string;
    region_1depth_name?: string;
    region_2depth_name?: string;
    region_3depth_name?: string;
  } | null;
  road_address?: {
    address_name?: string;
    region_1depth_name?: string;
    region_2depth_name?: string;
    region_3depth_name?: string;
  } | null;
};

const kakaoLocalBaseUrl = "https://dapi.kakao.com/v2/local";

function getRestApiKey() {
  return process.env.KAKAO_REST_API_KEY;
}

function createMissingKeyError() {
  return new Error("KAKAO_REST_API_KEY is not configured.");
}

export function hasKakaoRestApiKey() {
  return Boolean(getRestApiKey());
}

export async function geocodeAddress(address: string) {
  const restApiKey = getRestApiKey();
  if (!restApiKey) throw createMissingKeyError();

  const url = new URL(`${kakaoLocalBaseUrl}/search/address.json`);
  url.searchParams.set("query", address);
  url.searchParams.set("size", "10");

  const response = await fetch(url, {
    headers: {
      Authorization: `KakaoAK ${restApiKey}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Kakao address geocode failed with ${response.status}.`);
  }

  const payload = (await response.json()) as {
    documents?: KakaoAddressDocument[];
  };
  const documents = payload.documents ?? [];

  const candidates: KakaoAddressCandidate[] = [];

  documents.forEach((document) => {
    const latitude = Number(document.y);
    const longitude = Number(document.x);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return;
    }

    candidates.push({
      latitude,
      longitude,
      address_name: document.address?.address_name ?? document.address_name ?? "",
      road_address: document.road_address?.address_name ?? "",
      raw: document,
    });
  });

  return candidates;
}

export async function reverseGeocode(latitude: number, longitude: number) {
  const restApiKey = getRestApiKey();
  if (!restApiKey) throw createMissingKeyError();

  const url = new URL(`${kakaoLocalBaseUrl}/geo/coord2address.json`);
  url.searchParams.set("x", String(longitude));
  url.searchParams.set("y", String(latitude));
  url.searchParams.set("input_coord", "WGS84");

  const response = await fetch(url, {
    headers: {
      Authorization: `KakaoAK ${restApiKey}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Kakao reverse geocode failed with ${response.status}.`);
  }

  const payload = (await response.json()) as {
    documents?: KakaoReverseDocument[];
  };
  const document = payload.documents?.[0];
  if (!document) return undefined;

  const address = document.address;
  const roadAddress = document.road_address;

  return {
    address_name: address?.address_name ?? "",
    road_address: roadAddress?.address_name ?? "",
    region_1depth_name:
      roadAddress?.region_1depth_name ?? address?.region_1depth_name ?? "",
    region_2depth_name:
      roadAddress?.region_2depth_name ?? address?.region_2depth_name ?? "",
    region_3depth_name:
      roadAddress?.region_3depth_name ?? address?.region_3depth_name ?? "",
    raw: document,
  } satisfies KakaoReverseAddress;
}
