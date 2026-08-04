import { buildOperationalActionPlan, type OperationalActionPlan } from "@/lib/operations/actionPlan";
import { buildOperationalAuditTrail, type OperationalAuditTrail } from "@/lib/operations/auditTrail";
import { buildControlCenter, type ControlCenterDecision } from "@/lib/operations/controlCenter";
import {
  buildControlCenterProfileQueues,
  type ControlCenterProfileInput,
} from "@/lib/operations/controlCenterProfiles";
import { decideExecutionPolicy, type ExecutionPolicyDecision } from "@/lib/operations/executionPolicy";
import {
  buildExecutiveRecommendations,
  type ExecutiveRecommendationDecision,
} from "@/lib/operations/executiveRecommendations";
import { buildOperationalHealthPulse, type OperationalHealthPulse } from "@/lib/operations/healthPulse";

export const OPERATIONAL_SNAPSHOT_SCHEMA_VERSION = "1.0.0";
export const OPERATIONAL_SNAPSHOT_SCHEMA_NAME = "zovit.operational_snapshot";

export type OperationalSnapshotSource = "in_memory_profiles" | "persisted_snapshot";

export type OperationalSnapshotMetadata = {
  schemaName: typeof OPERATIONAL_SNAPSHOT_SCHEMA_NAME;
  schemaVersion: typeof OPERATIONAL_SNAPSHOT_SCHEMA_VERSION;
  source: OperationalSnapshotSource;
};

export type OperationalSnapshot = {
  metadata: OperationalSnapshotMetadata;
  generatedAt: string;
  controlCenter: ControlCenterDecision;
  actionPlan: OperationalActionPlan;
  executionPolicy: ExecutionPolicyDecision;
  auditTrail: OperationalAuditTrail;
  healthPulse: OperationalHealthPulse;
  executiveRecommendations: ExecutiveRecommendationDecision;
};

export function buildOperationalSnapshot(input: {
  profiles: ControlCenterProfileInput[];
  generatedAt?: Date;
  source?: OperationalSnapshotSource;
  topItemLimit?: number;
  recommendationLimit?: number;
}): OperationalSnapshot {
  const controlCenter = buildControlCenter({
    profiles: buildControlCenterProfileQueues(input.profiles),
    topItemLimit: input.topItemLimit,
  });
  const actionPlan = buildOperationalActionPlan({
    items: controlCenter.topItems,
  });
  const executionPolicy = decideExecutionPolicy({
    plan: actionPlan,
  });
  const auditTrail = buildOperationalAuditTrail({
    policy: executionPolicy,
    now: input.generatedAt,
  });
  const healthPulse = buildOperationalHealthPulse({
    controlCenter,
    executionPolicy,
    auditTrail,
  });
  const executiveRecommendations = buildExecutiveRecommendations({
    controlCenter,
    executionPolicy,
    healthPulse,
    limit: input.recommendationLimit,
  });

  return {
    metadata: {
      schemaName: OPERATIONAL_SNAPSHOT_SCHEMA_NAME,
      schemaVersion: OPERATIONAL_SNAPSHOT_SCHEMA_VERSION,
      source: input.source ?? "in_memory_profiles",
    },
    generatedAt: (input.generatedAt ?? new Date()).toISOString(),
    controlCenter,
    actionPlan,
    executionPolicy,
    auditTrail,
    healthPulse,
    executiveRecommendations,
  };
}
