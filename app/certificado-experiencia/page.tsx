import type { Metadata } from "next";
import { ExperienceCertificateHub } from "@/components/credential/ExperienceCertificateHub";

export const metadata: Metadata = {
  title: "Certificado de experiencia laboral | ZOVIT",
  description:
    "Crea o verifica el certificado gratuito de experiencia laboral ZOVIT con identidad y trayectoria comprobables.",
};

export default function ExperienceCertificatePage() {
  return <ExperienceCertificateHub />;
}
