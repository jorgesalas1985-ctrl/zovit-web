import assert from "node:assert/strict";
import test from "node:test";

import { buildCurrentSemesterClosePreview } from "@/lib/operations/currentSemesterClosePreview";
import type { ControlCenterProfileInput } from "@/lib/operations/controlCenterProfiles";

const cleanProfile: ControlCenterProfileInput = {
  id: "profile-1",
  first_name: "Perfil",
  last_name: "Limpio",
  role: "professional",
  intranet_role: null,
  identity_status: "approved",
  identity_verified: true,
  biometric_verified: true,
  worker_registration_status: "verified",
  primary_service_profile: null,
};

test("builds current close preview from current operational snapshot", () => {
  const preview = buildCurrentSemesterClosePreview({
    now: new Date("2026-12-20T12:00:00.000Z"),
    profiles: [cleanProfile],
    cadence: "semester_close",
  });

  assert.equal(preview.generatedFrom, "current_snapshot_preview");
  assert.equal(preview.target.mode, "closing_window");
  assert.equal(preview.summary.semester.code, "S2");
  assert.equal(preview.summary.totalSnapshots, 1);
  assert.equal(preview.decision.status, "ready");
  assert.equal(preview.report.title, "Cierre operacional 2026-S2");
  assert.equal(preview.manifest.retentionTier, "annual");
});

test("marks preview as blocked when current snapshot has critical operational risk", () => {
  const preview = buildCurrentSemesterClosePreview({
    now: new Date("2026-07-25T12:00:00.000Z"),
    profiles: [
      {
        ...cleanProfile,
        id: "profile-2",
        first_name: "Perfil",
        last_name: "Vencido",
        worker_registration_status: "document_expired",
      },
    ],
  });

  assert.equal(preview.target.mode, "closing_window");
  assert.equal(preview.snapshot.controlCenter.priorityMetrics.critical, 1);
  assert.equal(preview.decision.status, "blocked");
  assert.equal(
    preview.operationalRecommendation,
    "Priorizar correcciones criticas antes de cerrar el semestre.",
  );
});
