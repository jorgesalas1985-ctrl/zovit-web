"use client";

import Link from "next/link";
import { ArrowRight, GraduationCap, ShieldCheck } from "lucide-react";
import { Protected } from "@/components/Protected";
import { useAuth } from "@/components/AuthProvider";

export default function StudentHomePage() {
  const { profile } = useAuth();

  return (
    <Protected>
      <main className="simplePage">
        <section className="formPageCard">
          <div className="eyebrow">
            <GraduationCap size={16} /> ALUMNO ZOVIT
          </div>
          <h1>Perfil Alumno</h1>
          <p className="muted">
            Tu perfil alumno conecta identidad, formacion, documentos, competencias y
            pasaporte digital ZOVIT.
          </p>

          <div className="intranetGrid">
            <article className="intranetCard intranetCardStatic">
              <ShieldCheck size={24} />
              <h3>{profile?.account_kind === "student" ? "Activo" : "Disponible"}</h3>
              <p>Estado del perfil alumno dentro del ecosistema.</p>
            </article>
            <Link href="/panel/pasaporte" className="intranetCard">
              <GraduationCap size={24} />
              <h3>Pasaporte Digital</h3>
              <p>Ver identidad, formacion, competencias y trazabilidad.</p>
            </Link>
            <Link href="/registro/trabajador" className="intranetCard">
              <ArrowRight size={24} />
              <h3>Completar formacion</h3>
              <p>Subir alumno regular, certificados y antecedentes.</p>
            </Link>
          </div>
        </section>
      </main>
    </Protected>
  );
}
