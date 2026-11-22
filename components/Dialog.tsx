import { useEffect, useRef, type ReactNode } from "react";

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  titleId: string;
  /** A short line under the title: what this dialog is about. */
  subtitle?: ReactNode;
  variant?: "drawer" | "center" | "compact";
  footer?: ReactNode;
  children: ReactNode;
  /** Element to focus after closing when the opener no longer exists (e.g. a deleted row). */
  fallbackFocus?: () => HTMLElement | null;
}

/** Native modal dialog: the browser provides focus containment, Escape and inertness. */
export function Dialog({ open, onClose, title, titleId, subtitle, variant = "drawer", footer, children, fallbackFocus }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  const fallback = useRef(fallbackFocus);
  useEffect(() => { fallback.current = fallbackFocus; }, [fallbackFocus]);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  useEffect(() => {
    // Replacing the add form with line details removes the focused submit button.
    // Keep the active modal usable when that leaves focus on the document body.
    const dialog = ref.current;
    if (open && dialog?.open && document.activeElement === document.body) {
      dialog.querySelector<HTMLElement>(".close-button")?.focus();
    }
  }, [open, title]);

  function restoreFocus() {
    const target = opener.current?.isConnected ? opener.current : fallback.current?.() ?? null;
    window.requestAnimationFrame(() => {
      // Native close normally restores focus itself. Only supply a fallback when
      // focus is stranded; never steal focus from a new action or another modal.
      const active = document.activeElement;
      if (active === document.body || active === ref.current || !active?.isConnected) target?.focus();
    });
  }

  const className = `dialog${variant === "drawer" ? "" : variant === "center" ? " center" : " center compact"}`;
  return (
    <dialog
      ref={ref}
      className={className}
      aria-labelledby={titleId}
      onClose={() => { restoreFocus(); onClose(); }}
      onClick={event => { if (event.target === event.currentTarget) event.currentTarget.close(); }}
    >
      {open && (
        <div className="dialog-inner">
          <div className="dialog-head">
            <div>
              <h2 id={titleId}>{title}</h2>
              {subtitle && <p className="dialog-sub">{subtitle}</p>}
            </div>
            <button type="button" className="close-button" aria-label="Close" onClick={() => ref.current?.close()}>
              <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><path d="M4 4l10 10M14 4L4 14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
            </button>
          </div>
          <div className="dialog-body">{children}</div>
          {footer && <div className="dialog-foot">{footer}</div>}
        </div>
      )}
    </dialog>
  );
}
