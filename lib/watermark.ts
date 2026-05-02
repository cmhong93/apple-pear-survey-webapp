import type { WatermarkPayload } from '@/types/media'
import { formatCoordinate } from './geo'

export function buildWatermarkLines(payload: WatermarkPayload) {
  return [
    `sample: ${payload.sampleId}`,
    `month: ${payload.surveyMonth}`,
    `photo: ${payload.photoType}`,
    `address: ${payload.address}`,
    `app gps: ${formatCoordinate(payload.appGps)}`,
    `mygps660: ${formatCoordinate(payload.myGps660Coordinate)}`,
    `surveyor: ${payload.surveyorId}`,
    `time: ${payload.timestamp}`,
  ]
}
