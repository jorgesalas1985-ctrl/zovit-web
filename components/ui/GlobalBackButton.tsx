"use client";

import { ArrowLeft, ChevronRight } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

function fallbackFor(pathname: string) {
  if (pathname.startsWith("/intranet/admin/")) return "/intranet/admin";
  if (pathname.startsWith("/intranet/") && pathname !== "/intranet/finanzas") {
    return "/intranet/finanzas";
  }
  if (pathname.startsWith("/cliente/")) return "/panel";
  if (pathname.startsWith("/solicitudes/")) return "/panel";
  return "/";
}

export function GlobalBackButton() {
  const pathname = usePathname();
  const router = useRouter();
  const [hidden, setHidden] = useState(false);

  if (pathname === "/" || pathname.startsWith("/auth/")) return null;

  if (hidden) {
    return (
      <button
        type="button"
        className="globalPageBackToggle"
        onClick={() => setHidden(false)}
        aria-label="Mostrar botón Atrás"
        title="Mostrar Atrás"
      >
        <ChevronRight size={19} aria-hidden="true" />
      </button>
    );
  }

  return (
    <div className="globalPageBackWrap">
      <button
        type="button"
        className="globalPageBack"
        onClick={() => {
          if (window.history.length > 1) router.back();
          else router.push(fallbackFor(pathname));
        }}
        aria-label="Volver atrás"
      >
        <ArrowLeft size={19} aria-hidden="true" />
        <span>Atrás</span>
      </button>
      <button
        type="button"
        className="globalPageBackHide"
        onClick={() => setHidden(true)}
        aria-label="Ocultar botón Atrás"
        title="Ocultar Atrás"
      >
        <ChevronRight size={16} aria-hidden="true" />
      </button>
    </div>
  );
}
