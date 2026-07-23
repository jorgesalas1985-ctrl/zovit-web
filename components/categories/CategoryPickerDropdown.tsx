"use client";

import {
  buildCategoryHref,
  filterRootCategories,
  getSortedRootCategories,
} from "@/lib/categories/hierarchy";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronDown, Search } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState } from "react";

export function CategoryPickerDropdown() {
  const router = useRouter();
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);

  const allCategories = useMemo(() => getSortedRootCategories(), []);
  const filteredCategories = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return allCategories;
    return filterRootCategories(normalized);
  }, [allCategories, query]);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function onEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onEscape);
    inputRef.current?.focus();

    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onEscape);
    };
  }, [open]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query, open]);

  function selectCategory(slug: string) {
    setOpen(false);
    setQuery("");
    router.push(buildCategoryHref([slug]));
  }

  function onTriggerKeyDown(event: React.KeyboardEvent<HTMLButtonElement>) {
    if (event.key === "ArrowDown" || event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      setOpen(true);
    }
  }

  function onListKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((index) => Math.min(index + 1, Math.max(filteredCategories.length - 1, 0)));
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) => Math.max(index - 1, 0));
    }
    if (event.key === "Enter" && filteredCategories[activeIndex]) {
      event.preventDefault();
      selectCategory(filteredCategories[activeIndex].slug);
    }
  }

  return (
    <div className="categoryPicker" ref={rootRef}>
      <button
        type="button"
        className="primaryButton wide categoryPickerTrigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((value) => !value)}
        onKeyDown={onTriggerKeyDown}
      >
        Elegir categoría manualmente
        <ChevronDown size={18} className={open ? "categoryPickerChevronOpen" : undefined} />
      </button>

      {open && (
        <div className="categoryPickerPanel" role="presentation">
          <label className="categoryPickerSearchLabel" htmlFor={`${listId}-input`}>
            Buscar una categoría
          </label>
          <div className="categoryPickerSearch">
            <Search size={18} aria-hidden="true" />
            <input
              id={`${listId}-input`}
              ref={inputRef}
              type="search"
              value={query}
              placeholder="Buscar una categoría..."
              aria-controls={listId}
              aria-autocomplete="list"
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={onListKeyDown}
            />
          </div>

          <ul
            id={listId}
            className="categoryPickerList"
            role="listbox"
            aria-label="Categorías disponibles"
          >
            {filteredCategories.length === 0 ? (
              <li className="categoryPickerEmpty" role="option" aria-selected={false}>
                No hay coincidencias para tu búsqueda.
              </li>
            ) : (
              filteredCategories.map((category, index) => (
                <li key={category.slug} role="presentation">
                  <button
                    type="button"
                    role="option"
                    aria-selected={index === activeIndex}
                    className={index === activeIndex ? "categoryPickerOption active" : "categoryPickerOption"}
                    onMouseEnter={() => setActiveIndex(index)}
                    onClick={() => selectCategory(category.slug)}
                  >
                    {category.name}
                  </button>
                </li>
              ))
            )}
          </ul>

          <Link href="/categorias" className="categoryPickerFooterLink" onClick={() => setOpen(false)}>
            Ver todas las categorías
          </Link>
        </div>
      )}
    </div>
  );
}
