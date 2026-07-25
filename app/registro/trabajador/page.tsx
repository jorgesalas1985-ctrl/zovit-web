import type { Metadata } from "next";
import { WorkerOnboardingWizard } from "@/components/worker/WorkerOnboardingWizard";

export const metadata: Metadata = {
  title: "Registro de trabajador | ZOVIT",
  description:
    "Cuéntanos tu formación, experiencia y los servicios que deseas ofrecer para construir un perfil confiable en ZOVIT.",
};

export default function WorkerRegistrationPage() {
  return (
    <main className="simplePage">
      <WorkerOnboardingWizard requireAuth />
    </main>
  );
}
