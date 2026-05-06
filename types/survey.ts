export type InputType =
  | "text"
  | "number"
  | "select"
  | "textarea"
  | "date"
  | "tel"
  | "datetime-local";

export type TabId =
  | "farm-basic"
  | "interview"
  | "growth-june"
  | "growth-july"
  | "growth-august"
  | "growth-september"
  | "production";

export type PhotoStatus = "미촬영" | "촬영 완료";
export type GpsStatus = "미수집" | "수집 중" | "수집 완료" | "오류 발생";

export type SurveyTab = {
  id: TabId;
  label: string;
  order: number;
  help: string;
};

export type ValidationCandidate = {
  range?: string;
  warning?: string;
};

export type HelpDictionaryItem = {
  fieldId: string;
  questionName: string;
  purpose: string;
  inputMethod: string;
  example: string;
  unit?: string;
  cautions: string;
  relatedPhotoRequired: boolean;
  relatedGpsRequired: boolean;
  needsReview: boolean;
};

export type ValidationSeverity = "info" | "warning" | "error" | "admin_review";

export type ValidationIssue = {
  fieldId: string;
  fieldLabel: string;
  severity: ValidationSeverity;
  message: string;
  ruleId?: string;
  blocksSubmit?: boolean;
};

export type HandoffValidationLevel = ValidationSeverity;

export type HandoffValidationRule = {
  ruleId: string;
  tabId: string;
  fieldId: string;
  label: string;
  inputType: string;
  unit: string;
  level: HandoffValidationLevel;
  ruleType: string;
  messageForEnumerator: string;
  allowedOptions: string[];
  min: number | null;
  max: number | null;
  warningMin: number | null;
  warningMax: number | null;
  relatedFields: string[];
  blocksSubmit: boolean;
  needsReview: boolean;
};

export type ValidationRule = {
  fieldId: string;
  required: boolean;
  min?: number | null;
  max?: number | null;
  warningMin?: number | null;
  warningMax?: number | null;
  allowedOptions?: string[];
  warningMessage: string;
  errorMessage: string;
  ruleType: "confirmed" | "extracted" | "inferred";
  needsReview: boolean;
};

export type PhotoAiCriterion = {
  fieldId: string;
  photoType: string;
  purpose: string;
  mustShow: string[];
  aiChecks: string[];
  resultCategories: string[];
  needsReview: boolean;
};

export type GpsValidationCandidate = {
  id: string;
  title: string;
  checks: string[];
  toleranceCandidate: string;
  needsReview: boolean;
};

export type SurveyField = {
  id: string;
  fieldId: string;
  tabId: TabId;
  label: string;
  inputType: InputType;
  required: boolean;
  unit?: string;
  options: string[];
  note?: string;
  sourceFile?: string;
  needsReview: boolean;
  sensitive?: boolean;
  validation?: ValidationCandidate;
  readOnly?: boolean;
};

export type RepeatField = {
  id: string;
  label: string;
  inputType: InputType;
  unit?: string;
  required?: boolean;
  note?: string;
  validation?: ValidationCandidate;
};

export type RepeatGroup = {
  id: string;
  tabId: TabId;
  label: string;
  description: string;
  parentLabel: string;
  itemLabel: string;
  parentCount: number;
  maxRowsPerParent: number;
  initialRowsPerParent: number;
  fields: RepeatField[];
  needsReview?: boolean;
  sourceFile?: string;
};

export type PhotoSpec = {
  id: string;
  label: string;
  shortLabel?: string;
  required: boolean;
  note?: string;
  sourceFile?: string;
  needsReview?: boolean;
  aiExcluded?: boolean;
  adminReviewRequired?: boolean;
};

export type GpsState = {
  latitude: string;
  longitude: string;
  altitude: string;
  accuracy: string;
  timestamp: string;
  status: GpsStatus;
};

export type PhotoState = {
  status: PhotoStatus;
  fileName?: string;
  previewUrl?: string;
};

export type FormDataState = Record<string, Record<string, string>>;

export type RepeatRow = {
  id: string;
  parentId: string;
  index: number;
  values: Record<string, string>;
};

export type RepeatDataState = Record<string, RepeatRow[]>;

export type SubmissionCommonFields = {
  sample_id: string;
  farmer_name: string;
  phone: string;
  crop_type: string;
  variety_group: string;
  detail_variety: string;
  sido: string;
  sigungu: string;
  home_address: string;
  field_address: string;
  survey_month: string;
  survey_round_key: string;
  survey_label: string;
  window_start?: string;
  window_end?: string;
  surveyor_id: string;
};

export type SurveySubmissionPayload = {
  client_submission_id: string;
  common: SubmissionCommonFields;
  activeTab: TabId;
  formData: FormDataState;
  repeatData: RepeatDataState;
  photoStates: Record<string, Omit<PhotoState, "previewUrl">>;
  gpsState: GpsState;
  savedAt?: string;
  submittedAt?: string;
};

export type SurveyDraft = {
  activeTab: TabId;
  selectedSampleId?: string;
  clientSubmissionId?: string;
  commonFields?: SubmissionCommonFields;
  submissionPayload?: SurveySubmissionPayload;
  formData: FormDataState;
  repeatData: RepeatDataState;
  photoStates: Record<string, Omit<PhotoState, "previewUrl">>;
  gpsState: GpsState;
  savedAt: string;
};

export type SurveySchema = {
  tabs: SurveyTab[];
  fields: SurveyField[];
  repeatGroups: RepeatGroup[];
  photos: PhotoSpec[];
};
