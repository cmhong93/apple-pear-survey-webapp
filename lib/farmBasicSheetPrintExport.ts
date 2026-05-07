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
  { fieldId: "survey_datetime", cell: "A2", transform: surveyDateLine },
  { fieldId: "farm_id", cell: "C6" },
  { fieldId: "farmer_name", cell: "F6" },
  { fieldId: "farmer_contact", cell: "I6" },
  { fieldId: "home_address", cell: "C7" },
  { fieldId: "variety", cell: "I7", transform: (_, values) => joinUniqueValues([values.variety, values.detailed_variety], " / ") },
  { fieldId: "plot_address", cell: "C8" },
  { fieldId: "altitude_m", cell: "I8" },
  { fieldId: "plot_area_pyeong", cell: "C9" },
  { fieldId: "standing_trade_yn", cell: "I9" },
  { fieldId: "row_spacing_m", cell: "C10" },
  { fieldId: "tree_spacing_m", cell: "D10" },
  { fieldId: "detailed_variety", cell: "I10" },
  { fieldId: "planted_tree_count", cell: "C11" },
  { fieldId: "training_system", cell: "I11" },
  { fieldId: "bloom_start_current_date", cell: "C14", transform: monthDay },
  { fieldId: "bloom_start_previous_date", cell: "C15", transform: monthDay },
  { fieldId: "bloom_start_normal_date", cell: "C16", transform: monthDay },
  { fieldId: "full_bloom_current_date", cell: "C17", transform: monthDay },
  { fieldId: "full_bloom_previous_date", cell: "C18", transform: monthDay },
  { fieldId: "full_bloom_normal_date", cell: "C19", transform: monthDay },
  { fieldId: "flowering_amount_vs_previous", cell: "I14" },
  { fieldId: "flowering_amount_vs_normal", cell: "I15" },
  { fieldId: "full_bloom_amount_vs_previous", cell: "C20" },
  { fieldId: "full_bloom_amount_vs_normal", cell: "C21" },
  { fieldId: "fruit_set_target_count_current", cell: "I16" },
  { fieldId: "fruit_set_count_previous_year", cell: "I17" },
  { fieldId: "fruit_set_count_normal_year", cell: "I18" },
  { fieldId: "cold_damage_2026_rate", cell: "I20" },
  { fieldId: "cold_damage_2026_no_fruit_set_rate", cell: "J20" },
  { fieldId: "cold_damage_2026_quality_decline_rate", cell: "K20" },
  { fieldId: "cold_damage_2025_rate", cell: "I21" },
  { fieldId: "cold_damage_2025_no_fruit_set_rate", cell: "J21" },
  { fieldId: "cold_damage_2025_quality_decline_rate", cell: "K21" },
  { fieldId: "fruit_thinning_1_date", cell: "C22", transform: monthDay },
  { fieldId: "fruit_thinning_2_date", cell: "C23", transform: monthDay },
  { fieldId: "expected_harvest_1_date", cell: "I22", transform: monthDay },
  { fieldId: "expected_harvest_2_date", cell: "I23", transform: monthDay },
  { fieldId: "farm_basic_notes", cell: "C25" },
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
              rowCount: 28,
              columnCount: 11,
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
    requests: [
      ...createTemplateFormatRequests(properties.sheetId),
      ...createTemplateLayoutRepairRequests(properties.sheetId),
    ],
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

  requests.push(unmergeCells(sheetId, 1, 2, 1, 11));
  requests.push(unmergeCells(sheetId, 14, 23, 1, 11));
  requests.push(unmergeCells(sheetId, 22, 26, 1, 11));
  [
    ...labelMergeRanges,
    ...mergedValueRanges,
    [9, 9, 3, 5],
    [10, 10, 4, 5],
    [11, 11, 3, 5],
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
  requests.push(mergeCells(sheetId, 9, 9, 3, 5));
  requests.push(mergeCells(sheetId, 10, 10, 4, 5));
  requests.push(mergeCells(sheetId, 11, 11, 3, 5));

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
    [22, 23, 3, 11],
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
    [14, 23, 1, 2],
    [14, 23, 7, 8],
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
    [14, 23, 1, 11],
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
      [8, 1, "\uD544\uC9C0\uC8FC\uC18C\n(\uACE0\uB3C4m)"],
      [9, 1, "\uD574\uB2F9\uD544\uC9C0\uBA74\uC801(\uD3C9)"],
      [9, 5, ""],
      [11, 1, "\uC7AC\uC2DD \uC8FC\uC218\n(\uC8FC/\uD574\uB2F9\uD544\uC9C0)"],
      [11, 5, ""],
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

function surveyDateLine(value: string) {
  const parsed = parseDate(value);
  return `\u25CB \uAE30\uBCF8 \uC815\uBCF4(\uC870\uC0AC \uC77C\uC2DC : ${
    parsed.year || "    "
  } \uB144 ${parsed.month || "  "} \uC6D4 ${parsed.day || "  "} \uC77C)`;
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
