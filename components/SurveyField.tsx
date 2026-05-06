import type { SurveyField as SurveyFieldSchema } from "@/types/survey";

type SurveyFieldProps = {
  field: SurveyFieldSchema;
  value: string;
  onChange: (value: string) => void;
  autoLoaded?: boolean;
  modified?: boolean;
  noteOverride?: string;
  onFocus?: (field: SurveyFieldSchema) => void;
};

export default function SurveyField({
  field,
  value,
  onChange,
  autoLoaded = false,
  noteOverride,
  onFocus,
}: SurveyFieldProps) {
  const baseClass =
    "mt-2 w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100";
  const autoLoadedText =
    field.readOnly || field.note
      ? ""
      : "표본리스트에서 불러온 값이며 필요 시 수정할 수 있습니다.";
  const monthDayFieldIds = new Set([
    "bloom_start_previous_date",
    "bloom_start_normal_date",
    "full_bloom_previous_date",
    "full_bloom_normal_date",
  ]);
  const isMonthDayField = monthDayFieldIds.has(field.fieldId);
  const inputValue = value;

  return (
    <label className="block rounded border bg-gray-50 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-medium text-gray-900">{field.label}</span>
        {field.unit && <span className="text-xs text-gray-500">{field.unit}</span>}
      </div>

      {field.readOnly ? (
        <div
          className="mt-2 min-h-10 w-full rounded border border-gray-200 bg-gray-100 px-3 py-2 text-sm text-gray-900"
          onFocus={() => onFocus?.(field)}
          tabIndex={0}
        >
          {value || "표본 지정 후 자동 표시"}
        </div>
      ) : field.inputType === "select" ? (
        <select
          className={baseClass}
          value={value}
          onFocus={() => onFocus?.(field)}
          onChange={(event) => onChange(event.target.value)}
        >
          <option value="">-</option>
          {field.options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      ) : field.inputType === "textarea" ? (
        <textarea
          className={`${baseClass} min-h-24 resize-y`}
          value={inputValue}
          placeholder={field.label}
          onFocus={() => onFocus?.(field)}
          onChange={(event) => onChange(event.target.value)}
        />
      ) : (
        <input
          className={baseClass}
          type={isMonthDayField ? "text" : field.inputType}
          value={inputValue}
          placeholder={isMonthDayField ? "MM-DD" : field.label}
          inputMode={isMonthDayField ? "numeric" : undefined}
          onFocus={() => onFocus?.(field)}
          onChange={(event) => onChange(event.target.value)}
        />
      )}

      {((autoLoaded && autoLoadedText) || noteOverride || field.note) && (
        <div className="mt-2 space-y-1 text-xs text-gray-600">
          {autoLoaded && autoLoadedText && (
            <p className="font-medium text-blue-700">{autoLoadedText}</p>
          )}
          {(noteOverride || field.note) && <p>{noteOverride || field.note}</p>}
        </div>
      )}
    </label>
  );
}
