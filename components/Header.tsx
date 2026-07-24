"use client";

import Link from "next/link";
import { Home, LogOut, Moon, Sun, UserRound } from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { useRouter } from "next/navigation";
import { NotificationBell } from "@/components/NotificationBell";

function getInitialTheme() {
  if (typeof window === "undefined") return true;
  return localStorage.getItem("zovit-theme") !== "light";
}

export function Header() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const [dark, setDark] = useState(getInitialTheme);

  useEffect(() => {
    const isDark = localStorage.getItem("zovit-theme") !== "light";
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

        {user ? (
          <>
            <NotificationBell />
            <Link className="navButton" href="/panel">
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
  );
}
