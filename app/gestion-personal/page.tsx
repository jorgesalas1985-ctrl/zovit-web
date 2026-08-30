"use client";

import Link from "next/link";
import { ArrowRight, CreditCard, IdCard, ShieldCheck, UserRound } from "lucide-react";
import { Protected } from "@/components/Protected";
import { useAuth } from "@/components/AuthProvider";

function PersonalManagementContent() {
  const { user } = useAuth();
  const items = [
    { href: "/perfil", icon: <UserRound />, title: "Mi perfil", text: "Actualiza tus datos personales." },
    { href: user ? `/credencial/${user.id}` : "/credencial", icon: <IdCard />, title: "Mi certificado ZOVIT", text: "Consulta tu certificado con código QR." },
    { href: "/verificacion", icon: <ShieldCheck />, title: "Verificación gratuita", text: "Revisa tus documentos profesionales." },
    { href: "/pagos/profesional", icon: <CreditCard />, title: "Wallet profesional", text: "Revisa saldo, retenciones e ingresos." },
  ];
  return <main className="dashboardPage standalonePanelPage"><section className="panelSection"><div className="sectionHeading"><div><p className="kicker">GESTIÓN PERSONAL</p><h1>Cuenta y herramientas</h1><p className="muted">Administra tu información profesional desde un solo lugar.</p></div></div>
    <div className="dashboardGrid">{items.map((item) => <Link href={item.href} className="dashboardCard" key={item.title}><div className="dashboardIcon">{item.icon}</div><div><h3>{item.title}</h3><p>{item.text}</p></div><ArrowRight /></Link>)}</div>
  </section></main>;
}

export default function PersonalManagementPage() { return <Protected><PersonalManagementContent /></Protected>; }
