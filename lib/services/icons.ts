import type { LucideIcon } from "lucide-react";
import {
  BadgeCheck,
  BookOpen,
  Briefcase,
  Building2,
  Car,
  Flower2,
  Hammer,
  Heart,
  Home,
  Laptop,
  Plane,
  Shield,
  ShieldCheck,
  Ship,
  Sparkles,
  Truck,
} from "lucide-react";

const ICONS: Record<string, LucideIcon> = {
  home: Home,
  car: Car,
  hammer: Hammer,
  laptop: Laptop,
  flower: Flower2,
  sparkles: Sparkles,
  truck: Truck,
  heart: Heart,
  book: BookOpen,
  briefcase: Briefcase,
  shield: Shield,
  "shield-check": ShieldCheck,
  badge: BadgeCheck,
  building: Building2,
  ship: Ship,
  plane: Plane,
};

export function getCategoryIconByKey(iconKey?: string): LucideIcon {
  if (!iconKey) return Briefcase;
  return ICONS[iconKey] ?? Briefcase;
}

export function getCategoryIcon(name: string): LucideIcon {
  const normalized = name.toLowerCase();
  if (normalized.includes("hogar")) return Home;
  if (normalized.includes("automotriz")) return Car;
  if (normalized.includes("construcc")) return Hammer;
  if (normalized.includes("tecnolog")) return Laptop;
  if (normalized.includes("jardiner")) return Flower2;
  if (normalized.includes("limpieza") || normalized.includes("aseo")) return Sparkles;
  if (normalized.includes("transporte")) return Truck;
  if (normalized.includes("salud")) return Heart;
  if (normalized.includes("educaci")) return BookOpen;
  if (normalized.includes("fuerzas armadas")) return Shield;
  return Briefcase;
}
