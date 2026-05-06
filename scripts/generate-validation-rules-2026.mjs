import fs from "node:fs";

const source = JSON.parse(
  fs.readFileSync("_handoff/validation-rules.json", "utf8").replace(/^\uFEFF/, "")
);

const keys = [
  "ruleId",
  "tabId",
  "fieldId",
  "label",
  "inputType",
  "unit",
  "level",
  "ruleType",
  "messageForEnumerator",
  "allowedOptions",
  "min",
  "max",
  "warningMin",
  "warningMax",
  "relatedFields",
  "blocksSubmit",
  "needsReview",
];

const rules = source.rules.map((rule) =>
  Object.fromEntries(keys.map((key) => [key, rule[key] ?? null]))
);

const output = `import type { HandoffValidationRule } from "@/types/survey";

export const handoffValidationRuleCounts = ${JSON.stringify(
  source.metadata.ruleCounts,
  null,
  2
)} as const;

export const handoffValidationRules = ${JSON.stringify(
  rules,
  null,
  2
)} satisfies HandoffValidationRule[];
`;

fs.writeFileSync("data/validationRules2026.ts", output, "utf8");
console.log(`generated rules: ${rules.length}`);
