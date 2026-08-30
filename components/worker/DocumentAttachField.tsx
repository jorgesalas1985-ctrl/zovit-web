"use client";

import { FileText, FileUp, Plus, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type Props = {
  label: string;
  fileName?: string;
  busy?: boolean;
  hint?: string;
  fieldId?: string;
  highlight?: boolean;
  onPick: (file: File) => void | boolean | Promise<void | boolean>;
  onClear?: () => void;
};

export function DocumentAttachField({
  label,
  fileName,
  busy,
  hint,
  fieldId,
  highlight,
  onPick,
  onClear,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<{ url: string; type: string; name: string } | null>(null);

  useEffect(() => () => {
    if (preview?.url) URL.revokeObjectURL(preview.url);
  }, [preview]);

  return (
    <label
      className={`full workerDocAttach ${highlight ? "isMissingField" : ""}`}
      data-field-id={fieldId}
    >
      <span>{label}</span>
      <div className="workerDocAttachRow">
        <input
          type="text"
          readOnly
          value={fileName || ""}
          placeholder="Ningún archivo seleccionado"
          className="workerDocAttachName"
          onClick={() => inputRef.current?.click()}
        />
        <button
          type="button"
          className="workerDocAttachBtn"
          disabled={busy}
          aria-label="Adjuntar documento"
          title="Adjuntar documento"
          onClick={() => inputRef.current?.click()}
        >
          <Plus size={20} strokeWidth={2.5} />
        </button>
        {fileName && onClear ? (
          <button
            type="button"
            className="workerDocAttachClear"
            aria-label="Quitar archivo"
            title="Quitar archivo"
            onClick={() => {
              setPreview((current) => {
                if (current?.url) URL.revokeObjectURL(current.url);
                return null;
              });
              onClear();
            }}
          >
            <Trash2 size={16} />
          </button>
        ) : null}
      </div>
      <input
        ref={inputRef}
        type="file"
        className="workerDocAttachHidden"
        tabIndex={-1}
        aria-hidden="true"
        accept=".jpg,.jpeg,.png,.webp,.pdf,image/jpeg,image/png,image/webp,application/pdf"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (!file) return;
          const accepted = await onPick(file);
          if (accepted === false) return;
          setPreview((current) => {
            if (current?.url) URL.revokeObjectURL(current.url);
            return { url: URL.createObjectURL(file), type: file.type, name: file.name };
          });
        }}
      />
      <small className="muted workerDocAttachHint">
        <FileUp size={13} /> {hint ?? "JPG, PNG, WEBP o PDF · máx. 10 MB"}
      </small>
      {preview && fileName ? (
        <div className="workerDocPreview">
          {preview.type.startsWith("image/") ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview.url} alt={`Vista previa de ${preview.name}`} />
          ) : (
            <div className="workerDocPdfPreview"><FileText size={34} /><strong>PDF</strong></div>
          )}
          <span>{preview.name}</span>
        </div>
      ) : null}
    </label>
  );
}
