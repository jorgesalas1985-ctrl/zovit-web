export type CertificateType = "experiencia_profesional";
export type CertificateStatus = "active" | "revoked" | "replaced";
export type CertificateBillingStatus = "free" | "pending" | "paid" | "waived";

export type CertificateSnapshot = {
  experienceLevel: string;
  completedJobs: number;
  totalHours: number;
  averageRating: number;
  ratingCount: number;
  identityVerified: boolean;
  biometricVerified: boolean;
  studyVerified: boolean;
  topCategories: string[];
  issuedBy: "ZOVIT";
  schemaVersion: 1;
};

export type IssuedCertificate = {
  id: string;
  folio: string;
  profile_id: string;
  certificate_type: CertificateType;
  title: string;
  holder_full_name: string;
  holder_rut_masked: string | null;
  status: CertificateStatus;
  issued_at: string;
  revoked_at: string | null;
  revoke_reason: string | null;
  snapshot: CertificateSnapshot;
  price_clp: number;
  billing_status: CertificateBillingStatus;
};

export type PublicIssuedCertificate = {
  folio: string;
  certificate_type: CertificateType;
  title: string;
  holder_full_name: string;
  holder_rut_masked: string | null;
  status: CertificateStatus;
  issued_at: string;
  revoked_at: string | null;
  revoke_reason: string | null;
  snapshot: CertificateSnapshot;
  billing_status: CertificateBillingStatus;
  profile_id: string;
};
