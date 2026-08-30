"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import type { GeocodeSuggestion } from "@/lib/geo/geocode";
import { geocodeAddress } from "@/lib/geo/geocode";
import { Loader2, MapPin, Search, X } from "lucide-react";

type AddressSearchProps = {
  value: string;
  onChange: (value: string) => void;
  onSelect: (suggestion: GeocodeSuggestion) => void;
  placeholder?: string;
  disabled?: boolean;
};

export function AddressSearch({
  value,
  onChange,
  onSelect,
  placeholder = "Buscar calle, comuna o ciudad…",
  disabled,
}: AddressSearchProps) {
  const [suggestions, setSuggestions] = useState<GeocodeSuggestion[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => () => abortRef.current?.abort(), []);

  async function searchAddress(event?: FormEvent) {
    event?.preventDefault();
    const q = value.trim();
    if (q.length < 3) {
      setSuggestions([]);
      setBusy(false);
      setOpen(false);
      setError("Escribe al menos 3 caracteres y presiona la lupa.");
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setBusy(true);
    setError("");
    setOpen(false);
    try {
      const results = await geocodeAddress(q, { signal: controller.signal, limit: 5 });
      setSuggestions(results);
      setOpen(results.length > 0);
      if (results.length === 0) setError("No encontramos direcciones. Prueba agregando comuna o ciudad.");
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      setError(err instanceof Error ? err.message : "No se pudo buscar la dirección.");
      setSuggestions([]);
    } finally {
      setBusy(false);
    }
  }

  const listId = useMemo(() => "zovit-address-suggestions", []);

  return (
    <div className="mapAddressSearch">
      <label className="mapFieldLabel" htmlFor="map-address-input">
        Dirección del servicio
      </label>
      <form className="mapAddressInputWrap" onSubmit={(event) => void searchAddress(event)}>
        <button type="submit" className="mapAddressSearchButton" aria-label="Buscar dirección" disabled={disabled || busy}>
          {busy ? <Loader2 size={16} className="spinIcon" aria-hidden /> : <Search size={16} aria-hidden />}
        </button>
        <input
          id="map-address-input"
          type="search"
          value={value}
          disabled={disabled}
          autoComplete="street-address"
          placeholder={placeholder}
          aria-controls={listId}
          onChange={(e) => {
            onChange(e.target.value);
            setSuggestions([]);
            setOpen(false);
            setError("");
          }}
        />
        {value && !busy && (
          <button
            type="button"
            className="mapIconGhost"
            aria-label="Limpiar búsqueda"
            onClick={() => {
              onChange("");
              setSuggestions([]);
              setOpen(false);
            }}
          >
            <X size={14} />
          </button>
        )}
      </form>

      {error && <p className="mapHint mapHintDanger" role="alert">{error}</p>}

      {open && suggestions.length > 0 && (
        <ul id={listId} className="mapSuggestList" role="listbox">
          {suggestions.map((item) => (
            <li key={item.id} role="option" aria-selected={false}>
              <button
                type="button"
                className="mapSuggestItem"
                onClick={() => {
                  onSelect(item);
                  onChange(item.formattedAddress);
                  setOpen(false);
                }}
              >
                <MapPin size={14} aria-hidden />
                <span>{item.label}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
