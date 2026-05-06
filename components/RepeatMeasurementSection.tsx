"use client";

import { useMemo, useState } from "react";
import type { RepeatDataState, RepeatGroup, RepeatRow } from "@/types/survey";

type RepeatMeasurementSectionProps = {
  group: RepeatGroup;
  repeatData: RepeatDataState;
  onRepeatDataChange: (repeatData: RepeatDataState) => void;
};

const createRow = (
  group: RepeatGroup,
  parentIndex: number,
  rowIndex: number
): RepeatRow => ({
  id: `${group.id}-tree-${parentIndex}-row-${rowIndex}`,
  parentId: `${group.id}-tree-${parentIndex}`,
  index: rowIndex,
  values: Object.fromEntries(group.fields.map((field) => [field.id, ""])),
});

const ensureInitialRows = (
  group: RepeatGroup,
  rows: RepeatRow[] | undefined
) => {
  if (rows && rows.length > 0) return rows;

  return Array.from({ length: group.parentCount }, (_, parentIndex) =>
    Array.from({ length: group.initialRowsPerParent }, (_, rowIndex) =>
      createRow(group, parentIndex + 1, rowIndex + 1)
    )
  ).flat();
};

export default function RepeatMeasurementSection({
  group,
  repeatData,
  onRepeatDataChange,
}: RepeatMeasurementSectionProps) {
  const [open, setOpen] = useState(false);
  const rows = useMemo(
    () => ensureInitialRows(group, repeatData[group.id]),
    [group, repeatData]
  );

  const commitRows = (nextRows: RepeatRow[]) => {
    onRepeatDataChange({
      ...repeatData,
      [group.id]: nextRows,
    });
  };

  const updateValue = (rowId: string, fieldId: string, value: string) => {
    commitRows(
      rows.map((row) =>
        row.id === rowId
          ? { ...row, values: { ...row.values, [fieldId]: value } }
          : row
      )
    );
  };

  const addRow = (parentIndex: number) => {
    const parentId = `${group.id}-tree-${parentIndex}`;
    const parentRows = rows.filter((row) => row.parentId === parentId);
    if (parentRows.length >= group.maxRowsPerParent) return;

    commitRows([
      ...rows,
      createRow(group, parentIndex, parentRows.length + 1),
    ]);
  };

  return (
    <section className="rounded border bg-white">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
      >
        <span>
          <span className="font-bold text-gray-950">{group.label}</span>
          <span className="ml-2 text-sm text-gray-500">
            {rows.length}행 / 최대 {group.parentCount * group.maxRowsPerParent}행
          </span>
        </span>
        <span className="text-sm font-semibold text-blue-700">
          {open ? "접기" : "펼치기"}
        </span>
      </button>

      {open && (
        <div className="border-t p-4">
          <p className="mb-4 text-sm text-gray-600">{group.description}</p>
          <div className="space-y-5">
            {Array.from({ length: group.parentCount }, (_, index) => {
              const parentIndex = index + 1;
              const parentId = `${group.id}-tree-${parentIndex}`;
              const parentRows = rows.filter((row) => row.parentId === parentId);

              return (
                <div key={parentId} className="rounded border bg-gray-50 p-3">
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="font-semibold text-gray-900">
                      {group.parentLabel} {parentIndex}
                    </h3>
                    <button
                      type="button"
                      onClick={() => addRow(parentIndex)}
                      disabled={parentRows.length >= group.maxRowsPerParent}
                      className="rounded bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white disabled:bg-gray-300"
                    >
                      행 추가
                    </button>
                  </div>

                  <div className="space-y-3">
                    {parentRows.map((row) => (
                      <div
                        key={row.id}
                        className="grid gap-2 rounded border bg-white p-3 md:grid-cols-[110px_1fr]"
                      >
                        <div className="text-sm font-semibold text-gray-700">
                          {group.itemLabel} {row.index}
                        </div>
                        <div className="grid gap-2 md:grid-cols-2">
                          {group.fields.map((field) => (
                            <label key={field.id} className="text-sm">
                              <span className="font-medium text-gray-700">
                                {field.label}
                                {field.unit ? ` (${field.unit})` : ""}
                              </span>
                              <input
                                type={field.inputType === "number" ? "number" : "text"}
                                value={row.values[field.id] ?? ""}
                                onChange={(event) =>
                                  updateValue(row.id, field.id, event.target.value)
                                }
                                className="mt-1 w-full rounded border px-2 py-1.5 text-sm"
                              />
                            </label>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
