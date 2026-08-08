// ------------------------------------------------------------------
// modal.ts - חלונית (dialog) נגישה וכללית. סגירה ב-ESC, בלחיצה על הרקע,
// או בכפתור הסגירה. מחזירה פונקציית close.
// ------------------------------------------------------------------

import { el } from "./dom";

export function openModal(opts: {
  title: string;
  content: HTMLElement;
  /** מחלקת CSS נוספת לעיצוב מותאם (למשל רקע ייחודי) */
  className?: string;
  /** תווית נגישות כשאין כותרת מוצגת ויזואלית */
  ariaLabel?: string;
}): () => void {
  const dialog = el("div", {
    class: opts.className ? `modal ${opts.className}` : "modal",
    role: "dialog",
    "aria-modal": "true",
    "aria-label": opts.ariaLabel ?? opts.title,
  });

  const overlay = el(
    "div",
    {
      class: "modal-overlay",
      onClick: (e: Event) => {
        if (e.target === overlay) close();
      },
    },
    dialog
  );

  function close(): void {
    overlay.remove();
    document.removeEventListener("keydown", onKey);
  }
  function onKey(e: KeyboardEvent): void {
    if (e.key === "Escape") close();
  }

  const closeBtn = el(
    "button",
    { type: "button", class: "modal__close", "aria-label": "סגירה", onClick: close },
    "×"
  );

  dialog.append(closeBtn, el("h3", { class: "modal__title" }, opts.title), opts.content);
  document.body.appendChild(overlay);
  document.addEventListener("keydown", onKey);
  (dialog.querySelector("input, button:not(.modal__close)") as HTMLElement | null)?.focus();

  return close;
}
