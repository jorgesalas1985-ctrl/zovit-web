import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildControlCenter } from "./controlCenter";
import type { ReviewQueueDecision } from "./reviewQueue";

const emptyQueue: ReviewQueueDecision = {
  items: [],
  highestPriority: null,
  requiresHumanAction: false,
  summary: "Sin pendientes.",
};

describe("control center", () => {
  it("returns empty metrics when no profiles have pending work", () => {
    const decision = buildControlCenter({
      profiles: [
        {
          profileId: "profile-1",
          displayName: "Persona Uno",
          queue: emptyQueue,
        },
      ],
    });

    assert.equal(decision.totalProfiles, 1);
    assert.equal(decision.totalItems, 0);
    assert.equal(decision.highestPriority, null);
    assert.equal(decision.priorityMetrics.critical, 0);
  });

  it("aggregates metrics across profiles", () => {
    const decision = buildControlCenter({
      profiles: [
        {
          profileId: "profile-1",
          displayName: "Persona Uno",
          queue: {
            ...emptyQueue,
            items: [
              {
                id: "profile-1:document-renewal",
                type: "document_renewal",
                priority: "low",
                title: "Renovacion",
                summary: "Pendiente.",
                requiresHumanAction: false,
                dueAt: "2026-12-31",
              },
            ],
          },
        },
        {
          profileId: "profile-2",
          displayName: "Persona Dos",
          queue: {
            ...emptyQueue,
            items: [
              {
                id: "profile-2:manual-document-review",
                type: "manual_document_review",
                priority: "high",
                title: "Revision",
                summary: "Pendiente.",
                requiresHumanAction: true,
                dueAt: "2026-09-01",
              },
            ],
          },
        },
      ],
    });

    assert.equal(decision.totalProfiles, 2);
    assert.equal(decision.totalItems, 2);
    assert.equal(decision.requiresHumanAction, 1);
    assert.equal(decision.priorityMetrics.high, 1);
    assert.equal(decision.typeMetrics.manual_document_review, 1);
  });

  it("prioritizes critical items in the top list", () => {
    const decision = buildControlCenter({
      profiles: [
        {
          profileId: "profile-1",
          displayName: "Persona Uno",
          queue: {
            ...emptyQueue,
            items: [
              {
                id: "profile-1:second-review",
                type: "second_review",
                priority: "high",
                title: "Segunda revision",
                summary: "Pendiente.",
                requiresHumanAction: true,
                dueAt: null,
              },
            ],
          },
        },
        {
          profileId: "profile-2",
          displayName: "Persona Dos",
          queue: {
            ...emptyQueue,
            items: [
              {
                id: "profile-2:account-suspension",
                type: "account_suspension",
                priority: "critical",
                title: "Suspension",
                summary: "Critico.",
                requiresHumanAction: true,
                dueAt: "2026-08-01",
              },
            ],
          },
        },
      ],
    });

    assert.equal(decision.highestPriority, "critical");
    assert.equal(decision.topItems[0]?.type, "account_suspension");
  });
});
