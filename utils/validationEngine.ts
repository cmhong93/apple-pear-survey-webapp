import { handoffValidationRules } from "@/data/validationRules2026";
import type {
  FormDataState,
  GpsState,
  RepeatDataState,
  RepeatGroup,
  SurveyField,
  ValidationIssue,
} from "@/types/survey";

export type ValidationMode = "save" | "submit";

const monthDayFieldIds = new Set([
  "bloom_start_normal_date",
  "full_bloom_normal_date",
]);

const previousYearDateFieldIds = new Set([
  "bloom_start_previous_date",
  "full_bloom_previous_date",
]);

const distanceFieldIds = new Set(["row_spacing_m", "tree_spacing_m"]);

const fruitSetFieldIds = new Set([
  "fruit_set_target_count_current",
  "fruit_set_count_previous_year",
  "fruit_set_count_normal_year",
]);

const coldDamageFieldIds = new Set([
  "cold_damage_2026_rate",
  "cold_damage_2026_no_fruit_set_rate",
  "cold_damage_2026_quality_decline_rate",
  "cold_damage_2025_rate",
  "cold_damage_2025_no_fruit_set_rate",
  "cold_damage_2025_quality_decline_rate",
]);

const friendlyNumericFieldIds = new Set([
  ...distanceFieldIds,
  ...fruitSetFieldIds,
  ...coldDamageFieldIds,
]);

export function validateSurveyValues({
  fields,
  formData,
  gpsState,
  repeatGroups = [],
  repeatData = {},
  mode,
}: {
  fields: SurveyField[];
  formData: FormDataState;
  gpsState: GpsState;
  repeatGroups?: RepeatGroup[];
  repeatData?: RepeatDataState;
  mode: ValidationMode;
}): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  fields.forEach((field) => {
    const value = formData[field.tabId]?.[field.id] ?? "";
    issues.push(
      ...validateSurveyFieldValue({ field, value, mode, formData, fields })
    );
  });

  issues.push(...validateFarmBasicOpenQuestions({ fields, formData, mode }));

  repeatGroups.forEach((group) => {
    repeatData[group.id]?.forEach((row) => {
      group.fields.forEach((field) => {
        if (field.inputType !== "number") return;

        const value = row.values[field.id] ?? "";
        const label = `${group.label} ${row.index} - ${field.label}`;

        issues.push(
          ...validateRuleValue({
            fieldId: group.id,
            fieldLabel: label,
            value,
            mode,
            numericInput: field.inputType === "number",
          })
        );
      });
    });
  });

  if (mode === "submit") {
    if (!gpsState.latitude || !gpsState.longitude) {
      issues.push({
        fieldId: "gps_latitude",
        fieldLabel: "GPS",
        severity: "error",
        message: "GPS 위도/경도 수집값이 없습니다.",
      });
    }
  }

  return issues;
}

export function validateSurveyFieldValue({
  field,
  value,
  mode,
  formData,
  fields,
}: {
  field: SurveyField;
  value: string;
  mode: ValidationMode;
  formData?: FormDataState;
  fields?: SurveyField[];
}): ValidationIssue[] {
  return validateRuleValue({
    fieldId: field.fieldId,
    fieldLabel: field.label,
    value,
    mode,
    numericInput:
      field.inputType === "number" ||
      (Boolean(field.unit) && field.options.length === 0),
    formData,
    fields: fields ?? [field],
  });
}

function validateRuleValue({
  fieldId,
  fieldLabel,
  value,
  mode,
  numericInput,
  formData,
  fields,
}: {
  fieldId: string;
  fieldLabel: string;
  value: string;
  mode: ValidationMode;
  numericInput: boolean;
  formData?: FormDataState;
  fields?: SurveyField[];
}): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const trimmedValue = value.trim();
  const rules = handoffValidationRules.filter((rule) => rule.fieldId === fieldId);
  const friendlyIssues = validateFriendlyFieldRules({
    fieldId,
    fieldLabel,
    value: trimmedValue,
    mode,
  });
  const skipGenericNumericRules = friendlyNumericFieldIds.has(fieldId);

  rules.forEach((rule) => {
    const severity =
      mode === "save" && rule.level === "error" ? "warning" : rule.level;
    const issue = {
      fieldId,
      fieldLabel,
      severity,
      ruleId: rule.ruleId,
      blocksSubmit: mode === "submit" && rule.blocksSubmit,
      message: createRuleMessage(rule.messageForEnumerator, fieldLabel),
    };

    if (rule.ruleType === "missing_on_submit") {
      if (!trimmedValue && mode === "submit") issues.push(issue);
      return;
    }

    if (rule.ruleType === "allowed_option") {
      if (
        trimmedValue &&
        rule.allowedOptions.length > 0 &&
        !rule.allowedOptions.includes(trimmedValue)
      ) {
        issues.push(issue);
      }
      return;
    }

    if (rule.level === "info") {
      if (mode === "submit") issues.push(issue);
      return;
    }

    const hasNumericRule =
      rule.ruleType === "number_type" ||
      rule.min !== null ||
      rule.max !== null ||
      rule.warningMin !== null ||
      rule.warningMax !== null;
    if (
      skipGenericNumericRules ||
      !numericInput ||
      !hasNumericRule ||
      !trimmedValue
    ) {
      return;
    }

    const numericValue = Number(trimmedValue);
    if (!Number.isFinite(numericValue)) {
      issues.push(issue);
      return;
    }

    if (rule.min !== null && numericValue < rule.min) issues.push(issue);
    if (rule.max !== null && numericValue > rule.max) issues.push(issue);
    if (rule.warningMin !== null && numericValue < rule.warningMin) {
      issues.push(issue);
    }
    if (rule.warningMax !== null && numericValue > rule.warningMax) {
      issues.push(issue);
    }
  });

  issues.push(...friendlyIssues);

  if (formData && fieldId === "fruit_set_target_count_current" && trimmedValue) {
    const crop = getValueByFieldId(formData, "crop", fields);
    const numericValue = Number(trimmedValue);
    const limit = crop === "배" ? 1000 : crop === "사과" ? 500 : undefined;
    if (limit && Number.isFinite(numericValue) && numericValue > limit) {
      issues.push({
        fieldId,
        fieldLabel,
        severity: "warning",
        message:
          `${fieldLabel}: 농가 응답 기준의 1그루당 개수로 입력하되, 값이 커서 확인이 필요합니다.`,
        blocksSubmit: false,
      });
    }
  }

  return issues;
}

function validateFriendlyFieldRules({
  fieldId,
  fieldLabel,
  value,
}: {
  fieldId: string;
  fieldLabel: string;
  value: string;
  mode: ValidationMode;
}): ValidationIssue[] {
  if (!value) return [];

  if (monthDayFieldIds.has(fieldId)) {
    if (!isValidMonthDay(value)) {
      return [
        {
          fieldId,
          fieldLabel,
          severity: "error",
          message:
            "전년·평년 일자는 월-일 형식으로 입력해 주세요. 예: 04-12",
          blocksSubmit: true,
        },
      ];
    }
    return [];
  }

  if (previousYearDateFieldIds.has(fieldId)) {
    if (!isDateInYear(value, 2025)) {
      return [
        {
          fieldId,
          fieldLabel,
          severity: "error",
          message: "전년 일자는 2025년 날짜로 입력해 주세요.",
          blocksSubmit: true,
        },
      ];
    }
    return [];
  }

  if (distanceFieldIds.has(fieldId)) {
    const numericValue = Number(value);
    if (!Number.isFinite(numericValue)) {
      return [
        {
          fieldId,
          fieldLabel,
          severity: "error",
          message: "재식거리는 숫자로 입력해 주세요.",
          blocksSubmit: true,
        },
      ];
    }
    if (numericValue < 0) {
      return [
        {
          fieldId,
          fieldLabel,
          severity: "error",
          message: "재식거리는 0보다 작은 값을 입력할 수 없습니다.",
          blocksSubmit: true,
        },
      ];
    }
  }

  if (fruitSetFieldIds.has(fieldId)) {
    const numericValue = Number(value);
    if (!Number.isFinite(numericValue)) {
      return [
        {
          fieldId,
          fieldLabel,
          severity: "error",
          message: "최종 착과수는 1그루당 개수로 입력해 주세요.",
          blocksSubmit: true,
        },
      ];
    }
    if (numericValue < 0) {
      return [
        {
          fieldId,
          fieldLabel,
          severity: "error",
          message: "최종 착과수는 0보다 작은 값을 입력할 수 없습니다.",
          blocksSubmit: true,
        },
      ];
    }
  }

  if (coldDamageFieldIds.has(fieldId)) {
    const numericValue = Number(value);
    if (!Number.isFinite(numericValue)) {
      return [
        {
          fieldId,
          fieldLabel,
          severity: "error",
          message: "저온피해 비율은 0~100 사이로 입력해 주세요.",
          blocksSubmit: true,
        },
      ];
    }
    if (numericValue < 0) {
      return [
        {
          fieldId,
          fieldLabel,
          severity: "error",
          message: "저온피해 비율은 음수로 입력할 수 없습니다.",
          blocksSubmit: true,
        },
      ];
    }
    if (numericValue > 100) {
      return [
        {
          fieldId,
          fieldLabel,
          severity: "error",
          message: "저온피해 비율은 0~100 사이로 입력해 주세요.",
          blocksSubmit: true,
        },
      ];
    }
  }

  return [];
}

function isValidMonthDay(value: string) {
  const match = value.match(/^(\d{1,2})[-/](\d{1,2})$/);
  if (!match) return false;

  const month = Number(match[1]);
  const day = Number(match[2]);
  if (!Number.isInteger(month) || !Number.isInteger(day)) return false;
  if (month < 1 || month > 12 || day < 1 || day > 31) return false;

  const testDate = new Date(2024, month - 1, day);
  return testDate.getMonth() === month - 1 && testDate.getDate() === day;
}

function isDateInYear(value: string, year: number) {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return false;

  const inputYear = Number(match[1]);
  const inputMonth = Number(match[2]);
  const day = Number(match[3]);
  if (inputYear !== year) return false;

  const testDate = new Date(inputYear, inputMonth - 1, day);
  return (
    testDate.getFullYear() === inputYear &&
    testDate.getMonth() === inputMonth - 1 &&
    testDate.getDate() === day
  );
}

function validateFarmBasicOpenQuestions({
  fields,
  formData,
  mode,
}: {
  fields: SurveyField[];
  formData: FormDataState;
  mode: ValidationMode;
}): ValidationIssue[] {
  const hasFarmBasic = fields.some((field) => field.tabId === "farm-basic");
  if (!hasFarmBasic) return [];

  const altitude = getValueByFieldId(formData, "altitude_m", fields);
  const altitudeSource = getValueByFieldId(formData, "altitude_source", fields);
  const rowSpacing = Number(getValueByFieldId(formData, "row_spacing_m", fields));
  const treeSpacing = Number(getValueByFieldId(formData, "tree_spacing_m", fields));
  const issues: ValidationIssue[] = [];

  if (altitude && !altitudeSource) {
    issues.push({
      fieldId: "altitude_source",
      fieldLabel: "고도 출처",
      severity: "warning",
      message: "고도값이 있으면 출처를 함께 입력해 주세요.",
      blocksSubmit: false,
    });
  }

  if (
    altitude &&
    Number.isFinite(Number(altitude)) &&
    (Number(altitude) < -10 || Number(altitude) > 2000)
  ) {
    issues.push({
      fieldId: "altitude_m",
      fieldLabel: "고도",
      severity: "warning",
      message:
        "고도값이 일반적인 범위를 벗어났습니다. 제출은 가능하지만 확인이 필요합니다.",
      blocksSubmit: false,
    });
  }

  if (mode === "submit" && Number.isFinite(rowSpacing) && Number.isFinite(treeSpacing)) {
    issues.push({
      fieldId: "tree_area_m2",
      fieldLabel: "한 그루 넓이",
      severity: "info",
      message: `한 그루 넓이: ${(rowSpacing * treeSpacing).toFixed(2)}㎡ (열간×주간 파생값)`,
      blocksSubmit: false,
    });
  }

  issues.push(
    ...validateColdDamageSum({
      year: "2026년",
      rate: getValueByFieldId(formData, "cold_damage_2026_rate", fields),
      noFruitSet: getValueByFieldId(
        formData,
        "cold_damage_2026_no_fruit_set_rate",
        fields
      ),
      qualityDecline: getValueByFieldId(
        formData,
        "cold_damage_2026_quality_decline_rate",
        fields
      ),
    }),
    ...validateColdDamageSum({
      year: "2025년",
      rate: getValueByFieldId(formData, "cold_damage_2025_rate", fields),
      noFruitSet: getValueByFieldId(
        formData,
        "cold_damage_2025_no_fruit_set_rate",
        fields
      ),
      qualityDecline: getValueByFieldId(
        formData,
        "cold_damage_2025_quality_decline_rate",
        fields
      ),
    })
  );

  return issues;
}

function validateColdDamageSum({
  year,
  rate,
  noFruitSet,
  qualityDecline,
}: {
  year: string;
  rate: string;
  noFruitSet: string;
  qualityDecline: string;
}): ValidationIssue[] {
  if (!rate || !noFruitSet || !qualityDecline) return [];

  const rateValue = Number(rate);
  const noFruitSetValue = Number(noFruitSet);
  const qualityDeclineValue = Number(qualityDecline);
  if (
    !Number.isFinite(rateValue) ||
    !Number.isFinite(noFruitSetValue) ||
    !Number.isFinite(qualityDeclineValue)
  ) {
    return [];
  }

  const sum = noFruitSetValue + qualityDeclineValue;
  if (sum > 100) {
    return [
      {
        fieldId: `cold_damage_sum_${year}`,
        fieldLabel: `저온피해 ${year}`,
        severity: "error",
        message: `저온피해 ${year} 착과불능과 품위저하의 합계는 100이하여야 합니다.`,
        blocksSubmit: true,
      },
    ];
  }

  if (Math.abs(rateValue - sum) < 0.01) return [];

  return [
    {
      fieldId: `cold_damage_sum_${year}`,
      fieldLabel: `저온피해 ${year}`,
      severity: "error",
      message: `저온피해 ${year} 피해비중은 착과불능과 품위저하의 합계와 같아야 합니다.`,
      blocksSubmit: true,
    },
  ];
}

function getValueByFieldId(
  formData: FormDataState,
  fieldId: string,
  fields: SurveyField[] = []
) {
  const field = fields.find((item) => item.fieldId === fieldId);
  if (field) return formData[field.tabId]?.[field.id] ?? "";

  for (const values of Object.values(formData)) {
    const entry = Object.entries(values).find(([key]) => key.includes(fieldId));
    if (entry) return entry[1];
  }

  return "";
}

function createRuleMessage(message: string, fieldLabel: string) {
  if (!message || /[?]{2,}/.test(message)) {
    return `${fieldLabel}: 검증 기준을 확인해 주세요.`;
  }

  if (message.includes("필수 입력")) {
    return `${fieldLabel}: 값을 입력해 주세요.`;
  }

  return `${fieldLabel}: ${message}`;
}

export function validateGpsConsistency(gpsState: GpsState) {
  return {
    status: gpsState.status,
    warnings:
      gpsState.latitude && gpsState.longitude
        ? ["MYGPS-660 사진 판독값 비교는 OCR/수동 판독 연동 후 수행합니다."]
        : ["GPS가 수집되지 않았습니다."],
  };
}

export function checkParcelCoordinateConsistency() {
  return {
    status: "TODO",
    message:
      "필지주소-좌표 정합성은 지도 API/개인정보 정책 확정 후 함수 내부 구현 예정입니다.",
  };
}
