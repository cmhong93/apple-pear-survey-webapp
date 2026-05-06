"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import { useEffect, useMemo, useState } from "react";
import BottomActionBar from "@/components/BottomActionBar";
import GpsSection from "@/components/GpsSection";
import KakaoMapSection from "@/components/KakaoMapSection";
import LoginPanel from "@/components/LoginPanel";
import PhotoCaptureSection from "@/components/PhotoCaptureSection";
import RightReviewPanel from "@/components/RightReviewPanel";
import SampleListPanel from "@/components/SampleListPanel";
import SurveyFormRenderer from "@/components/SurveyFormRenderer";
import { getQuestionHelp } from "@/data/handoffArtifacts";
import {
  getRawSampleValue,
  type SampleMasterRecord,
  type SampleWorkbookResponse,
} from "@/data/sampleMaster";
import { draftStorageKey, surveySchema } from "@/data/surveySchema";
import {
  allPhotoRequirements,
  getPhotoMissingMessage,
  getPhotoRequirementsForRoundKey,
  getPhotoRequirementsForTab,
  type PhotoRequirement,
} from "@/data/photoRequirements";
import {
  getDefaultSurveyRound,
  getSurveyRoundByKey,
  getSurveyRoundsForSample,
  surveyRounds,
} from "@/data/surveySchedule";
import type { AuthUser } from "@/lib/auth";
import type {
  FormDataState,
  GpsState,
  PhotoState,
  RepeatDataState,
  SubmissionCommonFields,
  SurveyDraft,
  SurveyField,
  SurveySubmissionPayload,
  TabId,
  ValidationIssue,
} from "@/types/survey";
import {
  compareGpsCoordinates,
  toCoordinate,
  type Coordinate,
} from "@/utils/gpsConsistency";
import {
  checkParcelCoordinateConsistency,
  validateGpsConsistency,
  validateSurveyFieldValue,
  validateSurveyValues,
} from "@/utils/validationEngine";

type GeocodeAddressResponse = {
  latitude: number | null;
  longitude: number | null;
  address_name: string;
  road_address: string;
};

type ReverseGeocodeResponse = {
  address_name: string;
  road_address: string;
  region_1depth_name: string;
  region_2depth_name: string;
  region_3depth_name: string;
};

type SubmissionResponse = {
  submission_id?: string;
  submitted_at?: string;
  answer_count?: number;
  duplicate?: boolean;
  error?: string;
};

type PdfExportResponse = {
  filename?: string;
  drive_file_id?: string;
  drive_url?: string;
  status?: string;
  error?: string;
};

const createClientSubmissionId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `client_${Date.now()}_${Math.random().toString(16).slice(2)}`;
};

const createSampleFormData = (
  sample: SampleMasterRecord | undefined
): FormDataState => {
  if (!sample) return {};

  const nextFormData: FormDataState = {};

  surveySchema.fields.forEach((field) => {
    const sampleValue = getRawSampleValue(sample, field.fieldId);
    if (sampleValue === "") return;

    nextFormData[field.tabId] = {
      ...(nextFormData[field.tabId] ?? {}),
      [field.id]: sampleValue,
    };
  });

  return nextFormData;
};

const createInitialPhotoStates = (): Record<string, PhotoState> =>
  Object.fromEntries(
    allPhotoRequirements.map((photo) => [photo.id, { status: "미촬영" }])
  );

const getPhotosForTab = (tabId: TabId, roundKey?: string) =>
  roundKey
    ? getPhotoRequirementsForRoundKey(roundKey)
    : getPhotoRequirementsForTab(tabId);

const getPhotoSubmitIssues = ({
  photos,
  photoStates,
}: {
  photos: PhotoRequirement[];
  photoStates: Record<string, PhotoState>;
}): ValidationIssue[] =>
  photos
    .filter((photo) => photo.required)
    .flatMap((photo) => {
      const status = photoStates[photo.id]?.status ?? "미촬영";
      if (status === "촬영 완료") return [];

      const message =
        photo.id === "photo_bank_request_signed"
          ? "계좌입금의뢰서 서명본은 발주처 제출 필수 항목입니다. 전체 문서가 보이도록 촬영해 업로드해 주세요."
          : `${photo.label}은 필수 촬영 항목입니다.`;

      const photoMessage = getPhotoMissingMessage(photo);
      void message;

      return [
        {
          fieldId: photo.id,
          fieldLabel: photo.label,
          severity: "error",
          message: photoMessage,
          blocksSubmit: true,
        },
      ];
    });

const createInitialGpsState = (): GpsState => ({
  latitude: "",
  longitude: "",
  altitude: "",
  accuracy: "",
  timestamp: "",
  status: "미수집",
});

const formatDateTime = (date: Date) => {
  const pad = (value: number) => String(value).padStart(2, "0");

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate()
  )} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const getSampleRaw = (
  sample: SampleMasterRecord | undefined,
  key: string
) => sample?.raw[key] ?? "";

const createSubmissionCommonFields = ({
  sample,
  currentUser,
  round,
}: {
  sample: SampleMasterRecord | undefined;
  currentUser: AuthUser | undefined;
  round?: ReturnType<typeof getDefaultSurveyRound>;
}): SubmissionCommonFields => ({
  sample_id: sample?.sampleId ?? "",
  farmer_name: sample?.farmerName ?? "",
  phone: sample?.phone ?? sample?.mobilePhone ?? "",
  crop_type: sample?.crop ?? "",
  variety_group: sample?.variety ?? "",
  detail_variety:
    getSampleRaw(sample, "detailed_variety") ||
    getSampleRaw(sample, "detail_variety") ||
    "",
  sido: getSampleRaw(sample, "sido") || getSampleRaw(sample, "시도") || getSampleRaw(sample, "_source_sido"),
  sigungu:
    getSampleRaw(sample, "sigungu") ||
    getSampleRaw(sample, "시군구") ||
    getSampleRaw(sample, "_source_sigungu"),
  home_address: sample?.homeAddress ?? "",
  field_address: sample?.plotAddress ?? "",
  survey_month:
    round?.surveyMonth || sample?.surveyMonth || getSampleRaw(sample, "survey_month"),
  survey_round_key: round?.roundKey ?? "farm_basic",
  survey_label: round?.label ?? "농가기본정보",
  window_start: round?.windowStart,
  window_end: round?.windowEnd,
  surveyor_id:
    getSampleRaw(sample, "surveyor_id") ||
    getSampleRaw(sample, "조사원") ||
    sample?.surveyorId ||
    currentUser?.surveyorId ||
    "",
});

const getFieldValueByFieldId = ({
  formData,
  fieldId,
}: {
  formData: FormDataState;
  fieldId: string;
}) => {
  const field = surveySchema.fields.find((item) => item.fieldId === fieldId);
  if (!field) return "";

  return formData[field.tabId]?.[field.id] ?? "";
};

const createSchemaFormData = (formData: FormDataState): FormDataState => {
  const allowedKeys = new Map<string, Set<string>>();

  surveySchema.fields.forEach((field) => {
    const tabKeys = allowedKeys.get(field.tabId) ?? new Set<string>();
    tabKeys.add(field.id);
    allowedKeys.set(field.tabId, tabKeys);
  });

  return Object.fromEntries(
    Object.entries(formData)
      .map(([tabId, values]) => {
        const tabKeys = allowedKeys.get(tabId);
        if (!tabKeys) return [tabId, {}];

        return [
          tabId,
          Object.fromEntries(
            Object.entries(values).filter(([fieldId]) => tabKeys.has(fieldId))
          ),
        ];
      })
      .filter(([, values]) => Object.keys(values).length > 0)
  );
};

const formatSurveyMonth = (date: Date) =>
  `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}`;

const monthDayFieldIds = new Set([
  "bloom_start_normal_date",
  "full_bloom_normal_date",
]);

const normalizeMonthDay = (value: string) => {
  const trimmedValue = value.trim();
  const match = trimmedValue.match(/^(\d{1,2})[-/](\d{1,2})$/);
  if (!match) return value;

  const month = Number(match[1]);
  const day = Number(match[2]);
  const testDate = new Date(2024, month - 1, day);
  if (
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31 ||
    testDate.getMonth() !== month - 1 ||
    testDate.getDate() !== day
  ) {
    return value;
  }

  return `${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
};

const coldDamageAutoSumPairs = [
  {
    rate: "cold_damage_2026_rate",
    noFruitSet: "cold_damage_2026_no_fruit_set_rate",
    qualityDecline: "cold_damage_2026_quality_decline_rate",
  },
  {
    rate: "cold_damage_2025_rate",
    noFruitSet: "cold_damage_2025_no_fruit_set_rate",
    qualityDecline: "cold_damage_2025_quality_decline_rate",
  },
];

const formatAutoSum = (left: string, right: string) => {
  const leftValue = Number(left);
  const rightValue = Number(right);
  if (!left || !right || !Number.isFinite(leftValue) || !Number.isFinite(rightValue)) {
    return "";
  }

  const sum = leftValue + rightValue;
  return Number.isInteger(sum) ? String(sum) : sum.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
};

const autoTreeCountSourceFieldIds = new Set([
  "plot_area_pyeong",
  "row_spacing_m",
  "tree_spacing_m",
]);

const calculatePlantedTreeCount = ({
  plotAreaPyeong,
  rowSpacingM,
  treeSpacingM,
}: {
  plotAreaPyeong: string;
  rowSpacingM: string;
  treeSpacingM: string;
}) => {
  const plotArea = Number(plotAreaPyeong);
  const rowSpacing = Number(rowSpacingM);
  const treeSpacing = Number(treeSpacingM);

  if (
    !Number.isFinite(plotArea) ||
    !Number.isFinite(rowSpacing) ||
    !Number.isFinite(treeSpacing) ||
    plotArea <= 0 ||
    rowSpacing <= 0 ||
    treeSpacing <= 0
  ) {
    return "";
  }

  return String(Math.round((plotArea * 3.3058) / (rowSpacing * treeSpacing)));
};

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabId>(surveySchema.tabs[0].id);
  const [activeRoundKey, setActiveRoundKey] = useState("farm_basic");
  const [formData, setFormData] = useState<FormDataState>({});
  const [repeatData, setRepeatData] = useState<RepeatDataState>({});
  const [photoStates, setPhotoStates] = useState<Record<string, PhotoState>>(
    createInitialPhotoStates
  );
  const [gpsState, setGpsState] = useState<GpsState>(createInitialGpsState);
  const [aiValidation, setAiValidation] = useState("AI 검증 전입니다.");
  const [errors, setErrors] = useState<string[]>([]);
  const [validationIssues, setValidationIssues] = useState<ValidationIssue[]>(
    []
  );
  const [selectedField, setSelectedField] = useState<SurveyField | undefined>();
  const [footerStatus, setFooterStatus] = useState(
    "상태: 임시작성 중 / 관리자 확인 필요 없음"
  );
  const [lastSavedAt, setLastSavedAt] = useState("");
  const [sampleMasterStatus, setSampleMasterStatus] = useState(
    "표본 리스트를 불러오는 중입니다."
  );
  const [samples, setSamples] = useState<SampleMasterRecord[]>([]);
  const [selectedSampleId, setSelectedSampleId] = useState("");
  const [sampleTotalCount, setSampleTotalCount] = useState(0);
  const [sampleColumnCount, setSampleColumnCount] = useState(0);
  const [draftLoaded, setDraftLoaded] = useState(false);
  const [hasDraft, setHasDraft] = useState(false);
  const [currentUser, setCurrentUser] = useState<AuthUser | undefined>();
  const [sessionChecked, setSessionChecked] = useState(false);
  const [plotCoordinate, setPlotCoordinate] = useState<Coordinate | undefined>();
  const [plotGeocodeStatus, setPlotGeocodeStatus] =
    useState("필지주소 좌표 변환 전");
  const [reverseAddress, setReverseAddress] = useState("");
  const [clientSubmissionId, setClientSubmissionId] = useState(
    createClientSubmissionId
  );
  const [submissionResult, setSubmissionResult] =
    useState<SubmissionResponse | undefined>();
  const [submitting, setSubmitting] = useState(false);
  const [pdfExportResult, setPdfExportResult] = useState<PdfExportResponse | undefined>();
  const [pdfGenerating, setPdfGenerating] = useState(false);

  const selectedSample = useMemo(
    () => samples.find((sample) => sample.sampleId === selectedSampleId),
    [samples, selectedSampleId]
  );

  const availableSurveyRounds = useMemo(
    () => getSurveyRoundsForSample(selectedSample),
    [selectedSample]
  );
  const availableRoundKeys = useMemo(
    () => new Set(availableSurveyRounds.map((round) => round.roundKey)),
    [availableSurveyRounds]
  );

  const activeRound = useMemo(
    () =>
      getSurveyRoundByKey(activeRoundKey) ??
      getDefaultSurveyRound(selectedSample),
    [activeRoundKey, selectedSample]
  );

  const browserCoordinate = useMemo(
    () => toCoordinate(gpsState.latitude, gpsState.longitude),
    [gpsState.latitude, gpsState.longitude]
  );

  const gpsConsistency = useMemo(
    () =>
      compareGpsCoordinates({
        browserGps: browserCoordinate,
        parcelCoordinate: plotCoordinate,
      }),
    [browserCoordinate, plotCoordinate]
  );

  const submissionCommonFields = useMemo(
    () => {
      const common = createSubmissionCommonFields({
        sample: selectedSample,
        currentUser,
        round: activeRound,
      });
      return {
        ...common,
        survey_month:
          activeRound.surveyMonth ||
          common.survey_month ||
          getFieldValueByFieldId({ formData, fieldId: "survey_month" }) ||
          formatSurveyMonth(new Date()),
        surveyor_id:
          common.surveyor_id ||
          getFieldValueByFieldId({ formData, fieldId: "surveyor_name" }) ||
          currentUser?.surveyorId ||
          "",
      };
    },
    [activeRound, currentUser, formData, selectedSample]
  );

  const sampleDefaultValuesByFieldId = useMemo(() => {
    if (!selectedSample) return {};

    return Object.fromEntries(
      surveySchema.fields
        .map((field) => [
          field.id,
          getRawSampleValue(selectedSample, field.fieldId),
        ])
        .filter((entry): entry is [string, string] => entry[1] !== "")
    );
  }, [selectedSample]);

  const activeTabSchema = useMemo(
    () => {
      const tab =
        surveySchema.tabs.find((item) => item.id === activeTab) ??
        surveySchema.tabs[0];
      return {
        ...tab,
        label: activeRound.label,
      };
    },
    [activeRound.label, activeTab]
  );

  const activeFields = useMemo(
    () => surveySchema.fields.filter((field) => field.tabId === activeTab),
    [activeTab]
  );

  const activePhotos = useMemo(
    () => getPhotosForTab(activeTab, activeRound.roundKey),
    [activeRound.roundKey, activeTab]
  );

  const activeRepeatGroups = useMemo(
    () =>
      surveySchema.repeatGroups.filter((group) => group.tabId === activeTab),
    [activeTab]
  );

  const autoLoadedFieldIds = useMemo(
    () => new Set(Object.keys(sampleDefaultValuesByFieldId)),
    [sampleDefaultValuesByFieldId]
  );

  const modifiedFieldIds = useMemo(() => {
    const modified = new Set<string>();
    const farmBasicData = formData["farm-basic"] ?? {};

    Object.entries(sampleDefaultValuesByFieldId).forEach(
      ([fieldId, sampleValue]) => {
        if ((farmBasicData[fieldId] ?? "") !== sampleValue) {
          modified.add(fieldId);
        }
      }
    );

    return modified;
  }, [formData, sampleDefaultValuesByFieldId]);

  const selectedHelp = selectedField
    ? getQuestionHelp(selectedField.fieldId, selectedField.label)
    : undefined;

  useEffect(() => {
    const areaField = surveySchema.fields.find(
      (item) => item.fieldId === "plot_area_pyeong"
    );
    const rowSpacingField = surveySchema.fields.find(
      (item) => item.fieldId === "row_spacing_m"
    );
    const treeSpacingField = surveySchema.fields.find(
      (item) => item.fieldId === "tree_spacing_m"
    );
    const treeCountField = surveySchema.fields.find(
      (item) => item.fieldId === "planted_tree_count"
    );

    if (!areaField || !rowSpacingField || !treeSpacingField || !treeCountField) {
      return;
    }

    const tabData = formData[treeCountField.tabId] ?? {};
    const calculatedTreeCount = calculatePlantedTreeCount({
      plotAreaPyeong: tabData[areaField.id] ?? "",
      rowSpacingM: tabData[rowSpacingField.id] ?? "",
      treeSpacingM: tabData[treeSpacingField.id] ?? "",
    });

    if (!calculatedTreeCount || tabData[treeCountField.id] === calculatedTreeCount) {
      return;
    }

    setFormData((prev) => ({
      ...prev,
      [treeCountField.tabId]: {
        ...(prev[treeCountField.tabId] ?? {}),
        [treeCountField.id]: calculatedTreeCount,
      },
    }));
  }, [formData]);

  useEffect(() => {
    const draftJson = localStorage.getItem(draftStorageKey);
    if (!draftJson) {
      setDraftLoaded(true);
      return;
    }

    try {
      const draft = JSON.parse(draftJson) as SurveyDraft;
      const draftTab = surveySchema.tabs.some((tab) => tab.id === draft.activeTab)
        ? draft.activeTab
        : surveySchema.tabs[0].id;
      const draftRoundKey =
        draft.commonFields?.survey_round_key ??
        draft.submissionPayload?.common?.survey_round_key ??
        getDefaultSurveyRound().roundKey;

      setHasDraft(true);
      setSelectedSampleId(draft.selectedSampleId ?? "");
      setClientSubmissionId(
        draft.clientSubmissionId ?? createClientSubmissionId()
      );
      setActiveTab(draftTab);
      setActiveRoundKey(draftRoundKey);
      setFormData(draft.formData ?? {});
      setRepeatData(draft.repeatData ?? {});
      setGpsState(draft.gpsState ?? createInitialGpsState());
      setLastSavedAt(draft.savedAt ?? "");
      setFooterStatus("상태: 임시저장 불러옴 / 관리자 확인 필요 없음");
      setPhotoStates(() => {
        const restored = createInitialPhotoStates();
        allPhotoRequirements.forEach((photo) => {
          const saved = draft.photoStates?.[photo.id];
          if (saved) {
            restored[photo.id] = {
              status: saved.status,
              fileName: saved.fileName,
              driveFileId: saved.driveFileId,
              aiStatus: saved.aiStatus,
              aiMessage: saved.aiMessage,
            };
          }
        });
        return restored;
      });
    } catch {
      setErrors((prev) => [
        ...prev,
        "임시저장 데이터를 불러오지 못했습니다.",
      ]);
    } finally {
      setDraftLoaded(true);
    }
  }, []);

  useEffect(() => {
    fetch("/api/session")
      .then((response) => {
        if (!response.ok) return undefined;
        return response.json() as Promise<{ user: AuthUser }>;
      })
      .then((payload) => setCurrentUser(payload?.user))
      .finally(() => setSessionChecked(true));
  }, []);

  useEffect(() => {
    if (!draftLoaded || !currentUser) return;

    fetch("/api/samples")
      .then((response) => response.json())
      .then((payload: SampleWorkbookResponse) => {
        if (!payload.samples) {
          setSampleMasterStatus("표본 조회 권한이 없거나 로그인이 필요합니다.");
          return;
        }

        setSamples(payload.samples);
        setSampleTotalCount(payload.totalCount);
        setSampleColumnCount(payload.columnCount);

        const nextSample =
          payload.samples.find((sample) => sample.sampleId === selectedSampleId) ??
          payload.samples[0];

        if (nextSample) {
          setSelectedSampleId(nextSample.sampleId);
          if (!hasDraft) {
            setFormData(createSampleFormData(nextSample));
          }
        }

        setSampleMasterStatus(
          `표본 기본정보 자동 불러옴 / ${payload.sheetName} ${payload.totalCount}건, 컬럼 ${payload.columnCount}개`
        );
      })
      .catch(() => {
        setSampleMasterStatus("표본 리스트를 불러오지 못했습니다.");
        setErrors((prev) => [...prev, "표본 리스트 로딩 오류"]);
      });
  }, [draftLoaded, hasDraft, selectedSampleId, currentUser]);

  useEffect(() => {
    if (availableSurveyRounds.some((round) => round.roundKey === activeRoundKey)) {
      return;
    }
    const fallbackRound = getDefaultSurveyRound(selectedSample);
    setActiveRoundKey(fallbackRound.roundKey);
    setActiveTab(fallbackRound.tabId);
  }, [activeRoundKey, availableSurveyRounds, selectedSample]);

  useEffect(() => {
    if (!currentUser || !selectedSample?.plotAddress) {
      setPlotCoordinate(undefined);
      setPlotGeocodeStatus("필지주소 좌표 변환 전");
      return;
    }

    let ignore = false;
    setPlotCoordinate(undefined);
    setPlotGeocodeStatus("필지주소 좌표 변환 중");

    fetch("/api/geo/geocode", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ field_address: selectedSample.plotAddress }),
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("geocode failed");
        return response.json() as Promise<GeocodeAddressResponse>;
      })
      .then((payload) => {
        if (ignore) return;

        if (payload.latitude === null || payload.longitude === null) {
          setPlotGeocodeStatus("좌표 후보 없음");
          return;
        }

        setPlotCoordinate({
          latitude: payload.latitude,
          longitude: payload.longitude,
        });
        setPlotGeocodeStatus("필지주소 좌표 후보 생성");
      })
      .catch(() => {
        if (!ignore) {
          setPlotGeocodeStatus("좌표 변환 실패 또는 환경변수 미설정");
        }
      });

    return () => {
      ignore = true;
    };
  }, [currentUser, selectedSample?.sampleId, selectedSample?.plotAddress]);

  useEffect(() => {
    if (!currentUser || !browserCoordinate) {
      setReverseAddress("");
      return;
    }

    let ignore = false;

    fetch("/api/geo/reverse-geocode", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(browserCoordinate),
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("reverse geocode failed");
        return response.json() as Promise<ReverseGeocodeResponse>;
      })
      .then((payload) => {
        if (!ignore) {
          setReverseAddress(payload.road_address || payload.address_name);
        }
      })
      .catch(() => {
        if (!ignore) setReverseAddress("");
      });

    return () => {
      ignore = true;
    };
  }, [browserCoordinate, currentUser]);

  const handleLogin = (user: AuthUser) => {
    setCurrentUser(user);
    setSamples([]);
    setSelectedSampleId("");
    setSampleTotalCount(0);
    setSampleColumnCount(0);
    setSampleMasterStatus("로그인 세션 기준으로 표본 리스트를 불러오는 중입니다.");
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setCurrentUser(undefined);
    setSamples([]);
    setSelectedSampleId("");
    setSampleTotalCount(0);
    setSampleColumnCount(0);
    setSubmissionResult(undefined);
    setPdfExportResult(undefined);
    setClientSubmissionId(createClientSubmissionId());
    setSampleMasterStatus("로그아웃되었습니다. 다시 로그인해 주세요.");
  };

  const handleSelectSample = (sampleId: string) => {
    const nextSample = samples.find((sample) => sample.sampleId === sampleId);
    if (!nextSample) return;

    if (selectedSampleId && selectedSampleId !== sampleId) {
      const confirmed = window.confirm(
        "표본을 변경하면 현재 입력 중인 조사값, 반복 실측, 사진/GPS 상태가 새 표본 기준으로 초기화됩니다. 계속하시겠습니까?"
      );
      if (!confirmed) return;
    }

    setSelectedSampleId(sampleId);
    const defaultRound = getDefaultSurveyRound(nextSample);
    setActiveRoundKey(defaultRound.roundKey);
    setActiveTab(defaultRound.tabId);
    setFormData(createSampleFormData(nextSample));
    setRepeatData({});
    setPhotoStates(createInitialPhotoStates());
    setGpsState(createInitialGpsState());
    setValidationIssues([]);
    setErrors([]);
    setSelectedField(undefined);
    setSubmissionResult(undefined);
    setPdfExportResult(undefined);
    setClientSubmissionId(createClientSubmissionId());
    setAiValidation("AI 검증 전입니다.");
    setSampleMasterStatus(
      "표본 변경 완료 / 새 표본 기준으로 조사 입력 상태를 초기화했습니다."
    );
  };

  const handleFieldChange = (tabId: string, fieldId: string, value: string) => {
    const field = surveySchema.fields.find(
      (item) => item.tabId === tabId && item.id === fieldId
    );
    if (field?.readOnly) return;

    const nextValue =
      field && monthDayFieldIds.has(field.fieldId)
        ? normalizeMonthDay(value)
        : value;

    setFormData((prev) => {
      const nextTabData = {
        ...(prev[tabId] ?? {}),
        [fieldId]: nextValue,
      };

      coldDamageAutoSumPairs.forEach((pair) => {
        const rateField = surveySchema.fields.find(
          (item) => item.fieldId === pair.rate
        );
        const noFruitSetField = surveySchema.fields.find(
          (item) => item.fieldId === pair.noFruitSet
        );
        const qualityDeclineField = surveySchema.fields.find(
          (item) => item.fieldId === pair.qualityDecline
        );

        if (
          !rateField ||
          !noFruitSetField ||
          !qualityDeclineField ||
          rateField.tabId !== tabId
        ) {
          return;
        }

        if (fieldId !== noFruitSetField.id && fieldId !== qualityDeclineField.id) {
          return;
        }

        nextTabData[rateField.id] = formatAutoSum(
          nextTabData[noFruitSetField.id] ?? "",
          nextTabData[qualityDeclineField.id] ?? ""
        );
      });

      if (field && autoTreeCountSourceFieldIds.has(field.fieldId)) {
        const areaField = surveySchema.fields.find(
          (item) => item.fieldId === "plot_area_pyeong"
        );
        const rowSpacingField = surveySchema.fields.find(
          (item) => item.fieldId === "row_spacing_m"
        );
        const treeSpacingField = surveySchema.fields.find(
          (item) => item.fieldId === "tree_spacing_m"
        );
        const treeCountField = surveySchema.fields.find(
          (item) => item.fieldId === "planted_tree_count"
        );

        if (
          areaField &&
          rowSpacingField &&
          treeSpacingField &&
          treeCountField &&
          treeCountField.tabId === tabId
        ) {
          const calculatedTreeCount = calculatePlantedTreeCount({
            plotAreaPyeong: nextTabData[areaField.id] ?? "",
            rowSpacingM: nextTabData[rowSpacingField.id] ?? "",
            treeSpacingM: nextTabData[treeSpacingField.id] ?? "",
          });

          if (calculatedTreeCount) {
            nextTabData[treeCountField.id] = calculatedTreeCount;
          }
        }
      }

      return {
        ...prev,
        [tabId]: nextTabData,
      };
    });
    setSubmissionResult(undefined);
    setPdfExportResult(undefined);

    if (!field) return;

    const fieldIssues = validateSurveyFieldValue({
      field,
      value: nextValue,
      mode: "save",
    });

    setValidationIssues((prev) => {
      const merged = [
        ...prev.filter((issue) => issue.fieldId !== field.fieldId),
        ...fieldIssues,
      ];
      setErrors(merged.map((issue) => issue.message));
      return merged;
    });
  };

  const handlePhotoChange = async (photoId: string, file: File | null) => {
    if (!file) return;
    if (!submissionCommonFields.sample_id) {
      setErrors((prev) => [
        ...prev,
        "표본을 먼저 선택한 뒤 사진을 업로드해 주세요.",
      ]);
      return;
    }

    const previewUrl = URL.createObjectURL(file);

    setPhotoStates((prev) => {
      const previousPreview = prev[photoId]?.previewUrl;
      if (previousPreview) {
        URL.revokeObjectURL(previousPreview);
      }

      return {
        ...prev,
        [photoId]: {
          status: "촬영 완료",
          fileName: file.name,
          previewUrl,
        },
      };
    });
    setSubmissionResult(undefined);

    const uploadForm = new FormData();
    uploadForm.set("file", file);
    uploadForm.set("sample_id", submissionCommonFields.sample_id);
    uploadForm.set("survey_month", submissionCommonFields.survey_month);
    uploadForm.set("active_tab", activeTab);
    uploadForm.set("survey_round_key", activeRound.roundKey);
    uploadForm.set("photo_id", photoId);
    uploadForm.set("captured_at", new Date().toISOString());
    uploadForm.set("browser_latitude", gpsState.latitude);
    uploadForm.set("browser_longitude", gpsState.longitude);
    uploadForm.set("browser_altitude", gpsState.altitude);
    uploadForm.set("gps_accuracy_m", gpsState.accuracy);

    try {
      const response = await fetch("/api/photos/upload", {
        method: "POST",
        body: uploadForm,
      });
      const result = (await response.json().catch(() => ({}))) as {
        filename?: string;
        drive_file_id?: string;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(result.error || "사진 업로드에 실패했습니다.");
      }

      setPhotoStates((prev) => ({
        ...prev,
        [photoId]: {
          status: "촬영 완료",
          fileName: result.filename || file.name,
          previewUrl,
          driveFileId: result.drive_file_id,
        },
      }));
      setErrors((prev) => prev.filter((error) => !error.includes("사진 업로드")));
    } catch (error) {
      setPhotoStates((prev) => ({
        ...prev,
        [photoId]: {
          status: "미촬영",
          fileName: file.name,
          previewUrl,
        },
      }));
      setErrors((prev) => [
        ...prev,
        error instanceof Error ? error.message : "사진 업로드에 실패했습니다.",
      ]);
    }
  };

  const handleGpsCollect = () => {
    if (!navigator.geolocation) {
      setGpsState((prev) => ({ ...prev, status: "오류 발생" }));
      setErrors((prev) => [
        ...prev,
        "브라우저가 GPS를 지원하지 않습니다.",
      ]);
      return;
    }

    setGpsState((prev) => ({ ...prev, status: "수집 중" }));

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude, altitude, accuracy } = position.coords;
        setGpsState({
          latitude: latitude.toFixed(6),
          longitude: longitude.toFixed(6),
          altitude: altitude !== null ? altitude.toFixed(1) : "측정불가",
          accuracy: accuracy.toFixed(1),
          timestamp: formatDateTime(new Date()),
          status: "수집 완료",
        });
        if (altitude !== null) {
          const altitudeField = surveySchema.fields.find(
            (field) => field.fieldId === "altitude_m"
          );
          const altitudeSourceField = surveySchema.fields.find(
            (field) => field.fieldId === "altitude_source"
          );

          setFormData((prev) => {
            const next = { ...prev };
            if (altitudeField) {
              next[altitudeField.tabId] = {
                ...(next[altitudeField.tabId] ?? {}),
                [altitudeField.id]: altitude.toFixed(1),
              };
            }
            if (altitudeSourceField) {
              next[altitudeSourceField.tabId] = {
                ...(next[altitudeSourceField.tabId] ?? {}),
                [altitudeSourceField.id]: "앱 GPS",
              };
            }
            return next;
          });
        }
        setSubmissionResult(undefined);
        setErrors((prev) => prev.filter((error) => !error.includes("GPS")));
      },
      (error) => {
        let errorMessage = "GPS 수집 중 오류가 발생했습니다.";
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = "위치 권한이 거부되었습니다.";
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = "위치 정보를 사용할 수 없습니다.";
            break;
          case error.TIMEOUT:
            errorMessage = "위치 요청 시간이 초과되었습니다.";
            break;
        }

        setGpsState((prev) => ({ ...prev, status: "오류 발생" }));
        setErrors((prev) => [
          ...prev.filter(
            (item) => !item.includes("GPS") && !item.includes("위치")
          ),
          errorMessage,
        ]);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  const createStoredPhotoStates = () => {
    const storedPhotoStates: SurveyDraft["photoStates"] = {};

    allPhotoRequirements.forEach((photo) => {
      storedPhotoStates[photo.id] = {
        status: photoStates[photo.id]?.status ?? "미촬영",
        fileName: photoStates[photo.id]?.fileName,
        driveFileId: photoStates[photo.id]?.driveFileId,
        aiStatus: photoStates[photo.id]?.aiStatus,
        aiMessage: photoStates[photo.id]?.aiMessage,
      };
    });

    return storedPhotoStates;
  };

  const createSubmissionPayload = ({
    savedAt,
    submittedAt,
  }: {
    savedAt?: string;
    submittedAt?: string;
  }): SurveySubmissionPayload => ({
    client_submission_id: clientSubmissionId,
    common: submissionCommonFields,
    activeTab,
    formData: createSchemaFormData(formData),
    repeatData,
    photoStates: createStoredPhotoStates(),
    gpsState,
    savedAt,
    submittedAt,
  });

  const handleSaveDraft = () => {
    const savedAt = formatDateTime(new Date());
    const saveIssues = validateSurveyValues({
      fields: surveySchema.fields,
      formData,
      gpsState,
      repeatGroups: surveySchema.repeatGroups,
      repeatData,
      mode: "save",
    });
    const submissionPayload = createSubmissionPayload({ savedAt });
    const storedPhotoStates = submissionPayload.photoStates;

    const draft: SurveyDraft = {
      activeTab,
      selectedSampleId,
      clientSubmissionId,
      commonFields: submissionCommonFields,
      submissionPayload,
      formData,
      repeatData,
      photoStates: storedPhotoStates,
      gpsState,
      savedAt,
    };

    localStorage.setItem(draftStorageKey, JSON.stringify(draft));
    setValidationIssues(saveIssues);
    setErrors(saveIssues.map((issue) => issue.message));
    setLastSavedAt(savedAt);
    setFooterStatus("상태: 임시저장 완료 / 관리자 확인 필요 없음");
  };

  const handleAiValidation = () => {
    const missingRequiredPhoto = activePhotos.find(
      (photo) => photo.required && photoStates[photo.id]?.status !== "촬영 완료"
    );
    if (missingRequiredPhoto) {
      setAiValidation("검증 필요: 필수 사진 미촬영 항목이 있습니다.");
      return;
    }

    if (gpsState.status !== "수집 완료") {
      setAiValidation("검증 필요: GPS가 수집되지 않았습니다.");
      return;
    }

    const gpsConsistency = validateGpsConsistency(gpsState);
    const parcelConsistency = checkParcelCoordinateConsistency();
    setAiValidation(
      `AI 검증 완료: 모든 입력이 적합합니다. (${gpsConsistency.warnings[0]} / ${parcelConsistency.message})`
    );
    setErrors(gpsConsistency.warnings);
  };

  const handleSubmit = async () => {
    if (submissionResult?.submission_id && !submissionResult.duplicate) {
      const retry = window.confirm(
        "이미 최종제출이 완료되었습니다. 같은 제출을 다시 시도하시겠습니까?"
      );
      if (!retry) return;
    }

    const submitIssues = validateSurveyValues({
      fields: surveySchema.fields,
      formData,
      gpsState,
      repeatGroups: surveySchema.repeatGroups,
      repeatData,
      mode: "submit",
    });
    const photoIssues = getPhotoSubmitIssues({
      photos: activePhotos,
      photoStates,
    });
    const allSubmitIssues = [...submitIssues, ...photoIssues];
    setValidationIssues(allSubmitIssues);

    const blockingErrors = allSubmitIssues.filter(
      (issue) => issue.severity === "error"
    );
    if (blockingErrors.length > 0) {
      setErrors(blockingErrors.map((issue) => issue.message));
      alert("제출 전 오류 항목을 확인해 주세요.");
      return;
    }

    const submittedAt = formatDateTime(new Date());
    const submissionPayload = createSubmissionPayload({ submittedAt });
    localStorage.setItem(
      `${draftStorageKey}-latest-submission`,
      JSON.stringify(submissionPayload)
    );

    setSubmitting(true);
    setFooterStatus("상태: 최종제출 중 / Google Sheets 저장 요청 중");

    try {
      const response = await fetch("/api/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(submissionPayload),
      });
      const result = (await response.json()) as SubmissionResponse;

      if (!response.ok) {
        throw new Error(result.error || "Google Sheets 저장에 실패했습니다.");
      }

      setSubmissionResult(result);
      setErrors(submitIssues.map((issue) => issue.message));
      setFooterStatus(
        `상태: 최종제출 완료 / submission_id ${result.submission_id} / 답변 ${result.answer_count ?? 0}건 / 저장시각 ${result.submitted_at}`
      );
      alert(
        `제출 완료\nsubmission_id: ${result.submission_id}\n저장된 답변 수: ${result.answer_count ?? 0}\n저장 시각: ${result.submitted_at}`
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "네트워크 또는 서버 오류가 발생했습니다.";
      setSubmissionResult({ error: message });
      setErrors((prev) => [
        ...prev.filter((item) => !item.includes("제출 실패")),
        `제출 실패: ${message}`,
      ]);
      setFooterStatus("상태: 최종제출 실패 / localStorage 임시저장 유지");
      alert(`제출 실패\n${message}\n임시저장은 유지되었습니다.`);
    } finally {
      setSubmitting(false);
    }
  };

  const handlePreviewPdf = () => {
    if (pdfExportResult?.drive_url) {
      window.open(pdfExportResult.drive_url, "_blank", "noopener,noreferrer");
      return;
    }

    alert("아직 생성된 PDF가 없습니다. 최종제출 후 조사표 PDF 생성을 실행해 주세요.");
  };

  const handleGeneratePdf = async () => {
    if (!selectedSampleId || !submissionResult?.submission_id) {
      alert("PDF 생성 전 먼저 최종제출을 완료해 주세요.");
      return;
    }

    setPdfGenerating(true);
    setFooterStatus("상태: 조사표 PDF 생성 중 / Google Drive 저장 요청 중");

    try {
      const response = await fetch("/api/exports/farm-basic-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sample_id: selectedSampleId,
          submission_id: submissionResult.submission_id,
        }),
      });
      const result = (await response.json()) as PdfExportResponse;
      if (!response.ok || result.error) {
        throw new Error(result.error || "PDF 생성에 실패했습니다.");
      }

      setPdfExportResult(result);
      setFooterStatus(
        `상태: 조사표 PDF 생성 완료 / ${result.filename ?? "PDF"}`
      );
      alert(`조사표 PDF 생성 완료\n파일명: ${result.filename ?? ""}`);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "PDF 생성 중 오류가 발생했습니다.";
      setPdfExportResult({ error: message });
      setFooterStatus("상태: 조사표 PDF 생성 실패 / 최종제출 데이터는 유지");
      alert(`조사표 PDF 생성 실패\n${message}`);
    } finally {
      setPdfGenerating(false);
    }
  };

  const handleOpenPdf = () => {
    if (!pdfExportResult?.drive_url) return;
    window.open(pdfExportResult.drive_url, "_blank", "noopener,noreferrer");
  };

  if (sessionChecked && !currentUser) {
    return <LoginPanel onLogin={handleLogin} />;
  }

  return (
    <div className="flex h-screen flex-col bg-gray-100">
      <main className="flex min-h-0 flex-1 overflow-hidden">
        <aside className="w-56 overflow-y-auto border-r bg-white p-3">
          <h2 className="mb-4 text-lg font-bold text-gray-950">조사 단계</h2>
          <div className="flex flex-col gap-2">
            {surveyRounds.map((round) => {
              const enabled = !selectedSample || availableRoundKeys.has(round.roundKey);

              return (
                <button
                  key={round.roundKey}
                  type="button"
                  disabled={!enabled}
                  onClick={() => {
                    if (!enabled) return;
                    setActiveRoundKey(round.roundKey);
                    setActiveTab(round.tabId);
                  }}
                  className={`rounded-lg border px-3 py-3 text-left text-sm ${
                    activeRoundKey === round.roundKey
                      ? "bg-blue-600 text-white"
                      : enabled
                      ? "bg-white hover:bg-gray-100"
                      : "cursor-not-allowed bg-gray-100 text-gray-400"
                  }`}
                >
                  <span className="block">{round.label}</span>
                  {!enabled && (
                    <span className="mt-1 block text-xs">해당 표본 대상 아님</span>
                  )}
                </button>
              );
            })}
          </div>
        </aside>

        <section className="min-h-0 flex-1 overflow-y-auto bg-white p-6">
          <div className="mb-6 rounded-lg border bg-gray-50 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-gray-900">
                  표본 ID: {selectedSample?.sampleId ?? "불러오는 중"}
                </p>
                <p className="text-sm text-gray-700">
                  2025년산 사과·배 생육 및 생산량 실측조사
                </p>
                <p className="mt-1 text-xs text-gray-600">
                  현재 계정: {currentUser?.userId} / 권한: {currentUser?.role} /
                  조사원 ID: {currentUser?.surveyorId}
                </p>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className="rounded border bg-white px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100"
              >
                로그아웃
              </button>
            </div>
          </div>

          <SampleListPanel
            samples={samples}
            selectedSampleId={selectedSampleId}
            totalCount={sampleTotalCount}
            columnCount={sampleColumnCount}
            onSelectSample={handleSelectSample}
          />

          {selectedSample && (
            <section className="mb-6 rounded-lg border bg-white p-4">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-base font-bold text-gray-950">
                  표본 기본정보
                </h2>
                <p className="text-xs font-semibold text-blue-700">
                  모든 조사 단계에서 공통 참조
                </p>
              </div>
              <div className="grid gap-3 text-sm text-gray-800 md:grid-cols-2">
                <SampleInfoItem label="표본 ID" value={selectedSample.sampleId} />
                <SampleInfoItem label="농가명" value={selectedSample.farmerName} />
                <SampleInfoItem label="연락처" value={selectedSample.phone} />
                <SampleInfoItem label="품목" value={selectedSample.crop} />
                <SampleInfoItem label="품종" value={selectedSample.variety} />
                <SampleInfoItem
                  label="행정구역"
                  value={selectedSample.administrativeRegion}
                />
                <SampleInfoItem
                  label="자택주소"
                  value={selectedSample.homeAddress}
                  wide
                />
                <SampleInfoItem
                  label="필지주소"
                  value={selectedSample.plotAddress}
                  wide
                />
              </div>
            </section>
          )}

          <SurveyFormRenderer
            tab={activeTabSchema}
            fields={activeFields}
            repeatGroups={activeRepeatGroups}
            formData={formData}
            repeatData={repeatData}
            cropType={selectedSample?.crop ?? ""}
            autoLoadedFieldIds={autoLoadedFieldIds}
            modifiedFieldIds={modifiedFieldIds}
            onFieldChange={handleFieldChange}
            onRepeatDataChange={setRepeatData}
            onFieldFocus={setSelectedField}
          />

          <div className="mt-6 space-y-6">
            <PhotoCaptureSection
              photos={activePhotos}
              photoStates={photoStates}
              onPhotoChange={handlePhotoChange}
            />
            <GpsSection gpsState={gpsState} onCollect={handleGpsCollect} />
            <KakaoMapSection
              samples={samples}
              selectedSample={selectedSample}
              plotCoordinate={plotCoordinate}
              plotGeocodeStatus={plotGeocodeStatus}
              browserCoordinate={browserCoordinate}
              reverseAddress={reverseAddress}
              gpsConsistency={gpsConsistency}
            />
          </div>
        </section>

        <RightReviewPanel
          tab={activeTabSchema}
          fields={activeFields}
          repeatGroups={activeRepeatGroups}
          photos={activePhotos}
          photoStates={photoStates}
          gpsState={gpsState}
          aiValidation={aiValidation}
          errors={errors}
          sampleMasterStatus={sampleMasterStatus}
          selectedField={selectedField}
          selectedHelp={selectedHelp}
          validationIssues={validationIssues}
          cropType={selectedSample?.crop ?? ""}
          varietyType={selectedSample?.variety ?? ""}
        />
      </main>

      <BottomActionBar
        footerStatus={footerStatus}
        lastSavedAt={lastSavedAt}
        onSaveDraft={handleSaveDraft}
        onValidate={handleAiValidation}
        onSubmit={handleSubmit}
        onPreviewPdf={handlePreviewPdf}
        onGeneratePdf={handleGeneratePdf}
        onOpenPdf={handleOpenPdf}
        submitDisabled={submitting}
        pdfDisabled={pdfGenerating || !submissionResult?.submission_id}
        pdfGenerating={pdfGenerating}
        hasPdf={Boolean(pdfExportResult?.drive_url)}
        submitLabel={submitting ? "제출 중" : "제출"}
      />
    </div>
  );
}

function SampleInfoItem({
  label,
  value,
  wide = false,
}: {
  label: string;
  value: string;
  wide?: boolean;
}) {
  return (
    <div className={wide ? "md:col-span-2" : ""}>
      <p className="text-xs font-semibold text-gray-500">{label}</p>
      <p className="mt-1 whitespace-pre-wrap break-words rounded border bg-gray-50 px-3 py-2">
        {value || "-"}
      </p>
    </div>
  );
}
