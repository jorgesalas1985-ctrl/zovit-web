import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildOperationalTrendReport } from "./trendReport";
import type { OperationalSnapshotComparison } from "./snapshotComparison";

const comparison: OperationalSnapshotComparison = {
  trend: "stable",
  score: { previous: 90, current: 90, delta: 0 },
  totalItems: { previous: 0, current: 0, delta: 0 },
  humanActions: { previous: 0, current: 0, delta: 0 },
  blockedActions: { previous: 0, current: 0, delta: 0 },
  criticalItems: { previous: 0, current: 0, delta: 0 },
  summary: "El estado operacional se mantiene estable.",
};

describe("operational trend report", () => {
  it("builds a stable report", () => {
    const report = buildOperationalTrendReport(comparison);

    assert.equal(report.title, "Operacion estable");
    assert.equal(report.highlights.every((item) => item.severity === "neutral"), true);
    assert.equal(report.recommendedFocus.includes("Mantener monitoreo"), true);
  });

  it("marks score improvement as positive", () => {
    const report = buildOperationalTrendReport({
      ...comparison,
      trend: "improved",
      score: { previous: 70, current: 90, delta: 20 },
      totalItems: { previous: 5, current: 1, delta: -4 },
      summary: "El estado operacional mejoro 20 puntos.",
    });

    assert.equal(report.title, "Mejora operacional");
    assert.equal(report.highlights[0]?.severity, "positive");
    assert.equal(report.highlights[1]?.severity, "positive");
  });

  it("focuses on blocked actions when they increase", () => {
    const report = buildOperationalTrendReport({
      ...comparison,
      trend: "worsened",
      score: { previous: 90, current: 40, delta: -50 },
      blockedActions: { previous: 0, current: 2, delta: 2 },
      summary: "El estado operacional empeoro 50 puntos.",
    });

    assert.equal(report.title, "Deterioro operacional");
    assert.equal(report.highlights[3]?.severity, "warning");
    assert.equal(report.recommendedFocus.includes("acciones bloqueadas"), true);
  });
});
