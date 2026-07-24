"use client";

import { AccountModeControls } from "@/components/AccountModeControls";
import { Protected } from "@/components/Protected";
import { RoleModeBanner } from "@/components/RoleModeBanner";
import { ProfilePhotoUpload } from "@/components/profile/ProfilePhotoUpload";
import { useAuth } from "@/components/AuthProvider";
import { getActiveMode } from "@/lib/auth/roles";
import { supabase } from "@/lib/supabase";
import { FormEvent, useEffect, useState } from "react";
import { Save } from "lucide-react";

export default function ProfilePage() {
  const { user, profile, refreshProfile } = useAuth();
  const [form, setForm] = useState({
    first_name: "", last_name: "", rut: "", phone: "", address: "", commune: ""
  });
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("first_name,last_name,rut,phone,address,commune,avatar_url").eq("id", user.id).single()
      .then(({ data }) => {
        if (data) {
          setForm({
            first_name: data.first_name ?? "",
            last_name: data.last_name ?? "",
            rut: data.rut ?? "",
            phone: data.phone ?? "",
            address: data.address ?? "",
            commune: data.commune ?? ""
          });
          setAvatarUrl(data.avatar_url ?? null);
        }
      });
  }, [user]);

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!user) return;
    const { error } = await supabase.from("profiles").update({ ...form, updated_at: new Date().toISOString() }).eq("id", user.id);
    if (error) {
      setMessage(error.message);
      return;
    }
    await refreshProfile();
    setMessage("Perfil actualizado correctamente.");
  }

  const activeMode = profile ? getActiveMode(profile) : null;

  return (
    <Protected>
      {activeMode && <RoleModeBanner role={activeMode} />}
      <main className="simplePage">
        <section className="formPageCard">
          <p className="kicker">MI CUENTA</p>
          <h1>Perfil personal</h1>
          <p className="muted">Estos datos quedan guardados en tu cuenta ZOVIT.</p>

          <AccountModeControls variant="profile" />

          {user && (
            <ProfilePhotoUpload
              userId={user.id}
              currentUrl={avatarUrl}
              onUploaded={(url) => {
                setAvatarUrl(url);
                void refreshProfile();
              }}
            />
          )}

          <form className="formGrid" onSubmit={save}>
            <label>Nombres<input value={form.first_name} onChange={e => setForm({ ...form, first_name: e.target.value })} /></label>
            <label>Apellidos<input value={form.last_name} onChange={e => setForm({ ...form, last_name: e.target.value })} /></label>
            <label>RUT<input value={form.rut} onChange={e => setForm({ ...form, rut: e.target.value })} /></label>
            <label>Teléfono<input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></label>
            <label>Dirección<input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} /></label>
            <label>Comuna<input value={form.commune} onChange={e => setForm({ ...form, commune: e.target.value })} /></label>
            {message && <div className="notice full">{message}</div>}
            <button className="primaryButton full"><Save size={18} /> Guardar cambios</button>
          </form>
        </section>
      </main>
    </Protected>
  );
}
