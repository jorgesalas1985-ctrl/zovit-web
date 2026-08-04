import type { Metadata } from "next";
import { ClientMapPage } from "@/components/map/ClientMapPage";

export const metadata: Metadata = {
  title: "Mapa de profesionales",
  description: "Encuentra profesionales de servicios cercanos en el mapa ZOVIT.",
};

export default function ClienteMapaRoute() {
  return <ClientMapPage />;
}
