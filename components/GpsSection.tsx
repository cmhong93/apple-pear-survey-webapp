import type { GpsState } from "@/types/survey";

type GpsSectionProps = {
  gpsState: GpsState;
  onCollect: () => void;
};

export default function GpsSection({ gpsState, onCollect }: GpsSectionProps) {
  const collecting = gpsState.status === "수집 중";

  return (
    <section className="rounded-lg border bg-white p-4">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-gray-950">GPS 수집</h2>
          <p className="mt-1 text-sm text-gray-600">
            위도·경도·고도·정확도·수집시각을 공통 상태로 저장합니다.
          </p>
        </div>
        <button
          type="button"
          onClick={onCollect}
          disabled={collecting}
          className={`rounded px-4 py-2 text-sm font-semibold text-white ${
            collecting
              ? "cursor-not-allowed bg-gray-400"
              : "bg-green-600 hover:bg-green-700"
          }`}
        >
          {collecting
            ? "GPS 수집 중..."
            : gpsState.status === "수집 완료"
            ? "GPS 재수집"
            : "현재 위치 GPS 수집"}
        </button>
      </div>

      <div className="space-y-2">
        <div className="grid grid-cols-3 gap-2">
          <ReadOnlyGpsInput label="위도" value={gpsState.latitude} />
          <ReadOnlyGpsInput label="경도" value={gpsState.longitude} />
          <ReadOnlyGpsInput label="고도(m)" value={gpsState.altitude} />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <ReadOnlyGpsInput label="정확도(m)" value={gpsState.accuracy} />
          <ReadOnlyGpsInput label="수집시각" value={gpsState.timestamp} />
        </div>
      </div>
    </section>
  );
}

function ReadOnlyGpsInput({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-gray-700">{label}</span>
      <input
        className="mt-1 w-full rounded border px-2 py-1 text-sm"
        value={value}
        readOnly
      />
    </label>
  );
}
