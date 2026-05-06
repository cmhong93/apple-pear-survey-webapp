"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import KakaoMapPanel from "@/components/KakaoMapPanel";
import type { AuthUser } from "@/lib/auth";
import type { Coordinate } from "@/utils/gpsConsistency";

type SectionKey =
  | "dashboard"
  | "farm_basic"
  | "growth_1_06"
  | "growth_2_07"
  | "growth_3_08"
  | "growth_3_1"
  | "growth_4_09"
  | "growth_5_10"
  | "production_final_09_10"
  | "production_final_11"
  | "photos_gps"
  | "exports"
  | "admin_review"
  | "settings";

type StatusTarget = "submission" | "photo" | "bank" | "pdf" | "review";

type DashboardResponse = {
  generatedAt: string;
  operationMonth: string;
  summary: {
    totalSamples: number;
    submittedSamples: number;
    pendingSamples: number;
    totalSubmissions: number;
    todaySubmissions: number;
    photoIncomplete: number;
    pendingReviewCount: number;
    completionRate: number;
  };
  stages: StageRow[];
  progress: {
    submitted: number;
    review: number;
    pending: number;
    completionRate: number;
  };
  auditLogSchema: string[];
  sheetStatus: Array<{ sheetName: string; status: string; note: string }>;
};

type SamplesResponse = {
  samples: AdminSample[];
};

type StageRow = {
  key: string;
  label: string;
  target: number;
  submitted: number;
  pending: number;
  review: number;
  note: string;
};

type AdminSample = {
  sampleId: string;
  farmerName: string;
  phone: string;
  homeAddress: string;
  fieldAddress: string;
  region: string;
  crop: string;
  variety: string;
  growthTarget?: string;
  surveyCase: string;
  assignedTeam: string;
  surveyorId: string;
  altitude: string;
  submissionStatus: string;
  photoStatus: string;
  photoSummaryBySurvey?: Array<{
    surveyType: string;
    surveyLabel: string;
    requiredCount: number;
    uploadedCount: number;
    missingCount: number;
    aiPendingCount: number;
    adminReviewCount: number;
    blockingMissing: number;
  }>;
  bankRequestStatus: string;
  pdfStatus: string;
  reviewStatus: string;
  gpsStatus: string;
  plotCoordinate?: Coordinate;
  browserCoordinate?: Coordinate;
  myGpsCoordinate?: Coordinate;
};

const sidebarItems: Array<{ key: SectionKey; label: string }> = [
  { key: "dashboard", label: "대시보드" },
  { key: "farm_basic", label: "농가기본정보" },
  { key: "growth_1_06", label: "생육 1차(6월)" },
  { key: "growth_2_07", label: "생육 2차(7월)" },
  { key: "growth_3_08", label: "생육 3차(8월)" },
  { key: "growth_3_1", label: "생육 3-1차(8/25~9/5)" },
  { key: "growth_4_09", label: "생육 4차(9월)" },
  { key: "growth_5_10", label: "생육 5차(10월)" },
  { key: "production_final_09_10", label: "생산량조사(9월~10월)" },
  { key: "production_final_11", label: "생산량조사(11월)" },
  { key: "photos_gps", label: "사진/GPS" },
  { key: "exports", label: "PDF 산출물" },
  { key: "admin_review", label: "관리자 검토" },
  { key: "settings", label: "설정" },
];

const sectionTabs: Record<SectionKey, string[]> = {
  dashboard: ["전체", "진행률", "검토필요"],
  farm_basic: [
    "전체",
    "미제출",
    "제출완료",
    "사진누락",
    "계좌입금의뢰서 누락",
    "PDF미생성",
    "검토필요",
  ],
  growth_1_06: ["전체", "미제출", "제출완료", "사진누락", "GPS확인", "검토필요"],
  growth_2_07: ["전체", "미제출", "제출완료", "사진누락", "GPS확인", "검토필요"],
  growth_3_08: ["전체", "미제출", "제출완료", "사진누락", "GPS확인", "검토필요"],
  growth_3_1: ["전체", "미제출", "제출완료", "사진누락", "GPS확인", "검토필요"],
  growth_4_09: ["전체", "미제출", "제출완료", "사진누락", "GPS확인", "검토필요"],
  growth_5_10: ["전체", "미제출", "제출완료", "사진누락", "GPS확인", "검토필요"],
  production_final_09_10: ["전체", "미제출", "제출완료", "과중누락", "사진누락", "검토필요"],
  production_final_11: ["전체", "미제출", "제출완료", "과중누락", "사진누락", "검토필요"],
  photos_gps: [
    "전체",
    "농가기본",
    "생육6월",
    "생육7월",
    "생육8월",
    "생육9월",
    "생산량",
    "GPS확인필요",
  ],
  exports: ["전체", "생성완료", "미생성", "업로드실패", "재생성필요"],
  admin_review: [
    "전체",
    "검증오류",
    "경고",
    "관리자검토",
    "AI미완료",
    "계좌입금의뢰서확인",
    "GPS확인",
  ],
  settings: ["조사원", "팀", "배정", "감사로그"],
};

const operationMonth = "202606";

export default function AdminDashboardClient({ user }: { user: AuthUser }) {
  const [dashboard, setDashboard] = useState<DashboardResponse>();
  const [samples, setSamples] = useState<AdminSample[]>([]);
  const [selectedSampleId, setSelectedSampleId] = useState("");
  const [activeSection, setActiveSection] = useState<SectionKey>("dashboard");
  const [activeTab, setActiveTab] = useState("전체");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    void loadAll();
  }, []);

  const selectedSample = useMemo(
    () => samples.find((sample) => sample.sampleId === selectedSampleId) ?? samples[0],
    [samples, selectedSampleId]
  );

  const filteredSamples = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    const sectionFiltered = samples.filter((sample) =>
      filterBySectionAndTab(sample, activeSection, activeTab)
    );
    if (!keyword) return sectionFiltered;

    return sectionFiltered.filter((sample) =>
      [
        sample.sampleId,
        sample.farmerName,
        sample.phone,
        sample.crop,
        sample.variety,
        sample.region,
        sample.surveyorId,
        sample.assignedTeam,
      ]
        .join(" ")
        .toLowerCase()
        .includes(keyword)
    );
  }, [activeSection, activeTab, query, samples]);

  async function loadAll() {
    setLoading(true);
    setError("");

    const [dashboardResponse, samplesResponse] = await Promise.all([
      fetch("/api/admin/dashboard", { cache: "no-store" }),
      fetch("/api/admin/samples", { cache: "no-store" }),
    ]);
    const dashboardPayload = (await dashboardResponse.json().catch(() => ({}))) as
      | DashboardResponse
      | { error?: string };
    const samplesPayload = (await samplesResponse.json().catch(() => ({}))) as
      | SamplesResponse
      | { error?: string };

    if (!dashboardResponse.ok || !samplesResponse.ok) {
      setError(
        "error" in dashboardPayload
          ? dashboardPayload.error ?? "관리자 데이터를 불러오지 못했습니다."
          : "error" in samplesPayload
          ? samplesPayload.error ?? "관리자 데이터를 불러오지 못했습니다."
          : "관리자 데이터를 불러오지 못했습니다."
      );
      setLoading(false);
      return;
    }

    setDashboard(dashboardPayload as DashboardResponse);
    const nextSamples = (samplesPayload as SamplesResponse).samples ?? [];
    setSamples(nextSamples);
    setSelectedSampleId((current) => current || nextSamples[0]?.sampleId || "");
    setLoading(false);
  }

  async function importSamples() {
    setError("");
    const response = await fetch("/api/admin/import-sample-master", {
      method: "POST",
    });
    if (!response.ok) {
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      setError(payload.error ?? "표본 동기화에 실패했습니다.");
      return;
    }
    await loadAll();
  }

  return (
    <main className="flex min-h-screen bg-[#f5f6f2] text-[#1f241c]">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 border-r border-[#dde2d5] bg-[#1f2a18] p-4 text-white lg:block">
        <div className="mb-6">
          <p className="text-xs font-semibold text-[#b7c9a4]">운영 관리자</p>
          <h1 className="mt-1 text-lg font-bold tracking-normal">
            2026 사과·배 실측조사
          </h1>
        </div>
        <nav className="space-y-1">
          {sidebarItems.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => {
                setActiveSection(item.key);
                setActiveTab(sectionTabs[item.key][0]);
              }}
              className={`w-full rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition ${
                activeSection === item.key
                  ? "bg-white text-[#1f2a18]"
                  : "text-[#e6eddf] hover:bg-white/10"
              }`}
            >
              {item.label}
            </button>
          ))}
        </nav>
      </aside>

      <section className="min-w-0 flex-1">
        <header className="sticky top-0 z-20 border-b border-[#dde2d5] bg-[#f5f6f2]/95 px-4 py-4 backdrop-blur sm:px-6">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <p className="text-sm font-bold text-[#5a6f43]">관리자 대시보드</p>
              <h2 className="mt-1 text-2xl font-bold tracking-normal sm:text-3xl">
                2026 사과·배 실측조사 운영 대시보드
              </h2>
              <p className="mt-2 text-sm text-[#697064]">
                충남 표본 90건 · 농가기본/생육/생산량 진행 현황
              </p>
              <p className="mt-1 text-xs text-[#697064]">
                운영월: {dashboard?.operationMonth ?? operationMonth} · 마지막 갱신{" "}
                {formatDateTime(dashboard?.generatedAt)} · 로그인 계정/권한:{" "}
                {user.userId} / 관리자
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                href="/"
                className="rounded-xl border border-[#cbd2c2] bg-white px-4 py-2 text-sm font-bold text-[#2d3527] shadow-sm transition hover:bg-[#edf2e7]"
              >
                입력 화면
              </Link>
              <button
                type="button"
                onClick={() => void importSamples()}
                className="rounded-xl border border-[#6b8053] bg-white px-4 py-2 text-sm font-bold text-[#304320] shadow-sm transition hover:bg-[#edf2e7]"
              >
                표본 동기화
              </button>
              <button
                type="button"
                onClick={() => void loadAll()}
                className="rounded-xl bg-[#1f2a18] px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-[#334525]"
              >
                새로고침
              </button>
            </div>
          </div>
        </header>

        <div className="space-y-5 px-4 py-5 sm:px-6">
          <MobileSectionNav
            activeSection={activeSection}
            onChange={(section) => {
              setActiveSection(section);
              setActiveTab(sectionTabs[section][0]);
            }}
          />

          {error ? (
            <section className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
              {error}
            </section>
          ) : null}

          {loading && !dashboard ? (
            <section className="rounded-2xl border border-[#dde2d5] bg-white p-8 text-center text-sm text-[#697064] shadow-sm">
              관리자 대시보드 데이터를 불러오는 중입니다.
            </section>
          ) : null}

          {dashboard ? (
            <>
              <KpiGrid dashboard={dashboard} />
              <StageTable stages={dashboard.stages} />
              <ProgressPanel progress={dashboard.progress} />
              <SectionTabs
                tabs={sectionTabs[activeSection]}
                activeTab={activeTab}
                onChange={setActiveTab}
              />
              <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_390px]">
                <SampleList
                  activeSection={activeSection}
                  samples={filteredSamples}
                  query={query}
                  selectedSampleId={selectedSample?.sampleId ?? ""}
                  onQueryChange={setQuery}
                  onSelect={setSelectedSampleId}
                  onStatusNavigate={(sample, target) => {
                    const next = getStatusNavigationTarget(sample, target);
                    setSelectedSampleId(sample.sampleId);
                    setActiveSection(next.section);
                    setActiveTab(next.tab);
                  }}
                />
                <SampleDetail
                  activeSection={activeSection}
                  sample={selectedSample}
                  sheetStatus={dashboard.sheetStatus}
                  auditLogSchema={dashboard.auditLogSchema}
                />
              </section>
            </>
          ) : null}
        </div>
      </section>
    </main>
  );
}

function MobileSectionNav({
  activeSection,
  onChange,
}: {
  activeSection: SectionKey;
  onChange: (value: SectionKey) => void;
}) {
  return (
    <div className="lg:hidden">
      <select
        value={activeSection}
        onChange={(event) => onChange(event.target.value as SectionKey)}
        className="w-full rounded-xl border border-[#cbd2c2] bg-white px-3 py-2 text-sm font-bold"
      >
        {sidebarItems.map((item) => (
          <option key={item.key} value={item.key}>
            {item.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function KpiGrid({ dashboard }: { dashboard: DashboardResponse }) {
  const items = [
    {
      label: "전체 표본",
      value: dashboard.summary.totalSamples.toLocaleString(),
      help: "충남 운영 원장 기준",
      badge: "원장",
      tone: "gray",
    },
    {
      label: "제출 완료",
      value: `${dashboard.summary.submittedSamples} / ${dashboard.summary.totalSamples}`,
      help: `전체 완료율 ${dashboard.summary.completionRate}%`,
      badge: "진행",
      tone: "green",
    },
    {
      label: "오늘 제출",
      value: dashboard.summary.todaySubmissions.toLocaleString(),
      help: "금일 접수된 최종 제출",
      badge: "오늘",
      tone: "blue",
    },
    {
      label: "미제출",
      value: dashboard.summary.pendingSamples.toLocaleString(),
      help: "아직 제출 전 표본",
      badge: "대기",
      tone: "gray",
    },
    {
      label: "사진 미완료",
      value:
        dashboard.summary.photoIncomplete === 0
          ? "대기"
          : dashboard.summary.photoIncomplete.toLocaleString(),
      help: "사진/GPS 검토 기준",
      badge: "사진",
      tone: "orange",
    },
    {
      label: "관리자 검토",
      value: dashboard.summary.pendingReviewCount.toLocaleString(),
      help: "오류·사진·PDF 확인 필요",
      badge: "검토",
      tone: "purple",
    },
  ];

  return (
    <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
      {items.map((item) => (
        <div
          key={item.label}
          className="rounded-2xl border border-[#dde2d5] bg-white p-4 shadow-sm"
        >
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-bold text-[#697064]">{item.label}</p>
            <StatusBadge tone={item.tone}>{item.badge}</StatusBadge>
          </div>
          <p className="mt-3 text-3xl font-bold tracking-normal text-[#1f241c]">
            {item.value}
          </p>
          <p className="mt-2 text-xs font-medium text-[#697064]">{item.help}</p>
        </div>
      ))}
    </section>
  );
}

function StageTable({ stages }: { stages: StageRow[] }) {
  return (
    <section className="rounded-2xl border border-[#dde2d5] bg-white shadow-sm">
      <div className="border-b border-[#e4e8df] p-4">
        <h3 className="text-lg font-bold tracking-normal">조사 단계별 대상 수</h3>
        <p className="mt-1 text-sm text-[#697064]">
          생육 대상은 원장/할당 기준 재검증 전까지 확정 운영 기준 21건으로 표시합니다.
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] border-collapse text-left text-sm">
          <thead className="bg-[#f7f8f4] text-xs font-bold text-[#697064]">
            <tr>
              <th className="px-4 py-3">조사 구분</th>
              <th className="px-4 py-3 text-right">대상</th>
              <th className="px-4 py-3 text-right">제출</th>
              <th className="px-4 py-3 text-right">미제출</th>
              <th className="px-4 py-3 text-right">검토</th>
              <th className="px-4 py-3">기준</th>
            </tr>
          </thead>
          <tbody>
            {stages.map((stage) => (
              <tr key={stage.key} className="border-t border-[#edf0e8]">
                <td className="px-4 py-3 font-bold">{stage.label}</td>
                <td className="px-4 py-3 text-right">{stage.target}</td>
                <td className="px-4 py-3 text-right">{stage.submitted}</td>
                <td className="px-4 py-3 text-right">{stage.pending}</td>
                <td className="px-4 py-3 text-right">{stage.review}</td>
                <td className="px-4 py-3 text-[#697064]">{stage.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function ProgressPanel({ progress }: { progress: DashboardResponse["progress"] }) {
  const total = Math.max(progress.submitted + progress.review + progress.pending, 1);
  const submittedWidth = (progress.submitted / total) * 100;
  const reviewWidth = (progress.review / total) * 100;

  return (
    <section className="rounded-2xl border border-[#dde2d5] bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h3 className="text-lg font-bold tracking-normal">진행률</h3>
          <p className="text-sm text-[#697064]">
            아직 제출 전입니다. 표본 원장 기준 대상 수를 표시합니다.
          </p>
        </div>
        <div className="text-sm font-bold text-[#405134]">
          전체 완료율 {progress.completionRate}%
        </div>
      </div>
      <div className="mt-4 h-4 overflow-hidden rounded-full bg-[#e3e7de]">
        <div className="flex h-full">
          <div className="bg-green-600" style={{ width: `${submittedWidth}%` }} />
          <div className="bg-purple-500" style={{ width: `${reviewWidth}%` }} />
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-3 text-xs font-bold text-[#697064]">
        <span>제출 완료 {progress.submitted}</span>
        <span>검토 대기 {progress.review}</span>
        <span>미제출 {progress.pending}</span>
      </div>
    </section>
  );
}

function SectionTabs({
  tabs,
  activeTab,
  onChange,
}: {
  tabs: string[];
  activeTab: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="sticky top-[118px] z-10 flex gap-2 overflow-x-auto border-y border-[#dde2d5] bg-[#f5f6f2]/95 py-3 backdrop-blur">
      {tabs.map((tab) => (
        <button
          key={tab}
          type="button"
          onClick={() => onChange(tab)}
          className={`shrink-0 rounded-full px-4 py-2 text-sm font-bold transition ${
            activeTab === tab
              ? "bg-[#1f2a18] text-white"
              : "border border-[#d5dccd] bg-white text-[#4e5a45] hover:bg-[#edf2e7]"
          }`}
        >
          {tab}
        </button>
      ))}
    </div>
  );
}

function SampleList({
  activeSection,
  samples,
  query,
  selectedSampleId,
  onQueryChange,
  onSelect,
  onStatusNavigate,
}: {
  activeSection: SectionKey;
  samples: AdminSample[];
  query: string;
  selectedSampleId: string;
  onQueryChange: (value: string) => void;
  onSelect: (value: string) => void;
  onStatusNavigate: (sample: AdminSample, target: StatusTarget) => void;
}) {
  return (
    <section className="rounded-2xl border border-[#dde2d5] bg-white shadow-sm">
      <div className="sticky top-[183px] z-10 flex flex-col gap-3 border-b border-[#e4e8df] bg-white p-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h3 className="text-lg font-bold tracking-normal">표본 목록</h3>
          <p className="text-sm text-[#697064]">
            관리자 권한에서 농가명, 연락처, 계좌입금의뢰서, PDF 상태를 확인합니다.
          </p>
        </div>
        <input
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="표본ID, 농가명, 연락처, 품목, 권역, 조사원 검색"
          className="w-full rounded-xl border border-[#cbd2c2] bg-white px-3 py-2 text-sm outline-none transition focus:border-[#526a38] md:max-w-sm"
        />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1180px] border-collapse text-left text-sm">
          <thead className="bg-[#f7f8f4] text-xs font-bold text-[#697064]">
            <tr>
              <th className="px-4 py-3">표본ID</th>
              <th className="px-4 py-3">농가명</th>
              <th className="px-4 py-3">연락처</th>
              <th className="px-4 py-3">지역/권역</th>
              <th className="px-4 py-3">품목</th>
              <th className="px-4 py-3">품종</th>
              <th className="px-4 py-3">조사유형</th>
              <th className="px-4 py-3">배정팀</th>
              <th className="px-4 py-3">조사원</th>
              <th className="px-4 py-3">제출상태</th>
              <th className="px-4 py-3">사진상태</th>
              <th className="px-4 py-3">계좌입금의뢰서</th>
              <th className="px-4 py-3">PDF상태</th>
              <th className="px-4 py-3">검토상태</th>
            </tr>
          </thead>
          <tbody>
            {samples.map((sample) => (
              <tr
                key={sample.sampleId}
                onClick={() => onSelect(sample.sampleId)}
                className={`cursor-pointer border-t border-[#edf0e8] transition hover:bg-[#f7f8f4] ${
                  selectedSampleId === sample.sampleId ? "bg-[#eef4e7]" : ""
                }`}
              >
                <td className="px-4 py-3 font-bold">{sample.sampleId}</td>
                <td className="px-4 py-3">{sample.farmerName || "-"}</td>
                <td className="px-4 py-3">{sample.phone || "-"}</td>
                <td className="px-4 py-3">{sample.region || "-"}</td>
                <td className="px-4 py-3">{sample.crop || "-"}</td>
                <td className="px-4 py-3">{sample.variety || "-"}</td>
                <td className="px-4 py-3">{getSurveyLabel(activeSection, sample)}</td>
                <td className="px-4 py-3">{sample.assignedTeam || "-"}</td>
                <td className="px-4 py-3">{sample.surveyorId || "-"}</td>
                <td className="px-4 py-3">
                  <StatusBadge
                    tone={sample.submissionStatus === "제출완료" ? "green" : "gray"}
                    onClick={(event) => {
                      event.stopPropagation();
                      onStatusNavigate(sample, "submission");
                    }}
                    title="제출 상태 기준 목록으로 이동"
                  >
                    {sample.submissionStatus}
                  </StatusBadge>
                </td>
                <td className="px-4 py-3">
                  <StatusBadge
                    tone={sample.photoStatus === "정상" ? "green" : "orange"}
                    onClick={(event) => {
                      event.stopPropagation();
                      onStatusNavigate(sample, "photo");
                    }}
                    title="사진/GPS 검토 화면으로 이동"
                  >
                    {sample.photoStatus}
                  </StatusBadge>
                </td>
                <td className="px-4 py-3">
                  <StatusBadge
                    tone={sample.bankRequestStatus === "업로드 완료" ? "green" : "purple"}
                    onClick={(event) => {
                      event.stopPropagation();
                      onStatusNavigate(sample, "bank");
                    }}
                    title="계좌입금의뢰서 확인 화면으로 이동"
                  >
                    {sample.bankRequestStatus}
                  </StatusBadge>
                </td>
                <td className="px-4 py-3">
                  <StatusBadge
                    tone={sample.pdfStatus === "생성완료" ? "green" : "gray"}
                    onClick={(event) => {
                      event.stopPropagation();
                      onStatusNavigate(sample, "pdf");
                    }}
                    title="PDF 산출물 상태 화면으로 이동"
                  >
                    {sample.pdfStatus}
                  </StatusBadge>
                </td>
                <td className="px-4 py-3">
                  <StatusBadge
                    tone={sample.reviewStatus === "완료" ? "green" : "purple"}
                    onClick={(event) => {
                      event.stopPropagation();
                      onStatusNavigate(sample, "review");
                    }}
                    title="관리자 검토 화면으로 이동"
                  >
                    {sample.reviewStatus}
                  </StatusBadge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function SampleDetail({
  activeSection,
  sample,
  sheetStatus,
  auditLogSchema,
}: {
  activeSection: SectionKey;
  sample?: AdminSample;
  sheetStatus: DashboardResponse["sheetStatus"];
  auditLogSchema: string[];
}) {
  if (!sample) {
    return (
      <aside className="rounded-2xl border border-[#dde2d5] bg-white p-5 text-sm text-[#697064] shadow-sm">
        표본을 선택하면 개인정보 상세보기와 사진/GPS/PDF 검토 영역이 표시됩니다.
      </aside>
    );
  }

  return (
    <aside className="space-y-4">
      <section className="rounded-2xl border border-[#dde2d5] bg-white p-5 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold text-[#697064]">개인정보 상세보기</p>
            <h3 className="mt-1 text-xl font-bold tracking-normal">{sample.sampleId}</h3>
          </div>
          <StatusBadge tone="purple">관리자</StatusBadge>
        </div>
        <div className="mt-4 grid gap-3 text-sm">
          <DetailItem label="농가명" value={sample.farmerName} />
          <DetailItem label="연락처" value={sample.phone} />
          <DetailItem label="자택주소" value={sample.homeAddress} />
          <DetailItem label="필지주소" value={sample.fieldAddress} />
          <DetailItem label="품목/품종" value={`${sample.crop || "-"} / ${sample.variety || "-"}`} />
          <DetailItem label="고도" value={sample.altitude || "확인 필요"} />
          <DetailItem label="조사유형" value={getSurveyLabel(activeSection, sample)} />
          <DetailItem label="배정팀/조사원" value={`${sample.assignedTeam || "-"} / ${sample.surveyorId || "-"}`} />
          <DetailItem label="조사 상태" value={sample.submissionStatus} />
          <DetailItem label="농가기본 사진 4종 업로드 상태" value={sample.photoStatus} />
          <DetailItem label="계좌입금의뢰서 서명본" value={sample.bankRequestStatus} />
          <DetailItem label="제출 PDF 상태" value={sample.pdfStatus} />
          <DetailItem label="검증 결과" value={sample.reviewStatus} />
        </div>
        <textarea
          className="mt-4 h-24 w-full rounded-xl border border-[#cbd2c2] px-3 py-2 text-sm outline-none focus:border-[#526a38]"
          placeholder="관리자 메모"
        />
        <div className="mt-3 grid grid-cols-2 gap-2 text-sm font-bold">
          {["조사표 보기", "제출 PDF 열기", "사진 목록 보기", "계좌입금의뢰서 열람", "검토상태 변경", "관리자 메모 저장"].map(
            (label) => (
              <button
                key={label}
                type="button"
                className="rounded-xl border border-[#d5dccd] bg-white px-3 py-2 hover:bg-[#edf2e7]"
              >
                {label}
              </button>
            )
          )}
        </div>
      </section>

      {activeSection === "photos_gps" && (
        <section className="rounded-2xl border border-[#dde2d5] bg-white p-5 shadow-sm">
          <h3 className="text-lg font-bold tracking-normal">조사 단계별 사진 요구상태</h3>
          <div className="mt-3 space-y-2 text-sm">
            {(sample.photoSummaryBySurvey ?? []).map((summary) => (
              <div
                key={summary.surveyType}
                className="rounded-xl border border-[#e2e7db] bg-[#fbfcf8] p-3"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="font-bold text-[#24301f]">{summary.surveyLabel}</p>
                  <span className="rounded-full bg-white px-2 py-1 text-xs font-bold text-[#526a38]">
                    {summary.uploadedCount}/{summary.requiredCount}
                  </span>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-[#697064]">
                  <p>미업로드 {summary.missingCount}</p>
                  <p>AI 대기 {summary.aiPendingCount}</p>
                  <p>관리자 확인 {summary.adminReviewCount}</p>
                  <p>제출 차단 {summary.blockingMissing}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="rounded-2xl border border-[#dde2d5] bg-white p-5 shadow-sm">
        <h3 className="text-lg font-bold tracking-normal">지도/GPS 확인</h3>
        <div className="mt-3">
          <KakaoMapPanel
            title="표본 위치 정합성"
            fieldAddress={sample.fieldAddress}
            parcelCoordinate={sample.plotCoordinate}
            browserCoordinate={sample.browserCoordinate}
            myGpsCoordinate={sample.myGpsCoordinate}
            altitude={sample.altitude}
            region={sample.region}
            sampleId={sample.sampleId}
          />
        </div>
      </section>

      <section className="rounded-2xl border border-[#dde2d5] bg-white p-5 shadow-sm">
        <h3 className="text-lg font-bold tracking-normal">Google Sheet 연동</h3>
        <div className="mt-3 space-y-2 text-sm">
          {sheetStatus.map((sheet) => (
            <div key={sheet.sheetName} className="flex items-center justify-between gap-3">
              <span className="font-bold">{sheet.sheetName}</span>
              <span className="text-[#697064]">{sheet.status}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-[#dde2d5] bg-white p-5 shadow-sm">
        <h3 className="text-lg font-bold tracking-normal">감사로그 구조</h3>
        <p className="mt-1 text-sm text-[#697064]">
          개인정보/파일 열람과 검토 변경 시 admin_audit_logs에 기록합니다.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {auditLogSchema.map((column) => (
            <span
              key={column}
              className="rounded-full border border-[#d5dccd] bg-[#f7f8f4] px-3 py-1 text-xs font-bold text-[#4e5a45]"
            >
              {column}
            </span>
          ))}
        </div>
      </section>
    </aside>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-bold text-[#697064]">{label}</p>
      <p className="mt-0.5 break-words font-semibold">{value || "-"}</p>
    </div>
  );
}

function StatusBadge({
  tone,
  children,
  onClick,
  title,
}: {
  tone: string;
  children: React.ReactNode;
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  title?: string;
}) {
  const className =
    tone === "green"
      ? "bg-green-50 text-green-700 border-green-200"
      : tone === "orange"
      ? "bg-orange-50 text-orange-700 border-orange-200"
      : tone === "red"
      ? "bg-red-50 text-red-700 border-red-200"
      : tone === "purple"
      ? "bg-purple-50 text-purple-700 border-purple-200"
      : tone === "blue"
      ? "bg-blue-50 text-blue-700 border-blue-200"
      : "bg-gray-50 text-gray-700 border-gray-200";

  const badgeClass = `inline-flex rounded-full border px-2.5 py-1 text-xs font-bold ${className}`;

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        title={title}
        className={`${badgeClass} cursor-pointer transition hover:brightness-95 focus:outline-none focus:ring-2 focus:ring-[#526a38]`}
      >
        {children}
      </button>
    );
  }

  return <span className={badgeClass}>{children}</span>;
}

function getStatusNavigationTarget(
  sample: AdminSample,
  target: StatusTarget
): { section: SectionKey; tab: string } {
  if (target === "submission") {
    return {
      section: "farm_basic",
      tab: sample.submissionStatus === "제출완료" ? "제출완료" : "미제출",
    };
  }
  if (target === "photo") {
    return {
      section: "photos_gps",
      tab: sample.photoStatus === "정상" ? "전체" : "GPS확인필요",
    };
  }
  if (target === "bank") {
    return { section: "photos_gps", tab: "농가기본" };
  }
  if (target === "pdf") {
    return {
      section: "exports",
      tab: sample.pdfStatus === "생성완료" ? "생성완료" : "미생성",
    };
  }

  return {
    section: "admin_review",
    tab: sample.reviewStatus === "완료" ? "전체" : "관리자검토",
  };
}

function filterBySectionAndTab(
  sample: AdminSample,
  section: SectionKey,
  tab: string
) {
  if (!isSampleTargetForSection(sample, section)) return false;
  if (section === "exports" && tab === "생성완료") return sample.pdfStatus === "생성완료";
  if (section === "exports" && tab === "미생성") return sample.pdfStatus !== "생성완료";
  if (section === "photos_gps" && tab !== "전체" && tab !== "GPS확인필요") {
    return Boolean(
      sample.photoSummaryBySurvey?.some(
        (summary) => summary.surveyLabel === tab && summary.missingCount > 0
      )
    );
  }
  if (section === "photos_gps" && tab === "GPS확인필요") return sample.gpsStatus !== "정상";
  if (section === "admin_review" && tab !== "전체") return sample.reviewStatus !== "완료";
  if (tab === "미제출") return sample.submissionStatus !== "제출완료";
  if (tab === "제출완료") return sample.submissionStatus === "제출완료";
  if (tab === "사진누락") return sample.photoStatus !== "정상";
  if (tab === "계좌입금의뢰서 누락") return sample.bankRequestStatus !== "업로드 완료";
  if (tab === "PDF미생성") return sample.pdfStatus !== "생성완료";
  if (tab === "검토필요") return sample.reviewStatus !== "완료";
  return true;
}

function isSampleTargetForSection(sample: AdminSample, section: SectionKey) {
  const variety = sample.variety || "";
  const isFuji = variety.includes("후지");
  const isEarlyProduction = variety.includes("홍로") || variety.includes("신고");
  const isGrowthTarget = String(sample.growthTarget ?? "").toUpperCase() === "Y";

  if (section.startsWith("growth_")) {
    if (!isGrowthTarget) return false;
    if (section === "growth_3_1") return isEarlyProduction;
    if (section === "growth_4_09" || section === "growth_5_10") return isFuji;
    return true;
  }

  if (section === "production_final_09_10") return isEarlyProduction;
  if (section === "production_final_11") return isFuji;
  return true;
}

function getSurveyLabel(section: SectionKey, sample: AdminSample) {
  if (section === "growth_1_06") return "생육 1차(6월 10~20일)";
  if (section === "growth_2_07") return "생육 2차(7월 10~20일)";
  if (section === "growth_3_08") return "생육 3차(8월 10~20일)";
  if (section === "growth_3_1") return "생육 3-1차(8/25~9/5)";
  if (section === "growth_4_09") return "생육 4차(9월 10~20일)";
  if (section === "growth_5_10") return "생육 5차(10월 10~20일)";
  if (section === "production_final_09_10") return "생산량조사(9월~10월)";
  if (section === "production_final_11") return "생산량조사(11월)";
  if (section === "farm_basic") return "농가기본정보";
  return sample.surveyCase || "농가기본/생산량";
}

function formatDateTime(value: string | undefined) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("ko-KR", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}
