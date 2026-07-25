"use client";

import { FileUp, Plus, Trash2 } from "lucide-react";
import { useRef } from "react";

type Props = {
  label: string;
  fileName?: string;
  busy?: boolean;
  hint?: string;
  onPick: (file: File) => void | Promise<void>;
  onClear?: () => void;
};

export function DocumentAttachField({ label, fileName, busy, hint, onPick, onClear }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <label className="full workerDocAttach">
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
            onClick={onClear}
          >
            <Trash2 size={16} />
          </button>
        ) : null}
      </div>
      <input
        ref={inputRef}
        type="file"
        className="workerDocAttachHidden"
        accept=".jpg,.jpeg,.png,.webp,.pdf,image/jpeg,image/png,image/webp,application/pdf"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) void onPick(file);
        }}
      />
      <small className="muted workerDocAttachHint">
        <FileUp size={13} /> {hint ?? "JPG, PNG, WEBP o PDF · máx. 10 MB"}
      </small>
    </label>
  );
}
