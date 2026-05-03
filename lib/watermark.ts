import type { WatermarkPayload } from '@/types/media'
import { photoTypeLabelKo } from './koreanLabels'
import { formatCoordinate } from './geo'

export function buildWatermarkLines(payload: WatermarkPayload) {
  return [
    `표본ID: ${payload.sampleId}`,
    `조사월: ${payload.surveyMonth}`,
    `사진유형: ${photoTypeLabelKo(payload.photoType)}`,
    `위치: ${payload.locationLabel}`,
    `앱 GPS: ${formatCoordinate(payload.appGps)}`,
    `MyGPS660: ${formatCoordinate(payload.myGps660Coordinate)}`,
    `조사원: ${payload.surveyorId}`,
    `시각: ${payload.timestamp}`,
  ]
}
