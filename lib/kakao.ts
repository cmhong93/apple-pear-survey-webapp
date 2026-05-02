export function isKakaoRestConfigured() {
  return Boolean(process.env.KAKAO_REST_API_KEY)
}

export async function geocodeAddress(address: string) {
  return {
    configured: isKakaoRestConfigured(),
    address,
    coordinate: null,
  }
}

export async function reverseGeocode(latitude: number, longitude: number) {
  return {
    configured: isKakaoRestConfigured(),
    latitude,
    longitude,
    address: null,
  }
}
