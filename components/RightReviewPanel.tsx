import type {
  GpsState,
  HelpDictionaryItem,
  PhotoSpec,
  PhotoState,
  RepeatGroup,
  SurveyField,
  SurveyTab,
  ValidationIssue,
} from "@/types/survey";
import {
  gpsValidationCandidates,
  negativeNumberAiValidationNotice,
} from "@/data/handoffArtifacts";
import { handoffValidationRuleCounts } from "@/data/validationRules2026";
import {
  getDetailedVarietyExample,
  getDetailedVarietyHelpExample,
  getTrainingSystemHelpByCrop,
} from "@/data/fieldHelp2026";

type RightReviewPanelProps = {
  tab: SurveyTab;
  fields: SurveyField[];
  repeatGroups: RepeatGroup[];
  photos: PhotoSpec[];
  photoStates: Record<string, PhotoState>;
  gpsState: GpsState;
  aiValidation: string;
  errors: string[];
  sampleMasterStatus: string;
  selectedField?: SurveyField;
  selectedHelp?: HelpDictionaryItem;
  validationIssues: ValidationIssue[];
  cropType?: string;
  varietyType?: string;
};

export default function RightReviewPanel({
  tab,
  fields,
  repeatGroups,
  photos,
  photoStates,
  gpsState,
  aiValidation,
  errors,
  sampleMasterStatus,
  selectedField,
  selectedHelp,
  validationIssues,
  cropType = "",
  varietyType = "",
}: RightReviewPanelProps) {
  const guideFields = fields.filter((field) => field.unit || field.note);
  const selectedHelpExample =
    selectedField?.fieldId === "detailed_variety"
      ? getDetailedVarietyHelpExample(varietyType)
      : selectedHelp?.example;

  return (
    <aside className="min-h-0 w-80 overflow-y-auto border-l bg-gray-50 p-4 pb-24">
      <h2 className="mb-4 text-lg font-bold text-gray-950">도움말 / 검증</h2>

      <PanelCard title="현재 조사 단계">
        <p className="font-semibold text-gray-900">{tab.label}</p>
        <p className="mt-1 text-sm text-gray-700">{tab.help}</p>
      </PanelCard>

      <PanelCard title="표본 기본정보">
        <p className="text-sm font-semibold text-blue-700">
          표본 기본정보 자동 불러옴
        </p>
        <p className="mt-1 text-sm text-gray-700">{sampleMasterStatus}</p>
      </PanelCard>

      <PanelCard title="문항 도움말">
        {selectedField && selectedHelp ? (
          <div className="space-y-2 text-sm text-gray-700">
            <div className="flex items-center gap-2">
              <p className="font-semibold text-gray-900">
                {selectedHelp.questionName}
              </p>
              {selectedHelp.needsReview && (
                <span className="rounded bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-800">
                  검토 필요
                </span>
              )}
            </div>
            <p>목적: {selectedHelp.purpose}</p>
            <p>입력 방법: {selectedHelp.inputMethod}</p>
            <p>예시: {selectedHelpExample}</p>
            {selectedHelp.unit && <p>단위: {selectedHelp.unit}</p>}
            <p>주의사항: {selectedHelp.cautions}</p>
            <p>
              사진 필요: {selectedHelp.relatedPhotoRequired ? "예" : "아니오"} / GPS 필요:{" "}
              {selectedHelp.relatedGpsRequired ? "예" : "아니오"}
            </p>
          </div>
        ) : (
          <EmptyText text="문항을 누르면 입력 도움말이 표시됩니다." />
        )}
        {selectedField?.fieldId === "training_system" && (
          <div className="mt-3 grid gap-2">
            {getTrainingSystemHelpByCrop(cropType).map((item) => (
                <div key={item.label} className="rounded border bg-gray-50 p-2">
                  <p className="font-semibold text-gray-900">{item.label}</p>
                  <div className="mt-2 flex h-24 items-center justify-center rounded bg-white">
                    {item.imageSrc ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={item.imageSrc}
                        alt={`${item.label} 예시`}
                        className="max-h-24 w-full object-contain"
                      />
                    ) : (
                      <TrainingSystemSketch label={item.label} />
                    )}
                  </div>
                  <p className="mt-1 text-xs text-gray-600">{item.description}</p>
                </div>
              ))}
          </div>
        )}
      </PanelCard>

      <PanelCard title="입력 안내">
        {guideFields.length > 0 ? (
          <div className="space-y-3 text-sm">
            {guideFields.slice(0, 10).map((field) => (
              <div key={field.id}>
                <p className="font-semibold text-gray-800">{field.label}</p>
                {isSpacingField(field.fieldId) ? (
                  <SpacingGuideImage fieldId={field.fieldId} />
                ) : (
                  field.unit && <p className="text-gray-600">{field.unit}</p>
                )}
                {field.note && (
                  <p className="text-gray-600">
                    {field.fieldId === "detailed_variety"
                      ? getDetailedVarietyExample(varietyType)
                      : field.note}
                  </p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <EmptyText text="표시할 입력 안내 없음" />
        )}
      </PanelCard>

      <PanelCard title="검증 결과">
        <p className="mb-2 text-xs text-gray-600">
          확정 룰: 오류 {handoffValidationRuleCounts.error} / 경고{" "}
          {handoffValidationRuleCounts.warning} / 확인 {handoffValidationRuleCounts.info} /
          관리자 검토 {handoffValidationRuleCounts.admin_review}
        </p>
        {validationIssues.length > 0 ? (
          <div className="space-y-2 text-sm">
            {validationIssues.slice(0, 8).map((issue) => (
              <p
                key={`${issue.fieldId}-${issue.message}`}
                className={getIssueClass(issue.severity)}
              >
                [{getIssueLabel(issue.severity)}] {issue.message}
              </p>
            ))}
          </div>
        ) : (
          <EmptyText text="표시할 검증 결과 없음" />
        )}
      </PanelCard>

      <PanelCard title="반복 실측 구조">
        {repeatGroups.length > 0 ? (
          <div className="space-y-2 text-sm">
            {repeatGroups.map((group) => (
              <div key={group.id}>
                <p className="font-semibold text-gray-800">{group.label}</p>
                <p className="text-gray-600">
                  {group.parentLabel} 1~{group.parentCount}, {group.itemLabel} 1~
                  {group.maxRowsPerParent}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <EmptyText text="현재 단계 반복 실측 없음" />
        )}
      </PanelCard>

      <PanelCard title="사진 촬영 상태">
        <p className="mb-2 text-sm font-medium">
          촬영 완료:{" "}
          {
            photos.filter(
              (photo) => photoStates[photo.id]?.status === "촬영 완료"
            ).length
          }
          /{photos.length}
        </p>
        <div className="space-y-1 text-sm">
          {photos.map((photo) => (
            <div key={photo.id} className="flex justify-between gap-3">
              <span>{photo.label}</span>
              <span
                className={
                  photoStates[photo.id]?.status === "촬영 완료"
                    ? "text-green-700"
                    : "text-red-600"
                }
              >
                {photoStates[photo.id]?.status ?? "미촬영"}
              </span>
            </div>
          ))}
        </div>
      </PanelCard>

      <PanelCard title="GPS 상태">
        <p
          className={`text-sm font-semibold ${
            gpsState.status === "수집 완료"
              ? "text-green-700"
              : gpsState.status === "오류 발생"
              ? "text-red-600"
              : "text-gray-700"
          }`}
        >
          {gpsState.status}
        </p>
        {gpsState.status === "수집 완료" && (
          <p className="mt-2 text-sm text-gray-700">
            위도 {gpsState.latitude} / 경도 {gpsState.longitude} / 고도{" "}
            {gpsState.altitude}
          </p>
        )}
        <div className="mt-3 space-y-1 text-xs text-gray-600">
          {gpsValidationCandidates.slice(0, 3).map((candidate) => (
            <p key={candidate.id}>
              {candidate.title}: {candidate.toleranceCandidate}
            </p>
          ))}
        </div>
      </PanelCard>

      <PanelCard title="AI 검증 결과">
        <p
          className={`text-sm ${
            aiValidation.includes("완료")
              ? "text-green-700"
              : aiValidation.includes("검증 필요")
              ? "text-red-600"
              : "text-gray-700"
          }`}
        >
          {aiValidation}
        </p>
        <p className="mt-2 text-xs text-amber-700">
          숫자 범위 오류 기준: {negativeNumberAiValidationNotice} 사진 판독값의 음수는 OCR 오인식 가능성이 있어 재확인 필요로 처리합니다.
        </p>
      </PanelCard>

      <PanelCard title="오류 / 경고">
        {errors.length > 0 ? <List items={errors} /> : <EmptyText text="없음" />}
      </PanelCard>
    </aside>
  );
}

function PanelCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-4 rounded border bg-white p-3">
      <h3 className="mb-2 font-bold text-gray-950">{title}</h3>
      {children}
    </section>
  );
}

function List({ items }: { items: string[] }) {
  return (
    <ul className="space-y-1 text-sm text-gray-700">
      {items.map((item) => (
        <li key={item}>- {item}</li>
      ))}
    </ul>
  );
}

function EmptyText({ text }: { text: string }) {
  return <p className="text-sm text-gray-500">{text}</p>;
}

function isSpacingField(fieldId: string) {
  return fieldId === "row_spacing_m" || fieldId === "tree_spacing_m";
}

function SpacingGuideImage({ fieldId }: { fieldId: string }) {
  const isRowSpacing = fieldId === "row_spacing_m";

  return (
    <div className="mt-2 rounded border bg-gray-50 p-2">
      <svg
        role="img"
        aria-label={isRowSpacing ? "열간 거리 안내" : "주간 거리 안내"}
        viewBox="0 0 220 120"
        className="h-28 w-full"
      >
        <rect width="220" height="120" rx="6" fill="#f8fafc" />
        {[45, 95, 145].map((x) =>
          [32, 84].map((y) => (
            <g key={`${x}-${y}`}>
              <circle cx={x} cy={y} r="9" fill="#16a34a" />
              <rect x={x - 2} y={y + 8} width="4" height="11" fill="#854d0e" />
            </g>
          ))
        )}
        {isRowSpacing ? (
          <>
            <line
              x1="184"
              y1="32"
              x2="184"
              y2="84"
              stroke="#2563eb"
              strokeWidth="3"
              markerStart="url(#arrow)"
              markerEnd="url(#arrow)"
            />
            <text x="198" y="61" fontSize="13" fill="#1d4ed8" fontWeight="700">
              열간
            </text>
          </>
        ) : (
          <>
            <line
              x1="45"
              y1="103"
              x2="95"
              y2="103"
              stroke="#2563eb"
              strokeWidth="3"
              markerStart="url(#arrow)"
              markerEnd="url(#arrow)"
            />
            <text x="60" y="118" fontSize="13" fill="#1d4ed8" fontWeight="700">
              주간
            </text>
          </>
        )}
        <defs>
          <marker
            id="arrow"
            markerWidth="8"
            markerHeight="8"
            refX="4"
            refY="4"
            orient="auto"
          >
            <path d="M0,0 L8,4 L0,8 Z" fill="#2563eb" />
          </marker>
        </defs>
      </svg>
      <p className="mt-1 text-xs text-gray-600">
        {isRowSpacing
          ? "열간(세로): 과수 줄과 줄 사이 거리, 단위 m"
          : "주간(가로): 같은 줄 안의 과수와 과수 사이 거리, 단위 m"}
      </p>
    </div>
  );
}

function TrainingSystemSketch({ label }: { label: string }) {
  return (
    <svg
      viewBox="0 0 140 92"
      className="h-20 w-full"
      role="img"
      aria-label={`${label} 도식`}
    >
      <rect width="140" height="92" rx="6" fill="#f8fafc" />
      {label === "주간형" ? (
        <>
          <line x1="70" y1="78" x2="70" y2="12" stroke="#854d0e" strokeWidth="5" />
          <path d="M70 24 C52 28 38 33 26 40" stroke="#16a34a" strokeWidth="5" fill="none" />
          <path d="M70 34 C88 38 101 44 114 51" stroke="#16a34a" strokeWidth="5" fill="none" />
          <path d="M70 48 C50 53 36 59 22 67" stroke="#16a34a" strokeWidth="5" fill="none" />
          <path d="M70 59 C88 63 100 69 113 77" stroke="#16a34a" strokeWidth="5" fill="none" />
          <circle cx="70" cy="12" r="4" fill="#22c55e" />
        </>
      ) : label === "세장방추형" ? (
        <>
          <line x1="70" y1="80" x2="70" y2="10" stroke="#854d0e" strokeWidth="5" />
          <path d="M70 12 C48 24 42 47 47 76" stroke="#16a34a" strokeWidth="4" fill="none" />
          <path d="M70 12 C92 24 98 47 93 76" stroke="#16a34a" strokeWidth="4" fill="none" />
          <path d="M70 30 L48 39 M70 44 L50 52 M70 58 L52 65" stroke="#16a34a" strokeWidth="3" />
          <path d="M70 30 L92 39 M70 44 L90 52 M70 58 L88 65" stroke="#16a34a" strokeWidth="3" />
          <text x="54" y="89" fontSize="9" fill="#475569">좁은 원추형</text>
        </>
      ) : label === "다축형" ? (
        <>
          {[42, 56, 70, 84, 98].map((x) => (
            <g key={x}>
              <line x1={x} y1="80" x2={x} y2="20" stroke="#854d0e" strokeWidth="4" />
              <path d={`M${x} 30 C${x - 9} 38 ${x - 10} 52 ${x - 6} 70`} stroke="#16a34a" strokeWidth="3" fill="none" />
              <path d={`M${x} 30 C${x + 9} 38 ${x + 10} 52 ${x + 6} 70`} stroke="#16a34a" strokeWidth="3" fill="none" />
            </g>
          ))}
          <line x1="36" y1="80" x2="104" y2="80" stroke="#64748b" strokeWidth="2" />
        </>
      ) : label === "Y자형" ? (
        <>
          <line x1="70" y1="80" x2="70" y2="46" stroke="#854d0e" strokeWidth="5" />
          <line x1="70" y1="46" x2="28" y2="14" stroke="#16a34a" strokeWidth="6" />
          <line x1="70" y1="46" x2="112" y2="14" stroke="#16a34a" strokeWidth="6" />
          <line x1="29" y1="18" x2="111" y2="18" stroke="#64748b" strokeWidth="2" />
        </>
      ) : label === "배상형" ? (
        <>
          <line x1="70" y1="80" x2="70" y2="50" stroke="#854d0e" strokeWidth="5" />
          <path d="M70 50 C45 49 26 35 18 16" stroke="#16a34a" strokeWidth="6" fill="none" />
          <path d="M70 50 C95 49 114 35 122 16" stroke="#16a34a" strokeWidth="6" fill="none" />
          <path d="M42 39 C57 28 82 28 98 39" stroke="#16a34a" strokeWidth="4" fill="none" />
        </>
      ) : label === "방사상형" ? (
        <>
          <circle cx="70" cy="54" r="5" fill="#854d0e" />
          {[250, 220, 190, 160, 130, 100, 70, 40, 10].map((angle) => {
            const rad = (angle * Math.PI) / 180;
            const x = 70 + Math.cos(rad) * 48;
            const y = 54 - Math.sin(rad) * 38;
            return (
              <line
                key={angle}
                x1="70"
                y1="54"
                x2={x}
                y2={y}
                stroke="#16a34a"
                strokeWidth="4"
              />
            );
          })}
          <line x1="70" y1="80" x2="70" y2="54" stroke="#854d0e" strokeWidth="5" />
        </>
      ) : (
        <>
          <line x1="70" y1="78" x2="70" y2="30" stroke="#854d0e" strokeWidth="5" />
          <path d="M70 38 C48 35 34 45 25 61" stroke="#16a34a" strokeWidth="4" fill="none" />
          <path d="M70 46 C92 41 111 49 119 65" stroke="#16a34a" strokeWidth="4" fill="none" />
          <text x="62" y="25" fontSize="22" fill="#64748b" fontWeight="700">?</text>
        </>
      )}
    </svg>
  );
}

function getIssueLabel(severity: ValidationIssue["severity"]) {
  if (severity === "error") return "오류";
  if (severity === "warning") return "경고";
  if (severity === "admin_review") return "관리자 검토";
  return "확인";
}

function getIssueClass(severity: ValidationIssue["severity"]) {
  if (severity === "error") return "text-red-700";
  if (severity === "warning") return "text-amber-700";
  if (severity === "admin_review") return "text-purple-700";
  return "text-blue-700";
}
