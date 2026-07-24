"use client";

import { Camera, LoaderCircle, UserRound } from "lucide-react";
import Image from "next/image";
import { ChangeEvent, useEffect, useRef, useState } from "react";
import { uploadProfileAvatar } from "@/lib/profile/avatar";

type ProfilePhotoUploadProps = {
  userId: string;
  currentUrl?: string | null;
  onUploaded?: (url: string) => void;
  label?: string;
  hint?: string;
};

export function ProfilePhotoUpload({
  userId,
  currentUrl,
  onUploaded,
  label = "Foto para credencial",
  hint = "Esta foto aparece en tu perfil y en tu credencial ZOVIT con código QR.",
}: ProfilePhotoUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentUrl ?? null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setPreviewUrl(currentUrl ?? null);
  }, [currentUrl]);

  async function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setMessage("");
    setBusy(true);

    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);

    try {
      const publicUrl = await uploadProfileAvatar(userId, file);
      setPreviewUrl(publicUrl);
      onUploaded?.(publicUrl);
      setMessage("Foto guardada correctamente.");
    } catch (error) {
      setPreviewUrl(currentUrl ?? null);
      setMessage(error instanceof Error ? error.message : "No se pudo subir la foto.");
    } finally {
      URL.revokeObjectURL(objectUrl);
      setBusy(false);
    }
  }

  return (
    <div className="profilePhotoUpload">
      <div className="profilePhotoPreview">
        {previewUrl ? (
          <Image src={previewUrl} alt="Foto de perfil" width={120} height={120} unoptimized />
        ) : (
          <UserRound size={48} />
        )}
      </div>

      <div className="profilePhotoCopy">
        <p className="profilePhotoLabel">{label}</p>
        <p className="muted">{hint}</p>
        {message && <p className="notice compact">{message}</p>}
        <button
          type="button"
          className="secondaryButton"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
        >
          {busy ? (
            <>
              <LoaderCircle size={16} className="spin" /> Subiendo…
            </>
          ) : (
            <>
              <Camera size={16} /> {previewUrl ? "Cambiar foto" : "Subir foto"}
            </>
          )}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          hidden
          onChange={handleChange}
        />
      </div>
    </div>
  );
}

type ProfilePhotoPickerProps = {
  previewUrl?: string | null;
  onFileSelected: (file: File | null) => void;
};

export function ProfilePhotoPicker({ previewUrl, onFileSelected }: ProfilePhotoPickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    event.target.value = "";
    onFileSelected(file);
  }

  return (
    <div className="profilePhotoUpload">
      <div className="profilePhotoPreview">
        {previewUrl ? (
          <Image src={previewUrl} alt="Vista previa" width={120} height={120} unoptimized />
        ) : (
          <UserRound size={48} />
        )}
      </div>
      <div className="profilePhotoCopy">
        <p className="profilePhotoLabel">Foto para credencial</p>
        <p className="muted">Recomendada: rostro visible, fondo claro. Máximo 5 MB.</p>
        <button type="button" className="secondaryButton" onClick={() => inputRef.current?.click()}>
          <Camera size={16} /> {previewUrl ? "Cambiar foto" : "Elegir foto"}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          hidden
          onChange={handleChange}
        />
      </div>
    </div>
  );
}
