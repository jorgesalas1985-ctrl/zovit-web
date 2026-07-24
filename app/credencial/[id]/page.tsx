import { ZovitCredentialCard } from "@/components/credential/ZovitCredentialCard";
import type { PublicCredentialProfile } from "@/lib/credential/types";
import { createClient } from "@/lib/supabase/server";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

type PageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();

  const { data } = await supabase.rpc("get_public_credential", { p_profile_id: id });
  const row = Array.isArray(data) ? data[0] : data;

  const fullName = row
    ? [row.first_name, row.last_name].filter(Boolean).join(" ") || "Usuario ZOVIT"
    : "Credencial ZOVIT";

  return {
    title: `${fullName} · Credencial ZOVIT`,
    description: "Verifica la identidad y credenciales de un usuario registrado en ZOVIT.",
    openGraph: {
      title: `${fullName} · Credencial ZOVIT`,
      description: "Credencial verificable con código QR · ZOVIT",
      type: "profile",
    },
  };
}

export default async function PublicCredentialPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("get_public_credential", {
    p_profile_id: id,
  });

  const row = Array.isArray(data) ? data[0] : data;

  if (error || !row) {
    notFound();
  }

  const profile: PublicCredentialProfile = {
    id: row.id,
    first_name: row.first_name,
    last_name: row.last_name,
    rut: row.rut,
    role: row.role,
    avatar_url: row.avatar_url,
    identity_verified: row.identity_verified ?? false,
    biometric_verified: row.biometric_verified ?? false,
    study_verified: row.study_verified ?? false,
    identity_status: row.identity_status ?? "none",
    experience_level: row.experience_level,
  };

  return (
    <main className="credentialPage">
      <ZovitCredentialCard profile={profile} />
    </main>
  );
}
