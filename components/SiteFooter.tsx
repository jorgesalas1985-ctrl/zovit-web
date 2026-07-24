"use client";

import Link from "next/link";
import {
  Facebook,
  Globe2,
  Instagram,
  Linkedin,
  MapPin,
  Youtube,
} from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { canPublishServiceRequest } from "@/lib/auth/roles";
import { useMemo } from "react";

const SOCIAL_LINKS = [
  { label: "Facebook", href: "https://facebook.com", icon: Facebook },
  { label: "Instagram", href: "https://instagram.com", icon: Instagram },
  { label: "LinkedIn", href: "https://linkedin.com", icon: Linkedin },
  { label: "YouTube", href: "https://youtube.com", icon: Youtube },
] as const;

export function SiteFooter() {
  const { profile } = useAuth();
  const year = new Date().getFullYear();

  const footerColumns = useMemo(() => {
    const isProfessional = profile?.role === "professional";
    const showPublishLink = !profile?.role || canPublishServiceRequest(profile.role);

    return [
      {
        title: "Servicios",
        links: [
          { label: "Buscar con IA", href: "/ia/resultados" },
          { label: "Categorías", href: "/categorias" },
          ...(showPublishLink
            ? [{ label: "Publicar solicitud", href: "/solicitudes/nueva" }]
            : [{ label: "Ver trabajos", href: "/trabajos" }]),
          { label: "Profesionales verificados", href: "/servicios" },
        ],
      },
      {
        title: "Cuenta",
        links: [
          { label: "Crear cuenta", href: "/registro" },
          { label: "Ingresar", href: "/login" },
          { label: "Mi panel", href: "/panel" },
          ...(isProfessional
            ? [{ label: "Ver trabajos", href: "/trabajos" }]
            : []),
          { label: "Verificación biométrica", href: "/registro/biometria" },
        ],
      },
      {
        title: "ZOVIT",
        links: [
          { label: "¿Por qué ZOVIT?", href: "/#confianza" },
          { label: "Seguridad", href: "/verificacion" },
          { label: "Profesionales", href: "/registro" },
          { label: "Ingreso intranet", href: "/intranet/acceso" },
        ],
      },
      {
        title: "Legal",
        links: [
          { label: "Términos y condiciones", href: "/legal/terminos" },
          { label: "Política de privacidad", href: "/legal/privacidad" },
          { label: "Política de cookies", href: "/legal/cookies" },
          { label: "Ayuda", href: "/login" },
        ],
      },
    ];
  }, [profile?.role]);

  return (
    <footer className="siteFooter">
      <div className="siteFooterInner">
        <div className="siteFooterTop">
          <Link href="/" className="siteFooterBrand">
            <span className="brandMark">Z</span>
            <span>ZOVIT</span>
          </Link>

          <div className="siteFooterApps">
            <span className="siteFooterAppsLabel">Próximamente en</span>
            <div className="siteFooterAppButtons">
              <span className="siteFooterAppBadge">Google Play</span>
              <span className="siteFooterAppBadge">App Store</span>
            </div>
          </div>
        </div>

        <div className="siteFooterColumns">
          {footerColumns.map((column) => (
            <div className="siteFooterColumn" key={column.title}>
              <h3>{column.title}</h3>
              <ul>
                {column.links.map((link) => (
                  <li key={link.href + link.label}>
                    <Link href={link.href}>{link.label}</Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="siteFooterDivider" />

        <div className="siteFooterBottom">
          <div className="siteFooterSocial">
            {SOCIAL_LINKS.map(({ label, href, icon: Icon }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={label}
                className="siteFooterSocialLink"
              >
                <Icon size={22} />
              </a>
            ))}
          </div>

          <div className="siteFooterMeta">
            <span className="siteFooterLocale">
              <Globe2 size={18} /> Español (Chile)
            </span>
            <span className="siteFooterLocale">
              <MapPin size={18} /> Santiago
            </span>
          </div>

          <p className="siteFooterCopy">© {year} ZOVIT. Servicios verificados en Chile.</p>
        </div>
      </div>
    </footer>
  );
}
