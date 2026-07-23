"use client";

import type { RecommendedProfessional } from "@/lib/ai/types";
import { IdentityBadge } from "@/components/verification/IdentityBadge";
import { ScanFace } from "lucide-react";

type Props = Pick<RecommendedProfessional, "identityVerified" | "biometricVerified">;

export function ProfessionalTrustBadges({ identityVerified, biometricVerified }: Props) {
  if (!identityVerified && !biometricVerified) return null;

  return (
    <div className="browseProfessionalBadges">
      {biometricVerified && (
        <span className="identityBadge identityBadge--biometric">
          <ScanFace size={14} /> Biometría validada
        </span>
      )}
      {identityVerified && <IdentityBadge verified role="professional" compact />}
    </div>
  );
}
