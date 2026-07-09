// src/button.tsx
import { forwardRef } from "react";
import { jsx, jsxs } from "react/jsx-runtime";
var Button = forwardRef(function Button2({
  variant = "primary",
  size = "md",
  loading = false,
  disabled = false,
  className,
  children,
  type = "button",
  ...rest
}, ref) {
  return /* @__PURE__ */ jsxs(
    "button",
    {
      ref,
      type,
      disabled: disabled || loading,
      "data-loading": loading ? "true" : void 0,
      ...rest,
      children: [
        loading ? /* @__PURE__ */ jsx("span", { className: "dui-button__spinner", "aria-hidden": "true" }) : null,
        /* @__PURE__ */ jsx("span", { children })
      ]
    }
  );
});

// src/input.tsx
import { forwardRef as forwardRef2, useId } from "react";

// src/utils.ts
function cx(...classes) {
  return classes.filter(Boolean).join(" ");
}

// src/input.tsx
import { jsx as jsx2, jsxs as jsxs2 } from "react/jsx-runtime";
var Input = forwardRef2(function Input2({ label, error, helperText, className, id, ...rest }, ref) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const helperId = helperText ? `${inputId}-helper` : void 0;
  const errorId = error ? `${inputId}-error` : void 0;
  const describedBy = [errorId, helperId].filter(Boolean).join(" ") || void 0;
  return /* @__PURE__ */ jsxs2("label", { className: "dui-field", htmlFor: inputId, children: [
    label ? /* @__PURE__ */ jsx2("span", { className: "dui-field__label", children: label }) : null,
    /* @__PURE__ */ jsx2(
      "input",
      {
        ref,
        id: inputId,
        className: cx("dui-input", error ? "dui-input--error" : false, className),
        "aria-invalid": error ? true : void 0,
        "aria-describedby": describedBy,
        ...rest
      }
    ),
    error ? /* @__PURE__ */ jsx2("span", { className: "dui-field__message dui-field__message--error", id: errorId, children: error }) : helperText ? /* @__PURE__ */ jsx2("span", { className: "dui-field__message", id: helperId, children: helperText }) : null
  ] });
});

// src/card.tsx
import { jsx as jsx3, jsxs as jsxs3 } from "react/jsx-runtime";
function Card({ title, extra, children, className, ...rest }) {
  return /* @__PURE__ */ jsxs3("section", { className: cx("dui-card", className), ...rest, children: [
    title || extra ? /* @__PURE__ */ jsxs3("header", { className: "dui-card__header", children: [
      title ? /* @__PURE__ */ jsx3("h3", { className: "dui-card__title", children: title }) : null,
      extra ? /* @__PURE__ */ jsx3("div", { className: "dui-card__extra", children: extra }) : null
    ] }) : null,
    /* @__PURE__ */ jsx3("div", { className: "dui-card__body", children })
  ] });
}

// src/modal.tsx
import { useEffect } from "react";
import { createPortal } from "react-dom";
import { jsx as jsx4, jsxs as jsxs4 } from "react/jsx-runtime";
function Modal({ open, title, onOpenChange, footer, children }) {
  useEffect(() => {
    if (!open) {
      return;
    }
    const handleKeyDown = (event) => {
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
    /* @__PURE__ */ jsx4("div", { className: "dui-modal", role: "presentation", onMouseDown: () => onOpenChange(false), children: /* @__PURE__ */ jsxs4(
      "section",
      {
        className: "dui-modal__panel",
        role: "dialog",
        "aria-modal": "true",
        "aria-labelledby": title ? "dui-modal-title" : void 0,
        onMouseDown: (event) => event.stopPropagation(),
        children: [
          /* @__PURE__ */ jsxs4("header", { className: "dui-modal__header", children: [
            title ? /* @__PURE__ */ jsx4("h2", { className: "dui-modal__title", id: "dui-modal-title", children: title }) : null,
            /* @__PURE__ */ jsx4(Button, { variant: "ghost", size: "sm", "aria-label": "\u5173\u95ED\u5F39\u7A97", onClick: () => onOpenChange(false), children: "\u5173\u95ED" })
          ] }),
          /* @__PURE__ */ jsx4("div", { className: "dui-modal__body", children }),
          footer ? /* @__PURE__ */ jsx4("footer", { className: "dui-modal__footer", children: footer }) : null
        ]
      }
    ) }),
    document.body
  );
}
export {
  Button,
  Card,
  Input,
  Modal
};
//# sourceMappingURL=index.js.map