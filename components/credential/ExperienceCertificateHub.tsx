"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import {
  ArrowRight,
  BadgeCheck,
  FileBadge2,
  Mail,
  MessageCircle,
  Printer,
  Search,
  ShieldCheck,
} from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { getActiveMode } from "@/lib/auth/roles";
import { normalizeCertificateFolio } from "@/lib/certificates/folio";

function extractLegacyCredentialId(raw: string): string | null {
  const value = raw.trim();
  if (!value) return null;

  try {
    if (value.includes("/credencial/") || value.includes("http")) {
      const url = value.startsWith("http")
        ? new URL(value)
        : new URL(value, "https://zovit.cl");
      const parts = url.pathname.split("/").filter(Boolean);
      const idx = parts.indexOf("credencial");
      if (idx >= 0 && parts[idx + 1]) return parts[idx + 1];
    }
  } catch {
    // fall through
  }

  const uuidLike =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (uuidLike.test(value)) return value;

  return null;
}

export function ExperienceCertificateHub() {
  const router = useRouter();
  const { user, profile, loading } = useAuth();
  const [tab, setTab] = useState<"crear" | "verificar">("crear");
  const [verifyInput, setVerifyInput] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [activeFolio, setActiveFolio] = useState<string | null>(null);
  const [freeIssuance, setFreeIssuance] = useState(true);
  const [deliverEmail, setDeliverEmail] = useState(true);
  const [deliverWhatsapp, setDeliverWhatsapp] = useState(true);
  const [printAfter, setPrintAfter] = useState(true);
  const [toEmail, setToEmail] = useState("");
  const [toPhone, setToPhone] = useState("");

  const isProfessional =
    Boolean(profile) &&
    (profile?.role === "professional" ||
      profile?.can_act_as_professional ||
      getActiveMode(profile) === "professional");

  const identityReady = Boolean(
    profile?.identity_verified && profile?.biometric_verified,
  );

  useEffect(() => {
    if (!user) {
      setActiveFolio(null);
      return;
    }
    void (async () => {
      const response = await fetch("/api/certificates", { cache: "no-store" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) return;
      setFreeIssuance(Boolean(data.pricing?.free ?? true));
      if (data.contact?.email) setToEmail(String(data.contact.email));
      if (data.contact?.phone) setToPhone(String(data.contact.phone));
      const active = (data.certificates ?? []).find(
        (c: { status: string; folio: string }) => c.status === "active",
      );
      setActiveFolio(active?.folio ?? null);
    })();
  }, [user]);

  function submitVerify(event: FormEvent) {
    event.preventDefault();
    setMessage("");
    const folio = normalizeCertificateFolio(verifyInput);
    if (folio) {
      router.push(`/certificados/${folio}`);
      return;
    }
    const legacy = extractLegacyCredentialId(verifyInput);
    if (legacy) {
      router.push(`/credencial/${legacy}`);
      return;
    }
    setMessage("Ingresa un ID ZV-…, un enlace de certificado o una credencial ZOVIT.");
  }

  async function issueCertificate(reissue = false) {
    setBusy(true);
    setMessage("");
    const response = await fetch("/api/certificates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        reissue,
        deliverEmail,
        deliverWhatsapp,
        printAfter,
        toEmail: toEmail.trim() || undefined,
        toPhone: toPhone.trim() || undefined,
      }),
    });
    const data = await response.json().catch(() => ({}));
    setBusy(false);
    if (!response.ok) {
      setMessage(data.error ?? "No se pudo emitir el certificado.");
      return;
    }

    setActiveFolio(data.certificate?.folio ?? null);

    if (data.delivery?.emailSent) {
      setMessage("Certificado emitido y correo enviado a tu bandeja.");
    }

    // La página del certificado abre WhatsApp / correo / impresión según ?wa&mail&print
    router.push(data.publicUrl ?? `/certificados/${data.certificate.folio}`);
  }

  return (
    <main className="simplePage">
      <section className="formPageCard certificateHubCard">
        <p className="kicker">CERTIFICADO ZOVIT</p>
        <h1>Certificado de experiencia profesional</h1>
        <p className="muted">
          Documento oficial con folio y QR. Al pedirlo puedes recibirlo por correo, WhatsApp e
          imprimirlo. {freeIssuance ? "Emisión gratuita mientras ZOVIT crece." : "Emisión de pago."}
        </p>

        <div className="certificateHubTabs" role="tablist" aria-label="Certificado de experiencia">
          <button
            type="button"
            role="tab"
            aria-selected={tab === "crear"}
            className={`certificateHubTab ${tab === "crear" ? "isActive" : ""}`}
            onClick={() => setTab("crear")}
          >
            <FileBadge2 size={18} /> Emitir certificado
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === "verificar"}
            className={`certificateHubTab ${tab === "verificar" ? "isActive" : ""}`}
            onClick={() => setTab("verificar")}
          >
            <Search size={18} /> Verificar certificado
          </button>
        </div>

        {tab === "crear" && (
          <div className="certificateHubPanel" role="tabpanel">
            <div className="certificateHubPoints">
              <p>
                <BadgeCheck size={18} /> Identidad y biometría verificadas
              </p>
              <p>
                <ShieldCheck size={18} /> Folio único + QR a página de validación
              </p>
              <p>
                <FileBadge2 size={18} /> Correo, WhatsApp, PDF e impresión
              </p>
            </div>

            {loading ? (
              <p className="muted">Cargando…</p>
            ) : user ? (
              <>
                {!isProfessional && (
                  <p>
                    Activa el modo profesional para emitir tu certificado de experiencia laboral.
                  </p>
                )}
                {isProfessional && !identityReady && (
                  <p>
                    Completa la verificación de identidad (carnet + selfie) antes de emitir el
                    certificado.
                  </p>
                )}

                {isProfessional && identityReady && (
                  <div className="certificateDeliveryBox">
                    <strong>¿Cómo quieres recibirlo?</strong>
                    <p className="muted">
                      Elige uno, varios o todos. ZOVIT prepara el envío al emitir.
                    </p>

                    <label className="checkboxRow">
                      <input
                        type="checkbox"
                        checked={deliverEmail}
                        onChange={(e) => setDeliverEmail(e.target.checked)}
                      />
                      <span>
                        <Mail size={16} /> Enviar a mi correo
                      </span>
                    </label>
                    {deliverEmail && (
                      <label>
                        Correo
                        <input
                          type="email"
                          value={toEmail}
                          onChange={(e) => setToEmail(e.target.value)}
                          placeholder="tu@correo.cl"
                          autoComplete="email"
                        />
                      </label>
                    )}

                    <label className="checkboxRow">
                      <input
                        type="checkbox"
                        checked={deliverWhatsapp}
                        onChange={(e) => setDeliverWhatsapp(e.target.checked)}
                      />
                      <span>
                        <MessageCircle size={16} /> Abrir WhatsApp con el certificado
                      </span>
                    </label>
                    {deliverWhatsapp && (
                      <label>
                        WhatsApp (opcional: número destino)
                        <input
                          type="tel"
                          value={toPhone}
                          onChange={(e) => setToPhone(e.target.value)}
                          placeholder="+56 9 1234 5678"
                          autoComplete="tel"
                        />
                      </label>
                    )}

                    <label className="checkboxRow">
                      <input
                        type="checkbox"
                        checked={printAfter}
                        onChange={(e) => setPrintAfter(e.target.checked)}
                      />
                      <span>
                        <Printer size={16} /> Abrir impresión / guardar PDF al emitir
                      </span>
                    </label>
                  </div>
                )}

                {isProfessional && identityReady && (
                  <p>
                    {activeFolio
                      ? `Ya tienes un certificado vigente (${activeFolio}). Puedes abrirlo, reenviarlo o reemitirlo.`
                      : "Tu certificado se emitirá con un ID único y se enviará según tus preferencias."}
                  </p>
                )}

                <div className="securityHeroActions">
                  {activeFolio && (
                    <Link href={`/certificados/${activeFolio}`} className="primaryButton">
                      Abrir mi certificado <ArrowRight size={18} />
                    </Link>
                  )}
                  {isProfessional && identityReady && (
                    <button
                      type="button"
                      className={activeFolio ? "secondaryButton" : "primaryButton"}
                      disabled={busy || (!deliverEmail && !deliverWhatsapp && !printAfter)}
                      onClick={() => void issueCertificate(Boolean(activeFolio))}
                    >
                      {busy
                        ? "Emitiendo y enviando…"
                        : activeFolio
                          ? "Reemitir y enviar"
                          : freeIssuance
                            ? "Emitir y enviar gratis"
                            : "Emitir y enviar"}
                    </button>
                  )}
                  {!identityReady && (
                    <Link href="/verificacion" className="secondaryButton">
                      Ir a verificación
                    </Link>
                  )}
                  {!isProfessional && (
                    <Link href="/panel" className="secondaryButton">
                      Activar modo profesional
                    </Link>
                  )}
                  <Link
                    href={user ? `/credencial/${user.id}` : "/login"}
                    className="linkButton"
                  >
                    Ver credencial viva
                  </Link>
                </div>
                {message && <div className="formMessage">{message}</div>}
              </>
            ) : (
              <>
                <p>
                  Regístrate, verifica tu identidad y opera como profesional para emitir tu
                  certificado.
                </p>
                <div className="securityHeroActions">
                  <Link href="/registro" className="primaryButton">
                    Crear cuenta profesional <ArrowRight size={18} />
                  </Link>
                  <Link
                    href={`/login?next=${encodeURIComponent("/certificado-experiencia")}`}
                    className="secondaryButton"
                  >
                    Ya tengo cuenta
                  </Link>
                </div>
              </>
            )}
          </div>
        )}

        {tab === "verificar" && (
          <div className="certificateHubPanel" role="tabpanel">
            <p>
              Pega el ID del certificado (ZV-…), el enlace con QR, o una credencial antigua para
              comprobar autenticidad.
            </p>
            <form className="formGrid" onSubmit={submitVerify}>
              <label className="full">
                ID, enlace o credencial
                <input
                  value={verifyInput}
                  onChange={(e) => setVerifyInput(e.target.value)}
                  placeholder="ZV-261234567 o https://zovit.cl/certificados/…"
                  autoComplete="off"
                />
              </label>
              {message && <div className="formMessage full">{message}</div>}
              <button type="submit" className="primaryButton full">
                Verificar certificado <Search size={18} />
              </button>
            </form>
            <p className="muted">
              También en{" "}
              <Link href="/certificados/validar" className="textLink">
                /certificados/validar
              </Link>
              .
            </p>
          </div>
        )}
      </section>
    </main>
  );
}
