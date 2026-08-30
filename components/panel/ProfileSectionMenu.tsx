"use client";

import { ChevronDown, LogIn } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

export type ProfileSectionOption = { href: string; label: string; description?: string };

export function ProfileSectionMenu({
  options,
  title,
}: {
  options: ProfileSectionOption[];
  title?: string;
}) {
  const available = useMemo(() => options.filter((option) => option.href), [options]);
  const [destination, setDestination] = useState(available[0]?.href ?? "");
  const optionsKey = available.map((option) => option.href).join("|");
  const firstDestination = available[0]?.href ?? "";

  useEffect(() => {
    setDestination(firstDestination);
  }, [optionsKey, firstDestination]);

  const selected = available.find((option) => option.href === destination) ?? available[0];
  if (!selected) return null;

  return (
    <section className="superAdminDropdown profileSectionMenu" aria-label="Secciones del perfil">
      <div className="superAdminDropdownIcon"><ChevronDown size={24} /></div>
      <div className="superAdminDropdownCopy">
        <h2>{title ?? "Selecciona una sección"}</h2>
        <select aria-label="Sección" value={destination} onChange={(event) => setDestination(event.target.value)}>
          {available.map((option) => <option value={option.href} key={`${option.href}-${option.label}`}>{option.label}</option>)}
        </select>
        <Link className="primaryButton wide" href={destination}>
          <LogIn size={19} /> Ingresar a la sección
        </Link>
      </div>
    </section>
  );
}
