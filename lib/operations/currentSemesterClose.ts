import type { OperationalSnapshotManifest } from "@/lib/operations/snapshotManifest";
import {
  buildSemesterClosePackage,
  type SemesterClosePackage,
} from "@/lib/operations/semesterClosePackage";
import {
  resolveSemesterCloseTarget,
  type SemesterCloseTarget,
} from "@/lib/operations/semesterCloseTarget";

export type CurrentSemesterClose = SemesterClosePackage & {
  target: SemesterCloseTarget;
  operationalRecommendation: string;
};

export function buildCurrentSemesterClose(input: {
  manifests: OperationalSnapshotManifest[];
  now?: Date;
}): CurrentSemesterClose {
  const target = resolveSemesterCloseTarget(input.now);
  const closePackage = buildSemesterClosePackage({
    manifests: input.manifests,
    year: target.year,
    semester: target.semester,
  });

  return {
    target,
    ...closePackage,
    operationalRecommendation: recommendationFromTarget(target, closePackage),
  };
}

function recommendationFromTarget(
  target: SemesterCloseTarget,
  closePackage: SemesterClosePackage,
): string {
  if (target.mode === "active_semester" && !target.shouldPrepareClose) {
    return "Mantener monitoreo operacional; el cierre formal aun no debe iniciarse.";
  }

  if (closePackage.decision.status === "blocked") {
    return "Priorizar correcciones criticas antes de cerrar el semestre.";
  }

  if (closePackage.decision.status === "insufficient_data") {
    return "Generar snapshots historicos antes de tomar decision de cierre.";
  }

  if (closePackage.decision.status === "ready_with_observations") {
    return "Preparar cierre con observaciones y respaldo ejecutivo.";
  }

  return "Preparar cierre formal del semestre con reporte ejecutivo.";
}
