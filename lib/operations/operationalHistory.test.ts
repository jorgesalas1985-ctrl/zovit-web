import assert from "node:assert/strict";
import test from "node:test";

import { loadOperationalHistory } from "@/lib/operations/operationalHistory";

function queryResult(data: unknown[] | null, error: { message: string } | null = null) {
  return {
    select() {
      return this;
    },
    order() {
      return this;
    },
    limit() {
      return Promise.resolve({ data, error });
    },
  };
}

test("loads persisted operational history summaries", async () => {
  const supabase = {
    from(table: string) {
      if (table === "operational_snapshots") {
        return queryResult([
          {
            id: "snapshot-1",
            archive_key: "key-1",
            schema_version: "1.0.0",
            generated_at: "2026-12-31T10:00:00.000Z",
            cadence: "semester_close",
            health_status: "healthy",
            health_score: 100,
            total_profiles: 10,
            total_items: 0,
            critical_items: 0,
            blocked_actions: 0,
            retention_tier: "annual",
            should_persist: true,
          },
        ]);
      }

      return queryResult([
        {
          id: "close-1",
          year: 2026,
          semester: "S2",
          starts_at: "2026-08-01",
          ends_at: "2026-12-31",
          status: "ready",
          can_close: true,
          requires_superadmin_review: false,
          created_at: "2026-12-31T10:01:00.000Z",
        },
      ]);
    },
  };

  const history = await loadOperationalHistory(supabase as never);

  assert.equal(history.error, null);
  assert.equal(history.snapshotCount, 1);
  assert.equal(history.closeCount, 1);
  assert.equal(history.latestSnapshot?.healthScore, 100);
  assert.equal(history.latestClose?.semester, "S2");
});

test("returns controlled error when history tables are unavailable", async () => {
  const supabase = {
    from() {
      return queryResult(null, { message: "relation does not exist" });
    },
  };

  const history = await loadOperationalHistory(supabase as never);

  assert.equal(history.snapshotCount, 0);
  assert.equal(history.closeCount, 0);
  assert.match(history.error ?? "", /relation does not exist/);
});
