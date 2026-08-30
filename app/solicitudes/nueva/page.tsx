import { redirect } from "next/navigation";

export default function NuevaSolicitudPage() {
  redirect("/cliente/mapa?nueva=1");
}
