import { inflateRawSync } from "node:zlib";
import { access, readFile } from "node:fs/promises";
import path from "node:path";
import type { SampleMasterRecord } from "@/data/sampleMaster";
import type { AuthUser } from "@/lib/auth";
import { getGoogleSheetsConfig, readSheetValues } from "@/lib/googleSheets";

const candidateWorkbookPaths = [
  path.join(process.cwd(), "_handoff", "input", "sample_source_260506.xlsx"),
  path.join(process.cwd(), "_handoff", "farm-basic-sample-list.raw.xlsx"),
];
const confirmedGrowthWorkbookPath = path.join(
  process.cwd(),
  "_handoff",
  "farm-basic-sample-list.raw.xlsx"
);
const defaultSurveyMonth = "202605";

type ZipEntry = {
  name: string;
  method: number;
  compressedSize: number;
  uncompressedSize: number;
  localHeaderOffset: number;
};

type WorkbookData = {
  samples: SampleMasterRecord[];
  totalCount: number;
  columnCount: number;
  columns: string[];
};

let cachedWorkbook: WorkbookData | undefined;
let cachedWorkbookAt = 0;
const workbookCacheTtlMs = 30_000;

export async function readFarmBasicSampleWorkbook(): Promise<WorkbookData> {
  const now = Date.now();
  if (cachedWorkbook && now - cachedWorkbookAt < workbookCacheTtlMs) {
    return cachedWorkbook;
  }

  const sheetWorkbook = await readGoogleSampleMasterWorkbook().catch(
    () => undefined
  );
  if (sheetWorkbook?.samples.length) {
    cachedWorkbook = sheetWorkbook;
    cachedWorkbookAt = now;
    return cachedWorkbook;
  }

  cachedWorkbook = await readLocalSampleMasterWorkbook();
  cachedWorkbookAt = now;
  return cachedWorkbook;
}

export async function readLocalSampleMasterWorkbook(): Promise<WorkbookData> {
  const buffer = await readFile(await resolveWorkbookPath());
  const confirmedGrowthIds = await readConfirmedGrowthIds().catch(
    () => new Set<string>()
  );
  const files = readZipFiles(buffer);
  const workbookXml = getZipText(files, "xl/workbook.xml");
  const relsXml = getZipText(files, "xl/_rels/workbook.xml.rels");
  const sheetPath = resolveSampleSheetPath(workbookXml, relsXml);
  const worksheetXml = getZipText(files, sheetPath);
  const sharedStringsXml = files.get("xl/sharedStrings.xml")?.toString("utf8");
  const sharedStrings = sharedStringsXml
    ? parseSharedStrings(sharedStringsXml)
    : [];
  const table = parseWorksheet(worksheetXml, sharedStrings);
  const columns = table[0] ?? [];
  const samples = table
    .slice(1)
    .map((row) => rowToSample(columns, row, confirmedGrowthIds));

  return {
    samples,
    totalCount: samples.length,
    columnCount: columns.length,
    columns,
  };
}

async function resolveWorkbookPath() {
  for (const candidate of candidateWorkbookPaths) {
    try {
      await access(candidate);
      return candidate;
    } catch {
      // Try next known workbook location.
    }
  }

  return candidateWorkbookPaths[0];
}

async function readConfirmedGrowthIds() {
  const buffer = await readFile(confirmedGrowthWorkbookPath);
  const files = readZipFiles(buffer);
  const workbookXml = getZipText(files, "xl/workbook.xml");
  const relsXml = getZipText(files, "xl/_rels/workbook.xml.rels");
  const sheetPath = resolveSheetPath(workbookXml, relsXml, "sample_list_raw");
  const worksheetXml = getZipText(files, sheetPath);
  const sharedStringsXml = files.get("xl/sharedStrings.xml")?.toString("utf8");
  const sharedStrings = sharedStringsXml
    ? parseSharedStrings(sharedStringsXml)
    : [];
  const table = parseWorksheet(worksheetXml, sharedStrings);
  const columns = (table[0] ?? []).map(normalizeColumnName);
  const sampleIdIndex = columns.includes("sample_id")
    ? columns.indexOf("sample_id")
    : columns.indexOf("farm_id");
  const growthIndex = columns.indexOf("_source_growth_survey_yn");

  if (sampleIdIndex < 0 || growthIndex < 0) return new Set<string>();

  return new Set(
    table
      .slice(1)
      .filter((row) => parseExplicitGrowthFlag(row[growthIndex] ?? "") === "Y")
      .map((row) => String(row[sampleIdIndex] ?? "").trim())
      .filter(Boolean)
  );
}

async function readGoogleSampleMasterWorkbook(): Promise<WorkbookData | undefined> {
  const { spreadsheetId } = getGoogleSheetsConfig();
  if (!spreadsheetId) return undefined;

  const values = await readSheetValues({
    spreadsheetId,
    range: "'sample_master'!A:T",
  });
  const columns = values[0] ?? [];
  if (columns.length === 0) return undefined;

  const samples = values
    .slice(1)
    .map((row) => rowToSampleMasterRecord(columns, row))
    .filter((sample) => sample.sampleId);

  return {
    samples,
    totalCount: samples.length,
    columnCount: columns.length,
    columns,
  };
}

export const sampleMasterHeaders = [
  "sample_id",
  "farmer_name",
  "phone",
  "crop_type",
  "variety_group",
  "detail_variety",
  "sido",
  "sigungu",
  "home_address",
  "field_address",
  "survey_month",
  "surveyor_id",
  "survey_case",
  "growth_target",
  "assigned_team",
  "assigned_team_id",
  "assignment_status",
  "assignment_note",
  "pnu",
  "status",
  "source_row",
  "source_file",
  "raw_json",
];

export function sampleToMasterRow(sample: SampleMasterRecord) {
  return [
    sample.sampleId,
    sample.farmerName,
    sample.phone,
    sample.crop,
    sample.variety,
    sample.raw.detailed_variety || sample.raw.detail_variety || "",
    sample.raw["시도"] || sample.raw._source_sido || "",
    sample.raw["시군구"] || sample.raw._source_sigungu || "",
    sample.homeAddress,
    sample.plotAddress,
    sample.surveyMonth,
    sample.surveyorId,
    sample.surveyCase,
    sample.growthTarget,
    sample.assignedTeam,
    sample.assignedTeam,
    sample.raw.assignment_status || "",
    sample.raw.assignment_note || "",
    sample.pnu,
    sample.status,
    sample.raw._source_row || "",
    sample.raw._source_file || "sample_source_260506.xlsx",
    JSON.stringify(sample.raw),
  ];
}

function rowToSampleMasterRecord(
  columns: string[],
  row: string[]
): SampleMasterRecord {
  const raw = Object.fromEntries(
    columns.map((column, index) => [column, row[index] ?? ""])
  );
  const sampleId = raw.sample_id ?? "";
  const crop = raw.crop_type ?? "";
  const variety = raw.variety_group ?? "";
  const administrativeRegion = [raw.sido, raw.sigungu].filter(Boolean).join(" ");

  return {
    sampleId,
    farmerName: raw.farmer_name ?? "",
    phone: raw.phone ?? "",
    mobilePhone: raw.phone ?? "",
    homeAddress: raw.home_address ?? "",
    plotAddress: raw.field_address ?? "",
    detailAddress: raw.field_address ?? "",
    crop,
    variety,
    surveyorId: raw.surveyor_id ?? "",
    surveyorName: raw.surveyor_id ?? "",
    administrativeRegion,
    status: raw.status ?? "조사대기",
    surveyMonth: raw.survey_month ?? "",
    surveyCase: raw.survey_case ?? "",
    growthTarget: raw.growth_target ?? "",
    assignedTeam: raw.assigned_team_id || raw.assigned_team || "",
    pnu: raw.pnu ?? "",
    raw,
  };
}

export function filterSamplesByAccess({
  samples,
  user,
}: {
  samples: SampleMasterRecord[];
  user: AuthUser;
}) {
  if (user.role === "admin") return samples;

  const hasSurveyorAssignment = samples.some(
    (sample) => sample.surveyorId || sample.surveyorName || sample.assignedTeam
  );
  if (!hasSurveyorAssignment) return [];

  const teamId = getTeamIdForSurveyor(user.surveyorId);
  if (teamId) {
    return samples.filter((sample) => sample.assignedTeam === teamId);
  }

  if (user.surveyorId === "TEST") {
    return samples.filter(
      (sample) =>
        sample.surveyorId === "TEST" ||
        sample.surveyorName === "TEST" ||
        sample.sampleId.toUpperCase().startsWith("TEST")
    );
  }

  return samples.filter(
    (sample) =>
      sample.surveyorId === user.surveyorId ||
      sample.surveyorName === user.surveyorId
  );
}

export function canAccessSample(sample: SampleMasterRecord, user: AuthUser) {
  if (user.role === "admin") return true;

  const teamId = getTeamIdForSurveyor(user.surveyorId);
  if (teamId) return sample.assignedTeam === teamId;

  if (user.surveyorId === "TEST") {
    return (
      sample.surveyorId === "TEST" ||
      sample.surveyorName === "TEST" ||
      sample.sampleId.toUpperCase().startsWith("TEST")
    );
  }

  return (
    sample.surveyorId === user.surveyorId ||
    sample.surveyorName === user.surveyorId
  );
}

function getTeamIdForSurveyor(surveyorId: string) {
  if (["S01", "S02"].includes(surveyorId)) return "T01";
  if (["S03", "S04"].includes(surveyorId)) return "T02";
  if (["S05", "S06"].includes(surveyorId)) return "T03";
  if (["S07", "S08"].includes(surveyorId)) return "T04";
  return "";
}

function readZipFiles(buffer: Buffer) {
  const entries = readCentralDirectory(buffer);
  const files = new Map<string, Buffer>();

  entries.forEach((entry) => {
    const localOffset = entry.localHeaderOffset;
    const nameLength = buffer.readUInt16LE(localOffset + 26);
    const extraLength = buffer.readUInt16LE(localOffset + 28);
    const dataStart = localOffset + 30 + nameLength + extraLength;
    const dataEnd = dataStart + entry.compressedSize;
    const data = buffer.subarray(dataStart, dataEnd);

    if (entry.method === 0) {
      files.set(entry.name, data);
      return;
    }

    if (entry.method === 8) {
      files.set(entry.name, inflateRawSync(data));
    }
  });

  return files;
}

function readCentralDirectory(buffer: Buffer) {
  const entries: ZipEntry[] = [];
  const eocdOffset = findEndOfCentralDirectory(buffer);
  const entryCount = buffer.readUInt16LE(eocdOffset + 10);
  let offset = buffer.readUInt32LE(eocdOffset + 16);

  for (let index = 0; index < entryCount; index += 1) {
    const signature = buffer.readUInt32LE(offset);
    if (signature !== 0x02014b50) break;

    const method = buffer.readUInt16LE(offset + 10);
    const compressedSize = buffer.readUInt32LE(offset + 20);
    const uncompressedSize = buffer.readUInt32LE(offset + 24);
    const nameLength = buffer.readUInt16LE(offset + 28);
    const extraLength = buffer.readUInt16LE(offset + 30);
    const commentLength = buffer.readUInt16LE(offset + 32);
    const localHeaderOffset = buffer.readUInt32LE(offset + 42);
    const name = buffer
      .subarray(offset + 46, offset + 46 + nameLength)
      .toString("utf8");

    entries.push({
      name,
      method,
      compressedSize,
      uncompressedSize,
      localHeaderOffset,
    });

    offset += 46 + nameLength + extraLength + commentLength;
  }

  return entries;
}

function findEndOfCentralDirectory(buffer: Buffer) {
  for (let offset = buffer.length - 22; offset >= 0; offset -= 1) {
    if (buffer.readUInt32LE(offset) === 0x06054b50) return offset;
  }

  throw new Error("XLSX central directory를 찾을 수 없습니다.");
}

function getZipText(files: Map<string, Buffer>, name: string) {
  const file = files.get(name);
  if (!file) throw new Error(`${name} 파일을 XLSX 내부에서 찾을 수 없습니다.`);
  return file.toString("utf8");
}

function resolveSheetPath(workbookXml: string, relsXml: string, sheetName: string) {
  const sheetMatch = workbookXml.match(
    new RegExp(
      `<sheet[^>]*name="${escapeRegExp(sheetName)}"[^>]*r:id="([^"]+)"[^>]*/?>`
    )
  );
  if (!sheetMatch) throw new Error(`${sheetName} 시트를 찾을 수 없습니다.`);

  const relMatch = [...relsXml.matchAll(/<Relationship\b([^>]*)\/?>/g)].find(
    (match) => match[1].includes(`Id="${sheetMatch[1]}"`)
  );
  if (!relMatch) throw new Error(`${sheetName} 시트 관계 정보를 찾을 수 없습니다.`);

  const target =
    relMatch[1].match(/\bTarget="([^"]+)"/)?.[1].replace(/^\/+/, "") ?? "";
  if (!target) throw new Error(`${sheetName} 시트 파일 경로를 찾을 수 없습니다.`);
  return target.startsWith("xl/") ? target : `xl/${target}`;
}

function resolveSampleSheetPath(workbookXml: string, relsXml: string) {
  const sheetNames = [...workbookXml.matchAll(/<sheet\b([^>]*)\/?>/g)]
    .map((match) => decodeXml(match[1].match(/\bname="([^"]+)"/)?.[1] ?? ""))
    .filter(Boolean);
  const preferredName =
    sheetNames.find((name) => name.includes("앱")) ??
    sheetNames.find((name) => name.includes("sample_master")) ??
    sheetNames.find((name) => name.includes("통합명부") && name.includes("충남")) ??
    sheetNames.find((name) => name.includes("통합명부")) ??
    sheetNames.find((name) => name.includes("충남")) ??
    "sample_list_raw";

  return resolveSheetPath(workbookXml, relsXml, preferredName);
}

function parseSharedStrings(xml: string) {
  return [...xml.matchAll(/<si\b[^>]*>([\s\S]*?)<\/si>/g)].map((match) =>
    decodeXml(
      [...match[1].matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/g)]
        .map((textMatch) => textMatch[1])
        .join("")
    )
  );
}

function parseWorksheet(xml: string, sharedStrings: string[]) {
  const rows: string[][] = [];

  for (const rowMatch of xml.matchAll(/<row\b[^>]*>([\s\S]*?)<\/row>/g)) {
    const values: string[] = [];

    for (const cellMatch of rowMatch[1].matchAll(/<c\b([^>]*)>([\s\S]*?)<\/c>/g)) {
      const attrs = cellMatch[1];
      const body = cellMatch[2];
      const ref = attrs.match(/\br="([A-Z]+)\d+"/)?.[1] ?? "";
      const columnIndex = columnNameToIndex(ref);
      const type = attrs.match(/\bt="([^"]+)"/)?.[1] ?? "";
      let value = "";

      if (type === "inlineStr") {
        value = decodeXml(
          [...body.matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/g)]
            .map((match) => match[1])
            .join("")
        );
      } else {
        const raw = body.match(/<v>([\s\S]*?)<\/v>/)?.[1] ?? "";
        value = type === "s" ? sharedStrings[Number(raw)] ?? "" : decodeXml(raw);
      }

      values[columnIndex] = value;
    }

    rows.push(values.map((value) => value ?? ""));
  }

  return rows;
}

function rowToSample(
  columns: string[],
  row: string[],
  confirmedGrowthIds = new Set<string>()
): SampleMasterRecord {
  const raw = Object.fromEntries(
    columns.map((column, index) => [normalizeColumnName(column), row[index] ?? ""])
  );
  const sourceId = raw.ID || raw.farm_id || "";
  const sourceCrop = raw["품목"] || raw.crop || "";
  const crop = normalizeCrop(sourceCrop);
  const variety = normalizeVariety(sourceCrop, raw.variety || "");
  const status = normalizeStatus(raw);
  const growthTarget = normalizeGrowthTarget(raw, sourceId, confirmedGrowthIds);
  const administrativeRegion = [
    raw["시도"] || raw._source_sido,
    raw["시군구"] || raw._source_sigungu,
  ]
    .filter(Boolean)
    .join(" ");

  return {
    sampleId: sourceId,
    farmerName: raw["이름"] || raw.farmer_name || "",
    phone: raw["휴대전화"] || raw.farmer_contact || "",
    mobilePhone: raw["휴대전화"] || raw.farmer_contact || "",
    homeAddress: raw["자택주소"] || raw.home_address || "",
    plotAddress: raw["필지주소"] || raw.plot_address || "",
    detailAddress: raw["필지주소"] || raw.plot_address || "",
    crop,
    variety,
    surveyorId: raw["조사원"] || raw.surveyor_id || raw.surveyor_name || "",
    surveyorName: raw["조사원"] || raw.surveyor_name || "",
    administrativeRegion,
    status,
    surveyMonth:
      extractSurveyMonth(raw["조사일"] || raw.survey_datetime || "") ||
      raw.survey_month ||
      defaultSurveyMonth,
    surveyCase: createSurveyCase(growthTarget),
    growthTarget,
    assignedTeam: raw.assigned_team_id || raw.assigned_team || "",
    pnu: raw["팜맵 PNU"] || "",
    raw,
  };
}

function normalizeColumnName(column: string) {
  return column.replace(/\s+/g, " ").trim();
}

function normalizeCrop(value: string) {
  if (value === "홍로" || value === "후지") return "사과";
  if (value === "배") return "배";
  return value;
}

function normalizeVariety(sourceCrop: string, fallback: string) {
  if (sourceCrop === "홍로" || sourceCrop === "후지") return sourceCrop;
  if (sourceCrop === "배") return fallback || "신고";
  return fallback || sourceCrop;
}

function normalizeStatus(raw: Record<string, string>) {
  if (raw["조사 완료"]) return "조사완료";
  if (raw["조사 종료"]) return "조사종료";
  if (raw["조사 대기"]) return "조사대기";
  return raw.status || "조사대기";
}

function normalizeGrowthTarget(
  raw: Record<string, string>,
  sampleId: string,
  confirmedGrowthIds: Set<string>
) {
  if (confirmedGrowthIds.size > 0) {
    return confirmedGrowthIds.has(sampleId) ? "Y" : "N";
  }

  return parseExplicitGrowthFlag(
    raw._source_growth_survey_yn || raw.growth_target || ""
  );
}

function parseExplicitGrowthFlag(value: string) {
  const text = String(value ?? "").trim().toUpperCase();
  if (!text) return "N";
  if (
    ["Y", "YES", "TRUE", "1", "O", "○", "●", "대상", "생육", "생육대상"].includes(
      text
    )
  ) {
    return "Y";
  }
  return "N";
}

function createSurveyCase(growthTarget: string) {
  return growthTarget === "Y" ? "면접+생육+생산량" : "면접+생산량";
}

function extractSurveyMonth(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.length >= 6) return digits.slice(0, 6);
  return "";
}

function columnNameToIndex(columnName: string) {
  return columnName.split("").reduce((sum, char) => {
    return sum * 26 + char.charCodeAt(0) - 64;
  }, 0) - 1;
}

function decodeXml(value: string) {
  return value
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, code) =>
      String.fromCodePoint(Number.parseInt(code, 16))
    )
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
