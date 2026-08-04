"use client";

import { credentialAvatarCandidates } from "@/lib/credential/avatarUrl";
import { UserRound } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type CredentialAvatarProps = {
  profileId: string;
  avatarUrl: string | null;
  name: string;
};

export function CredentialAvatar({ profileId, avatarUrl, name }: CredentialAvatarProps) {
  const candidates = useMemo(
    () => credentialAvatarCandidates(profileId, avatarUrl),
    [profileId, avatarUrl],
  );
  const [index, setIndex] = useState(0);

  const candidatesKey = candidates.join("|");
  useEffect(() => {
    setIndex(0);
  }, [candidatesKey]);

  const src = candidates[index] ?? null;

  return (
    <div className="credentialPhotoWrap" aria-label={`Foto de ${name}`}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={`Foto de perfil de ${name}`}
          className="credentialPhoto"
          width={128}
          height={128}
          onError={() => setIndex((current) => current + 1)}
        />
      ) : (
        <div className="credentialPhotoPlaceholder">
          <UserRound size={48} strokeWidth={1.5} />
        </div>
      )}
    </div>
  );
}
