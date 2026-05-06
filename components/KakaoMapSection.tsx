"use client";

import KakaoMapPanel from "@/components/KakaoMapPanel";
import type { SampleMasterRecord } from "@/data/sampleMaster";
import type {
  Coordinate,
  GpsConsistencyResult,
} from "@/utils/gpsConsistency";

type KakaoMapSectionProps = {
  samples: SampleMasterRecord[];
  selectedSample?: SampleMasterRecord;
  plotCoordinate?: Coordinate;
  plotGeocodeStatus: string;
  browserCoordinate?: Coordinate;
  reverseAddress?: string;
  gpsConsistency?: GpsConsistencyResult;
};

export default function KakaoMapSection({
  selectedSample,
  plotCoordinate,
  plotGeocodeStatus,
  browserCoordinate,
  reverseAddress,
}: KakaoMapSectionProps) {
  return (
    <section className="rounded-lg border bg-white p-4">
      <div className="mb-4">
        <h2 className="text-lg font-bold text-gray-950">지도/GPS 확인</h2>
        <p className="mt-1 text-sm text-gray-600">
          필지주소 기준 위치, 브라우저 GPS 위치, MYGPS-660 판독 위치의 거리 차이를
          확인합니다. 초기에는 제출 차단 없이 상태만 표시합니다.
        </p>
      </div>
      <KakaoMapPanel
        title="사진/GPS 지도 카드"
        fieldAddress={selectedSample?.plotAddress}
        parcelCoordinate={plotCoordinate}
        browserCoordinate={browserCoordinate}
        altitude={selectedSample?.raw.altitude_m || selectedSample?.raw.altitude || ""}
        region={selectedSample?.administrativeRegion}
        sampleId={selectedSample?.sampleId}
      />
      <div className="mt-3 grid gap-2 text-xs text-gray-600 md:grid-cols-2">
        <p className="rounded border bg-gray-50 p-2">
          필지주소 좌표 변환: {plotGeocodeStatus}
        </p>
        <p className="rounded border bg-gray-50 p-2">
          현재 위치 주소: {reverseAddress || "GPS 수집 후 표시"}
        </p>
      </div>
    </section>
  );
}
