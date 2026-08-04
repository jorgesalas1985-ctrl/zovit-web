import type { SemesterCode } from "@/lib/operational/status";
import { getSemesterPeriod } from "@/lib/operational/status";

export type CloseableSemesterCode = Exclude<SemesterCode, "OUT_OF_SEMESTER">;

export type SemesterCloseTargetMode =
  | "active_semester"
  | "closing_window"
  | "out_of_semester";

export type SemesterCloseTarget = {
  mode: SemesterCloseTargetMode;
  year: number;
  semester: CloseableSemesterCode;
  startsAt: string;
  endsAt: string;
  shouldPrepareClose: boolean;
  summary: string;
};

export function resolveSemesterCloseTarget(now = new Date()): SemesterCloseTarget {
  const active = getSemesterPeriod(now);

  if (active.code === "S1" || active.code === "S2") {
    const daysUntilClose = active.endsAt
      ? daysBetween(dateOnly(now), active.endsAt)
      : Number.POSITIVE_INFINITY;

    return {
      mode: daysUntilClose <= 15 ? "closing_window" : "active_semester",
      year: active.year,
      semester: active.code,
      startsAt: active.startsAt ?? "",
      endsAt: active.endsAt ?? "",
      shouldPrepareClose: daysUntilClose <= 15,
      summary:
        daysUntilClose <= 15
          ? `Preparar cierre del semestre ${active.year}-${active.code}.`
          : `Monitorear semestre activo ${active.year}-${active.code}.`,
    };
  }

  const previous = previousCloseableSemester(now);

  return {
    mode: "out_of_semester",
    year: previous.year,
    semester: previous.semester,
    startsAt: previous.startsAt,
    endsAt: previous.endsAt,
    shouldPrepareClose: true,
    summary: `Periodo fuera de semestre: revisar cierre pendiente ${previous.year}-${previous.semester}.`,
  };
}

function previousCloseableSemester(date: Date): {
  year: number;
  semester: CloseableSemesterCode;
  startsAt: string;
  endsAt: string;
} {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;

  if (month <= 2) {
    return {
      year: year - 1,
      semester: "S2",
      startsAt: `${year - 1}-08-01`,
      endsAt: `${year - 1}-12-31`,
    };
  }

  return {
    year,
    semester: "S1",
    startsAt: `${year}-03-01`,
    endsAt: `${year}-07-31`,
  };
}

function dateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function daysBetween(from: string, to: string): number {
  const fromTime = Date.parse(`${from}T00:00:00.000Z`);
  const toTime = Date.parse(`${to}T00:00:00.000Z`);

  return Math.ceil((toTime - fromTime) / 86_400_000);
}
