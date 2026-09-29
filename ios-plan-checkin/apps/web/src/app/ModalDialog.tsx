import { useEffect, useRef, type ReactNode } from "react";

export function ModalDialog({
  children,
  className,
  labelledBy,
  describedBy,
  label,
  fallbackFocusId,
  onClose,
}: {
  children: ReactNode;
  className?: string;
  labelledBy?: string;
  describedBy?: string;
  label?: string;
  fallbackFocusId?: string;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const element = dialog.current;
    const prior = document.activeElement;
    if (!element) return;
    element.showModal();
    element.querySelector<HTMLElement>("[data-initial-focus]")?.focus();
    return () => {
      if (element.open) element.close();
      if (prior instanceof HTMLElement && prior.isConnected) prior.focus();
      else if (fallbackFocusId)
        document.getElementById(fallbackFocusId)?.focus();
    };
  }, []);

  return (
    <dialog
      ref={dialog}
      className={`modal-dialog ${className ?? ""}`.trim()}
      role="alertdialog"
      aria-modal="true"
      aria-label={label}
      aria-labelledby={labelledBy}
      aria-describedby={describedBy}
      onCancel={(event) => {
        event.preventDefault();
        onCloseRef.current();
      }}
    >
      {children}
    </dialog>
  );
}
