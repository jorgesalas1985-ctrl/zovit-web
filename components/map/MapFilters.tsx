"use client";

import { MAP_FILTER_CHIPS, type MapFiltersState } from "@/lib/map/types";
import { COVERAGE_RADIUS_OPTIONS_KM } from "@/lib/geo/coordinates";
import { SERVICE_CATEGORIES } from "@/lib/categories";
import { BadgeCheck, SlidersHorizontal } from "lucide-react";

type MapFiltersProps = {
  filters: MapFiltersState;
  onChange: (next: MapFiltersState) => void;
};

export function MapFilters({ filters, onChange }: MapFiltersProps) {
  function patch(partial: Partial<MapFiltersState>) {
    onChange({ ...filters, ...partial });
  }

  return (
    <div className="mapFilters">
      <div className="mapFiltersHead">
        <SlidersHorizontal size={16} aria-hidden />
        <span>Filtros</span>
      </div>

      <div className="mapChipRow" role="list" aria-label="Especialidades rápidas">
        <button
          type="button"
          className={`mapChip ${!filters.specialty && !filters.category ? "isActive" : ""}`}
          onClick={() => patch({ specialty: "", category: "" })}
        >
          Todas
        </button>
        {MAP_FILTER_CHIPS.map((chip) => (
          <button
            key={chip}
            type="button"
            className={`mapChip ${filters.specialty === chip || filters.category === chip ? "isActive" : ""}`}
            onClick={() =>
              patch({
                specialty: chip,
                category: SERVICE_CATEGORIES.includes(chip as (typeof SERVICE_CATEGORIES)[number])
                  ? chip
                  : filters.category,
              })
            }
          >
            {chip}
          </button>
        ))}
      </div>

      <label className="mapFieldLabel" htmlFor="map-category-select">
        Categoría
      </label>
      <select
        id="map-category-select"
        value={filters.category}
        onChange={(e) => patch({ category: e.target.value })}
      >
        <option value="">Todas las categorías</option>
        {SERVICE_CATEGORIES.map((cat) => (
          <option key={cat} value={cat}>
            {cat}
          </option>
        ))}
      </select>

      <label className="mapFieldLabel" htmlFor="map-availability-select">
        Disponibilidad
      </label>
      <select
        id="map-availability-select"
        value={filters.availability}
        onChange={(e) =>
          patch({
            availability: e.target.value as MapFiltersState["availability"],
          })
        }
      >
        <option value="">Cualquiera (activos)</option>
        <option value="available">Disponible</option>
        <option value="busy">Ocupado / limitada</option>
        <option value="on_the_way">En camino</option>
      </select>

      <label className="mapFieldLabel" htmlFor="map-radius-select">
        Distancia máxima
      </label>
      <select
        id="map-radius-select"
        value={filters.radiusKm}
        onChange={(e) => patch({ radiusKm: Number(e.target.value) })}
      >
        {COVERAGE_RADIUS_OPTIONS_KM.map((km) => (
          <option key={km} value={km}>
            {km} km
          </option>
        ))}
      </select>

      <label className="mapFieldLabel" htmlFor="map-rating-select">
        Calificación mínima
      </label>
      <select
        id="map-rating-select"
        value={filters.minRating}
        onChange={(e) => patch({ minRating: Number(e.target.value) })}
      >
        <option value={0}>Cualquiera</option>
        <option value={3}>3.0+</option>
        <option value={4}>4.0+</option>
        <option value={4.5}>4.5+</option>
      </select>

      <div className="mapToggleRow">
        <label className="mapToggle">
          <input
            type="checkbox"
            checked={filters.verifiedOnly}
            onChange={(e) => patch({ verifiedOnly: e.target.checked })}
          />
          <BadgeCheck size={14} aria-hidden />
          Solo verificados
        </label>
        <label className="mapToggle">
          <input
            type="checkbox"
            checked={filters.certifiedOnly}
            onChange={(e) => patch({ certifiedOnly: e.target.checked })}
          />
          Solo certificados
        </label>
      </div>
    </div>
  );
}

export function CoverageRadiusControl({
  radiusKm,
  onChange,
}: {
  radiusKm: number;
  onChange: (km: number) => void;
}) {
  return (
    <div className="mapRadiusControl" role="group" aria-label="Radio de cobertura">
      {COVERAGE_RADIUS_OPTIONS_KM.map((km) => (
        <button
          key={km}
          type="button"
          className={`mapRadiusBtn ${radiusKm === km ? "isActive" : ""}`}
          onClick={() => onChange(km)}
          aria-pressed={radiusKm === km}
        >
          {km} km
        </button>
      ))}
    </div>
  );
}
