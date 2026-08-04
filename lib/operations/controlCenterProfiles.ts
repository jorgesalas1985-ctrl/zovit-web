import { buildDigitalPassport, type PassportProfileInput } from "@/lib/passport/buildPassport";
import type { ControlCenterProfileQueue } from "@/lib/operations/controlCenter";

export type ControlCenterProfileInput = PassportProfileInput;

export function buildControlCenterProfileQueue(
  profile: ControlCenterProfileInput,
): ControlCenterProfileQueue {
  const passport = buildDigitalPassport(profile);

  return {
    profileId: passport.owner.id,
    displayName: passport.owner.displayName,
    queue: passport.reviewQueuePreview,
  };
}

export function buildControlCenterProfileQueues(
  profiles: ControlCenterProfileInput[],
): ControlCenterProfileQueue[] {
  return profiles.map(buildControlCenterProfileQueue);
}
