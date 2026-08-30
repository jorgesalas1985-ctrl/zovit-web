"use client";

import { credentialAvatarCandidates } from "@/lib/credential/avatarUrl";
import { supabase } from "@/lib/supabase";
import { UserRound } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type CredentialAvatarProps = {
  profileId: string;
  avatarUrl: string | null;
  name: string;
};

export function CredentialAvatar({ profileId, avatarUrl, name }: CredentialAvatarProps) {
  const publicCandidates = useMemo(
    () => credentialAvatarCandidates(profileId, avatarUrl),
    [profileId, avatarUrl],
  );
  const [candidates, setCandidates] = useState(publicCandidates);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setIndex(0);
    setCandidates(publicCandidates);

    // La foto puede estar en un bucket privado. Agregamos enlaces firmados
    // como respaldo para que no desaparezca al fallar el enlace público.
    void Promise.all(
      ["jpg", "jpeg", "png", "webp"].map(async (extension) => {
        const { data } = await supabase.storage
          .from("profile-avatars")
          .createSignedUrl(`${profileId}/avatar.${extension}`, 60 * 60);
        return data?.signedUrl ?? "";
      }),
    ).then((signedUrls) => {
      if (cancelled) return;
      setCandidates((current) => [...new Set([...current, ...signedUrls.filter(Boolean)])]);
    });

    return () => { cancelled = true; };
  }, [profileId, publicCandidates]);

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
