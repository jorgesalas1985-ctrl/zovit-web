import type { ServiceCategory } from "@/lib/categories";
import {
  BookOpen,
  Briefcase,
  Car,
  Flower2,
  Hammer,
  Home,
  Laptop,
  Sparkles,
  Truck,
  type LucideIcon,
} from "lucide-react";

export const CATEGORY_ICONS: Record<ServiceCategory, LucideIcon> = {
  Hogar: Home,
  Automotriz: Car,
  Construcción: Hammer,
  Tecnología: Laptop,
  Jardinería: Flower2,
  Limpieza: Sparkles,
  "Transporte de carga": Truck,
  Salud: Briefcase,
  Educación: BookOpen,
  Profesionales: Briefcase,
};

export function getCategoryIcon(name: ServiceCategory): LucideIcon {
  return CATEGORY_ICONS[name] ?? Briefcase;
}
