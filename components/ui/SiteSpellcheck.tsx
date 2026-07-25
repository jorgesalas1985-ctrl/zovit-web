"use client";

import { useEffect } from "react";
import {
  applySpanishAutocorrect,
  shouldAutocorrectElement,
  shouldEnableSpellcheck,
} from "@/lib/ui/spanishAutocorrect";

const LANG = "es-CL";

function isEditable(el: Element): el is HTMLInputElement | HTMLTextAreaElement | HTMLElement {
  if (el instanceof HTMLTextAreaElement) return true;
  if (el instanceof HTMLInputElement) return true;
  if (el instanceof HTMLElement && el.isContentEditable) return true;
  return false;
}

function enhanceElement(el: HTMLElement) {
  if (!shouldEnableSpellcheck(el)) {
    el.setAttribute("spellcheck", "false");
    return;
  }

  el.setAttribute("spellcheck", "true");
  el.setAttribute("lang", LANG);
  el.setAttribute("autocorrect", "on");
  el.setAttribute("autocapitalize", "sentences");

  if (el.dataset.zovitSpellbound === "1") return;
  el.dataset.zovitSpellbound = "1";

  if (!shouldAutocorrectElement(el)) return;

  const onBlur = () => {
    if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
      const next = applySpanishAutocorrect(el.value);
      if (next !== el.value) {
        const descriptor = Object.getOwnPropertyDescriptor(
          el instanceof HTMLTextAreaElement
            ? HTMLTextAreaElement.prototype
            : HTMLInputElement.prototype,
          "value"
        );
        descriptor?.set?.call(el, next);
        el.dispatchEvent(new Event("input", { bubbles: true }));
        el.dispatchEvent(new Event("change", { bubbles: true }));
      }
      return;
    }

    if (el.isContentEditable) {
      const next = applySpanishAutocorrect(el.innerText);
      if (next !== el.innerText) {
        el.innerText = next;
        el.dispatchEvent(new Event("input", { bubbles: true }));
      }
    }
  };

  el.addEventListener("blur", onBlur);
}

function scan(root: ParentNode = document) {
  const nodes = root.querySelectorAll("input, textarea, [contenteditable='true'], [contenteditable='']");
  nodes.forEach((node) => {
    if (isEditable(node)) enhanceElement(node);
  });
}

/**
 * Activa revisión ortográfica en español en todo el sitio
 * y auto-corrige tipografías frecuentes al salir de campos de texto libre.
 */
export function SiteSpellcheck() {
  useEffect(() => {
    document.documentElement.lang = LANG;
    document.documentElement.setAttribute("spellcheck", "true");
    document.body?.setAttribute("spellcheck", "true");
    document.body?.setAttribute("lang", LANG);

    scan(document);

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        mutation.addedNodes.forEach((node) => {
          if (!(node instanceof HTMLElement)) return;
          if (isEditable(node)) enhanceElement(node);
          scan(node);
        });
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  return null;
}
