"use client";

import Link from "next/link";
import { LogOut, Moon, Sun, UserRound } from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { useRouter } from "next/navigation";
import { NotificationBell } from "@/components/NotificationBell";

export function Header() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("zovit-theme") === "dark";
    setDark(saved);
    document.documentElement.dataset.theme = saved ? "dark" : "light";
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
        <button className="iconButton" onClick={toggleTheme} aria-label="Cambiar tema">
          {dark ? <Sun size={19} /> : <Moon size={19} />}
        </button>

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
