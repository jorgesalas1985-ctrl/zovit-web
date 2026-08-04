"use client";

import Link from "next/link";
import {
  BriefcaseBusiness,
  Building2,
  ClipboardCheck,
  CreditCard,
  GraduationCap,
  Landmark,
  MapPinned,
  ShieldCheck,
  UserCog,
} from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { getEcosystemNavigation } from "@/lib/ecosystem/navigation";

const ICONS = {
  "client-map": MapPinned,
  "client-requests": BriefcaseBusiness,
  "professional-jobs": BriefcaseBusiness,
  "professional-experience": ShieldCheck,
  "professional-verification": ClipboardCheck,
  "evaluator-intranet": ClipboardCheck,
  "admin-documents": UserCog,
  "superadmin-money": CreditCard,
  "superadmin-users": UserCog,
  "student-passport": GraduationCap,
  "company-tools": Building2,
  "institution-reports": Landmark,
} as const;

export function EcosystemAccessGrid() {
  const { profile } = useAuth();
  const items = getEcosystemNavigation(profile);

  if (!items.length) return null;

  return (
    <section className="panelSection compactSection">
      <div className="sectionHeading">
        <div>
          <p className="kicker">ECOSISTEMA ZOVIT</p>
          <h2>Accesos segun tu rol</h2>
        </div>
      </div>
      <div className="dashboardGrid">
        {items.map((item) => {
          const Icon = ICONS[item.id as keyof typeof ICONS] ?? ShieldCheck;
          return (
            <Link href={item.href} className="dashboardCard" key={item.id}>
              <div className="dashboardIcon">
                <Icon />
              </div>
              <div>
                <h3>{item.label}</h3>
                <p>{item.description}</p>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
