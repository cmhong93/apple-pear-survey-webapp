import type { SampleMasterRecord } from "@/data/sampleMaster";

type SampleListPanelProps = {
  samples: SampleMasterRecord[];
  selectedSampleId: string;
  totalCount: number;
  columnCount: number;
  onSelectSample: (sampleId: string) => void;
};

type SampleDisplayRow = {
  sampleId: string;
  farmerName: string;
  crop: string;
  variety: string;
  growthTarget: string;
  administrativeRegion: string;
  status: string;
};

export default function SampleListPanel({
  samples,
  selectedSampleId,
  totalCount,
  columnCount,
  onSelectSample,
}: SampleListPanelProps) {
  const visibleSamples = samples;
  const filterSummary = "검색어: 없음 / 필터: 없음";

  return (
    <section className="mb-6 rounded-lg border bg-white p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-gray-950">표본 리스트</h2>
          <p className="text-sm text-gray-600">
            로딩 표본 {totalCount}건 / 컬럼 {columnCount}개
          </p>
          <p className="mt-1 text-xs font-semibold text-blue-700">
            원본 표본: {totalCount}건 / 표시 표본: {visibleSamples.length}건 /{" "}
            {filterSummary}
          </p>
        </div>
        <p className="text-xs font-semibold text-blue-700">
          개인정보·주소 원문 표시
        </p>
      </div>

      <div className="max-h-72 overflow-y-auto rounded border">
        <table className="w-full border-collapse text-left text-sm">
          <thead className="sticky top-0 bg-gray-100 text-gray-700">
            <tr>
              <th className="border-b px-3 py-2">표본 ID</th>
              <th className="border-b px-3 py-2">농가명</th>
              <th className="border-b px-3 py-2">품목</th>
              <th className="border-b px-3 py-2">품종</th>
              <th className="border-b px-3 py-2">행정구역</th>
              <th className="border-b px-3 py-2">조사상태</th>
              <th className="border-b px-3 py-2">생육 해당 여부</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {visibleSamples.length > 0 ? (
              visibleSamples.map((sample, index) => {
                const row = toDisplayRow(sample);

                return (
                  <tr
                    key={row.sampleId || `sample-${index}`}
                    onClick={() => row.sampleId && onSelectSample(row.sampleId)}
                    className={`cursor-pointer align-top text-gray-900 hover:bg-blue-50 ${
                      selectedSampleId === row.sampleId ? "bg-blue-100" : ""
                    }`}
                  >
                    <td className="border-b px-3 py-2 font-semibold">
                      {row.sampleId}
                    </td>
                    <td className="border-b px-3 py-2">{row.farmerName}</td>
                    <td className="border-b px-3 py-2">{row.crop}</td>
                    <td className="border-b px-3 py-2">{row.variety}</td>
                    <td className="whitespace-normal break-words border-b px-3 py-2">
                      {row.administrativeRegion}
                    </td>
                    <td className="border-b px-3 py-2">{row.status}</td>
                    <td className="border-b px-3 py-2">
                      <span
                        className={`rounded-full px-2 py-1 text-xs font-semibold ${
                          row.growthTarget === "Y"
                            ? "bg-green-100 text-green-800"
                            : "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {row.growthTarget === "Y" ? "해당" : "비해당"}
                      </span>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td
                  colSpan={7}
                  className="px-3 py-6 text-center text-sm text-amber-700"
                >
                  표시할 표본이 없습니다. 로그인 계정의 배정 표본 또는 API 응답
                  samples 배열을 확인하세요.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function toDisplayRow(sample: SampleMasterRecord): SampleDisplayRow {
  return {
    sampleId:
      firstValue(sample, [
        "sampleId",
        "sample_id",
        "표본ID",
        "표본 ID",
        "표본_id",
        "farm_id",
        "ID",
        "id",
      ]) || "-",
    farmerName:
      firstValue(sample, [
        "farmerName",
        "farmer_name",
        "농가명",
        "경작자",
        "name",
      ]) || "-",
    crop:
      firstValue(sample, [
        "crop",
        "crop_type",
        "품목",
        "작목",
      ]) || "-",
    variety:
      firstValue(sample, [
        "variety",
        "품종",
        "detail_variety",
        "detailed_variety",
        "variety_group",
      ]) || "-",
    growthTarget: normalizeGrowthTarget(
      firstValue(sample, [
        "growthTarget",
        "growth_target",
        "growth_survey_yn",
        "생육해당여부",
        "생육조사 여부",
      ])
    ),
    administrativeRegion:
      firstValue(sample, [
        "administrativeRegion",
        "sigungu",
        "행정구역",
        "시군구",
        "field_address",
        "plot_address",
        "필지주소",
        "주소",
      ]) || "-",
    status:
      firstValue(sample, [
        "status",
        "survey_status",
        "조사상태",
        "상태",
      ]) || "-",
  };
}

function firstValue(sample: SampleMasterRecord, keys: string[]) {
  const sampleRecord = sample as unknown as Record<string, string | undefined>;

  for (const key of keys) {
    const directValue = sampleRecord[key];
    if (hasText(directValue)) return directValue;

    const rawValue = sample.raw[key];
    if (hasText(rawValue)) return rawValue;
  }

  return "";
}

function hasText(value: string | undefined): value is string {
  return typeof value === "string" && value.trim() !== "";
}

function normalizeGrowthTarget(value: string) {
  const text = String(value ?? "").trim().toUpperCase();
  return ["Y", "YES", "TRUE", "1", "O", "해당", "대상"].includes(text)
    ? "Y"
    : "N";
}
