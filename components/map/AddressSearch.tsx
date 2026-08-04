"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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

  useEffect(() => {
    const q = value.trim();
    if (q.length < 3) {
      setSuggestions([]);
      setBusy(false);
      return;
    }

    setBusy(true);
    setError("");
    const timer = window.setTimeout(async () => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      try {
        const results = await geocodeAddress(q, { signal: controller.signal, limit: 5 });
        setSuggestions(results);
        setOpen(true);
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        setError(err instanceof Error ? err.message : "No se pudo buscar la dirección.");
        setSuggestions([]);
      } finally {
        setBusy(false);
      }
    }, 400);

    return () => {
      window.clearTimeout(timer);
      abortRef.current?.abort();
    };
  }, [value]);

  const listId = useMemo(() => "zovit-address-suggestions", []);

  return (
    <div className="mapAddressSearch">
      <label className="mapFieldLabel" htmlFor="map-address-input">
        Dirección del servicio
      </label>
      <div className="mapAddressInputWrap">
        <Search size={16} aria-hidden />
        <input
          id="map-address-input"
          type="search"
          value={value}
          disabled={disabled}
          autoComplete="street-address"
          placeholder={placeholder}
          aria-controls={listId}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => suggestions.length > 0 && setOpen(true)}
        />
        {busy && <Loader2 size={16} className="spinIcon" aria-label="Buscando" />}
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
      </div>

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
