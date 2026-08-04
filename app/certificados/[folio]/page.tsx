import { IssuedCertificateClient } from "@/components/certificates/IssuedCertificateClient";
import type { CertificateSnapshot, PublicIssuedCertificate } from "@/lib/certificates/types";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

type PageProps = {
  params: Promise<{ folio: string }>;
};

function asCertificate(row: Record<string, unknown>): PublicIssuedCertificate {
  return {
    folio: String(row.folio),
    certificate_type: "experiencia_profesional",
    title: String(row.title),
    holder_full_name: String(row.holder_full_name),
    holder_rut_masked: (row.holder_rut_masked as string | null) ?? null,
    status: row.status as PublicIssuedCertificate["status"],
    issued_at: String(row.issued_at),
    revoked_at: (row.revoked_at as string | null) ?? null,
    revoke_reason: (row.revoke_reason as string | null) ?? null,
    snapshot: (row.snapshot as CertificateSnapshot) ?? {
      experienceLevel: "junior",
      completedJobs: 0,
      totalHours: 0,
      averageRating: 0,
      ratingCount: 0,
      identityVerified: false,
      biometricVerified: false,
      studyVerified: false,
      topCategories: [],
      issuedBy: "ZOVIT",
      schemaVersion: 1,
    },
    billing_status: (row.billing_status as PublicIssuedCertificate["billing_status"]) ?? "free",
    profile_id: String(row.profile_id),
  };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { folio } = await params;
  const supabase = await createClient();
  const { data } = await supabase.rpc("get_public_issued_certificate", {
    p_folio: decodeURIComponent(folio),
  });
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) {
    return { title: "Certificado no encontrado · ZOVIT" };
  }
  return {
    title: `Certificado ${row.folio} · ${row.holder_full_name}`,
    description: "Valida un certificado de experiencia profesional emitido por ZOVIT.",
    robots: { index: false, follow: true },
  };
}

export default async function PublicCertificatePage({ params }: PageProps) {
  const { folio } = await params;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_public_issued_certificate", {
    p_folio: decodeURIComponent(folio),
  });
  const row = Array.isArray(data) ? data[0] : data;

  if (error || !row) {
    notFound();
  }

  const certificate = asCertificate(row as Record<string, unknown>);

  let defaultPhone: string | null = null;
  try {
    const admin = createAdminClient();
    const { data: owner } = await admin
      .from("profiles")
      .select("phone")
      .eq("id", certificate.profile_id)
      .maybeSingle();
    defaultPhone = owner?.phone ?? null;
  } catch {
    defaultPhone = null;
  }

  return (
    <main className="simplePage issuedCertShell">
      <section className="issuedCertIntro no-print">
        <p className="kicker">VALIDACIÓN PÚBLICA</p>
        <h1>Verificación de certificado ZOVIT</h1>
        <p className="muted">
          Este folio corresponde a un certificado emitido por ZOVIT. Compara el ID impreso con el
          que aparece abajo.
        </p>
        <p>
          Estado:{" "}
          <strong>
            {certificate.status === "active"
              ? "Vigente"
              : certificate.status === "revoked"
                ? "Revocado"
                : "Reemplazado"}
          </strong>
        </p>
      </section>

      <IssuedCertificateClient certificate={certificate} defaultPhone={defaultPhone} />

      <p className="muted no-print" style={{ textAlign: "center" }}>
        <Link href="/certificados/validar" className="textLink">
          Validar otro certificado
        </Link>
        {" · "}
        <Link href={`/credencial/${certificate.profile_id}`} className="textLink">
          Ver credencial viva del profesional
        </Link>
      </p>
    </main>
  );
}
