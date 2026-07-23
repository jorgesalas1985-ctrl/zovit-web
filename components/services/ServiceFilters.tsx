"use client";

type Props = {
  commune: string;
  minRating: number;
  sortBy: "match" | "rating" | "jobs";
  onCommuneChange: (value: string) => void;
  onMinRatingChange: (value: number) => void;
  onSortByChange: (value: "match" | "rating" | "jobs") => void;
};

export function ServiceFilters({
  commune,
  minRating,
  sortBy,
  onCommuneChange,
  onMinRatingChange,
  onSortByChange,
}: Props) {
  return (
    <section className="browseFilters" aria-label="Filtros de búsqueda">
      <label>
        Comuna o ubicación
        <input
          value={commune}
          onChange={(event) => onCommuneChange(event.target.value)}
          placeholder="Ejemplo: Santiago, Maipú…"
        />
      </label>

      <label>
        Calificación mínima
        <select
          value={minRating}
          onChange={(event) => onMinRatingChange(Number(event.target.value))}
        >
          <option value={0}>Todas</option>
          <option value={3}>3+ estrellas</option>
          <option value={4}>4+ estrellas</option>
          <option value={4.5}>4.5+ estrellas</option>
        </select>
      </label>

      <label>
        Ordenar por
        <select
          value={sortBy}
          onChange={(event) => onSortByChange(event.target.value as "match" | "rating" | "jobs")}
        >
          <option value="match">Mejor coincidencia</option>
          <option value="rating">Mejor calificación</option>
          <option value="jobs">Más trabajos verificados</option>
        </select>
      </label>
    </section>
  );
}
