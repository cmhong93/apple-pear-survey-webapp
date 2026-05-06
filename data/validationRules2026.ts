import type { HandoffValidationRule } from "@/types/survey";
import rawValidationRules from "./validation-rules-2026.json";

type ValidationRulesArtifact = {
  metadata?: {
    ruleCounts?: {
      error?: number;
      warning?: number;
      info?: number;
      admin_review?: number;
    };
  };
  rules?: HandoffValidationRule[];
};

const artifact = rawValidationRules as ValidationRulesArtifact;

export const handoffValidationRuleCounts = {
  error: artifact.metadata?.ruleCounts?.error ?? 0,
  warning: artifact.metadata?.ruleCounts?.warning ?? 0,
  info: artifact.metadata?.ruleCounts?.info ?? 0,
  admin_review: artifact.metadata?.ruleCounts?.admin_review ?? 0,
} as const;

export const handoffValidationRules =
  artifact.rules ?? ([] satisfies HandoffValidationRule[]);
