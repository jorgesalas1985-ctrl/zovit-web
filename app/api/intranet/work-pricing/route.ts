import { requireIntranetSuperAdmin } from "@/lib/intranet/apiAuth";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

const DEFAULT_PRICING = {
  professionalDayNet: 30000,
  minimumDayNet: 20000,
  dayHours: 8,
  additionalHourNet: 3750,
  additionalHourSurchargePercent: 50,
  fuelBaseFare: 4000,
  fuelDayKmRate: 600,
  fuelNightKmRate: 800,
  fuelHighDemandKmRate: 1000,
  fuelMinuteRate: 100,
  fuelNightStartsAt: 22,
  fuelNightEndsAt: 7,
};

function mapPricing(row: Record<string, unknown> | null) {
  if (!row) return DEFAULT_PRICING;
  return {
    professionalDayNet: Number(row.professional_day_net ?? DEFAULT_PRICING.professionalDayNet),
    minimumDayNet: Number(row.minimum_day_net ?? DEFAULT_PRICING.minimumDayNet),
    dayHours: Number(row.day_hours ?? DEFAULT_PRICING.dayHours),
    additionalHourNet: Number(row.additional_hour_net ?? DEFAULT_PRICING.additionalHourNet),
    additionalHourSurchargePercent: Number(row.additional_hour_surcharge_percent ?? DEFAULT_PRICING.additionalHourSurchargePercent),
    fuelBaseFare: Number(row.fuel_base_fare ?? DEFAULT_PRICING.fuelBaseFare),
    fuelDayKmRate: Number(row.fuel_day_km_rate ?? DEFAULT_PRICING.fuelDayKmRate),
    fuelNightKmRate: Number(row.fuel_night_km_rate ?? DEFAULT_PRICING.fuelNightKmRate),
    fuelHighDemandKmRate: Number(row.fuel_high_demand_km_rate ?? DEFAULT_PRICING.fuelHighDemandKmRate),
    fuelMinuteRate: Number(row.fuel_minute_rate ?? DEFAULT_PRICING.fuelMinuteRate),
    fuelNightStartsAt: Number(row.fuel_night_starts_at ?? DEFAULT_PRICING.fuelNightStartsAt),
    fuelNightEndsAt: Number(row.fuel_night_ends_at ?? DEFAULT_PRICING.fuelNightEndsAt),
  };
}

export async function GET() {
  try {
    const auth = await requireIntranetSuperAdmin();
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
    const { data, error } = await createAdminClient().from("platform_work_pricing").select("*").eq("id", true).maybeSingle();
    if (error?.code === "42P01") return NextResponse.json({ pricing: DEFAULT_PRICING, pendingMigration: true });
    if (error) throw error;
    return NextResponse.json({ pricing: mapPricing(data) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "No fue posible cargar las tarifas." }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const auth = await requireIntranetSuperAdmin();
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
    const body = (await request.json()) as Record<string, unknown>;
    const values = {
      professionalDayNet: Math.round(Number(body.professionalDayNet)),
      minimumDayNet: Math.round(Number(body.minimumDayNet)),
      dayHours: Number(body.dayHours),
      additionalHourNet: Math.round(Number(body.additionalHourNet)),
      additionalHourSurchargePercent: Number(body.additionalHourSurchargePercent),
      fuelBaseFare: Math.round(Number(body.fuelBaseFare)),
      fuelDayKmRate: Math.round(Number(body.fuelDayKmRate)),
      fuelNightKmRate: Math.round(Number(body.fuelNightKmRate)),
      fuelHighDemandKmRate: Math.round(Number(body.fuelHighDemandKmRate)),
      fuelMinuteRate: Math.round(Number(body.fuelMinuteRate)),
      fuelNightStartsAt: Math.round(Number(body.fuelNightStartsAt)),
      fuelNightEndsAt: Math.round(Number(body.fuelNightEndsAt)),
    };
    if (!Object.values(values).every(Number.isFinite) || values.minimumDayNet < 20000 || values.professionalDayNet < values.minimumDayNet || values.dayHours <= 0 || values.dayHours > 24 || values.additionalHourNet < 0 || values.additionalHourSurchargePercent < 0 || values.fuelBaseFare < 0 || values.fuelDayKmRate < 0 || values.fuelNightKmRate < 0 || values.fuelHighDemandKmRate < 0 || values.fuelMinuteRate < 0 || values.fuelNightStartsAt < 0 || values.fuelNightStartsAt > 23 || values.fuelNightEndsAt < 0 || values.fuelNightEndsAt > 23) {
      return NextResponse.json({ error: "Revisa los valores: el mínimo diario no puede bajar de $20.000 líquidos." }, { status: 400 });
    }
    const { data, error } = await createAdminClient().from("platform_work_pricing").upsert({
      id: true,
      professional_day_net: values.professionalDayNet,
      minimum_day_net: values.minimumDayNet,
      day_hours: values.dayHours,
      additional_hour_net: values.additionalHourNet,
      additional_hour_surcharge_percent: values.additionalHourSurchargePercent,
      fuel_base_fare: values.fuelBaseFare,
      fuel_day_km_rate: values.fuelDayKmRate,
      fuel_night_km_rate: values.fuelNightKmRate,
      fuel_high_demand_km_rate: values.fuelHighDemandKmRate,
      fuel_minute_rate: values.fuelMinuteRate,
      fuel_night_starts_at: values.fuelNightStartsAt,
      fuel_night_ends_at: values.fuelNightEndsAt,
      updated_at: new Date().toISOString(),
      updated_by: auth.manager.userId,
    }).select("*").single();
    if (error) throw error;
    return NextResponse.json({ pricing: mapPricing(data) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "No fue posible guardar las tarifas." }, { status: 500 });
  }
}
