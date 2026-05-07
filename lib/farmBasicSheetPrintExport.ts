import "server-only";
import {
  batchUpdateSheetValues,
  batchUpdateSpreadsheet,
  exportSheetToPdf,
  getSpreadsheetMetadata,
  type SheetValueUpdate,
} from "@/lib/googleSheets";

export type FarmBasicPrintValues = Record<string, string>;

type CellMapping = {
  fieldId: string;
  cell: string;
  transform?: (value: string, values: FarmBasicPrintValues) => string;
};

const defaultTemplateSheetName = "print_template_farm_basic";

const valueMappings: CellMapping[] = [
  { fieldId: "survey_datetime", cell: "C3", transform: dateYear },
  { fieldId: "survey_datetime", cell: "E3", transform: dateMonth },
  { fieldId: "survey_datetime", cell: "G3", transform: dateDay },
  { fieldId: "farm_id", cell: "C5" },
  { fieldId: "farmer_name", cell: "E5" },
  { fieldId: "farmer_contact", cell: "G5" },
  { fieldId: "home_address", cell: "C6" },
  { fieldId: "variety", cell: "G6", transform: (_, values) => joinUniqueValues([values.variety, values.detailed_variety], " / ") },
  { fieldId: "plot_address", cell: "C7" },
  { fieldId: "altitude_m", cell: "G7" },
  { fieldId: "plot_area_pyeong", cell: "C8" },
  { fieldId: "standing_trade_yn", cell: "H8" },
  { fieldId: "row_spacing_m", cell: "C9" },
  { fieldId: "tree_spacing_m", cell: "E9" },
  { fieldId: "detailed_variety", cell: "H9" },
  { fieldId: "planted_tree_count", cell: "C10" },
  { fieldId: "training_system", cell: "H10" },
  { fieldId: "tree_count_changed_reason", cell: "D11" },
  { fieldId: "bloom_start_current_date", cell: "C12", transform: monthDay },
  { fieldId: "bloom_start_previous_date", cell: "C13", transform: monthDay },
  { fieldId: "bloom_start_normal_date", cell: "C14", transform: monthDay },
  { fieldId: "full_bloom_current_date", cell: "C15", transform: monthDay },
  { fieldId: "full_bloom_previous_date", cell: "C16", transform: monthDay },
  { fieldId: "full_bloom_normal_date", cell: "C17", transform: monthDay },
  { fieldId: "flowering_amount_vs_previous", cell: "F12" },
  { fieldId: "flowering_amount_vs_normal", cell: "F13" },
  { fieldId: "fruit_set_target_count_current", cell: "G14" },
  { fieldId: "fruit_set_count_previous_year", cell: "G15" },
  { fieldId: "fruit_set_count_normal_year", cell: "G16" },
  { fieldId: "full_bloom_amount_vs_previous", cell: "C18" },
  { fieldId: "full_bloom_amount_vs_normal", cell: "C19" },
  { fieldId: "cold_damage_2026_rate", cell: "F18" },
  { fieldId: "cold_damage_2026_no_fruit_set_rate", cell: "G18" },
  { fieldId: "cold_damage_2026_quality_decline_rate", cell: "H18" },
  { fieldId: "cold_damage_2025_rate", cell: "F19" },
  { fieldId: "cold_damage_2025_no_fruit_set_rate", cell: "G19" },
  { fieldId: "cold_damage_2025_quality_decline_rate", cell: "H19" },
  { fieldId: "fruit_thinning_1_date", cell: "C20", transform: monthDay },
  { fieldId: "fruit_thinning_2_date", cell: "C21", transform: monthDay },
  { fieldId: "expected_harvest_1_date", cell: "F20", transform: monthDay },
  { fieldId: "expected_harvest_2_date", cell: "F21", transform: monthDay },
  { fieldId: "farm_basic_notes", cell: "C22" },
];

export function getFarmBasicPrintTemplateConfig(defaultSpreadsheetId: string) {
  return {
    spreadsheetId:
      process.env.GOOGLE_SHEETS_PRINT_TEMPLATE_SPREADSHEET_ID ||
      defaultSpreadsheetId,
    templateSheetName:
      process.env.GOOGLE_SHEETS_FARM_BASIC_PRINT_TEMPLATE_SHEET ||
      defaultTemplateSheetName,
    keepGeneratedSheet:
      process.env.GOOGLE_SHEETS_KEEP_PRINT_SHEET === "1" ||
      process.env.GOOGLE_SHEETS_KEEP_PRINT_SHEET === "true",
  };
}

export async function createFarmBasicPdfFromSheetTemplate({
  spreadsheetId,
  templateSheetName,
  values,
}: {
  spreadsheetId: string;
  templateSheetName: string;
  values: FarmBasicPrintValues;
}) {
  await ensureFarmBasicTemplate({ spreadsheetId, title: templateSheetName });
  const generatedTitle = `print_${sanitizeSheetTitle(values.farm_id || "sample")}_${Date.now()}`;
  const generated = await createGeneratedFarmBasicPrintSheet({
    spreadsheetId,
    title: generatedTitle,
  });

  try {
    await batchUpdateSheetValues({
      spreadsheetId,
      updates: createValueUpdates({
        sheetName: generatedTitle,
        values,
      }),
    });

    return {
      pdfBytes: await exportSheetToPdf({
        spreadsheetId,
        sheetId: generated.sheetId,
      }),
      generatedSheetId: generated.sheetId,
      generatedSheetName: generatedTitle,
    };
  } catch (error) {
    await deleteSheetQuietly(spreadsheetId, generated.sheetId);
    throw error;
  }
}

export async function deleteGeneratedPrintSheet({
  spreadsheetId,
  sheetId,
}: {
  spreadsheetId: string;
  sheetId: number;
}) {
  await batchUpdateSpreadsheet({
    spreadsheetId,
    requests: [{ deleteSheet: { sheetId } }],
  });
}

async function findSheetByTitle(spreadsheetId: string, title: string) {
  const metadata = await getSpreadsheetMetadata(spreadsheetId);
  const sheet = metadata.sheets?.find((item) => item.properties?.title === title);
  const sheetId = sheet?.properties?.sheetId;
  if (sheetId === undefined) {
    return createDefaultFarmBasicTemplate({ spreadsheetId, title });
  }
  await repairFarmBasicTemplate({ spreadsheetId, sheetId });
  return { sheetId, title };
}

async function ensureFarmBasicTemplate({
  spreadsheetId,
  title,
}: {
  spreadsheetId: string;
  title: string;
}) {
  try {
    await findSheetByTitle(spreadsheetId, title);
  } catch {
    // PDF export uses a fresh generated sheet, so a template repair failure
    // must not keep old Google Sheets layout artifacts in the exported PDF.
  }
}

async function createGeneratedFarmBasicPrintSheet({
  spreadsheetId,
  title,
}: {
  spreadsheetId: string;
  title: string;
}) {
  const response = await batchUpdateSpreadsheet({
    spreadsheetId,
    requests: [
      {
        addSheet: {
          properties: {
            title,
            index: 1,
            gridProperties: {
              rowCount: 24,
              columnCount: 8,
              hideGridlines: true,
            },
          },
        },
      },
    ],
  });
  const properties = response.replies?.[0]?.addSheet?.properties;
  if (properties?.sheetId === undefined || !properties.title) {
    throw new Error("Google Sheets generated print sheet creation failed.");
  }

  await batchUpdateSpreadsheet({
    spreadsheetId,
    requests: createXlsxFarmBasicTemplateRequests(properties.sheetId),
  });

  return { sheetId: properties.sheetId, title: properties.title };
}

async function createDefaultFarmBasicTemplate({
  spreadsheetId,
  title,
}: {
  spreadsheetId: string;
  title: string;
}) {
  const response = await batchUpdateSpreadsheet({
    spreadsheetId,
    requests: [
      {
        addSheet: {
          properties: {
            title,
            index: 0,
            gridProperties: {
              rowCount: 32,
              columnCount: 11,
              hideGridlines: true,
            },
          },
        },
      },
    ],
  });
  const properties = response.replies?.[0]?.addSheet?.properties;
  if (properties?.sheetId === undefined) {
    throw new Error("Google Sheets print template creation failed.");
  }

  await batchUpdateSpreadsheet({
    spreadsheetId,
    requests: [
      ...createTemplateFormatRequests(properties.sheetId),
      ...createTemplateLayoutRepairRequests(properties.sheetId),
    ],
  });

  return { sheetId: properties.sheetId, title };
}

async function repairFarmBasicTemplate({
  spreadsheetId,
  sheetId,
}: {
  spreadsheetId: string;
  sheetId: number;
}) {
  await batchUpdateSpreadsheet({
    spreadsheetId,
    requests: createTemplateLayoutRepairRequests(sheetId),
  }).catch(() => undefined);
}

function createValueUpdates({
  sheetName,
  values,
}: {
  sheetName: string;
  values: FarmBasicPrintValues;
}): SheetValueUpdate[] {
  return valueMappings.map((mapping) => {
    const rawValue = values[mapping.fieldId] ?? "";
    const printValue = mapping.transform
      ? mapping.transform(rawValue, values)
      : rawValue;
    return {
      range: `${quoteSheetName(sheetName)}!${mapping.cell}`,
      values: [[printValue]],
    };
  });
}

async function deleteSheetQuietly(spreadsheetId: string, sheetId: number) {
  try {
    await deleteGeneratedPrintSheet({ spreadsheetId, sheetId });
  } catch {
    // Best-effort cleanup only. The export route returns the original failure.
  }
}

function createTemplateFormatRequests(sheetId: number) {
  const requests: unknown[] = [
    repeatCell(sheetId, 1, 32, 1, 11, cellFormat("#ffffff")),
    repeatCell(sheetId, 1, 1, 1, 11, {
      userEnteredFormat: {
        horizontalAlignment: "CENTER",
        verticalAlignment: "MIDDLE",
        textFormat: {
          bold: true,
          fontSize: 16,
          fontFamily: "Malgun Gothic",
        },
      },
    }),
    repeatCell(sheetId, 6, 25, 1, 11, {
      userEnteredFormat: {
        wrapStrategy: "WRAP",
        verticalAlignment: "MIDDLE",
        textFormat: {
          fontSize: 10,
          fontFamily: "Malgun Gothic",
        },
      },
    }),
  ];

  [70, 88, 92, 52, 54, 90, 80, 96, 84, 84, 84].forEach((width, index) => {
    requests.push(updateDimension(sheetId, "COLUMNS", index + 1, index + 1, width));
  });
  [
    34, 26, 12, 6, 8, 30, 34, 38, 34, 34, 42, 34, 10, 34, 34, 34, 10, 34, 34,
    34, 34, 34, 34, 10, 34, 34, 10, 58, 8, 8, 8, 8,
  ].forEach((height, index) => {
    requests.push(updateDimension(sheetId, "ROWS", index + 1, index + 1, height));
  });

  [
    [1, 1, 1, 11],
    [2, 2, 1, 11],
    [6, 6, 1, 2],
    [6, 6, 3, 4],
    [6, 6, 6, 7],
    [6, 6, 9, 11],
    [7, 7, 1, 2],
    [7, 7, 3, 7],
    [7, 7, 9, 11],
    [8, 8, 1, 2],
    [8, 8, 3, 8],
    [8, 8, 9, 11],
    [9, 9, 1, 2],
    [9, 9, 3, 4],
    [9, 9, 6, 8],
    [9, 9, 9, 11],
    [10, 10, 1, 2],
    [10, 10, 6, 8],
    [10, 10, 9, 11],
    [11, 12, 1, 2],
    [11, 11, 3, 4],
    [11, 11, 6, 8],
    [11, 11, 9, 11],
    [12, 12, 3, 11],
    [14, 16, 1, 1],
    [18, 20, 1, 1],
    [14, 15, 8, 8],
    [17, 19, 8, 8],
    [21, 22, 8, 8],
    [22, 22, 1, 2],
    [22, 22, 3, 4],
    [23, 23, 1, 2],
    [23, 23, 3, 4],
    [25, 26, 1, 2],
    [25, 26, 8, 8],
    [28, 28, 1, 2],
    [28, 28, 3, 11],
  ].forEach(([startRow, endRow, startCol, endCol]) => {
    requests.push(mergeCells(sheetId, startRow, endRow, startCol, endCol));
  });

  [
    [6, 6, 1, 2],
    [6, 6, 5, 5],
    [6, 6, 8, 8],
    [7, 7, 1, 2],
    [7, 7, 8, 8],
    [8, 8, 1, 2],
    [9, 9, 1, 2],
    [9, 9, 6, 8],
    [10, 10, 1, 2],
    [10, 10, 6, 8],
    [11, 12, 1, 2],
    [11, 11, 6, 8],
    [14, 23, 1, 2],
    [14, 23, 7, 8],
    [25, 26, 1, 2],
    [25, 26, 8, 8],
    [28, 28, 1, 2],
  ].forEach(([startRow, endRow, startCol, endCol]) => {
    requests.push(repeatCell(sheetId, startRow, endRow, startCol, endCol, cellFormat("#d9d9d9", true)));
  });

  [
    [2, 2, 5, 5],
    [6, 12, 3, 11],
    [14, 23, 3, 11],
    [25, 26, 3, 11],
    [28, 28, 3, 11],
  ].forEach(([startRow, endRow, startCol, endCol]) => {
    requests.push(repeatCell(sheetId, startRow, endRow, startCol, endCol, cellFormat("#fff2cc")));
  });

  [
    [6, 12, 1, 11],
    [14, 23, 1, 11],
    [25, 26, 1, 11],
    [28, 28, 1, 11],
  ].forEach(([startRow, endRow, startCol, endCol]) => {
    requests.push(updateBorders(sheetId, startRow, endRow, startCol, endCol, "SOLID_THICK"));
  });

  requests.push(
    ...setCells(sheetId, [
      [1, 1, "\uC0AC\uACFC\u00B7\uBC30 \uC2E4\uCE21 \uC870\uC0AC \uB18D\uAC00 \uAE30\uBCF8 \uC815\uBCF4 \uC870\uC0AC[\uC0DD\uC721 \uB18D\uAC00]"],
      [2, 1, "\u25CB \uAE30\uBCF8 \uC815\uBCF4(\uC870\uC0AC \uC77C\uC2DC :     \uB144    \uC6D4    \uC77C)"],
      [6, 1, "ID"],
      [6, 5, "\uACBD\uC791\uC790"],
      [6, 8, "\uC5F0\uB77D\uCC98"],
      [7, 1, "\uC790\uD0DD\uC8FC\uC18C"],
      [7, 8, "\uD488\uC885"],
      [8, 1, "\uD544\uC9C0\uC8FC\uC18C\n(\uACE0\uB3C4m)"],
      [8, 9, "\uACE0\uB3C4"],
      [9, 1, "\uD574\uB2F9\uD544\uC9C0\uBA74\uC801(\uD3C9)"],
      [9, 5, ""],
      [9, 6, "\uD45C\uC804\uAC70\uB798 \uC5EC\uBD80"],
      [10, 1, "\uC7AC\uC2DD\uAC70\uB9AC\n(\uD55C\uADF8\uB8E8 \uB113\uC774)"],
      [10, 3, "\uC5F4\uAC04"],
      [10, 4, "\uC8FC\uAC04"],
      [10, 6, "\uACFC\uC218 \uC138\uBD80 \uD488\uC885"],
      [11, 1, "\uC7AC\uC2DD \uC8FC\uC218\n(\uC8FC/\uD574\uB2F9\uD544\uC9C0)"],
      [11, 5, ""],
      [11, 6, "\uC7AC\uBC30 \uC218\uD615"],
      [12, 3, "\uC7AC\uC2DD \uC8FC\uC218_\uC804\uB144\uACFC \uB2E4\uB978 \uC774\uC720"],
      [14, 1, "\uAC1C\uD654\n\uC2DC\uC791\uC77C"],
      [14, 2, "\uC62C\uD574\n\uAC1C\uD654\uC77C"],
      [15, 2, "\uC804\uB144\n\uAC1C\uD654\uC77C"],
      [16, 2, "\uD3C9\uB144\n\uAC1C\uD654\uC77C"],
      [17, 1, "\uB9CC\uAC1C\uAE30"],
      [17, 2, "\uC62C\uD574\n\uB9CC\uAC1C\uC77C"],
      [18, 2, "\uC804\uB144\n\uB9CC\uAC1C\uC77C"],
      [19, 2, "\uD3C9\uB144\n\uB9CC\uAC1C\uC77C"],
      [14, 8, "\uCC29\uD654\uB7C9"],
      [14, 7, "\uC804\uB144\n\uB300\uBE44"],
      [15, 7, "\uD3C9\uB144\n\uB300\uBE44"],
      [16, 8, "\uCD5C\uC885\n\uCC29\uACFC\uC218"],
      [16, 7, "\uC62C\uD574\n\uBAA9\uD45C"],
      [17, 7, "\uC804\uB144"],
      [18, 7, "\uD3C9\uB144"],
      [22, 8, "\uC800\uC628\n\uD53C\uD574"],
      [22, 7, "2026\uB144"],
      [23, 7, "2025\uB144"],
      [22, 9, "\uD53C\uD574\uBE44\uC911"],
      [22, 10, "\uCC29\uACFC\uBD88\uB2A5"],
      [22, 11, "\uD488\uC704\uC800\uD558"],
      [23, 9, "\uD53C\uD574\uBE44\uC911"],
      [23, 10, "\uCC29\uACFC\uBD88\uB2A5"],
      [23, 11, "\uD488\uC704\uC800\uD558"],
      [20, 1, "\uB9CC\uAC1C\uB7C9\n(\uC804\uB144\uB300\uBE44)"],
      [21, 1, "\uB9CC\uAC1C\uB7C9\n(\uD3C9\uB144\uB300\uBE44)"],
      [25, 1, "\uC801\uACFC\uC77C\n(\uC608\uC815\uC77C)"],
      [25, 3, "\uC801\uACFC\uC77C 1\uCC28"],
      [26, 3, "\uC801\uACFC\uC77C 2\uCC28"],
      [25, 8, "\uC218\uD655\uC608\uC815\uC77C"],
      [25, 9, "\uC218\uD655\uC608\uC815\uC77C 1\uCC28"],
      [26, 9, "\uC218\uD655\uC608\uC815\uC77C 2\uCC28"],
      [28, 1, "\uD2B9\uC774\uC0AC\uD56D\n(\uAE30\uD0C0)"],
      [28, 3, "\uD2B9\uC774\uC0AC\uD56D"],
    ])
  );

  return requests;
}

function createTemplateLayoutRepairRequests(sheetId: number) {
  const requests: unknown[] = [];
  const labelMergeRanges: Array<[number, number, number, number]> = [
    [1, 1, 1, 11],
    [2, 2, 1, 11],
    [6, 6, 1, 2],
    [6, 6, 3, 4],
    [6, 6, 6, 7],
    [6, 6, 9, 11],
    [7, 7, 1, 2],
    [7, 7, 3, 7],
    [7, 7, 9, 11],
    [8, 8, 1, 2],
    [8, 8, 3, 8],
    [8, 8, 9, 11],
    [9, 9, 1, 2],
    [9, 9, 3, 5],
    [9, 9, 6, 8],
    [9, 9, 9, 11],
    [10, 10, 1, 2],
    [10, 10, 4, 5],
    [10, 10, 6, 8],
    [10, 10, 9, 11],
    [11, 11, 1, 2],
    [11, 11, 3, 5],
    [11, 11, 6, 8],
    [11, 11, 9, 11],
    [14, 16, 1, 1],
    [17, 19, 1, 1],
    [14, 15, 8, 8],
    [16, 18, 8, 8],
    [20, 21, 8, 8],
    [20, 20, 1, 2],
    [21, 21, 1, 2],
    [22, 23, 1, 2],
    [22, 23, 8, 8],
    [25, 25, 1, 2],
  ];
  const mergedValueRanges: Array<[number, number, number, number]> = [
    [14, 14, 3, 6],
    [15, 15, 3, 6],
    [16, 16, 3, 6],
    [17, 17, 3, 6],
    [18, 18, 3, 6],
    [19, 19, 3, 6],
    [14, 14, 9, 11],
    [15, 15, 9, 11],
    [16, 16, 9, 11],
    [17, 17, 9, 11],
    [18, 18, 9, 11],
    [20, 20, 3, 6],
    [21, 21, 3, 6],
    [22, 22, 3, 6],
    [23, 23, 3, 6],
    [22, 22, 9, 11],
    [23, 23, 9, 11],
    [25, 25, 3, 11],
  ];

  requests.push(unmergeCells(sheetId, 6, 12, 1, 11));
  requests.push(unmergeCells(sheetId, 1, 2, 1, 11));
  requests.push(unmergeCells(sheetId, 14, 23, 1, 11));
  requests.push(unmergeCells(sheetId, 22, 26, 1, 11));
  [
    ...labelMergeRanges,
    ...mergedValueRanges,
    [18, 20, 1, 1],
    [17, 19, 8, 8],
    [21, 22, 8, 8],
    [22, 22, 1, 2],
    [23, 23, 1, 2],
    [22, 22, 3, 4],
    [23, 23, 3, 4],
  ].forEach(([startRow, endRow, startCol, endCol]) => {
    requests.push(unmergeCells(sheetId, startRow, endRow, startCol, endCol));
  });
  labelMergeRanges.forEach(([startRow, endRow, startCol, endCol]) => {
    requests.push(mergeCells(sheetId, startRow, endRow, startCol, endCol));
  });
  mergedValueRanges.forEach(([startRow, endRow, startCol, endCol]) => {
    requests.push(mergeCells(sheetId, startRow, endRow, startCol, endCol));
  });
  requests.push(unmergeCells(sheetId, 20, 20, 9, 11));
  requests.push(unmergeCells(sheetId, 21, 21, 9, 11));

  [74, 96, 104, 60, 54, 102, 70, 92, 92, 92, 92].forEach(
    (width, index) => {
      requests.push(updateDimension(sheetId, "COLUMNS", index + 1, index + 1, width));
    }
  );

  [
    [1, 42],
    [2, 30],
    [6, 36],
    [7, 39],
    [8, 43],
    [9, 38],
    [10, 38],
    [11, 48],
    [12, 1],
    [14, 42],
    [15, 42],
    [16, 42],
    [17, 42],
    [18, 42],
    [19, 42],
    [20, 42],
    [21, 42],
    [22, 40],
    [23, 40],
    [24, 1],
    [25, 64],
    [26, 1],
    [27, 1],
    [28, 1],
  ].forEach(([row, height]) => {
    requests.push(updateDimension(sheetId, "ROWS", row, row, height));
  });

  requests.push(
    repeatCell(sheetId, 1, 1, 1, 11, {
      userEnteredFormat: {
        horizontalAlignment: "CENTER",
        verticalAlignment: "MIDDLE",
        textFormat: {
          bold: true,
          fontSize: 17,
          fontFamily: "Malgun Gothic",
        },
      },
    })
  );
  requests.push(
    repeatCell(sheetId, 6, 28, 1, 11, {
      userEnteredFormat: {
        wrapStrategy: "WRAP",
        verticalAlignment: "MIDDLE",
        textFormat: {
          fontSize: 11,
          fontFamily: "Malgun Gothic",
        },
      },
    })
  );

  [
    [6, 11, 3, 11],
    [14, 23, 3, 11],
    [25, 25, 3, 11],
  ].forEach(([startRow, endRow, startCol, endCol]) => {
    requests.push(
      repeatCell(sheetId, startRow, endRow, startCol, endCol, cellFormat("#fff2cc", false, 11))
    );
  });

  [
    [6, 6, 1, 2],
    [6, 6, 5, 5],
    [6, 6, 8, 8],
    [7, 7, 1, 2],
    [7, 7, 8, 8],
    [8, 8, 1, 2],
    [9, 9, 1, 2],
    [9, 9, 6, 8],
    [10, 10, 1, 2],
    [10, 10, 6, 8],
    [11, 11, 1, 2],
    [11, 11, 6, 8],
    [14, 21, 1, 2],
    [14, 21, 7, 8],
    [20, 21, 9, 11],
    [22, 23, 1, 2],
    [22, 23, 8, 8],
    [25, 25, 1, 2],
  ].forEach(([startRow, endRow, startCol, endCol]) => {
    requests.push(
      repeatCell(sheetId, startRow, endRow, startCol, endCol, cellFormat("#d9d9d9", true, 11))
    );
  });

  [
    [6, 11, 1, 11],
    [14, 21, 1, 11],
    [22, 23, 1, 11],
    [25, 25, 1, 11],
  ].forEach(([startRow, endRow, startCol, endCol]) => {
    requests.push(updateBorders(sheetId, startRow, endRow, startCol, endCol, "SOLID_THICK"));
  });
  requests.push(updateBorders(sheetId, 20, 21, 9, 11, "SOLID"));

  requests.push(
    ...setCells(sheetId, [
      [1, 1, "\uC0AC\uACFC\u00B7\uBC30 \uC2E4\uCE21 \uC870\uC0AC \uB18D\uAC00 \uAE30\uBCF8 \uC815\uBCF4 \uC870\uC0AC[\uC0DD\uC721 \uB18D\uAC00]"],
      [2, 1, "\u25CB \uAE30\uBCF8 \uC815\uBCF4(\uC870\uC0AC \uC77C\uC2DC :     \uB144    \uC6D4    \uC77C)"],
      [6, 1, "ID"],
      [6, 5, "\uACBD\uC791\uC790"],
      [6, 8, "\uC5F0\uB77D\uCC98"],
      [7, 1, "\uC790\uD0DD\uC8FC\uC18C"],
      [7, 8, "\uD488\uC885"],
      [8, 1, "\uD544\uC9C0\uC8FC\uC18C\n(\uACE0\uB3C4m)"],
      [8, 9, "\uACE0\uB3C4"],
      [9, 1, "\uD574\uB2F9\uD544\uC9C0\uBA74\uC801(\uD3C9)"],
      [9, 5, ""],
      [9, 6, "\uD45C\uC804\uAC70\uB798 \uC5EC\uBD80"],
      [10, 1, "\uC7AC\uC2DD\uAC70\uB9AC\n(\uD55C\uADF8\uB8E8 \uB113\uC774)"],
      [10, 3, "\uC5F4\uAC04"],
      [10, 4, "\uC8FC\uAC04"],
      [10, 6, "\uACFC\uC218 \uC138\uBD80 \uD488\uC885"],
      [11, 1, "\uC7AC\uC2DD \uC8FC\uC218\n(\uC8FC/\uD574\uB2F9\uD544\uC9C0)"],
      [11, 5, ""],
      [11, 6, "\uC7AC\uBC30 \uC218\uD615"],
      [12, 1, ""],
      [12, 3, ""],
      [12, 6, ""],
      [17, 1, "\uB9CC\uAC1C\uAE30"],
      [17, 2, "\uC62C\uD574\n\uB9CC\uAC1C\uC77C"],
      [18, 2, "\uC804\uB144\n\uB9CC\uAC1C\uC77C"],
      [19, 2, "\uD3C9\uB144\n\uB9CC\uAC1C\uC77C"],
      [14, 8, "\uCC29\uD654\uB7C9"],
      [14, 7, "\uC804\uB144\n\uB300\uBE44"],
      [15, 7, "\uD3C9\uB144\n\uB300\uBE44"],
      [16, 8, "\uCD5C\uC885\n\uCC29\uACFC\uC218\n(\uACFC\uC218\uB2F9)"],
      [16, 7, "\uC62C\uD574\n\uBAA9\uD45C"],
      [17, 7, "\uC804\uB144"],
      [18, 7, "\uD3C9\uB144"],
      [19, 7, ""],
      [20, 1, "\uB9CC\uAC1C\uB7C9\n(\uC804\uB144\uB300\uBE44)"],
      [21, 1, "\uB9CC\uAC1C\uB7C9\n(\uD3C9\uB144\uB300\uBE44)"],
      [22, 1, "\uC801\uACFC\uC77C"],
      [20, 8, "\uC800\uC628\n\uD53C\uD574\n(%)"],
      [20, 7, "2026\uB144"],
      [21, 7, "2025\uB144"],
      [20, 9, "\uD53C\uD574\uBE44\uC911"],
      [20, 10, "\uCC29\uACFC\uBD88\uB2A5"],
      [20, 11, "\uD488\uC704\uC800\uD558"],
      [21, 9, "\uD53C\uD574\uBE44\uC911"],
      [21, 10, "\uCC29\uACFC\uBD88\uB2A5"],
      [21, 11, "\uD488\uC704\uC800\uD558"],
      [22, 3, "1\uCC28"],
      [23, 3, "2\uCC28"],
      [22, 8, "\uC218\uD655\n\uC608\uC815\uC77C"],
      [22, 9, "1\uCC28"],
      [23, 9, "2\uCC28"],
      [24, 1, ""],
      [24, 3, ""],
      [24, 8, ""],
      [24, 9, ""],
      [25, 1, "\uD2B9\uC774\uC0AC\uD56D\n(\uAE30\uD0C0)"],
      [25, 3, "\uD2B9\uC774\uC0AC\uD56D"],
      [26, 1, ""],
      [26, 3, ""],
      [28, 1, ""],
      [28, 3, ""],
    ])
  );

  return requests;
}

function createXlsxFarmBasicTemplateRequests(sheetId: number) {
  const requests: unknown[] = [];
  const merges: Array<[number, number, number, number]> = [
    [1, 1, 1, 8],
    [5, 5, 1, 2],
    [5, 5, 3, 3],
    [5, 5, 7, 8],
    [6, 6, 1, 2],
    [6, 6, 3, 5],
    [6, 6, 7, 8],
    [7, 7, 1, 2],
    [7, 7, 3, 5],
    [8, 8, 1, 2],
    [8, 8, 4, 5],
    [9, 9, 1, 2],
    [10, 11, 1, 1],
    [10, 11, 2, 2],
    [10, 10, 3, 4],
    [10, 10, 6, 7],
    [11, 11, 4, 8],
    [12, 14, 1, 1],
    [12, 13, 4, 4],
    [12, 12, 6, 8],
    [13, 13, 6, 8],
    [14, 16, 4, 4],
    [15, 17, 1, 1],
    [17, 19, 4, 4],
    [18, 19, 1, 1],
    [20, 21, 1, 1],
    [20, 20, 6, 8],
    [21, 21, 6, 8],
    [22, 22, 1, 2],
    [22, 22, 3, 8],
  ];

  requests.push(repeatCell(sheetId, 1, 24, 1, 8, cellFormat("#ffffff", false, 10)));
  requests.push(unmergeCells(sheetId, 1, 24, 1, 8));
  merges.forEach(([startRow, endRow, startCol, endCol]) => {
    requests.push(mergeCells(sheetId, startRow, endRow, startCol, endCol));
  });

  [84, 72, 126, 72, 72, 92, 92, 92].forEach((width, index) => {
    requests.push(updateDimension(sheetId, "COLUMNS", index + 1, index + 1, width));
  });
  [
    [1, 34],
    [2, 12],
    [3, 24],
    [4, 10],
    [5, 30],
    [6, 36],
    [7, 36],
    [8, 30],
    [9, 30],
    [10, 30],
    [11, 30],
    [12, 30],
    [13, 30],
    [14, 30],
    [15, 30],
    [16, 30],
    [17, 30],
    [18, 30],
    [19, 30],
    [20, 30],
    [21, 30],
    [22, 52],
    [23, 8],
    [24, 8],
  ].forEach(([row, height]) => {
    requests.push(updateDimension(sheetId, "ROWS", row, row, height));
  });

  requests.push(
    repeatCell(sheetId, 1, 1, 1, 8, {
      userEnteredFormat: {
        horizontalAlignment: "CENTER",
        verticalAlignment: "MIDDLE",
        textFormat: {
          bold: true,
          fontSize: 16,
          fontFamily: "Malgun Gothic",
        },
      },
    })
  );
  requests.push(
    repeatCell(sheetId, 3, 22, 1, 8, {
      userEnteredFormat: {
        horizontalAlignment: "CENTER",
        verticalAlignment: "MIDDLE",
        wrapStrategy: "WRAP",
        textFormat: {
          fontSize: 10,
          fontFamily: "Malgun Gothic",
        },
      },
    })
  );

  [
    [3, 3, 3, 3],
    [3, 3, 5, 5],
    [3, 3, 7, 7],
    [5, 5, 3, 3],
    [5, 5, 5, 5],
    [5, 5, 7, 8],
    [6, 7, 3, 5],
    [6, 6, 7, 8],
    [7, 7, 7, 7],
    [8, 8, 3, 3],
    [8, 8, 8, 8],
    [9, 9, 3, 3],
    [9, 9, 5, 5],
    [9, 9, 8, 8],
    [10, 10, 3, 4],
    [10, 10, 8, 8],
    [11, 11, 4, 8],
    [12, 14, 3, 3],
    [12, 13, 6, 8],
    [14, 16, 7, 7],
    [18, 19, 3, 3],
    [18, 19, 6, 8],
    [20, 21, 3, 3],
    [20, 21, 6, 8],
    [22, 22, 3, 8],
  ].forEach(([startRow, endRow, startCol, endCol]) => {
    requests.push(
      repeatCell(sheetId, startRow, endRow, startCol, endCol, cellFormat("#ffffff", false, 10))
    );
  });

  [
    [5, 10, 1, 2],
    [5, 5, 4, 4],
    [5, 5, 6, 6],
    [6, 6, 6, 6],
    [7, 7, 6, 6],
    [8, 8, 6, 7],
    [10, 10, 6, 7],
    [12, 19, 1, 2],
    [12, 19, 4, 5],
    [17, 19, 6, 8],
    [20, 21, 1, 2],
    [20, 21, 4, 4],
    [22, 22, 1, 2],
  ].forEach(([startRow, endRow, startCol, endCol]) => {
    requests.push(
      repeatCell(sheetId, startRow, endRow, startCol, endCol, cellFormat("#d9d9d9", true, 10))
    );
  });

  [
    [5, 11, 1, 8],
    [12, 19, 1, 8],
    [20, 21, 1, 8],
    [22, 22, 1, 8],
  ].forEach(([startRow, endRow, startCol, endCol]) => {
    requests.push(updateBorders(sheetId, startRow, endRow, startCol, endCol, "SOLID_THICK"));
  });
  requests.push(updateBorders(sheetId, 17, 19, 6, 8, "SOLID"));

  requests.push(
    ...setCells(sheetId, [
      [1, 1, "사과·배 실측 조사 농가 기본 정보 조사[생육 농가]"],
      [3, 1, "○ 기본 정보(조사 일시 : "],
      [3, 4, "년"],
      [3, 6, "월"],
      [3, 8, "일)"],
      [5, 1, "ID"],
      [5, 4, "경작자"],
      [5, 6, "연락처"],
      [6, 1, "자택주소"],
      [6, 6, "품종"],
      [7, 1, "필지주소"],
      [7, 6, "고도"],
      [7, 8, "m"],
      [8, 1, "해당필지면적"],
      [8, 4, "평"],
      [8, 6, "포전거래 여부"],
      [9, 1, "재식거리"],
      [9, 4, "m(열간)"],
      [9, 6, "m(주간)"],
      [9, 7, "과수 세부품종"],
      [10, 1, "재식주수"],
      [10, 5, "주/해당필지"],
      [10, 6, "재배 수형"],
      [11, 3, "전년과 다른 이유:"],
      [12, 1, "개화시작일"],
      [12, 2, "올해"],
      [13, 2, "전년"],
      [14, 2, "평년"],
      [15, 1, "만개기"],
      [15, 2, "올해"],
      [16, 2, "전년"],
      [17, 2, "평년"],
      [18, 1, "만개량"],
      [18, 2, "전년대비"],
      [19, 2, "평년대비"],
      [12, 4, "착화량"],
      [12, 5, "전년대비"],
      [13, 5, "평년대비"],
      [14, 4, "최종착과수"],
      [14, 5, "올해목표"],
      [14, 6, "1그루당"],
      [14, 8, "개"],
      [15, 5, "전년"],
      [15, 6, "1그루당"],
      [15, 8, "개"],
      [16, 5, "평년"],
      [16, 6, "1그루당"],
      [16, 8, "개"],
      [17, 4, "저온피해(%)"],
      [17, 5, "년도"],
      [17, 6, "피해비중(%)"],
      [17, 7, "착과불능(%)"],
      [17, 8, "품위저하(%)"],
      [18, 5, "2026년"],
      [19, 5, "2025년"],
      [20, 1, "적과예정일"],
      [20, 2, "1차"],
      [21, 2, "2차"],
      [20, 4, "수확예정일"],
      [20, 5, "1차"],
      [21, 5, "2차"],
      [22, 1, "특이사항(기타)"],
    ])
  );

  return requests;
}

function gridRange(
  sheetId: number,
  startRow: number,
  endRow: number,
  startCol: number,
  endCol: number
) {
  return {
    sheetId,
    startRowIndex: startRow - 1,
    endRowIndex: endRow,
    startColumnIndex: startCol - 1,
    endColumnIndex: endCol,
  };
}

function mergeCells(
  sheetId: number,
  startRow: number,
  endRow: number,
  startCol: number,
  endCol: number
) {
  return {
    mergeCells: {
      range: gridRange(sheetId, startRow, endRow, startCol, endCol),
      mergeType: "MERGE_ALL",
    },
  };
}

function unmergeCells(
  sheetId: number,
  startRow: number,
  endRow: number,
  startCol: number,
  endCol: number
) {
  return {
    unmergeCells: {
      range: gridRange(sheetId, startRow, endRow, startCol, endCol),
    },
  };
}

function repeatCell(
  sheetId: number,
  startRow: number,
  endRow: number,
  startCol: number,
  endCol: number,
  cell: unknown
) {
  return {
    repeatCell: {
      range: gridRange(sheetId, startRow, endRow, startCol, endCol),
      cell,
      fields: "userEnteredFormat",
    },
  };
}

function updateDimension(
  sheetId: number,
  dimension: "ROWS" | "COLUMNS",
  start: number,
  end: number,
  pixelSize: number
) {
  return {
    updateDimensionProperties: {
      range: {
        sheetId,
        dimension,
        startIndex: start - 1,
        endIndex: end,
      },
      properties: { pixelSize },
      fields: "pixelSize",
    },
  };
}

function updateBorders(
  sheetId: number,
  startRow: number,
  endRow: number,
  startCol: number,
  endCol: number,
  style: "SOLID" | "SOLID_THICK"
) {
  const border = {
    style,
    width: style === "SOLID_THICK" ? 2 : 1,
    color: { red: 0.12, green: 0.12, blue: 0.12 },
  };
  return {
    updateBorders: {
      range: gridRange(sheetId, startRow, endRow, startCol, endCol),
      top: border,
      bottom: border,
      left: border,
      right: border,
      innerHorizontal: { ...border, style: "SOLID", width: 1 },
      innerVertical: { ...border, style: "SOLID", width: 1 },
    },
  };
}

function cellFormat(backgroundColor: string, bold = false, fontSize = 10) {
  return {
    userEnteredFormat: {
      backgroundColor: hexColor(backgroundColor),
      horizontalAlignment: "CENTER",
      verticalAlignment: "MIDDLE",
      wrapStrategy: "WRAP",
      textFormat: {
        bold,
        fontSize,
        fontFamily: "Malgun Gothic",
      },
    },
  };
}

function setCells(sheetId: number, values: Array<[number, number, string]>) {
  return values.map(([row, col, value]) => ({
    updateCells: {
      range: gridRange(sheetId, row, row, col, col),
      rows: [{ values: [{ userEnteredValue: { stringValue: value } }] }],
      fields: "userEnteredValue",
    },
  }));
}

function hexColor(value: string) {
  const number = Number.parseInt(value.slice(1), 16);
  return {
    red: ((number >> 16) & 255) / 255,
    green: ((number >> 8) & 255) / 255,
    blue: (number & 255) / 255,
  };
}

function monthDay(value: string) {
  const parsed = parseDate(value);
  if (!parsed.month || !parsed.day) return "";
  return `${parsed.month}-${parsed.day}`;
}

function dateYear(value: string) {
  return parseDate(value).year || "";
}

function dateMonth(value: string) {
  return parseDate(value).month || "";
}

function dateDay(value: string) {
  return parseDate(value).day || "";
}

function parseDate(value = "") {
  const text = String(value).trim();
  const digits = text.replace(/\D/g, "");
  if (digits.length >= 8) {
    return { year: digits.slice(0, 4), month: digits.slice(4, 6), day: digits.slice(6, 8) };
  }
  if (digits.length === 4) {
    return { month: digits.slice(0, 2), day: digits.slice(2, 4) };
  }
  const match = text.match(/(\d{1,2})\D+(\d{1,2})/);
  if (!match) return {};
  return {
    month: match[1].padStart(2, "0"),
    day: match[2].padStart(2, "0"),
  };
}

function joinUniqueValues(values: Array<string | undefined>, separator: string) {
  const seen = new Set<string>();
  return values
    .map((item) => String(item ?? "").trim())
    .filter(Boolean)
    .filter((item) => {
      const key = item.replace(/\s+/g, "");
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .join(separator);
}

function sanitizeSheetTitle(value: string) {
  return value.replace(/[\[\]*?/\\:]/g, "_").slice(0, 40);
}

function quoteSheetName(sheetName: string) {
  return `'${sheetName.replace(/'/g, "''")}'`;
}
