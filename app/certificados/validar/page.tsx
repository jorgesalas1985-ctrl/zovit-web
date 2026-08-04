"use client";

import { normalizeCertificateFolio } from "@/lib/certificates/folio";
import { Search, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

export default function ValidateCertificatePage() {
  const router = useRouter();
  const [input, setInput] = useState("");
  const [message, setMessage] = useState("");

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    const folio = normalizeCertificateFolio(input);
    if (!folio) {
      setMessage("Ingresa un ID tipo ZV-261234567 o el enlace completo del certificado.");
      return;
    }
    router.push(`/certificados/${folio}`);
  }

  return (
    <main className="simplePage">
      <section className="formPageCard certificateHubCard">
        <p className="kicker">
          <ShieldCheck size={16} /> VALIDACIÓN
        </p>
        <h1>Validar certificado ZOVIT</h1>
        <p className="muted">
          Igual que un certificado institucional: ingresa el ID impreso o escanea el QR. Si el folio
          es auténtico, verás el documento oficial y su estado (vigente / revocado).
        </p>

        <form className="formGrid" onSubmit={onSubmit}>
          <label className="full">
            ID o enlace del certificado
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="ZV-261234567 o https://zovit.cl/certificados/…"
              autoComplete="off"
            />
          </label>
          {message && <div className="formMessage full">{message}</div>}
          <button type="submit" className="primaryButton full">
            Validar <Search size={18} />
          </button>
        </form>

        <p className="muted">
          ¿Eres profesional?{" "}
          <Link href="/certificado-experiencia" className="textLink">
            Emite tu certificado gratis
          </Link>
          .
        </p>
      </section>
    </main>
  );
}
