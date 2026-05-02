import type { Sample } from '@/types/sample'

export const mockSamples: Sample[] = [
  {
    id: 'CN-APPLE-001',
    crop: 'apple',
    farmCode: 'A-001',
    farmDisplayName: 'Apple orchard 001',
    address: 'Chungnam, Yesan-gun',
    surveyMonth: '2026-05',
    assignedSurveyorId: 'S01',
    status: 'pending',
    expectedCoordinate: { latitude: 36.6823, longitude: 126.8492 },
  },
  {
    id: 'CN-APPLE-002',
    crop: 'apple',
    farmCode: 'A-002',
    farmDisplayName: 'Apple orchard 002',
    address: 'Chungnam, Cheonan-si',
    surveyMonth: '2026-05',
    assignedSurveyorId: 'S02',
    status: 'submitted',
    expectedCoordinate: { latitude: 36.8151, longitude: 127.1139 },
  },
  {
    id: 'CN-PEAR-001',
    crop: 'pear',
    farmCode: 'P-001',
    farmDisplayName: 'Pear orchard 001',
    address: 'Chungnam, Asan-si',
    surveyMonth: '2026-05',
    assignedSurveyorId: 'S03',
    status: 'pending',
    expectedCoordinate: { latitude: 36.7898, longitude: 127.0019 },
  },
]

export function getSampleById(sampleId: string) {
  return mockSamples.find((sample) => sample.id === sampleId)
}
