import type { Coordinate } from '@/types/sample'

const EARTH_RADIUS_METERS = 6371000

function toRadians(degrees: number) {
  return (degrees * Math.PI) / 180
}

export function distanceMeters(a: Coordinate, b: Coordinate) {
  const deltaLat = toRadians(b.latitude - a.latitude)
  const deltaLng = toRadians(b.longitude - a.longitude)
  const lat1 = toRadians(a.latitude)
  const lat2 = toRadians(b.latitude)

  const h =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) ** 2

  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.sqrt(h))
}

export function formatCoordinate(coordinate?: Coordinate) {
  if (!coordinate) return '수집 안 됨'
  return `${coordinate.latitude.toFixed(6)}, ${coordinate.longitude.toFixed(6)}`
}
