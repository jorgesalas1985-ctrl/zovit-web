import { supabase } from "@/lib/supabase";

const AVATAR_BUCKET = "profile-avatars";
const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export function validateProfileAvatar(file: File): string | null {
  if (!ALLOWED_TYPES.has(file.type)) {
    return "Usa una imagen JPG, PNG o WebP.";
  }

  if (file.size > MAX_BYTES) {
    return "La imagen no puede superar 5 MB.";
  }

  return null;
}

function avatarExtension(file: File): string {
  if (file.type === "image/png") return "png";
  if (file.type === "image/webp") return "webp";
  return "jpg";
}

export async function uploadProfileAvatar(userId: string, file: File): Promise<string> {
  const validationError = validateProfileAvatar(file);
  if (validationError) throw new Error(validationError);

  const path = `${userId}/avatar.${avatarExtension(file)}`;

  const { error: uploadError } = await supabase.storage
    .from(AVATAR_BUCKET)
    .upload(path, file, { contentType: file.type, upsert: true });

  if (uploadError) throw new Error(uploadError.message);

  const { data } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(path);
  const publicUrl = `${data.publicUrl}?v=${Date.now()}`;

  await updateProfileAvatarUrl(userId, publicUrl);
  return publicUrl;
}

export async function updateProfileAvatarUrl(userId: string, avatarUrl: string): Promise<void> {
  const { error } = await supabase
    .from("profiles")
    .update({ avatar_url: avatarUrl, updated_at: new Date().toISOString() })
    .eq("id", userId);

  if (error) throw new Error(error.message);
}
