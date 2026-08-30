"use client";

import Link from "next/link";
import { Home, LogOut, Moon, Sun, UserRound } from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { useRouter } from "next/navigation";
import { NotificationBell } from "@/components/NotificationBell";
import { ProfessionalRequestAlert } from "@/components/ProfessionalRequestAlert";
import { useSuperAdminView } from "@/components/superadmin/SuperAdminViewProvider";
import { SUPER_ADMIN_TOUR_OPTIONS } from "@/lib/auth/superAdminView";

function getInitialTheme() {
  if (typeof window === "undefined") return false;
  return localStorage.getItem("zovit-theme") === "dark";
}

export function Header() {
  const { user, loading, signOut } = useAuth();
  const { isRealSuperAdmin, tourAccount } = useSuperAdminView();
  const router = useRouter();
  const [dark, setDark] = useState(getInitialTheme);
  const panelHref = isRealSuperAdmin
    ? SUPER_ADMIN_TOUR_OPTIONS.find((option) => option.id === tourAccount)?.href ?? "/intranet/finanzas"
    : "/panel";

  useEffect(() => {
    const isDark = localStorage.getItem("zovit-theme") === "dark";
    setDark(isDark);
    document.documentElement.dataset.theme = isDark ? "dark" : "light";
  }, []);

  const toggleTheme = () => {
    const next = !dark;
    setDark(next);
    localStorage.setItem("zovit-theme", next ? "dark" : "light");
    document.documentElement.dataset.theme = next ? "dark" : "light";
  };

  return (
    <>
    <header className="header">
      <Link className="brand" href="/">
        <span className="brandMark">Z</span>
        <span>ZOVIT</span>
        <small>BETA</small>
      </Link>

      <nav className="headerActions">
        <button
          className="iconButton themeToggle"
          onClick={toggleTheme}
          aria-label={dark ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
        >
          {dark ? <Sun size={19} /> : <Moon size={19} />}
        </button>

        <Link className="navButton homeNavButton" href="/">
          <Home size={18} /> INICIO
        </Link>

        {loading ? (
          <span className="headerAuthPlaceholder" aria-hidden="true" />
        ) : user ? (
          <>
            <NotificationBell />
            <Link className="navButton" href={panelHref}>
              <UserRound size={18} /> Panel
            </Link>
            <button
              className="navButton danger"
              onClick={async () => {
                await signOut();
                router.push("/");
              }}
            >
              <LogOut size={18} /> Salir
            </button>
          </>
        ) : (
          <>
            <Link className="navButton" href="/login">Ingresar</Link>
            <Link className="primaryButton small" href="/registro">Crear cuenta</Link>
          </>
        )}
      </nav>
    </header>
    <ProfessionalRequestAlert />
    </>
  );
}
