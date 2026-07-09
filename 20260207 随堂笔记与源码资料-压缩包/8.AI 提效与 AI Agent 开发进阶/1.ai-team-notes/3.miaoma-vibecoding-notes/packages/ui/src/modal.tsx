import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Button } from "./button";

export interface ModalProps {
  open: boolean;
  title?: ReactNode;
  onOpenChange: (open: boolean) => void;
  footer?: ReactNode;
  children: ReactNode;
}

export function Modal({ open, title, onOpenChange, footer, children }: ModalProps) {
  useEffect(() => {
    if (!open) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onOpenChange(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onOpenChange, open]);

  if (!open || typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div className="dui-modal" role="presentation" onMouseDown={() => onOpenChange(false)}>
      <section
        className="dui-modal__panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? "dui-modal-title" : undefined}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="dui-modal__header">
          {title ? (
            <h2 className="dui-modal__title" id="dui-modal-title">
              {title}
            </h2>
          ) : null}
          <Button variant="ghost" size="sm" aria-label="关闭弹窗" onClick={() => onOpenChange(false)}>
            关闭
          </Button>
        </header>
        <div className="dui-modal__body">{children}</div>
        {footer ? <footer className="dui-modal__footer">{footer}</footer> : null}
      </section>
    </div>,
    document.body
  );
}
