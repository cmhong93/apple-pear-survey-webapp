import SurveyField from "@/components/SurveyField";
import {
  appleTrainingSystemLabels,
  getDetailedVarietyExample,
  getTrainingSystemHelpByCrop,
  pearTrainingSystemLabels,
} from "@/data/fieldHelp2026";
import type {
  FormDataState,
  RepeatDataState,
  RepeatGroup,
  SurveyField as SurveyFieldSchema,
  SurveyTab,
} from "@/types/survey";
import RepeatMeasurementSection from "@/components/RepeatMeasurementSection";

type SurveyFormRendererProps = {
  tab: SurveyTab;
  fields: SurveyFieldSchema[];
  repeatGroups: RepeatGroup[];
  formData: FormDataState;
  repeatData: RepeatDataState;
  autoLoadedFieldIds?: Set<string>;
  modifiedFieldIds?: Set<string>;
  onFieldChange: (tabId: string, fieldId: string, value: string) => void;
  onRepeatDataChange: (repeatData: RepeatDataState) => void;
  onFieldFocus?: (field: SurveyFieldSchema) => void;
  cropType?: string;
};

export default function SurveyFormRenderer({
  tab,
  fields,
  repeatGroups,
  formData,
  repeatData,
  autoLoadedFieldIds = new Set(),
  modifiedFieldIds = new Set(),
  onFieldChange,
  onRepeatDataChange,
  onFieldFocus,
  cropType = "",
}: SurveyFormRendererProps) {
  const rowSpacingField = fields.find((field) => field.fieldId === "row_spacing_m");
  const treeSpacingField = fields.find(
    (field) => field.fieldId === "tree_spacing_m"
  );
  const plotAreaField = fields.find((field) => field.fieldId === "plot_area_pyeong");
  const rowSpacing = rowSpacingField
    ? Number(formData[rowSpacingField.tabId]?.[rowSpacingField.id])
    : Number.NaN;
  const treeSpacing = treeSpacingField
    ? Number(formData[treeSpacingField.tabId]?.[treeSpacingField.id])
    : Number.NaN;
  const treeArea =
    Number.isFinite(rowSpacing) && Number.isFinite(treeSpacing)
      ? rowSpacing * treeSpacing
      : undefined;
  const plotArea = plotAreaField
    ? Number(formData[plotAreaField.tabId]?.[plotAreaField.id])
    : Number.NaN;
  const calculatedTreeCount =
    treeArea && Number.isFinite(plotArea) && plotArea > 0 && treeArea > 0
      ? String(Math.round((plotArea * 3.3058) / treeArea))
      : "";
  const fruitSetFieldIds = new Set([
    "fruit_set_target_count_current",
    "fruit_set_count_previous_year",
    "fruit_set_count_normal_year",
  ]);
  const bloomStartFieldIds = new Set([
    "bloom_start_current_date",
    "bloom_start_previous_date",
    "bloom_start_normal_date",
  ]);
  const fullBloomFieldIds = new Set([
    "full_bloom_current_date",
    "full_bloom_previous_date",
    "full_bloom_normal_date",
  ]);
  const floweringAmountFieldIds = new Set([
    "flowering_amount_vs_previous",
    "flowering_amount_vs_normal",
  ]);
  const fullBloomAmountFieldIds = new Set([
    "full_bloom_amount_vs_previous",
    "full_bloom_amount_vs_normal",
  ]);
  const thinningDateFieldIds = new Set(["fruit_thinning_completion_dates"]);
  const harvestDateFieldIds = new Set(["expected_harvest_dates"]);
  const coldDamage2026FieldIds = new Set([
    "cold_damage_2026_rate",
    "cold_damage_2026_no_fruit_set_rate",
    "cold_damage_2026_quality_decline_rate",
  ]);
  const coldDamage2025FieldIds = new Set([
    "cold_damage_2025_rate",
    "cold_damage_2025_no_fruit_set_rate",
    "cold_damage_2025_quality_decline_rate",
  ]);
  const fruitSetFields = fields.filter((field) =>
    fruitSetFieldIds.has(field.fieldId)
  );
  const bloomStartFields = fields.filter((field) =>
    bloomStartFieldIds.has(field.fieldId)
  );
  const fullBloomFields = fields.filter((field) =>
    fullBloomFieldIds.has(field.fieldId)
  );
  const floweringAmountFields = fields.filter((field) =>
    floweringAmountFieldIds.has(field.fieldId)
  );
  const fullBloomAmountFields = fields.filter((field) =>
    fullBloomAmountFieldIds.has(field.fieldId)
  );
  const thinningDateFields = fields.filter((field) =>
    thinningDateFieldIds.has(field.fieldId)
  );
  const harvestDateFields = fields.filter((field) =>
    harvestDateFieldIds.has(field.fieldId)
  );
  const farmBasicNotesFields = fields.filter(
    (field) => field.fieldId === "farm_basic_notes"
  );
  const trainingSystemField = fields.find(
    (field) => field.fieldId === "training_system"
  );
  const trainingSystemOtherField = fields.find(
    (field) => field.fieldId === "training_system_other"
  );
  const varietyField = fields.find((field) => field.fieldId === "variety");
  const selectedVariety =
    varietyField
      ? formData[varietyField.tabId]?.[varietyField.id] ?? ""
      : "";
  const selectedTrainingSystem =
    trainingSystemField
      ? formData[trainingSystemField.tabId]?.[trainingSystemField.id] ?? ""
      : "";
  const trainingSystemOptions = cropType.includes("사과")
    ? appleTrainingSystemLabels
    : cropType.includes("배")
    ? pearTrainingSystemLabels
    : trainingSystemField?.options ?? [];
  const displayTrainingSystemField = trainingSystemField
    ? {
        ...trainingSystemField,
        options: trainingSystemOptions,
      }
    : undefined;
  const coldDamage2026Fields = fields.filter((field) =>
    coldDamage2026FieldIds.has(field.fieldId)
  );
  const coldDamage2025Fields = fields.filter((field) =>
    coldDamage2025FieldIds.has(field.fieldId)
  );
  const groupedFieldIds = new Set([
    ...bloomStartFieldIds,
    ...fullBloomFieldIds,
    ...floweringAmountFieldIds,
    ...fullBloomAmountFieldIds,
    ...fruitSetFieldIds,
    ...coldDamage2026FieldIds,
    ...coldDamage2025FieldIds,
    ...thinningDateFieldIds,
    ...harvestDateFieldIds,
    "farm_basic_notes",
    "training_system",
    "training_system_other",
  ]);
  const ungroupedFields = fields.filter(
    (field) => !groupedFieldIds.has(field.fieldId)
  );
  const hasTrainingSystem = ungroupedFields.some(
    (field) => field.fieldId === "training_system"
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-950">{tab.label}</h1>
        <p className="mt-2 text-sm text-gray-600">{tab.help}</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {ungroupedFields.map((field) => (
          <SurveyField
            key={field.id}
            field={field}
            value={formData[field.tabId]?.[field.id] ?? ""}
            noteOverride={
              field.fieldId === "detailed_variety"
                ? getDetailedVarietyExample(selectedVariety)
                : undefined
            }
            autoLoaded={autoLoadedFieldIds.has(field.id)}
            modified={modifiedFieldIds.has(field.id)}
            onFocus={onFieldFocus}
            onChange={(value) => onFieldChange(field.tabId, field.id, value)}
          />
        ))}
      </div>

      {displayTrainingSystemField && (
        <div className="grid gap-4 lg:grid-cols-2">
          <SurveyField
            field={displayTrainingSystemField}
            value={
              formData[displayTrainingSystemField.tabId]?.[
                displayTrainingSystemField.id
              ] ?? ""
            }
            autoLoaded={autoLoadedFieldIds.has(displayTrainingSystemField.id)}
            modified={modifiedFieldIds.has(displayTrainingSystemField.id)}
            onFocus={onFieldFocus}
            onChange={(value) =>
              onFieldChange(
                displayTrainingSystemField.tabId,
                displayTrainingSystemField.id,
                value
              )
            }
          />
          {trainingSystemOtherField && selectedTrainingSystem === "기타" && (
            <SurveyField
              field={trainingSystemOtherField}
              value={
                formData[trainingSystemOtherField.tabId]?.[
                  trainingSystemOtherField.id
                ] ?? ""
              }
              autoLoaded={autoLoadedFieldIds.has(trainingSystemOtherField.id)}
              modified={modifiedFieldIds.has(trainingSystemOtherField.id)}
              onFocus={onFieldFocus}
              onChange={(value) =>
                onFieldChange(
                  trainingSystemOtherField.tabId,
                  trainingSystemOtherField.id,
                  value
                )
              }
            />
          )}
        </div>
      )}

      {treeArea !== undefined && (
        <div className="rounded border bg-blue-50 p-4 text-sm text-blue-900">
          <p className="font-semibold">한 그루 넓이: {treeArea.toFixed(2)}㎡</p>
          {calculatedTreeCount && (
            <p className="mt-1 font-semibold">
              자동 계산 재식주수: {calculatedTreeCount}주
            </p>
          )}
          <p className="mt-1 text-xs">
            열간×주간과 해당필지면적으로 계산합니다. 재식 주수 입력값은 조사원이 현장 확인 후 수정할 수 있습니다.
          </p>
        </div>
      )}

      {hasTrainingSystem && <TrainingSystemImageGuide cropType={cropType} />}

      {bloomStartFields.length > 0 && (
        <GroupedFieldRow
          title="개화시작일(전체 10% 개화)"
          fields={bloomStartFields}
          formData={formData}
          autoLoadedFieldIds={autoLoadedFieldIds}
          modifiedFieldIds={modifiedFieldIds}
          onFieldChange={onFieldChange}
          onFieldFocus={onFieldFocus}
        />
      )}

      {fullBloomFields.length > 0 && (
        <GroupedFieldRow
          title="만개기(전체 80% 개화)"
          fields={fullBloomFields}
          formData={formData}
          autoLoadedFieldIds={autoLoadedFieldIds}
          modifiedFieldIds={modifiedFieldIds}
          onFieldChange={onFieldChange}
          onFieldFocus={onFieldFocus}
        />
      )}

      {fullBloomAmountFields.length > 0 && (
        <GroupedFieldRow
          title="만개량"
          fields={fullBloomAmountFields}
          formData={formData}
          autoLoadedFieldIds={autoLoadedFieldIds}
          modifiedFieldIds={modifiedFieldIds}
          onFieldChange={onFieldChange}
          onFieldFocus={onFieldFocus}
          columns={2}
        />
      )}

      {floweringAmountFields.length > 0 && (
        <GroupedFieldRow
          title="착화량"
          fields={floweringAmountFields}
          formData={formData}
          autoLoadedFieldIds={autoLoadedFieldIds}
          modifiedFieldIds={modifiedFieldIds}
          onFieldChange={onFieldChange}
          onFieldFocus={onFieldFocus}
          columns={2}
        />
      )}

      {fruitSetFields.length > 0 && (
        <GroupedFieldRow
          title="최종착과수(과수당)"
          fields={fruitSetFields}
          formData={formData}
          autoLoadedFieldIds={autoLoadedFieldIds}
          modifiedFieldIds={modifiedFieldIds}
          onFieldChange={onFieldChange}
          onFieldFocus={onFieldFocus}
        />
      )}

      {(coldDamage2026Fields.length > 0 || coldDamage2025Fields.length > 0) && (
        <section className="rounded border bg-white p-4">
          <h2 className="text-base font-bold text-gray-950">저온피해</h2>
          <p className="mt-1 text-xs text-gray-600">
            각 비율은 0~100 사이의 % 값으로 입력합니다. 착과불능과 품위저하의 합계는 100이하여야 합니다.
          </p>
          <div className="mt-4 space-y-4">
            {coldDamage2026Fields.length > 0 && (
              <GroupedFieldRow
                title="2026년"
                fields={coldDamage2026Fields}
                formData={formData}
                autoLoadedFieldIds={autoLoadedFieldIds}
                modifiedFieldIds={modifiedFieldIds}
                onFieldChange={onFieldChange}
                onFieldFocus={onFieldFocus}
                nested
              />
            )}
            {coldDamage2025Fields.length > 0 && (
              <GroupedFieldRow
                title="2025년"
                fields={coldDamage2025Fields}
                formData={formData}
                autoLoadedFieldIds={autoLoadedFieldIds}
                modifiedFieldIds={modifiedFieldIds}
                onFieldChange={onFieldChange}
                onFieldFocus={onFieldFocus}
                nested
              />
            )}
          </div>
        </section>
      )}

      {thinningDateFields.length > 0 && (
        <GroupedFieldRow
          title="적과예정일"
          fields={thinningDateFields}
          formData={formData}
          autoLoadedFieldIds={autoLoadedFieldIds}
          modifiedFieldIds={modifiedFieldIds}
          onFieldChange={onFieldChange}
          onFieldFocus={onFieldFocus}
          columns={2}
        />
      )}

      {harvestDateFields.length > 0 && (
        <GroupedFieldRow
          title="수확예정일"
          fields={harvestDateFields}
          formData={formData}
          autoLoadedFieldIds={autoLoadedFieldIds}
          modifiedFieldIds={modifiedFieldIds}
          onFieldChange={onFieldChange}
          onFieldFocus={onFieldFocus}
          columns={2}
        />
      )}

      {farmBasicNotesFields.length > 0 && (
        <div className="grid gap-4 lg:grid-cols-1">
          {farmBasicNotesFields.map((field) => (
            <SurveyField
              key={field.id}
              field={field}
              value={formData[field.tabId]?.[field.id] ?? ""}
              autoLoaded={autoLoadedFieldIds.has(field.id)}
              modified={modifiedFieldIds.has(field.id)}
              onFocus={onFieldFocus}
              onChange={(value) => onFieldChange(field.tabId, field.id, value)}
            />
          ))}
        </div>
      )}

      {repeatGroups.length > 0 && (
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-bold text-gray-950">반복 실측</h2>
            <p className="mt-1 text-sm text-gray-600">
              반복 항목은 배열 상태로 저장됩니다. 행은 필요한 만큼 추가해서 입력합니다.
            </p>
          </div>
          {repeatGroups.map((group) => (
            <RepeatMeasurementSection
              key={group.id}
              group={group}
              repeatData={repeatData}
              onRepeatDataChange={onRepeatDataChange}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function GroupedFieldRow({
  title,
  fields,
  formData,
  autoLoadedFieldIds,
  modifiedFieldIds,
  onFieldChange,
  onFieldFocus,
  nested = false,
  columns = 3,
}: {
  title: string;
  fields: SurveyFieldSchema[];
  formData: FormDataState;
  autoLoadedFieldIds: Set<string>;
  modifiedFieldIds: Set<string>;
  onFieldChange: (tabId: string, fieldId: string, value: string) => void;
  onFieldFocus?: (field: SurveyFieldSchema) => void;
  nested?: boolean;
  columns?: 2 | 3;
}) {
  return (
    <section className={nested ? "" : "rounded border bg-white p-4"}>
      <h2 className="text-base font-bold text-gray-950">{title}</h2>
      <div
        className={`mt-3 grid gap-3 ${
          columns === 2 ? "lg:grid-cols-2" : "lg:grid-cols-3"
        }`}
      >
        {fields.map((field) => {
          const displayField = {
            ...field,
            label: field.label
              .replace(/^개화 시작일 - /, "")
              .replace(/^만개일 - /, "")
              .replace(/^착화량 /, "")
              .replace(/^만개량 /, "")
              .replace(/^최종 착과수 - /, "")
              .replace(/^저온피해 \d{4}년 - /, "")
              .replace(/^적과일\(예정일\) /, "")
              .replace(/^수확예정일 /, ""),
          };

          return (
            <SurveyField
              key={field.id}
              field={displayField}
              value={formData[field.tabId]?.[field.id] ?? ""}
              autoLoaded={autoLoadedFieldIds.has(field.id)}
              modified={modifiedFieldIds.has(field.id)}
              onFocus={onFieldFocus}
              onChange={(value) => onFieldChange(field.tabId, field.id, value)}
            />
          );
        })}
      </div>
    </section>
  );
}

function TrainingSystemImageGuide({ cropType }: { cropType: string }) {
  const helpItems = getTrainingSystemHelpByCrop(cropType);

  return (
    <section className="rounded border bg-white p-4">
      <h2 className="text-base font-bold text-gray-950">재배수형 이미지</h2>
      <div className="mt-3 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {helpItems.map((item) => (
          <div key={item.label} className="rounded border bg-gray-50 p-3">
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
            <p className="mt-2 text-xs text-gray-600">{item.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function TrainingSystemSketch({ label }: { label: string }) {
  return (
    <svg viewBox="0 0 140 92" className="h-20 w-full" role="img" aria-label={label}>
      <rect width="120" height="80" rx="6" fill="#f8fafc" />
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
