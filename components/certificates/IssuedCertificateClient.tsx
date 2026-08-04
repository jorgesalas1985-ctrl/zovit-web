"use client";

import { IssuedCertificateDocument } from "@/components/certificates/IssuedCertificateDocument";
import type { PublicIssuedCertificate } from "@/lib/certificates/types";
import { Suspense } from "react";

export function IssuedCertificateClient({
  certificate,
  defaultPhone = null,
}: {
  certificate: PublicIssuedCertificate;
  defaultPhone?: string | null;
}) {
  return (
    <Suspense fallback={<p className="muted">Cargando certificado…</p>}>
      <IssuedCertificateDocument certificate={certificate} defaultPhone={defaultPhone} />
    </Suspense>
  );
}
