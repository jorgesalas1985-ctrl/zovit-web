"use client";

import { Camera, LoaderCircle, Move, UserRound, X } from "lucide-react";
import Image from "next/image";
import { ChangeEvent, PointerEvent as ReactPointerEvent, useEffect, useRef, useState } from "react";
import { uploadProfileAvatar, validateProfileAvatar } from "@/lib/profile/avatar";
import { MobileDocumentCaptureButton } from "@/components/verification/MobileDocumentCaptureButton";

const CROP_SIZE = 320;
const OUTPUT_SIZE = 512;

type CropPosition = { x: number; y: number };
type ImageSize = { width: number; height: number };

function clampPosition(position: CropPosition, imageSize: ImageSize, zoom: number): CropPosition {
  const baseScale = Math.max(CROP_SIZE / imageSize.width, CROP_SIZE / imageSize.height);
  const maxX = Math.max(0, (imageSize.width * baseScale * zoom - CROP_SIZE) / 2);
  const maxY = Math.max(0, (imageSize.height * baseScale * zoom - CROP_SIZE) / 2);
  return {
    x: Math.max(-maxX, Math.min(maxX, position.x)),
    y: Math.max(-maxY, Math.min(maxY, position.y)),
  };
}

async function createCroppedFile(
  source: HTMLImageElement,
  imageSize: ImageSize,
  position: CropPosition,
  zoom: number,
): Promise<File> {
  const baseScale = Math.max(CROP_SIZE / imageSize.width, CROP_SIZE / imageSize.height);
  const displayedScale = baseScale * zoom;
  const sourceSize = CROP_SIZE / displayedScale;
  const sourceX = imageSize.width / 2 - position.x / displayedScale - sourceSize / 2;
  const sourceY = imageSize.height / 2 - position.y / displayedScale - sourceSize / 2;
  const canvas = document.createElement("canvas");
  canvas.width = OUTPUT_SIZE;
  canvas.height = OUTPUT_SIZE;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("No se pudo preparar la imagen.");
  context.drawImage(source, sourceX, sourceY, sourceSize, sourceSize, 0, 0, OUTPUT_SIZE, OUTPUT_SIZE);

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.9));
  if (!blob) throw new Error("No se pudo recortar la imagen.");
  return new File([blob], "foto-perfil.jpg", { type: "image/jpeg" });
}

type PhotoCropDialogProps = {
  file: File;
  onCancel: () => void;
  onConfirm: (file: File) => void | Promise<void>;
};

function PhotoCropDialog({ file, onCancel, onConfirm }: PhotoCropDialogProps) {
  const imageRef = useRef<HTMLImageElement>(null);
  const dragRef = useRef<{ pointerId: number; startX: number; startY: number; origin: CropPosition } | null>(null);
  const [sourceUrl, setSourceUrl] = useState("");
  const [imageSize, setImageSize] = useState<ImageSize | null>(null);
  const [position, setPosition] = useState<CropPosition>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const url = URL.createObjectURL(file);
    setSourceUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !saving) onCancel();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onCancel, saving]);

  function handlePointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (!imageSize) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      origin: position,
    };
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId || !imageSize) return;
    setPosition(clampPosition({
      x: drag.origin.x + event.clientX - drag.startX,
      y: drag.origin.y + event.clientY - drag.startY,
    }, imageSize, zoom));
  }

  function handlePointerEnd(event: ReactPointerEvent<HTMLDivElement>) {
    if (dragRef.current?.pointerId === event.pointerId) dragRef.current = null;
  }

  function handleZoom(nextZoom: number) {
    setZoom(nextZoom);
    if (imageSize) setPosition((current) => clampPosition(current, imageSize, nextZoom));
  }

  async function confirmCrop() {
    if (!imageRef.current || !imageSize) return;
    setSaving(true);
    setError("");
    try {
      const croppedFile = await createCroppedFile(imageRef.current, imageSize, position, zoom);
      await onConfirm(croppedFile);
    } catch (cropError) {
      setError(cropError instanceof Error ? cropError.message : "No se pudo guardar la foto.");
      setSaving(false);
    }
  }

  const baseScale = imageSize ? Math.max(CROP_SIZE / imageSize.width, CROP_SIZE / imageSize.height) : 1;
  const displayedWidth = imageSize ? imageSize.width * baseScale * zoom : CROP_SIZE;
  const displayedHeight = imageSize ? imageSize.height * baseScale * zoom : CROP_SIZE;

  return (
    <div className="profileCropDialog" role="dialog" aria-modal="true" aria-labelledby="profile-crop-title">
      <div className="profileCropCard">
        <div className="profileCropHeader">
          <div>
            <h2 id="profile-crop-title">Centra tu foto</h2>
            <p>Arrastra la imagen y usa el zoom para elegir qué parte se mostrará.</p>
          </div>
          <button type="button" className="profileCropClose" aria-label="Cancelar y cerrar" onClick={onCancel} disabled={saving}>
            <X size={22} />
          </button>
        </div>

        <div
          className="profileCropViewport"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerEnd}
          onPointerCancel={handlePointerEnd}
        >
          {sourceUrl && (
            // The cropper needs the image's natural dimensions and direct canvas access.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              ref={imageRef}
              src={sourceUrl}
              alt="Vista previa de la foto seleccionada"
              draggable={false}
              onLoad={(event) => setImageSize({
                width: event.currentTarget.naturalWidth,
                height: event.currentTarget.naturalHeight,
              })}
              style={{
                width: displayedWidth,
                height: displayedHeight,
                transform: `translate(-50%, -50%) translate(${position.x}px, ${position.y}px)`,
              }}
            />
          )}
          <div className="profileCropShade" aria-hidden="true" />
          <div className="profileCropGuide" aria-hidden="true" />
          <div className="profileCropMoveHint"><Move size={16} /> Arrastra para centrar</div>
        </div>

        <label className="profileCropZoom">
          <span>Zoom</span>
          <input
            type="range"
            min="1"
            max="3"
            step="0.01"
            value={zoom}
            onChange={(event) => handleZoom(Number(event.target.value))}
            aria-label="Zoom de la foto"
          />
        </label>
        {error && <p className="formMessage compact" role="alert">{error}</p>}
        <div className="profileCropActions">
          <button type="button" className="secondaryButton" onClick={onCancel} disabled={saving}>Cancelar</button>
          <button type="button" className="primaryButton" onClick={() => void confirmCrop()} disabled={saving || !imageSize}>
            {saving ? <><LoaderCircle size={16} className="spin" /> Guardando…</> : "Guardar foto"}
          </button>
        </div>
      </div>
    </div>
  );
}

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
  const [fileToCrop, setFileToCrop] = useState<File | null>(null);

  useEffect(() => {
    setPreviewUrl(currentUrl ?? null);
  }, [currentUrl]);

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setMessage("");
    const validationError = validateProfileAvatar(file);
    if (validationError) {
      setMessage(validationError);
      return;
    }
    setFileToCrop(file);
  }

  async function handleCropConfirmed(file: File) {
    setBusy(true);
    try {
      const publicUrl = await uploadProfileAvatar(userId, file);
      setPreviewUrl(publicUrl);
      onUploaded?.(publicUrl);
      setMessage("Foto guardada correctamente.");
      setFileToCrop(null);
    } catch (error) {
      setPreviewUrl(currentUrl ?? null);
      setMessage(error instanceof Error ? error.message : "No se pudo subir la foto.");
      throw error;
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="profilePhotoUpload">
      <div className="profilePhotoPreview">
        {previewUrl ? (
          <Image className="profilePhotoImage" src={previewUrl} alt="Foto de perfil" width={120} height={120} unoptimized />
        ) : (
          <div className="profilePhotoPlaceholder"><UserRound size={48} /></div>
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
      {fileToCrop && (
        <PhotoCropDialog
          file={fileToCrop}
          onCancel={() => setFileToCrop(null)}
          onConfirm={handleCropConfirmed}
        />
      )}
    </div>
  );
}

type ProfilePhotoPickerProps = {
  previewUrl?: string | null;
  onFileSelected: (file: File | null) => void;
};

export function ProfilePhotoPicker({ previewUrl, onFileSelected }: ProfilePhotoPickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraMessage, setCameraMessage] = useState("");
  const [fileToCrop, setFileToCrop] = useState<File | null>(null);

  function beginCrop(file: File | null) {
    if (!file) return;
    const validationError = validateProfileAvatar(file);
    if (validationError) {
      setCameraMessage(validationError);
      return;
    }
    setCameraMessage("");
    setFileToCrop(file);
  }

  function stopCamera() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setCameraOpen(false);
  }

  async function openCamera() {
    setCameraMessage("");
    if (!navigator.mediaDevices?.getUserMedia) {
      cameraInputRef.current?.click();
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false });
      streamRef.current = stream;
      setCameraOpen(true);
      window.setTimeout(() => {
        if (videoRef.current) videoRef.current.srcObject = stream;
      }, 0);
    } catch {
      setCameraMessage("No se pudo abrir la cámara. Permite el acceso o elige una foto.");
    }
  }

  function takePhoto() {
    const video = videoRef.current;
    if (!video || !video.videoWidth || !video.videoHeight) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")?.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => {
      if (!blob) return;
      beginCrop(new File([blob], "foto-credencial.jpg", { type: "image/jpeg" }));
      stopCamera();
    }, "image/jpeg", 0.9);
  }

  useEffect(() => () => stopCamera(), []);

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    event.target.value = "";
    beginCrop(file);
  }

  return (
    <div className="profilePhotoUpload">
      <div className="profilePhotoPreview">
        {previewUrl ? (
          <Image className="profilePhotoImage" src={previewUrl} alt="Miniatura de la foto para credencial" width={120} height={120} unoptimized />
        ) : (
          <div className="profilePhotoPlaceholder"><UserRound size={48} /></div>
        )}
      </div>
      <div className="profilePhotoCopy">
        <p className="profilePhotoLabel">Foto para credencial</p>
        <p className="muted">Recomendada: rostro visible, fondo claro. Máximo 5 MB.</p>
        <button type="button" className="secondaryButton" onClick={() => inputRef.current?.click()}>
          <Camera size={16} /> {previewUrl ? "Cambiar foto" : "Elegir foto"}
        </button>
        <button type="button" className="secondaryButton" onClick={() => void openCamera()}>
          <Camera size={16} /> Usar cámara del PC
        </button>
        <MobileDocumentCaptureButton
          documentType="selfie"
          label="Foto para credencial"
          onCaptured={beginCrop}
        />
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          hidden
          onChange={handleChange}
        />
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          capture="user"
          hidden
          onChange={handleChange}
        />
        {cameraMessage && <p className="formMessage compact">{cameraMessage}</p>}
        {cameraOpen && (
          <div className="profileCameraDialog" role="dialog" aria-modal="true" aria-label="Tomar foto para credencial">
            <video ref={videoRef} className="profileCameraVideo" autoPlay playsInline muted />
            <div className="profileCameraActions">
              <button type="button" className="primaryButton" onClick={takePhoto}><Camera size={16} /> Tomar foto</button>
              <button type="button" className="secondaryButton" onClick={stopCamera}>Cancelar</button>
            </div>
          </div>
        )}
      </div>
      {fileToCrop && (
        <PhotoCropDialog
          file={fileToCrop}
          onCancel={() => setFileToCrop(null)}
          onConfirm={(file) => {
            onFileSelected(file);
            setFileToCrop(null);
          }}
        />
      )}
    </div>
  );
}
