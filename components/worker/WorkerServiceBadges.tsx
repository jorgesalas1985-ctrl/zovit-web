"use client";

import { PUBLIC_BADGE_LABELS } from "@/lib/worker/profiles";
import type { PublicWorkerBadge, ServiceProfileType } from "@/lib/worker/types";
import {
  Award,
  BadgeCheck,
  GraduationCap,
  HandHeart,
  ShieldCheck,
  Sparkles,
  Star,
} from "lucide-react";

type Props = {
  identityVerified?: boolean;
  badges?: PublicWorkerBadge[];
  primaryProfile?: ServiceProfileType | null;
  jobsCompleted?: number | null;
  avgRating?: number | null;
  fulfillmentRate?: number | null;
};

const ICONS: Partial<Record<PublicWorkerBadge, typeof ShieldCheck>> = {
  identity_verified: ShieldCheck,
  background_reviewed: BadgeCheck,
  title_verified: Award,
  certification_verified: Award,
  license_valid: Award,
  experience_proven: Star,
  student_active: GraduationCap,
  in_training: GraduationCap,
  community_collaborator: HandHeart,
  zovit_featured: Sparkles,
};

export function WorkerServiceBadges({
  identityVerified,
  badges = [],
  primaryProfile,
  jobsCompleted,
  avgRating,
  fulfillmentRate,
}: Props) {
  const resolved = new Set<PublicWorkerBadge>(badges);

  if (identityVerified) resolved.add("identity_verified");
  if (primaryProfile === "community_collaborator") resolved.add("community_collaborator");
  if (primaryProfile === "in_training") resolved.add("in_training");
  if (primaryProfile === "experience_verified") resolved.add("experience_proven");
  if (primaryProfile === "certified") resolved.add("certification_verified");

  const items: Array<{ key: string; label: string; Icon: typeof ShieldCheck }> = [];

  for (const key of resolved) {
    if (key === "jobs_completed" || key === "avg_rating" || key === "fulfillment_rate") continue;
    items.push({
      key,
      label: PUBLIC_BADGE_LABELS[key],
      Icon: ICONS[key] ?? BadgeCheck,
    });
  }

  if (typeof jobsCompleted === "number" && jobsCompleted > 0) {
    items.push({
      key: "jobs_completed",
      label: `${jobsCompleted} trabajos completados`,
      Icon: Star,
    });
  }
  if (typeof avgRating === "number" && avgRating > 0) {
    items.push({
      key: "avg_rating",
      label: `${avgRating.toFixed(1)} calificación`,
      Icon: Star,
    });
  }
  if (typeof fulfillmentRate === "number" && fulfillmentRate > 0) {
    items.push({
      key: "fulfillment_rate",
      label: `${Math.round(fulfillmentRate)}% cumplimiento`,
      Icon: BadgeCheck,
    });
  }

  if (!items.length) return null;

  return (
    <div className="workerPublicBadges" aria-label="Distintivos del profesional">
      {items.map(({ key, label, Icon }) => (
        <span key={key} className="workerPublicBadge">
          <Icon size={14} aria-hidden />
          {label}
        </span>
      ))}
    </div>
  );
}
