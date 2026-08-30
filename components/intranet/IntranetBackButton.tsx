"use client";

import { ArrowLeft } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";

export function IntranetBackButton({ href, label = "Atrás" }: { href?: string; label?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const fallback = href ?? (
    pathname.startsWith("/intranet/admin/") ? "/intranet/admin" :
    pathname === "/intranet/admin" ? "/intranet/finanzas" :
    pathname.startsWith("/intranet/") && pathname !== "/intranet/finanzas" ? "/intranet/finanzas" : "/"
  );

  return (
    <button
      type="button"
      className="browseBackLink intranetSectionBack intranetGlobalBack"
      onClick={() => { if (window.history.length > 1) router.back(); else router.push(fallback); }}
      aria-label={label}
    >
      <ArrowLeft size={18} /> {label}
    </button>
  );
}
