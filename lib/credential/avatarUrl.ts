/** Candidatos públicos de foto de perfil para la credencial. */
export function credentialAvatarCandidates(
  profileId: string,
  avatarUrl: string | null | undefined,
): string[] {
  const seen = new Set<string>();
  const out: string[] = [];

  const push = (url: string | null | undefined) => {
    const value = (url ?? "").trim();
    if (!value || seen.has(value)) return;
    seen.add(value);
    out.push(value);
  };

  push(avatarUrl);

  const base = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\/$/, "");
  if (base) {
    for (const ext of ["jpg", "jpeg", "png", "webp"]) {
      push(`${base}/storage/v1/object/public/profile-avatars/${profileId}/avatar.${ext}`);
    }
  }

  return out;
}
