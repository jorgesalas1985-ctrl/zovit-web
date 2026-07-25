"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import {
  ArrowRight,
  BadgeCheck,
  FileBadge2,
  Search,
  ShieldCheck,
} from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { getActiveMode } from "@/lib/auth/roles";

function extractCredentialId(raw: string): string | null {
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

  const isProfessional =
    Boolean(profile) &&
    (profile?.role === "professional" ||
      profile?.can_act_as_professional ||
      getActiveMode(profile) === "professional");

  function submitVerify(event: FormEvent) {
    event.preventDefault();
    setMessage("");
    const id = extractCredentialId(verifyInput);
    if (!id) {
      setMessage("Ingresa un enlace de credencial ZOVIT o un ID válido.");
      return;
    }
    router.push(`/credencial/${id}`);
  }

  return (
    <main className="simplePage">
      <section className="formPageCard certificateHubCard">
        <p className="kicker">CERTIFICADO ZOVIT</p>
        <h1>Certificado de experiencia laboral</h1>
        <p className="muted">
          Crea tu certificado gratuito con identidad y experiencia verificables, o comprueba la
          autenticidad de un certificado ZOVIT.
        </p>

        <div className="certificateHubTabs" role="tablist" aria-label="Certificado de experiencia">
          <button
            type="button"
            role="tab"
            aria-selected={tab === "crear"}
            className={`certificateHubTab ${tab === "crear" ? "isActive" : ""}`}
            onClick={() => setTab("crear")}
          >
            <FileBadge2 size={18} /> Crear certificado
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
                <BadgeCheck size={18} /> Identidad y biometría verificadas en ZOVIT
              </p>
              <p>
                <ShieldCheck size={18} /> Experiencia respaldada por trabajos en la plataforma
              </p>
              <p>
                <FileBadge2 size={18} /> Enlace y QR para compartir o imprimir
              </p>
            </div>

            {loading ? (
              <p className="muted">Cargando…</p>
            ) : user ? (
              <>
                <p>
                  {isProfessional
                    ? "Tu certificado se genera desde tu cuenta profesional. Puedes abrirlo, compartirlo o imprimirlo cuando quieras."
                    : "Activa o usa el modo profesional en tu cuenta para emitir el certificado de experiencia laboral."}
                </p>
                <div className="securityHeroActions">
                  <Link
                    href={user ? `/credencial/${user.id}` : "/login"}
                    className="primaryButton"
                  >
                    {isProfessional ? (
                      <>
                        Abrir mi certificado <ArrowRight size={18} />
                      </>
                    ) : (
                      <>
                        Ir a mi credencial <ArrowRight size={18} />
                      </>
                    )}
                  </Link>
                  {!isProfessional && (
                    <Link href="/panel" className="secondaryButton">
                      Activar modo profesional
                    </Link>
                  )}
                </div>
              </>
            ) : (
              <>
                <p>
                  Para crear tu certificado debes registrarte, verificar tu identidad y operar como
                  profesional en ZOVIT.
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
              Pega el enlace del certificado o el ID del profesional para verificar su autenticidad
              en ZOVIT.
            </p>
            <form className="formGrid" onSubmit={submitVerify}>
              <label className="full">
                Enlace o ID del certificado
                <input
                  value={verifyInput}
                  onChange={(e) => setVerifyInput(e.target.value)}
                  placeholder="https://zovit.cl/credencial/… o ID"
                  autoComplete="off"
                />
              </label>
              {message && <div className="formMessage full">{message}</div>}
              <button type="submit" className="primaryButton full">
                Verificar certificado <Search size={18} />
              </button>
            </form>
            <p className="muted">
              También puedes escanear el código QR impreso en el certificado: te llevará a la misma
              página de verificación.
            </p>
          </div>
        )}
      </section>
    </main>
  );
}
