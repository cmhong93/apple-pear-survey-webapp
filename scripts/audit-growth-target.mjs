import fs from "node:fs/promises";
import path from "node:path";
import { inflateRawSync } from "node:zlib";

const workbookPaths = [
  path.join(process.cwd(), "_handoff", "input", "sample_source_260506.xlsx"),
  path.join(process.cwd(), "_handoff", "farm-basic-sample-list.xlsx"),
  path.join(process.cwd(), "_handoff", "farm-basic-sample-list.raw.xlsx"),
];

const piiHeaderPatterns = [
  /이름|성명|농가명|경작자/,
  /전화|휴대/,
  /주소|상세주소|필지주소|자택주소/,
  /계좌|은행|예금주/,
];

const candidateColumns = [
  "생육조사 여부",
  "growth_target",
  "_source_growth_survey_yn",
  "survey_case",
  "_source_production_survey_yn",
  "_source_2025_survey_farm",
  "품목",
  "시도",
  "시군구",
];

for (const workbookPath of workbookPaths) {
  const workbook = await readWorkbook(workbookPath).catch(() => null);
  if (!workbook) continue;
  console.log(`\nFILE ${path.relative(process.cwd(), workbookPath)}`);
  console.log(`SHEETS ${workbook.sheets.map((sheet) => sheet.name).join(" | ")}`);

  for (const sheet of workbook.sheets) {
    const xml = workbook.files.get(sheet.path)?.toString("utf8");
    if (!xml) continue;
    const table = parseWorksheet(xml, workbook.sharedStrings);
    const headers = (table[0] ?? []).map(normalizeColumnName);
    const rows = table.slice(1);
    const nonEmptyRows = rows.filter((row) => row.some((value) => String(value ?? "").trim()));
    const presentCandidates = candidateColumns.filter((column) => headers.includes(column));

    console.log(`SHEET ${sheet.name}`);
    console.log(`ROWS ${nonEmptyRows.length}`);
    console.log(`COLUMNS ${headers.length}`);
    if (sheet.name === "sample_list_raw" || sheet.name === "통합명부_충남지역") {
      console.log(`HEADERS ${headers.join(" | ")}`);
    }
    console.log(`CANDIDATE_COLUMNS ${presentCandidates.join(" | ") || "(none)"}`);

    for (const column of presentCandidates) {
      const index = headers.indexOf(column);
      const values = countValues(nonEmptyRows.map((row) => row[index] ?? ""));
      console.log(`DIST ${column} ${JSON.stringify(values)}`);
    }

    const growthColumn = headers.includes("생육조사 여부")
      ? "생육조사 여부"
      : headers.includes("_source_growth_survey_yn")
        ? "_source_growth_survey_yn"
        : headers.includes("growth_target")
          ? "growth_target"
          : "";
    if (growthColumn) {
      const index = headers.indexOf(growthColumn);
      const normalized = nonEmptyRows.map((row) => normalizeYesNo(row[index] ?? ""));
      console.log(`NORMALIZED_${growthColumn}_Y ${normalized.filter((value) => value === "Y").length}`);
      console.log(`NORMALIZED_${growthColumn}_N ${normalized.filter((value) => value === "N").length}`);
      console.log(
        `NORMALIZED_${growthColumn}_UNKNOWN ${
          normalized.filter((value) => value === "").length
        }`
      );
    }

    const regionIndex = headers.indexOf("시군구");
    const cropIndex = headers.indexOf("품목");
    const growthIndex = headers.indexOf(growthColumn);
    if (regionIndex >= 0 && cropIndex >= 0 && growthIndex >= 0) {
      const distribution = new Map();
      for (const row of nonEmptyRows) {
        if (normalizeYesNo(row[growthIndex] ?? "") !== "Y") continue;
        const key = `${row[regionIndex] || "(blank)"} / ${row[cropIndex] || "(blank)"}`;
        distribution.set(key, (distribution.get(key) ?? 0) + 1);
      }
      console.log(`GROWTH_DISTRIBUTION ${JSON.stringify(Object.fromEntries(distribution))}`);
    }

    const suspiciousHeaders = headers.filter((header) =>
      piiHeaderPatterns.some((pattern) => pattern.test(header))
    );
    if (suspiciousHeaders.length) {
      console.log(`PII_COLUMNS_PRESENT ${suspiciousHeaders.join(" | ")}`);
      console.log("PII_VALUES_PRINTED false");
    }
  }
}

await auditConfirmedGrowthMatch();

function normalizeYesNo(value) {
  const text = String(value ?? "").trim().toUpperCase();
  if (!text) return "";
  if (["Y", "YES", "TRUE", "1", "O", "○", "●", "대상", "생육", "생육대상"].includes(text)) {
    return "Y";
  }
  if (
    ["N", "NO", "FALSE", "0", "X", "×", "-", "비대상", "미대상", "대상아님", "아니오"].includes(
      text
    )
  ) {
    return "N";
  }
  return "";
}

function countValues(values) {
  const counts = new Map();
  values.forEach((value) => {
    const text = String(value ?? "").trim() || "(blank)";
    counts.set(text, (counts.get(text) ?? 0) + 1);
  });
  return Object.fromEntries([...counts.entries()].sort((a, b) => b[1] - a[1]));
}

async function readWorkbook(filePath) {
  const buffer = await fs.readFile(filePath);
  const files = readZipFiles(buffer);
  const workbookXml = files.get("xl/workbook.xml").toString("utf8");
  const relsXml = files.get("xl/_rels/workbook.xml.rels").toString("utf8");
  const sharedStringsXml = files.get("xl/sharedStrings.xml")?.toString("utf8");
  const sharedStrings = sharedStringsXml ? parseSharedStrings(sharedStringsXml) : [];
  const rels = Object.fromEntries(
    [...relsXml.matchAll(/<Relationship\b([^>]*)\/?>/g)].map((match) => {
      const id = match[1].match(/\bId="([^"]+)"/)?.[1] ?? "";
      const target = match[1].match(/\bTarget="([^"]+)"/)?.[1] ?? "";
      const normalizedTarget = target.replace(/^\/+/, "");
      return [
        id,
        normalizedTarget.startsWith("xl/") ? normalizedTarget : `xl/${normalizedTarget}`,
      ];
    })
  );
  const sheets = [...workbookXml.matchAll(/<sheet\b([^>]*)\/?>/g)].map((match) => {
    const name = decodeXml(match[1].match(/\bname="([^"]+)"/)?.[1] ?? "");
    const relId = match[1].match(/\br:id="([^"]+)"/)?.[1] ?? "";
    return { name, path: rels[relId] };
  });
  return { files, sheets, sharedStrings };
}

function readZipFiles(buffer) {
  const entries = readCentralDirectory(buffer);
  const files = new Map();
  entries.forEach((entry) => {
    const localOffset = entry.localHeaderOffset;
    const nameLength = buffer.readUInt16LE(localOffset + 26);
    const extraLength = buffer.readUInt16LE(localOffset + 28);
    const dataStart = localOffset + 30 + nameLength + extraLength;
    const dataEnd = dataStart + entry.compressedSize;
    const data = buffer.subarray(dataStart, dataEnd);
    if (entry.method === 0) files.set(entry.name, data);
    if (entry.method === 8) files.set(entry.name, inflateRawSync(data));
  });
  return files;
}

function readCentralDirectory(buffer) {
  const entries = [];
  const eocdOffset = findEndOfCentralDirectory(buffer);
  const entryCount = buffer.readUInt16LE(eocdOffset + 10);
  let offset = buffer.readUInt32LE(eocdOffset + 16);
  for (let index = 0; index < entryCount; index += 1) {
    if (buffer.readUInt32LE(offset) !== 0x02014b50) break;
    const nameLength = buffer.readUInt16LE(offset + 28);
    const extraLength = buffer.readUInt16LE(offset + 30);
    const commentLength = buffer.readUInt16LE(offset + 32);
    entries.push({
      method: buffer.readUInt16LE(offset + 10),
      compressedSize: buffer.readUInt32LE(offset + 20),
      localHeaderOffset: buffer.readUInt32LE(offset + 42),
      name: buffer.subarray(offset + 46, offset + 46 + nameLength).toString("utf8"),
    });
    offset += 46 + nameLength + extraLength + commentLength;
  }
  return entries;
}

function findEndOfCentralDirectory(buffer) {
  for (let offset = buffer.length - 22; offset >= 0; offset -= 1) {
    if (buffer.readUInt32LE(offset) === 0x06054b50) return offset;
  }
  throw new Error("XLSX central directory not found.");
}

function parseSharedStrings(xml) {
  return [...xml.matchAll(/<si\b[^>]*>([\s\S]*?)<\/si>/g)].map((match) =>
    decodeXml(
      [...match[1].matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/g)]
        .map((textMatch) => textMatch[1])
        .join("")
    )
  );
}

function parseWorksheet(xml, sharedStrings) {
  const rows = [];
  for (const rowMatch of xml.matchAll(/<row\b[^>]*>([\s\S]*?)<\/row>/g)) {
    const values = [];
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

function columnNameToIndex(columnName) {
  return columnName.split("").reduce((sum, char) => {
    return sum * 26 + char.charCodeAt(0) - 64;
  }, 0) - 1;
}

function normalizeColumnName(column) {
  return String(column ?? "").replace(/\s+/g, " ").trim();
}

function decodeXml(value) {
  return String(value ?? "")
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

async function auditConfirmedGrowthMatch() {
  const source = await readSheet(
    path.join(process.cwd(), "_handoff", "input", "sample_source_260506.xlsx"),
    "통합명부_충남지역"
  );
  const confirmed = await readSheet(
    path.join(process.cwd(), "_handoff", "farm-basic-sample-list.raw.xlsx"),
    "sample_list_raw"
  );
  if (!source || !confirmed) return;

  const sourceIdIndex = source.headers.indexOf("ID");
  const confirmedIdIndex =
    confirmed.headers.indexOf("sample_id") >= 0
      ? confirmed.headers.indexOf("sample_id")
      : confirmed.headers.indexOf("farm_id");
  const confirmedGrowthIndex = confirmed.headers.indexOf("_source_growth_survey_yn");
  if (sourceIdIndex < 0 || confirmedIdIndex < 0 || confirmedGrowthIndex < 0) return;

  const sourceIds = new Set(
    source.rows.map((row) => String(row[sourceIdIndex] ?? "").trim()).filter(Boolean)
  );
  const confirmedGrowthIds = new Set(
    confirmed.rows
      .filter((row) => normalizeYesNo(row[confirmedGrowthIndex] ?? "") === "Y")
      .map((row) => String(row[confirmedIdIndex] ?? "").trim())
      .filter(Boolean)
  );
  const matchedGrowthIds = [...confirmedGrowthIds].filter((id) => sourceIds.has(id));

  const regionIndex = source.headers.indexOf("시군구");
  const cropIndex = source.headers.indexOf("품목");
  const distribution = new Map();
  for (const row of source.rows) {
    const sampleId = String(row[sourceIdIndex] ?? "").trim();
    if (!confirmedGrowthIds.has(sampleId)) continue;
    const key = `${row[regionIndex] || "(blank)"} / ${row[cropIndex] || "(blank)"}`;
    distribution.set(key, (distribution.get(key) ?? 0) + 1);
  }

  console.log("\nCONFIRMED_GROWTH_MATCH");
  console.log(`SOURCE_SAMPLE_COUNT ${sourceIds.size}`);
  console.log(`CONFIRMED_GROWTH_SOURCE_COLUMN _source_growth_survey_yn`);
  console.log(`CONFIRMED_GROWTH_Y ${confirmedGrowthIds.size}`);
  console.log(`CONFIRMED_GROWTH_MATCHED_TO_FINAL_SOURCE ${matchedGrowthIds.length}`);
  console.log(`CONFIRMED_GROWTH_DISTRIBUTION ${JSON.stringify(Object.fromEntries(distribution))}`);
}

async function readSheet(filePath, preferredName) {
  const workbook = await readWorkbook(filePath).catch(() => null);
  if (!workbook) return null;
  const sheet =
    workbook.sheets.find((item) => item.name === preferredName) ??
    workbook.sheets.find((item) => item.name.includes(preferredName)) ??
    workbook.sheets[0];
  const xml = workbook.files.get(sheet.path)?.toString("utf8");
  if (!xml) return null;
  const table = parseWorksheet(xml, workbook.sharedStrings);
  return {
    headers: (table[0] ?? []).map(normalizeColumnName),
    rows: table.slice(1).filter((row) => row.some((value) => String(value ?? "").trim())),
  };
}
