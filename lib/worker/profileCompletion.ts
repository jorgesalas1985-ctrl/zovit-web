import { DOCUMENT_KIND_LABELS } from "@/lib/worker/documentKind";
import { resolveRequiredDocumentKinds } from "@/lib/worker/requiredDocuments";
import type { WorkerFieldId, ValidationIssue } from "@/lib/worker/validate";
import { getMissingDocumentIssue, getRegistrationFormIssue } from "@/lib/worker/validate";
import type { WorkerRegistrationDraft } from "@/lib/worker/types";

export const FORM_COMPLETION_WEIGHT = 86;
export const DOCUMENT_COMPLETION_WEIGHT = 14;

export type ProfileCompletionItemStatus = "complete" | "pending" | "locked" | "error";

export type ProfileCompletionItem = {
  id: "form" | "documents" | "certificate";
  title: string;
  status: ProfileCompletionItemStatus;
  description: string;
  actionLabel?: string;
};

export type ProfileCompletionTarget = {
  fieldId: WorkerFieldId;
  step: number;
  message: string;
};

export type WorkerProfileCompletion = {
  percent: number;
  remainingPercent: number;
  formComplete: boolean;
  documentsComplete: boolean;
  certificateUnlocked: boolean;
  missingDocumentLabel: string;
  target: ProfileCompletionTarget | null;
  items: ProfileCompletionItem[];
  warning: string;
};

export type DocumentComplianceSnapshot = {
  status?: string;
  missingKinds?: string[];
  pendingKinds?: string[];
  rejectedKinds?: string[];
  expiredKinds?: string[];
  nextStep?: "none" | "upload_documents" | "wait_review" | "replace_documents";
  actionLabel?: string;
};

const FORM_UNITS = 6;

function countCompleteFormUnits(draft: WorkerRegistrationDraft): number {
  const issue = getRegistrationFormIssue(draft);
  if (!issue) return FORM_UNITS;

  if (issue.step <= 1) return 0;
  if (issue.step === 2) return 1;
  if (issue.step === 3) return 2;
  if (issue.step === 4) return 3;
  if (issue.step === 5) return 4;
  return 5;
}

function documentIssueToTarget(issue: ValidationIssue | null): ProfileCompletionTarget | null {
  if (!issue) return null;
  return {
    fieldId: issue.fieldId,
    step: issue.step,
    message: issue.message,
  };
}

function firstMissingKindLabel(kinds: string[] | undefined): string {
  const kind = kinds?.[0];
  if (!kind) return DOCUMENT_KIND_LABELS.student_enrollment;
  return DOCUMENT_KIND_LABELS[kind as keyof typeof DOCUMENT_KIND_LABELS] ?? kind;
}

export function buildWorkerProfileCompletion(input: {
  draft: WorkerRegistrationDraft;
  isStudent?: boolean;
  documentCompliance?: DocumentComplianceSnapshot | null;
  documentComplianceError?: string;
}): WorkerProfileCompletion {
  const formIssue = getRegistrationFormIssue(input.draft);
  const documentIssue = getMissingDocumentIssue(input.draft);
  const formComplete = !formIssue;
  const draftDocumentsComplete = !documentIssue;
  const compliance = input.documentCompliance;
  const requiredKinds = resolveRequiredDocumentKinds({
    accountKind: input.isStudent ? "student" : null,
    draft: input.draft,
  });
  const blockingKinds = [
    ...(compliance?.rejectedKinds ?? []),
    ...(compliance?.expiredKinds ?? []),
  ];
  const hasRejectedRequired = blockingKinds.some((kind) =>
    requiredKinds.includes(kind as (typeof requiredKinds)[number]),
  );
  const documentsComplete = draftDocumentsComplete && !hasRejectedRequired;

  const formUnits = countCompleteFormUnits(input.draft);
  const formPercent = Math.round((formUnits / FORM_UNITS) * FORM_COMPLETION_WEIGHT);
  const documentPercent = documentsComplete ? DOCUMENT_COMPLETION_WEIGHT : 0;
  const percent = Math.min(100, formPercent + documentPercent);
  const remainingPercent = Math.max(0, 100 - percent);
  const certificateUnlocked = percent === 100;
  const missingDocumentLabel = documentIssue
    ? documentIssue.fieldId === "training.enrollment"
      ? DOCUMENT_KIND_LABELS.student_enrollment
      : DOCUMENT_KIND_LABELS.credential
    : firstMissingKindLabel(compliance?.missingKinds?.length ? compliance.missingKinds : requiredKinds);

  const target = documentIssueToTarget(documentIssue) ??
    (documentsComplete
      ? null
      : {
          fieldId: input.isStudent || requiredKinds.includes("student_enrollment")
            ? ("training.enrollment" as const)
            : ("credentials.document" as const),
          step: 3,
          message: `Sube el ${missingDocumentLabel.toLowerCase()} para completar tu perfil.`,
        });

  const documentDescription = documentsComplete
    ? compliance?.nextStep === "wait_review"
      ? "Tus documentos están en revisión. El certificado se habilita al validarlos."
      : "Documentos de respaldo cargados."
    : input.documentComplianceError
      ? `No pudimos confirmar el estado documental. ${target?.message ?? "Revisa y sube el documento faltante."}`
      : `Te falta ${missingDocumentLabel}. Al pulsar Revisar documentos irás directo a subirlo.`;

  const items: ProfileCompletionItem[] = [
    {
      id: "form",
      title: "Formulario de registro",
      status: formComplete ? "complete" : "pending",
      description: formComplete
        ? "Datos personales, participación, servicios y disponibilidad listos."
        : formIssue?.message ?? "Completa los pasos del formulario.",
    },
    {
      id: "documents",
      title: "Revisión de documentos",
      status: documentsComplete ? "complete" : input.documentComplianceError ? "error" : "pending",
      description: documentDescription,
      actionLabel: documentsComplete ? undefined : "Revisar documentos",
    },
    {
      id: "certificate",
      title: "Certificado",
      status: certificateUnlocked ? "complete" : "locked",
      description: certificateUnlocked
        ? "Ya puedes emitir o revisar tu certificado ZOVIT."
        : "Se habilitará automáticamente al completar los requisitos.",
    },
  ];

  const warning = documentsComplete
    ? ""
    : `Debes subir el ${missingDocumentLabel.toLowerCase()} dentro del plazo indicado. Si no lo haces, tu cuenta quedará suspendida y no podrás realizar trabajos.`;

  return {
    percent,
    remainingPercent,
    formComplete,
    documentsComplete,
    certificateUnlocked,
    missingDocumentLabel,
    target,
    items,
    warning,
  };
}
